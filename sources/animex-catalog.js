import {encodePagePath} from './html-source.js'

export const ANIMEX_CATALOG_ID = 'animex_anime_catalog'
export const ANIMEX_CATALOG_NAME_FA = 'انیمکس'
export const ANIMEX_CATALOG_NAME_EN = 'animex'

const LIST_TTL_MS = 8 * 60 * 1000
const listCache = new Map()
const kitsuCache = new Map()

function flagOn(v) {
  const s = String(v ?? '').trim().toLowerCase()
  return s === '1' || s === 'true' || s === 'yes' || s === 'on'
}
function flagOff(v) {
  const s = String(v ?? '').trim().toLowerCase()
  return s === '0' || s === 'false' || s === 'no' || s === 'off'
}

export function isAnimexCatalogEnabled(env = {}) {
  if (flagOff(env.ENABLE_ANIMEX_CATALOG)) return false
  if (flagOn(env.ENABLE_ANIMEX_CATALOG)) return true
  return Boolean(String(env.ANIMEX_BASEURL || '').trim())
}

export function animexCatalogBase(env = {}) {
  return String(env.ANIMEX_BASEURL || 'https://animex.click').trim().replace(/\/+$/, '') || 'https://animex.click'
}

export function animexCatalogDisplayName(lang = 'fa') {
  return String(lang || 'fa').toLowerCase().startsWith('en') ? ANIMEX_CATALOG_NAME_EN : ANIMEX_CATALOG_NAME_FA
}

function cleanTitle(raw) {
  return String(raw || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCharCode(Number(n)) } catch { return '' } })
    .replace(/<[^>]+>/g, '')
    .replace(/^دانلود\s+(انیمه|سریال|فیلم)\s+/i, '')
    .replace(/\s+/g, ' ').trim()
}

function pickPosterUrl(chunk, base) {
  const text = String(chunk || '')
  const candidates = []
  const srcset = text.match(/srcset=["']([^"']+)["']/i)
  if (srcset) {
    for (const part of srcset[1].split(',')) {
      const u = part.trim().split(/\s+/)[0]
      if (u) candidates.push(u)
    }
  }
  for (const re of [
    /data-src=["']([^"']+)["']/i,
    /data-lazy-src=["']([^"']+)["']/i,
    /<img[^>]+src=["']([^"']+)["']/i,
  ]) {
    const m = text.match(re)
    if (m) candidates.push(m[1])
  }
  for (const raw of candidates) {
    if (!raw || raw.startsWith('data:')) continue
    if (raw.includes('_files/')) continue
    try {
      const abs = new URL(raw, base).toString()
      if (/^https?:\/\//i.test(abs)) return abs
    } catch { /* next */ }
  }
  return null
}

function latinQuery(title, slug) {
  const t = String(title || '')
  const m = t.match(/[A-Za-z][A-Za-z0-9 .':!&-]{2,80}/)
  if (m) return m[0].trim()
  if (slug) return String(slug).replace(/-/g, ' ')
  return t.replace(/[\u0600-\u06FF]/g, ' ').replace(/\s+/g, ' ').trim()
}

async function httpGetText(url, httpClient, timeout = 18000) {
  const headers = {
    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
    Referer: 'https://animex.click/',
  }
  if (httpClient?.get) {
    const res = await httpClient.get(url, {
      timeout, headers, validateStatus: (s) => s >= 200 && s < 400,
      responseType: 'text', transformResponse: [(d) => d],
    })
    return typeof res.data === 'string' ? res.data : String(res.data ?? '')
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

function parseListingHtml(html, base) {
  const items = []
  const seen = new Set()
  const text = String(html || '')
  const articles = text.match(/<article\b[^>]*\btype-anime\b[^>]*>[\s\S]*?<\/article>/gi)
    || text.match(/<article\b[^>]*>[\s\S]*?<\/article>/gi)
    || []

  const push = (slug, title, img) => {
    if (!slug || ['page', 'feed', 'category', 'tag', 'genre'].includes(slug)) return
    const idPath = '/anime/' + slug + '/'
    if (seen.has(idPath)) return
    seen.add(idPath)
    const pageId = encodePagePath(idPath)
    if (!pageId) return
    let name = cleanTitle(title) || slug.replace(/-/g, ' ')
    if (name.length < 2 || name === 'انیمکس') name = slug.replace(/-/g, ' ')
    let poster = null
    if (img && !String(img).startsWith('data:') && !String(img).includes('_files/')) {
      try { poster = new URL(img, base).toString() } catch { poster = String(img).startsWith('http') ? img : null }
    }
    items.push({
      id: 'ipanimex___' + pageId,
      name,
      query: latinQuery(name, slug),
      slug,
      poster,
      path: idPath,
      description: '',
      year: null,
      background: null,
    })
  }

  for (const chunk of articles) {
    const href = chunk.match(/href=["'](https?:\/\/[^"']+\/anime\/([^/"']+)\/?)["']/i)
      || chunk.match(/href=["'](\/anime\/([^/"']+)\/?)["']/i)
    if (!href) continue
    const slug = href[2]
    const poster = pickPosterUrl(chunk, base)
    const titleM = chunk.match(/entry-title[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i)
      || chunk.match(/alt=["']([^"']+)["']/i)
      || chunk.match(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/i)
    let title = titleM ? cleanTitle(titleM[1]) : ''
    if (!title || title === 'انیمکس') title = slug.replace(/-/g, ' ')
    push(slug, title, poster)
  }

  if (!items.length) {
    const re = /href=["'](?:https?:\/\/[^"']+)?\/anime\/([a-z0-9][a-z0-9-]*)\/?["']/gi
    let m
    while ((m = re.exec(text))) push(m[1], m[1].replace(/-/g, ' '), null)
  }
  return items
}

async function kitsuEnrich(query, httpClient) {
  if (!query) return null
  if (kitsuCache.has(query)) return kitsuCache.get(query)
  try {
    const url = 'https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(query) + '&page[limit]=1'
    let data
    if (httpClient?.get) {
      data = (await httpClient.get(url, {
        timeout: 7000,
        headers: { Accept: 'application/vnd.api+json' },
        validateStatus: (s) => s < 400,
      })).data
    } else {
      const res = await fetch(url, { headers: { Accept: 'application/vnd.api+json' } })
      data = await res.json()
    }
    const a = data?.data?.[0]?.attributes
    if (!a) { kitsuCache.set(query, null); return null }
    const out = {
      description: String(a.synopsis || '').trim().slice(0, 1200),
      poster: a.posterImage?.large || a.posterImage?.medium || null,
      background: a.coverImage?.large || null,
      year: (a.startDate || '').slice(0, 4) || null,
    }
    kitsuCache.set(query, out)
    return out
  } catch {
    kitsuCache.set(query, null)
    return null
  }
}

async function scrapeAnimexList(env, httpClient) {
  const base = animexCatalogBase(env)
  const cacheKey = 'list5:' + base
  const hit = listCache.get(cacheKey)
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.items

  let items = []
  for (let page = 1; page <= 4; page++) {
    const url = page === 1 ? base + '/anime/' : base + '/anime/page/' + page + '/'
    try {
      const html = await httpGetText(url, httpClient, 18000)
      if (!html || html.length < 300) break
      const pageItems = parseListingHtml(html, base)
      if (!pageItems.length) break
      const seen = new Set(items.map((i) => i.path))
      for (const it of pageItems) {
        if (!seen.has(it.path)) { seen.add(it.path); items.push(it) }
      }
    } catch {
      break
    }
  }

  const needArt = items.filter((it) => !it.poster)
  const batch = needArt.slice(0, 40)
  for (let i = 0; i < batch.length; i += 8) {
    await Promise.all(batch.slice(i, i + 8).map(async (it) => {
      try {
        const k = await kitsuEnrich(it.query || it.name, httpClient)
        if (!k) return
        if (k.description && !it.description) it.description = k.description
        if (k.poster && !it.poster) it.poster = k.poster
        if (k.background && !it.background) it.background = k.background
        if (k.year && !it.year) it.year = k.year
      } catch { /* ignore */ }
    }))
  }

  listCache.set(cacheKey, { at: Date.now(), items })
  return items
}

export async function animexCatalogList(catalogId, search, env, httpClient) {
  if (!isAnimexCatalogEnabled(env)) return { metas: [] }
  if (String(catalogId) !== ANIMEX_CATALOG_ID) return { metas: [] }
  try {
    let items = await scrapeAnimexList(env, httpClient)
    const q = String(search || '').trim().toLowerCase()
    if (q) {
      items = items.filter((it) =>
        String(it.name || '').toLowerCase().includes(q) ||
        String(it.query || '').toLowerCase().includes(q) ||
        String(it.slug || '').toLowerCase().includes(q.replace(/\s+/g, '-')),
      )
    }
    return {
      metas: items.map((it) => {
        const meta = {
          id: it.id,
          type: 'series',
          name: it.name || it.slug || 'Anime',
          poster: it.poster || null,
          posterShape: 'poster',
        }
        if (it.background) meta.background = it.background
        if (it.year) meta.releaseInfo = String(it.year)
        meta.description = it.description || it.name || it.slug || ''
        return meta
      }),
    }
  } catch {
    return { metas: [] }
  }
}

export function animexCatalogManifestCatalogs(env, lang = 'fa') {
  if (!isAnimexCatalogEnabled(env)) return []
  return [{
    type: 'series',
    id: ANIMEX_CATALOG_ID,
    name: animexCatalogDisplayName(lang),
    extra: [
      { name: 'search', isRequired: false },
      { name: 'skip', isRequired: false },
    ],
  }]
}
