/**
 * FarsiPlex — Iranian movies & series (catalog + direct MP4 streams via FarsiLand CDN).
 * Only active when ENABLE_FARSIPLEX=1 (BASEURL alone does NOT enable).
 *
 * Flow:
 *  - Catalog: scrape /movie/ and /tvshow/ list pages
 *  - Meta: page og/title + episode list from #seasons
 *  - Streams: GET /wp-json/dooplayer/v2/{postId}/{movie|tv}/{nume}
 *             → embed_url source= https://cdn2.farsiland.com/...mp4
 */

export const FARSIPLEX_PREFIX = 'farsiplex:'
export const DEFAULT_FARSIPLEX_BASEURL = 'https://farsiplex.com'
export const FARSIPLEX_MOVIE_CATALOG_ID = 'farsiplex_movies'
export const FARSIPLEX_SERIES_CATALOG_ID = 'farsiplex_series'

const UA =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const listCache = new Map()
const pageCache = new Map()
const LIST_TTL_MS = 10 * 60 * 1000
const PAGE_TTL_MS = 15 * 60 * 1000
const MAX_LIST_PAGES = 5

function flagOn(v) {
    const s = String(v ?? '').trim().toLowerCase()
    return s === '1' || s === 'true' || s === 'yes' || s === 'on'
}

/** Strict: only ENABLE_FARSIPLEX */
export function isFarsiplexEnabled(env = {}) {
    return flagOn(env.ENABLE_FARSIPLEX)
}

export function farsiplexBase(env = {}) {
    const raw = String(env.FARSIPLEX_BASEURL || DEFAULT_FARSIPLEX_BASEURL).trim() || DEFAULT_FARSIPLEX_BASEURL
    return raw.replace(/\/+$/, '')
}

function decodeEntities(s) {
    return String(s || '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
}

function slugToName(slug) {
    return String(slug || '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim()
}

async function fetchText(url, httpClient, timeout = 14_000, referer) {
    const headers = {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/json',
        'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.7',
        Referer: referer || farsiplexBase({}) + '/',
    }
    if (httpClient?.get) {
        const res = await httpClient.get(url, {
            timeout,
            headers,
            responseType: 'text',
            validateStatus: (s) => s >= 200 && s < 400,
            maxRedirects: 5,
        })
        return String(res.data ?? '')
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeout)
    try {
        const res = await fetch(url, {signal: ctrl.signal, headers, redirect: 'follow'})
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.text()
    } finally {
        clearTimeout(t)
    }
}

async function fetchJson(url, httpClient, timeout = 12_000, referer) {
    const headers = {
        'User-Agent': UA,
        Accept: 'application/json',
        Referer: referer || farsiplexBase({}) + '/',
    }
    if (httpClient?.get) {
        const res = await httpClient.get(url, {
            timeout,
            headers,
            validateStatus: (s) => s >= 200 && s < 400,
        })
        return res.data
    }
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), timeout)
    try {
        const res = await fetch(url, {signal: ctrl.signal, headers, redirect: 'follow'})
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return await res.json()
    } finally {
        clearTimeout(t)
    }
}

function extractPostId(html) {
    const m =
        String(html || '').match(/postid-(\d+)/i) ||
        String(html || '').match(/data-id=["'](\d+)["']/i) ||
        String(html || '').match(/name=["']id["']\s+value=["'](\d+)["']/i)
    return m ? m[1] : null
}

function extractTitle(html, fallback) {
    const h1 = String(html || '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
    if (h1) {
        const t = decodeEntities(h1[1].replace(/<[^>]+>/g, '')).trim()
        if (t) return t
    }
    const og = String(html || '').match(/property=["']og:title["']\s+content=["']([^"']+)["']/i)
    if (og) return decodeEntities(og[1]).replace(/\s*[–—|-]\s*FarsiPlex.*$/i, '').trim()
    const title = String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (title) {
        return decodeEntities(title[1].replace(/<[^>]+>/g, ''))
            .replace(/\s*[–—|-]\s*FarsiPlex.*$/i, '')
            .trim()
    }
    return fallback || ''
}

function extractPoster(html, base) {
    const og = String(html || '').match(/property=["']og:image["']\s+content=["']([^"']+)["']/i)
    if (og?.[1]) return og[1]
    const img = String(html || '').match(
        /wp-content\/uploads\/[^"' ]+\.(?:jpg|jpeg|png|webp)/i,
    )
    if (img) {
        const p = img[0]
        return p.startsWith('http') ? p : `${base}/${p.replace(/^\/+/, '')}`
    }
    return null
}

function extractDescription(html) {
    const syn = String(html || '').match(
        /id=["']info["'][\s\S]*?class=["']wp-content["'][^>]*>([\s\S]*?)<\/div>/i,
    )
    if (syn) {
        const text = decodeEntities(syn[1].replace(/<[^>]+>/g, '\n'))
            .replace(/\n+/g, '\n')
            .trim()
        if (text.length > 20) return text.slice(0, 1200)
    }
    const og = String(html || '').match(/property=["']og:description["']\s+content=["']([^"']+)["']/i)
    return og ? decodeEntities(og[1]) : ''
}

function parseListPage(html, kind, base) {
    const re =
        kind === 'movie'
            ? /href=["'](?:https?:\/\/[^"']+)?(\/movie\/([a-z0-9][a-z0-9-]*))\/?["']/gi
            : /href=["'](?:https?:\/\/[^"']+)?(\/tvshow\/([a-z0-9][a-z0-9-]*))\/?["']/gi
    const seen = new Set()
    const items = []
    let m
    while ((m = re.exec(html))) {
        const slug = m[2]
        if (!slug || slug === 'feed' || slug === 'page' || seen.has(slug)) continue
        seen.add(slug)
        const type = kind === 'movie' ? 'movie' : 'series'
        const id = `${FARSIPLEX_PREFIX}${kind === 'movie' ? 'm' : 's'}:${slug}`
        // try nearby poster in a window around the match
        let poster = null
        const start = Math.max(0, m.index - 400)
        const window = html.slice(start, m.index + 500)
        const img =
            window.match(/data-src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i) ||
            window.match(/src=["']([^"']+\/(?:uploads|poster)[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i) ||
            window.match(/src=["']([^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i)
        if (img?.[1] && !/logo|favicon|icon|avatar|emoji/i.test(img[1])) {
            poster = img[1].startsWith('http') ? img[1] : `${base}${img[1].startsWith('/') ? '' : '/'}${img[1]}`
        }
        items.push({
            id,
            type,
            name: slugToName(slug),
            poster,
        })
    }
    return items
}

async function scrapeList(kind, env, httpClient) {
    const base = farsiplexBase(env)
    const cacheKey = `list:${kind}:${base}`
    const hit = listCache.get(cacheKey)
    if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.items

    const path = kind === 'movie' ? 'movie' : 'tvshow'
    const all = []
    const seen = new Set()
    for (let page = 1; page <= MAX_LIST_PAGES; page++) {
        const url =
            page === 1 ? `${base}/${path}/` : `${base}/${path}/page/${page}/`
        try {
            const html = await fetchText(url, httpClient, 16_000, base + '/')
            if (!html) break
            const batch = parseListPage(html, kind, base)
            let added = 0
            for (const it of batch) {
                if (seen.has(it.id)) continue
                seen.add(it.id)
                all.push(it)
                added++
            }
            if (added === 0 && page > 1) break
            if (!/\/page\/\d+\//.test(html) && page === 1 && batch.length < 15) break
        } catch {
            if (page === 1) break
        }
    }

    listCache.set(cacheKey, {at: Date.now(), items: all})
    return all
}

async function loadPage(path, env, httpClient) {
    const base = farsiplexBase(env)
    const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
    const cacheKey = `page:${url}`
    const hit = pageCache.get(cacheKey)
    if (hit && Date.now() - hit.at < PAGE_TTL_MS) return hit.html
    const html = await fetchText(url, httpClient, 16_000, base + '/')
    pageCache.set(cacheKey, {at: Date.now(), html})
    return html
}

function parseEpisodes(html, seriesSlug) {
    const eps = []
    const re =
        /class=['"]numerando['"]>\s*(\d+)\s*[-–]\s*(\d+)\s*<[\s\S]*?href=['"]([^'"]*\/episode\/([a-z0-9-]+))\/?['"][^>]*>([^<]*)</gi
    let m
    while ((m = re.exec(html))) {
        const season = Number(m[1]) || 1
        const episode = Number(m[2]) || 1
        const epSlug = m[4]
        const title = decodeEntities(m[5] || `Episode ${episode}`).trim()
        eps.push({
            season,
            episode,
            epSlug,
            title,
            id: `${FARSIPLEX_PREFIX}e:${epSlug}`,
        })
    }
    // fallback: bare episode links
    if (!eps.length) {
        const re2 = /\/episode\/([a-z0-9-]+)\//gi
        const seen = new Set()
        let n = 0
        while ((m = re2.exec(html))) {
            const epSlug = m[1]
            if (seen.has(epSlug)) continue
            seen.add(epSlug)
            n++
            const em = epSlug.match(/ep0*(\d+)/i) || epSlug.match(/-(\d+)$/)
            const episode = em ? Number(em[1]) : n
            eps.push({
                season: 1,
                episode,
                epSlug,
                title: `Episode ${episode}`,
                id: `${FARSIPLEX_PREFIX}e:${epSlug}`,
            })
        }
    }
    eps.sort((a, b) => a.season - b.season || a.episode - b.episode)
    return eps
}

function extractSourceFromEmbed(embedUrl) {
    if (!embedUrl) return null
    try {
        const u = new URL(embedUrl, 'https://farsiplex.com')
        const src = u.searchParams.get('source')
        if (src && /^https?:\/\//i.test(src)) return src
    } catch {
        /* ignore */
    }
    const m = String(embedUrl).match(/source=([^&]+)/i)
    if (m) {
        try {
            return decodeURIComponent(m[1])
        } catch {
            return m[1]
        }
    }
    return null
}

function qualityFromUrl(url) {
    const s = String(url || '').toLowerCase()
    if (/2160|4k/.test(s)) return '2160p'
    if (/1080/.test(s)) return '1080p'
    if (/720/.test(s)) return '720p'
    if (/480/.test(s)) return '480p'
    if (/360/.test(s)) return '360p'
    return 'HD'
}

async function resolveStreams(postId, type, env, httpClient) {
    const base = farsiplexBase(env)
    const streams = []
    const seen = new Set()
    for (let nume = 1; nume <= 5; nume++) {
        try {
            const api = `${base}/wp-json/dooplayer/v2/${postId}/${type}/${nume}`
            const data = await fetchJson(api, httpClient, 12_000, base + '/')
            const embed = data?.embed_url
            if (!embed) continue
            const src = extractSourceFromEmbed(embed)
            if (!src || seen.has(src)) continue
            seen.add(src)
            const q = qualityFromUrl(src)
            streams.push({
                name: `🇮🇷 FarsiPlex · ${q}`,
                title: `FarsiPlex\n${q} · MP4 · cdn.farsiland`,
                url: src,
                behaviorHints: {
                    notWebReady: false,
                    bingeGroup: `farsiplex-${postId}`,
                },
            })
        } catch {
            /* next quality */
        }
    }
    // Prefer higher quality first
    const rank = (n) => {
        const m = String(n).match(/(\d{3,4})p/)
        return m ? Number(m[1]) : 0
    }
    streams.sort((a, b) => rank(b.name) - rank(a.name))
    return streams
}

export function farsiplexManifestCatalogs(env = {}, lang = 'fa') {
    if (!isFarsiplexEnabled(env)) return []
    const en = String(lang || '').toLowerCase().startsWith('en')
    return [
        {
            id: FARSIPLEX_MOVIE_CATALOG_ID,
            type: 'movie',
            name: en ? 'Iranian Movies' : 'فیلم ایرانی',
            extra: [{name: 'skip'}, {name: 'search'}],
        },
        {
            id: FARSIPLEX_SERIES_CATALOG_ID,
            type: 'series',
            name: en ? 'Iranian Series' : 'سریال ایرانی',
            extra: [{name: 'skip'}, {name: 'search'}],
        },
    ]
}


export async function farsiplexListCatalog(catalogId, search, env, httpClient) {
    if (!isFarsiplexEnabled(env)) return {metas: []}
    const isSeries = catalogId === FARSIPLEX_SERIES_CATALOG_ID
    const items = await scrapeList(isSeries ? 'tv' : 'movie', env, httpClient)
    let out = items
    if (search && String(search).trim()) {
        const q = String(search).trim().toLowerCase()
        out = items.filter(
            (it) =>
                String(it.name || '').toLowerCase().includes(q) ||
                String(it.id || '').toLowerCase().includes(q.replace(/\s+/g, '-')),
        )
    }
    return {
        metas: out.map((it) => ({
            id: it.id,
            type: it.type,
            name: it.name,
            poster: it.poster || undefined,
            posterShape: 'poster',
        })),
    }
}

function parseFarsiplexId(id) {
    const raw = String(id || '')
    if (!raw.startsWith(FARSIPLEX_PREFIX)) return null
    const rest = raw.slice(FARSIPLEX_PREFIX.length)
    const m = rest.match(/^(m|s|e):(.+)$/i)
    if (!m) return null
    return {kind: m[1].toLowerCase(), slug: m[2]}
}

export async function farsiplexGetMeta(id, env, httpClient) {
    if (!isFarsiplexEnabled(env)) return null
    const parsed = parseFarsiplexId(id)
    if (!parsed) return null
    const base = farsiplexBase(env)

    if (parsed.kind === 'e') {
        const html = await loadPage(`/episode/${parsed.slug}/`, env, httpClient)
        const name = extractTitle(html, slugToName(parsed.slug))
        const poster = extractPoster(html, base)
        return {
            meta: {
                id,
                type: 'series',
                name,
                poster: poster || undefined,
                background: poster || undefined,
                description: extractDescription(html),
            },
        }
    }

    if (parsed.kind === 'm') {
        const html = await loadPage(`/movie/${parsed.slug}/`, env, httpClient)
        const name = extractTitle(html, slugToName(parsed.slug))
        const poster = extractPoster(html, base)
        return {
            meta: {
                id,
                type: 'movie',
                name,
                poster: poster || undefined,
                background: poster || undefined,
                description: extractDescription(html),
            },
        }
    }

    const html = await loadPage(`/tvshow/${parsed.slug}/`, env, httpClient)
    const name = extractTitle(html, slugToName(parsed.slug))
    const poster = extractPoster(html, base)
    const episodes = parseEpisodes(html, parsed.slug)
    const videos = episodes.map((ep) => ({
        id: ep.id,
        title: ep.title || `S${ep.season}E${ep.episode}`,
        season: ep.season,
        episode: ep.episode,
    }))
    return {
        meta: {
            id,
            type: 'series',
            name,
            poster: poster || undefined,
            background: poster || undefined,
            description: extractDescription(html),
            videos,
        },
    }
}

export async function farsiplexGetStreams(id, env, httpClient) {
    if (!isFarsiplexEnabled(env)) return {streams: []}
    let targetId = String(id || '')
    let season = null
    let episode = null
    const seMatch = targetId.match(/^(farsiplex:s:[^:]+):(\d+):(\d+)$/i)
    if (seMatch) {
        targetId = seMatch[1]
        season = Number(seMatch[2])
        episode = Number(seMatch[3])
    }

    const parsed = parseFarsiplexId(targetId)
    if (!parsed) return {streams: []}

    if (parsed.kind === 'm') {
        const html = await loadPage(`/movie/${parsed.slug}/`, env, httpClient)
        const postId = extractPostId(html)
        if (!postId) return {streams: []}
        return {streams: await resolveStreams(postId, 'movie', env, httpClient)}
    }

    if (parsed.kind === 'e') {
        const html = await loadPage(`/episode/${parsed.slug}/`, env, httpClient)
        const postId = extractPostId(html)
        if (!postId) return {streams: []}
        return {streams: await resolveStreams(postId, 'tv', env, httpClient)}
    }

    if (parsed.kind === 's') {
        const html = await loadPage(`/tvshow/${parsed.slug}/`, env, httpClient)
        const episodes = parseEpisodes(html, parsed.slug)
        let ep = null
        if (season != null && episode != null) {
            ep = episodes.find((e) => e.season === season && e.episode === episode)
        }
        if (!ep && episodes.length) ep = episodes[0]
        if (!ep) return {streams: []}
        const epHtml = await loadPage(`/episode/${ep.epSlug}/`, env, httpClient)
        const postId = extractPostId(epHtml)
        if (!postId) return {streams: []}
        return {streams: await resolveStreams(postId, 'tv', env, httpClient)}
    }

    return {streams: []}
}
