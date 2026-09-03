import Aslmoviez from '../sources/aslmoviez.js'
import Cinamatic from '../sources/cinamatic.js'
import Digimovie from '../sources/digimovie.js'
import Avamovie from '../sources/avamovie.js'
import Animex from '../sources/animex.js'
import Donyayeserial from '../sources/donyayeserial.js'
import F2Media from '../sources/f2media.js'
import Peepboxtv from '../sources/peepboxtv.js'
import Serialblog from '../sources/serialblog.js'
import {
    isF2TurkishEnabled,
    f2turkishManifestCatalogs,
    f2turkishListCatalog,
    F2TURKISH_CATALOG_ID,
} from '../sources/f2turkish.js'
import {
    isAnimexCatalogEnabled,
    animexCatalogManifestCatalogs,
    animexCatalogList,
    ANIMEX_CATALOG_ID,
} from '../sources/animex-catalog.js'
import {ID_SEPARATOR, METADATA_SOURCE} from '../sources/source.js'
import {findExternalMetaSource, findExternalStreamSource, formatStreamTitle, getExternalCatalogSources, getKitsuTitle, getTMDBMetaFa, getTMDBMetaByTmdbId, getTMDBDetails, getTMDBTitle, getLandingTmdbCatalogs, getTorrentStreams, modifyUrls, proxyExternalCatalog, proxyExternalMeta, proxyExternalStream, proxySubtitles, translateCatalogName, buildOrderedExternalCatalogs, classifyExternalCatalogSource, rewriteTmdbImageUrls, parseTmdbImageProxyPath, enrichMetaWithFaTmdb, enrichCatalogMetasWithoutRpdb, setMetaLangPref, setUiLangPref} from '../utils.js'
import {landingUrlsFromRequest, renderLandingPage, renderConfigurePage, renderGuidePage} from '../landing.js'
import {createFetchHttpClient} from './http-client.js'
import {createWorkerProxyConfig, handleProxyRequest} from './proxy.js'
import {decodeAddonConfig, mergeEnv} from './config.js'

const ADDON_PREFIX = 'ip'
const ADDON_VERSION = '3.2.7'

const CATALOGS = [
    {key: 'f2media', name: 'F2Media', catalogType: 'movies'},
    {key: 'peepboxtv', name: 'PeepBoxTv', catalogType: 'movies'},
    {key: 'cinamatic', name: 'Cinamatic', catalogType: 'movies'},
    {key: 'aslmoviez', name: 'AslMoviez', catalogType: 'movies'},
    {key: 'serialblog', name: 'SerialBlog', catalogType: 'movies'},
    {key: 'digimovie', name: 'DigiMovie', catalogType: 'movies'},
    {key: 'avamovie', name: 'AvaMovie', catalogType: 'movies'},
    {key: 'donyayeserial', name: 'DonyayeSerial', catalogType: 'movies'},
    {key: 'animex', name: 'Animex', catalogType: 'movies'},
]
const CORS_HEADERS = {
    'access-control-allow-headers': 'Content-Type',
    'access-control-allow-methods': 'GET, HEAD, OPTIONS',
    'access-control-allow-origin': '*',
}

export function createWorkerLogger(env = {}) {
    const levels = ['error', 'warn', 'info', 'debug']
    const configuredLevel = levels.includes(env.LOG_LEVEL) ? env.LOG_LEVEL : 'info'
    const threshold = levels.indexOf(configuredLevel)
    return Object.fromEntries(levels.map((level, index) => [
        level,
        (message, details) => {
            if (index <= threshold) console[level](message, details ?? '')
        },
    ]))
}

export function createWorkerManifest(env = {}) {
    const developmentSuffix = env.DEV_MODE === 'true' ? ' - DEV' : ''
    return {
        id: 'com.cinemagraphy.stremio',
        version: ADDON_VERSION,
        contactEmail: 'thenerdcow@gmail.com',
        description: 'سینماگرافی — دانلود و تماشای فیلم و سریال از منابع ایرانی و بین‌المللی.',
        logo: 'https://raw.githubusercontent.com/TheNerdCow/CinemaGraphy/refs/heads/master/logo.png',
        name: `سینماگرافی${developmentSuffix}`,
        catalogs: CATALOGS.flatMap((cfg) => {
            const types = cfg.catalogType === 'tv' ? ['tv'] : ['movie', 'series']
            return types.map((type) => ({
                name: `${cfg.name}${developmentSuffix}`,
                type,
                id: `${cfg.key}_${cfg.catalogType === 'tv' ? 'tv' : (type === 'movie' ? 'movies' : 'series')}`,
                extra: [{name: 'search', isRequired: true}],
            }))
        }),
        resources: [
            'catalog',
            {name: 'meta', types: ['series', 'movie', 'tv'], idPrefixes: [ADDON_PREFIX, 'tt', 'tmdb:', 'kitsu:']},
            {name: 'stream', types: ['series', 'movie', 'tv'], idPrefixes: [ADDON_PREFIX, 'tt', 'kitsu:', 'tmdb:']},
            {name: 'subtitles', types: ['series', 'movie'], idPrefixes: [ADDON_PREFIX, 'tt', 'kitsu:', 'tmdb:']},
        ],
        types: ['movie', 'series', 'tv'],
        behaviorHints: {
            p2p: Boolean(env.TORRENT_METEOR_MANIFEST_URL),
            configurable: true,
            configurationRequired: false,
        },
        stremioAddonsConfig: {
            issuer: 'https://stremio-addons.net',
            signature: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..qYqYdUtntg-bF3wGDjsiww.IBIrE7RSO9aaALvNQROynW-pBh-OQLl3t-nFXqhEAO4AYl2qHvSGJWNP6WTwzU1yD8DjmYbnjDVdgkIDYw75MtInyH_cG0uEYr2VXEIGbHNZVlWlPH-C5go_8UyAMxCc.bM45Z1wp81dep2eCW5dt8A',
        },
    }
}

export function createWorkerProviders({env = {}, logger = console, httpClient} = {}) {
    return [
        new F2Media(env.F2MEDIA_BASEURL, logger, httpClient, env),
        new Peepboxtv(env.PEEPBOXTV_BASEURL, logger, httpClient, env),
        new Cinamatic(env.CINAMATIC_BASEURL, logger, httpClient, env),
        new Aslmoviez(env.ASLMOVIEZ_BASEURL, logger, httpClient, env),
        new Serialblog(env.SERIALBLOG_BASEURL, logger, httpClient, env),
        new Digimovie(env.DIGIMOVIE_BASEURL, logger, httpClient, env),
        new Avamovie(env.AVAMOVIE_BASEURL, logger, httpClient, env),
        new Donyayeserial(env.DONYAYESERIAL_BASEURL, logger, httpClient),
        new Animex(env.ANIMEX_BASEURL, logger, httpClient),
    ]
}

export function parseWorkerAddonId(id, providers) {
    const parts = String(id ?? '').split(ID_SEPARATOR)
    const provider = providers.find((item) => parts[0] === `${ADDON_PREFIX}${item.key}`)
    if (!provider || !parts[1]) return null
    return {provider, providerItemId: parts[1], videoId: parts.slice(2).join(ID_SEPARATOR) || null}
}

function publicOrigin(request, env) {
    const fromEnv = String(env.PUBLIC_BASE_URL || env.PROXY_URL || '').replace(/\/$/, '')
    if (fromEnv) return fromEnv
    try { return new URL(request.url).origin } catch { return '' }
}

async function handleTmdbImageProxy(request, size, filePath, fetcher = fetch) {
    const parsed = parseTmdbImageProxyPath(size, filePath)
    if (!parsed) return new Response('invalid tmdb image path', {status: 400, headers: {'content-type': 'text/plain'}})
    try {
        const upstream = await fetcher(parsed.upstream, {headers: {Accept: 'image/*,*/*'}, redirect: 'follow'})
        if (!upstream.ok) return new Response('not found', {status: upstream.status === 404 ? 404 : 502, headers: {'content-type': 'text/plain'}})
        const ct = upstream.headers.get('content-type') || 'image/jpeg'
        if (!ct.startsWith('image/') && !ct.includes('octet-stream')) return new Response('upstream not image', {status: 502, headers: {'content-type': 'text/plain'}})
        const buf = await upstream.arrayBuffer()
        if (buf.byteLength > 8 * 1024 * 1024) return new Response('image too large', {status: 502, headers: {'content-type': 'text/plain'}})
        return new Response(buf, {status: 200, headers: {'content-type': ct, 'cache-control': 'public, max-age=86400, s-maxage=604800', 'access-control-allow-origin': '*'}})
    } catch {
        return new Response('proxy failed', {status: 502, headers: {'content-type': 'text/plain'}})
    }
}

function json(value, status = 200) {
    return new Response(JSON.stringify(value), {status, headers: {'content-type': 'application/json; charset=utf-8'}})
}

function withCors(response, headOnly = false) {
    const headers = new Headers(response.headers)
    for (const [name, value] of Object.entries(CORS_HEADERS)) headers.set(name, value)
    return new Response(headOnly ? null : response.body, {status: response.status, statusText: response.statusText, headers})
}

function decoded(value) {
    try { return decodeURIComponent(value) } catch { return null }
}

function findCatalogProvider(catalogId, providers) {
    return providers.find((provider) => {
        const cfg = CATALOGS.find((c) => c.key === provider.key)
        if (cfg?.catalogType === 'tv') return catalogId === `${provider.key}_tv`
        return catalogId === `${provider.key}_movies` || catalogId === `${provider.key}_series`
    })
}

function proxyPrefix(env, requestUrl) {
    const baseUrl = String(env.PROXY_URL || new URL(requestUrl).origin).replace(/\/$/, '')
    return `${baseUrl}/${createWorkerProxyConfig(env).path}?url=`
}

const QUALITY_RANKS = {'2160': 7, '4k': 7, '1440': 6, '1080': 5, '720': 4, '576': 3, '480': 2, '360': 1, '240': 0}
function rankFromTitle(title) {
    const t = String(title ?? '').toLowerCase()
    for (const [key, rank] of Object.entries(QUALITY_RANKS)) if (t.includes(key)) return rank
    return -1
}
function sortByQuality(streams) {
    if (!Array.isArray(streams)) return streams
    return streams.map((s) => ({...s, title: (s.title ?? '').replace(/انکودر\s*:/gi, '').replace(/encoder\s*:/gi, '').trim()})).sort((a, b) => rankFromTitle(b.title) - rankFromTitle(a.title))
}
function logResourceError(logger, resource, error) {
    logger.error(`${resource} request failed`, {message: error?.message ?? String(error)})
}

async function getCinemeta(type, imdbId, httpClient) {
    if (!imdbId) return null
    try {
        const response = await httpClient.get(`https://v3-cinemeta.strem.io/meta/${type}/${encodeURIComponent(imdbId)}.json`, {timeout: 15_000})
        return response.data ?? null
    } catch { return null }
}

async function getSubtitle(type, imdbId, httpClient) {
    if (!imdbId) return {subtitles: []}
    try {
        const response = await httpClient.get(`https://opensubtitles-v3.strem.io/subtitles/${type}/${encodeURIComponent(imdbId)}.json`, {timeout: 15_000})
        return response.data ?? {subtitles: []}
    } catch { return {subtitles: []} }
}

async function catalogResponse(route, providers, logger, env = {}, httpClient) {
    try {
        if (route.id === ANIMEX_CATALOG_ID && isAnimexCatalogEnabled(env)) {
            const extra = Object.fromEntries(new URLSearchParams(route.extraArgs || ''))
            return json(await animexCatalogList(route.id, extra.search || '', env, httpClient) || {metas: []})
        }
        if (route.id === F2TURKISH_CATALOG_ID && isF2TurkishEnabled(env)) {
            const extra = Object.fromEntries(new URLSearchParams(route.extraArgs || ''))
            return json(await f2turkishListCatalog(route.id, extra.search || '', env, httpClient) || {metas: []})
        }
        const externalSources = await getExternalCatalogSources(env, httpClient, logger)
        const externalSource = externalSources.find((source) => source.catalogIds.has(route.id))
        if (externalSource) {
            let data = await proxyExternalCatalog(externalSource, route.type, route.id, route.extraArgs, httpClient, logger)
            if (env.TMDB_API_KEY && Array.isArray(data?.metas) && data.metas.length) {
                try {
                    const enrichPromise = enrichCatalogMetasWithoutRpdb(
                        data.metas, route.type, httpClient, env.TMDB_API_KEY, logger, {concurrency: 2},
                    )
                    const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 6500))
                    const enriched = await Promise.race([enrichPromise, timeoutPromise])
                    if (Array.isArray(enriched) && enriched.length) {
                        data = {...data, metas: enriched}
                    }
                } catch (error) {
                    logger.warn?.('Catalog FA enrich skipped', {message: error?.message})
                }
            }
            return json(data || {metas: []})
        }
        const provider = findCatalogProvider(route.id, providers)
        if (!provider) return json({metas: []})
        const search = new URLSearchParams(route.extraArgs ?? '').get('search')?.trim()
        if (!search || !['movie', 'series'].includes(route.type)) return json({metas: []})
        const results = await provider.search(search)
        const metas = (Array.isArray(results) ? results : []).filter((item) => item?.id != null && item.type === route.type).map((item) => ({...item, id: `${ADDON_PREFIX}${provider.providerID}${item.id}`}))
        return json({metas})
    } catch (error) {
        logResourceError(logger, 'Catalog', error)
        return json({metas: []})
    }
}

function rewriteEpisodeIdsToImdb(meta, imdbId) {
    if (!meta || !imdbId || !/^tt\d+$/.test(String(imdbId))) return meta
    const videos = Array.isArray(meta.videos) ? meta.videos : null
    if (!videos || !videos.length) return meta
    meta.videos = videos.map((v) => {
        const s = Number(v?.season)
        const e = Number(v?.episode)
        if (!Number.isInteger(s) || !Number.isInteger(e) || s < 0 || e < 1) return v
        return {...v, id: `${imdbId}:${s}:${e}`}
    })
    if (!meta.imdb_id) meta.imdb_id = imdbId
    return meta
}

async function metaResponse(route, providers, services, env, requestUrl, logger, httpClient) {
    try {
        setMetaLangPref(String(env.META_LANG || env.ADDON_LANG || 'fa'))
        setUiLangPref(String(env.ADDON_LANG || 'fa'))

        if (route.id.startsWith('tt') && env.TMDB_API_KEY) {
            const tmdbMeta = await getTMDBMetaFa(route.type, route.id, httpClient, env.TMDB_API_KEY, logger)
            if (tmdbMeta) {
                if (route.type === 'series') {
                    try {
                        const cin = await services.getCinemeta(route.type, route.id)
                        if (Array.isArray(cin?.meta?.videos) && cin.meta.videos.length) {
                            tmdbMeta.videos = cin.meta.videos
                            let enriched = await enrichMetaWithFaTmdb(tmdbMeta, route.type, httpClient, env.TMDB_API_KEY, logger, route.id) || tmdbMeta
                            enriched = rewriteEpisodeIdsToImdb(enriched, route.id)
                            return json({meta: enriched})
                        }
                    } catch {}
                }
                return json({meta: tmdbMeta})
            }
            try {
                const cin = await services.getCinemeta(route.type, route.id)
                if (cin?.meta) {
                    let enriched = await enrichMetaWithFaTmdb(cin.meta, route.type, httpClient, env.TMDB_API_KEY, logger, route.id) || cin.meta
                    enriched = rewriteEpisodeIdsToImdb(enriched, route.id)
                    return json({meta: enriched})
                }
            } catch {}
            return json({})
        }

        if (route.id.startsWith('tmdb:') && env.TMDB_API_KEY) {
            const meta = await getTMDBMetaByTmdbId(route.type === 'tv' ? 'series' : route.type, String(route.id).split(':')[1], httpClient, env.TMDB_API_KEY, logger, services.getCinemeta)
            return json(meta ? {meta} : {})
        }

        const externalSources = await getExternalCatalogSources(env, httpClient, logger)
        const metaSource = findExternalMetaSource(externalSources, route.id)
        if (metaSource) {
            const data = await proxyExternalMeta(metaSource, route.type, route.id, httpClient, logger)
            if (data?.meta && env.TMDB_API_KEY) {
                try { data.meta = await enrichMetaWithFaTmdb(data.meta, route.type, httpClient, env.TMDB_API_KEY, logger, route.id) } catch {}
            }
            return json(data)
        }

        const parsedId = parseWorkerAddonId(route.id, providers)
        if (!parsedId || !['movie', 'series', 'tv'].includes(route.type)) return json({})
        let movieData = await parsedId.provider.getMovieData(route.type, parsedId.providerItemId)
        // Animex: never hard-fail meta — open detail even if scrape is partial
        if (!movieData && parsedId.provider?.key === 'animex') {
            try {
                const {decodePagePath} = await import('../sources/html-source.js')
                const path = decodePagePath(parsedId.providerItemId)
                const slug = String(path || '').split('/').filter(Boolean).pop() || ''
                movieData = {
                    path: path || `/anime/${slug}/`,
                    title: slug.replace(/-/g, ' '),
                    imdbId: null,
                    isSeries: true,
                    pageSeason: null,
                    links: [],
                }
            } catch {}
        }
        if (!movieData) return json({})

        let upstreamMeta = parsedId.provider.metadataSource === METADATA_SOURCE.PROVIDER
            ? {meta: await parsedId.provider.getMeta(route.type, parsedId.providerItemId, movieData)}
            : await services.getCinemeta(route.type, await parsedId.provider.imdbID(movieData, route.type))

        // No IMDb/Cinemeta (typical for Animex anime) → build meta + episode list from links
        if (!upstreamMeta?.meta && movieData) {
            const title = String(movieData.title || '').trim() || 'Anime'
            const links = Array.isArray(movieData.links) ? movieData.links : []
            const videos = []
            const seenEp = new Set()
            for (const link of links) {
                const s = Number(link.season) || 1
                const e = Number(link.episode) || 0
                if (!e) continue
                const key = `${s}:${e}`
                if (seenEp.has(key)) continue
                seenEp.add(key)
                videos.push({
                    id: `${s}:${e}`,
                    title: `S${s}E${String(e).padStart(2, '0')}`,
                    season: s,
                    episode: e,
                    released: '2000-01-01',
                })
            }
            videos.sort((a, b) => a.season - b.season || a.episode - b.episode)
            // Kitsu synopsis for anime when possible
            let description = ''
            let poster = null
            let background = null
            try {
                const q = title.replace(/[\u0600-\u06FF]/g, ' ').trim() || title
                const kitsuUrl = 'https://kitsu.io/api/edge/anime?filter[text]=' + encodeURIComponent(q) + '&page[limit]=1'
                const kres = await httpClient.get(kitsuUrl, {
                    timeout: 8000,
                    headers: {Accept: 'application/vnd.api+json'},
                    validateStatus: (s) => s < 500,
                })
                const a = kres?.data?.data?.[0]?.attributes
                if (a) {
                    description = String(a.synopsis || '').trim().slice(0, 1200)
                    poster = a.posterImage?.large || a.posterImage?.medium || null
                    background = a.coverImage?.large || null
                    if (a.canonicalTitle || a.titles?.en_jp) {
                        // prefer Kitsu title if page title is weak
                        const kt = a.titles?.en_jp || a.canonicalTitle
                        if (kt && (title.length < 4 || /^[a-z0-9 -]+$/i.test(title))) {
                            movieData.title = kt
                        }
                    }
                }
            } catch {}
            upstreamMeta = {
                meta: {
                    id: route.id,
                    type: route.type === 'tv' ? 'series' : route.type,
                    name: String(movieData.title || title).trim(),
                    poster,
                    background,
                    description,
                    videos: route.type === 'series' || route.type === 'tv' ? videos : undefined,
                },
            }
        }
        if (!upstreamMeta?.meta) return json({})
        let result = structuredClone(upstreamMeta)
        if (env.PROXY_ENABLE === 'true' || env.PROXY_ENABLE === '1') result = modifyUrls(result, proxyPrefix(env, requestUrl))

        if (env.TMDB_API_KEY) {
            try {
                const imdb = result.meta?.imdb_id || result.meta?.imdbId || (await parsedId.provider.imdbID?.(movieData, route.type))
                if (imdb) result.meta = await enrichMetaWithFaTmdb(result.meta, route.type, httpClient, env.TMDB_API_KEY, logger, imdb)
            } catch {}
        }

        if (route.type === 'series') {
            const videos = Array.isArray(result.meta.videos) ? result.meta.videos : []
            result.meta.videos = videos.filter((v) => v?.id).map((v) => ({...v, id: `${ADDON_PREFIX}${parsedId.provider.providerID}${parsedId.providerItemId}${ID_SEPARATOR}${v.id}`}))
            result.meta.id = route.id
        } else {
            result.meta.id = `${ADDON_PREFIX}${parsedId.provider.providerID}${parsedId.providerItemId}${ID_SEPARATOR}${result.meta.id}`
            result.meta.behaviorHints = {...(result.meta.behaviorHints ?? {}), defaultVideoId: result.meta.id}
        }
        return json(result)
    } catch (error) {
        logResourceError(logger, 'Meta', error)
        return json({})
    }
}

function parseImdbId(value) {
    const parts = String(value ?? '').split(':')
    if (!/^tt\d+$/.test(parts[0])) return null
    return {imdbId: parts[0], season: parts[1] ? Number(parts[1]) : null, episode: parts[2] ? Number(parts[2]) : null}
}

async function getCinemetaName(type, imdbId, services) {
    const cinemeta = await services.getCinemeta(type, imdbId)
    return cinemeta?.meta?.name ?? null
}

function extractYearHint(value) {
    const m = String(value ?? '').match(/\b((?:19|20)\d{2})\b/)
    return m ? Number(m[1]) : null
}

function extractSequelHint(value) {
    const noYear = String(value ?? '').replace(/\b(?:19|20)\d{2}\b/g, ' ')
    const nums = [...noYear.matchAll(/\b(\d{1,2})\b/g)]
        .map((x) => Number(x[1]))
        .filter((n) => n >= 1 && n <= 20)
    return nums.length ? nums[nums.length - 1] : null
}

function stripPersian(s) {
    return String(s || '').replace(/[\u0600-\u06FF]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()
}

function scoreWorkerCandidate(result, cleanTitle, opts = {}) {
    const rawName = String(result?.name ?? '')
    const n = stripPersian(rawName).replace(/[^\w\s]/g, ' ').replace(/\b(19|20)\d{2}\b/g, ' ').replace(/\s+/g, ' ').trim()
    if (!n || !cleanTitle) return -100
    let score = 0
    if (n === cleanTitle) score += 100
    else if (n.includes(cleanTitle) || cleanTitle.includes(n)) score += 40
    else {
        const ta = cleanTitle.split(' ').filter((x) => x.length > 2)
        const tb = n.split(' ').filter((x) => x.length > 2)
        const setB = new Set(tb)
        const hits = ta.filter((x) => setB.has(x)).length
        if (!hits) return -50
        score += hits * 12
    }
    score -= Math.min(30, Math.abs(n.length - cleanTitle.length))
    const wantSeq = extractSequelHint(cleanTitle)
    const gotSeq = extractSequelHint(n)
    if (wantSeq != null && gotSeq != null) score += wantSeq === gotSeq ? 50 : -60
    else if (wantSeq != null && gotSeq == null) score -= 25
    else if (wantSeq == null && gotSeq != null) score -= 20
    const wantYear = opts.year != null ? Number(opts.year) : extractYearHint(cleanTitle)
    const gotYear = extractYearHint(rawName)
    if (wantYear && gotYear) score += wantYear === gotYear ? 35 : -45
    const wantImdb = opts.imdbId && /^tt\d+$/.test(String(opts.imdbId)) ? String(opts.imdbId) : null
    const gotImdb = result.imdbId || result.imdb_id || null
    if (wantImdb && gotImdb && /^tt\d+$/.test(String(gotImdb))) {
        score += String(gotImdb) === wantImdb ? 80 : -80
    }
    return score
}

function pickBestWorkerMatch(typed, cleanTitle, tokens, opts = {}) {
    if (!typed.length) return null
    const scored = typed.map((r) => ({r, s: scoreWorkerCandidate(r, cleanTitle, opts)}))
        .sort((a, b) => b.s - a.s)
    const best = scored[0]
    if (best && best.s >= 25) return best.r
    if (typed.length === 1 && best && best.s >= 0) return best.r
    if (best && best.s >= 10 && best.s >= (scored[1]?.s ?? -999) + 15) return best.r
    const wantSeq = extractSequelHint(cleanTitle)
    const soft = typed.find((r) => {
        const rawN = String(r.name || '').toLowerCase()
        if (!(tokens || []).some((tok) => rawN.includes(tok))) return false
        if (wantSeq != null) {
            const got = extractSequelHint(stripPersian(r.name))
            if (got != null && got !== wantSeq) return false
        }
        return true
    })
    return soft || null
}



// Match Vercel: short in-memory stream cache (same isolate / warm Worker)
const STREAM_CACHE_TTL_MS = 90_000
const streamTitleCache = new Map()
function streamCacheKey(title, type, season, episode) {
    return `${type}|${season ?? ''}|${episode ?? ''}|${String(title || '').toLowerCase().trim()}`
}

function withProviderTimeout(promise, ms, key) {
    return new Promise((resolve) => {
        let done = false
        const t = setTimeout(() => {
            if (!done) { done = true; resolve({key, streams: []}) }
        }, ms)
        promise.then((v) => {
            if (!done) { done = true; clearTimeout(t); resolve(v) }
        }).catch(() => {
            if (!done) { done = true; clearTimeout(t); resolve({key, streams: []}) }
        })
    })
}

async function streamsByTitle(title, type, season, episode, providers, env = {}, matchOpts = {}) {
    const cleanTitle = stripPersian(title)
    const cacheKey = streamCacheKey(cleanTitle, type, season, episode)
    const cached = streamTitleCache.get(cacheKey)
    if (cached && Date.now() - cached.at < STREAM_CACHE_TTL_MS) {
        return cached.streams
    }
    // Align with Vercel: series pages (F2Media etc.) need longer than movies
    const budget = Number(env.PROVIDER_TIMEOUT_MS) || (type === 'series' ? 20_000 : 12_000)
    const queries = []
    const raw = String(title || '').trim()
    if (raw) queries.push(raw)
    if (cleanTitle && cleanTitle !== raw.toLowerCase()) queries.push(cleanTitle)
    const tokens = cleanTitle.split(' ').filter((t) => t.length > 2)
    if (tokens.length >= 2) queries.push(tokens.slice(0, 3).join(' '))

    const settled = await Promise.allSettled(providers.map((provider) => {
        const work = (async () => {
            let match = null
            for (const q of queries) {
                let results = []
                try { results = await provider.search(q) } catch { results = [] }
                if (!Array.isArray(results) || !results.length) continue
                const typed = results.filter((r) => r && r.type === type && r.id != null)
                if (!typed.length) continue
                match = pickBestWorkerMatch(typed, cleanTitle, tokens, matchOpts)
                if (match) break
            }
            if (!match) return {key: provider.key, streams: []}
            const movieData = await provider.getMovieData(match.type || type, match.id)
            if (!movieData) return {key: provider.key, streams: []}
            const videoId = season && episode ? `${match.id}:${season}:${episode}` : null
            const links = provider.getLinks(match.type || type, videoId, movieData)
            return {
                key: provider.key,
                streams: (Array.isArray(links) ? links : []).map((link) => ({
                    url: link.url,
                    title: formatStreamTitle({
                        providerKey: provider.key,
                        quality: link.quality,
                        size: link.size,
                        audioType: link.audioType,
                        extraText: link.title,
                        url: link.url,
                    }),
                })).filter((s) => s.url || s.externalUrl),
            }
        })()
        return withProviderTimeout(work, budget, provider.key)
    }))
    const streams = sortByQuality(
        settled.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value?.streams || []),
    )
    streamTitleCache.set(cacheKey, {at: Date.now(), streams})
    if (streamTitleCache.size > 250) {
        const oldest = streamTitleCache.keys().next().value
        streamTitleCache.delete(oldest)
    }
    return streams
}

async function imdbStreamResponse(type, id, providers, services, env, httpClient, logger) {
    const torrentPromise = getTorrentStreams(type, id, env, httpClient, logger).catch(() => [])
    const parsed = parseImdbId(id)
    if (!parsed) return json({streams: await torrentPromise})
    let title = await getCinemetaName(type, parsed.imdbId, services)
    if (!title && env.TMDB_API_KEY) {
        try {
            title = await getTMDBTitle(type, parsed.imdbId, httpClient, env.TMDB_API_KEY, logger)
        } catch { /* ignore */ }
    }
    const streams = title ? await streamsByTitle(title, type, parsed.season, parsed.episode, providers, env, {imdbId: parsed.imdbId, year: extractYearHint(title)}) : []
    let torrent = []
    try { torrent = await torrentPromise } catch { torrent = [] }
    return json({streams: [...streams, ...torrent]})
}

function parseKitsuId(value) {
    const match = String(value ?? '').match(/^kitsu:(\d+)(?::(\d+))?$/)
    if (!match) return null
    return {kitsuId: `kitsu:${match[1]}`, episode: match[2] ? Number(match[2]) : null}
}

async function kitsuStreamResponse(type, id, providers, env, httpClient, logger) {
    const torrentPromise = getTorrentStreams(type, id, env, httpClient, logger).catch(() => [])
    const parsed = parseKitsuId(id)
    if (!parsed) return json({streams: await torrentPromise})
    const title = await getKitsuTitle(parsed.kitsuId, httpClient, logger)
    const streams = title ? await streamsByTitle(title, 'series', parsed.episode ? 1 : null, parsed.episode, providers, env) : []
    return json({streams: [...streams, ...await torrentPromise]})
}

function parseTmdbId(value) {
    const match = String(value ?? '').match(/^tmdb:(\d+)(?::(\d+):(\d+))?$/)
    if (!match) return null
    return {tmdbId: match[1], season: match[2] ? Number(match[2]) : null, episode: match[3] ? Number(match[3]) : null}
}

async function tmdbStreamResponse(type, id, providers, httpClient, apiKey, env, logger) {
    const parsed = parseTmdbId(id)
    if (!parsed) return json({streams: await getTorrentStreams(type, id, env, httpClient, logger).catch(() => [])})
    const details = await getTMDBDetails(type, parsed.tmdbId, httpClient, apiKey, logger)
    const title = details?.title ?? null
    const imdbId = details?.imdbId ?? null
    const torrentId = imdbId ? (parsed.season != null && parsed.episode != null ? `${imdbId}:${parsed.season}:${parsed.episode}` : imdbId) : id
    const torrentPromise = getTorrentStreams(type, torrentId, env, httpClient, logger).catch(() => [])
    const streams = title ? await streamsByTitle(title, type, parsed.season, parsed.episode, providers, env) : []
    return json({streams: [...streams, ...await torrentPromise]})
}

async function streamResponse(route, providers, services, logger, httpClient, env, request = null) {
    try {
        if (!['movie', 'series', 'tv'].includes(route.type)) return json({streams: []})
        // Edge Cache API — second request for same episode is near-instant (like warm Vercel)
        try {
            if (request && typeof caches !== 'undefined' && caches.default) {
                const ck = new Request(new URL(request.url).origin + `/__stream_cache/${route.type}/${encodeURIComponent(route.id)}`)
                const hit = await caches.default.match(ck)
                if (hit) return hit
            }
        } catch (_) { /* ignore cache read errors */ }
        const parsedId = parseWorkerAddonId(route.id, providers)
        if (parsedId) {
            const movieData = await parsedId.provider.getMovieData(route.type, parsedId.providerItemId)
            let streams = movieData ? parsedId.provider.getLinks(route.type, parsedId.videoId, movieData) : []
            if (Array.isArray(streams)) {
                streams = streams.map((link) => ({...link, title: formatStreamTitle({providerKey: parsedId.provider.key, quality: link.quality, size: link.size, audioType: link.audioType, extraText: link.title, url: link.url})}))
            }
            return json({streams: sortByQuality(Array.isArray(streams) ? streams : [])})
        }
        if (route.id.startsWith('tmdb:')) return await tmdbStreamResponse(route.type, route.id, providers, httpClient, env.TMDB_API_KEY, env, logger)
        if (route.id.startsWith('kitsu:')) return await kitsuStreamResponse(route.type, route.id, providers, env, httpClient, logger)
        if (/^tt/.test(route.id)) return await imdbStreamResponse(route.type, route.id, providers, services, env, httpClient, logger)
        const externalSources = await getExternalCatalogSources(env, httpClient, logger)
        const streamSource = findExternalStreamSource(externalSources, route.id)
        if (streamSource) return json(await proxyExternalStream(streamSource, route.type, route.id, route.extraArgs, httpClient, logger))
        return json({streams: []})
    } catch (error) {
        logResourceError(logger, 'Stream', error)
        return json({streams: []})
    }
}

async function subtitleResponse(route, providers, services, env, httpClient, logger) {
    try {
        if (!['movie', 'series'].includes(route.type)) return json({subtitles: []})
        if (!route.id.startsWith(ADDON_PREFIX) && env.SUBSOURCE_MANIFEST_URL) {
            const result = await proxySubtitles(env.SUBSOURCE_MANIFEST_URL, route.type, route.id, route.extraArgs, httpClient, logger)
            if (result) return json(result)
        }
        const parsedId = parseWorkerAddonId(route.id, providers)
        if (!parsedId || !parsedId.videoId) return json({subtitles: []})
        const result = await services.getSubtitle(route.type, parsedId.videoId)
        return json(result?.subtitles ? result : {subtitles: []})
    } catch (error) {
        logResourceError(logger, 'Subtitle', error)
        return json({subtitles: []})
    }
}

function matchRoute(pathname) {
    const resource = pathname.match(/^\/(meta|stream)\/([^/]+)\/([^/]+)\.json$/)
    if (resource) return {resource: resource[1], type: decoded(resource[2]), id: decoded(resource[3])}
    const variable = pathname.match(/^\/(catalog|subtitles)\/([^/]+)\/([^/]+)(?:\/(.*))?\.json$/)
    if (variable) return {resource: variable[1], type: decoded(variable[2]), id: decoded(variable[3]), extraArgs: decoded(variable[4] ?? '')}
    return null
}

export function createWorkerHandler(options = {}) {
    return async function workerFetch(request, env = {}) {
        const logger = options.logger ?? createWorkerLogger(env)
        try {
            let url = new URL(request.url)
            const cfgMatch = url.pathname.match(/^\/c\/([^/]+)(\/.*)?$/)
            if (cfgMatch) {
                const addonConfig = decodeAddonConfig(cfgMatch[1])
                const rest = (cfgMatch[2] && cfgMatch[2].length) ? cfgMatch[2] : '/'
                url = new URL(rest + url.search, url.origin)
                if (addonConfig) env = mergeEnv(env, addonConfig)
            }
            setMetaLangPref(String(env.META_LANG || env.ADDON_LANG || 'fa'))
            setUiLangPref(String(env.ADDON_LANG || 'fa'))
            if (request.method === 'OPTIONS') return withCors(new Response(null, {status: 204}))
            if (!['GET', 'HEAD'].includes(request.method)) return withCors(new Response('Method Not Allowed', {status: 405}))

            const headOnly = request.method === 'HEAD'
            let response
            if (url.pathname === '/' || url.pathname === '') {
                const urls = landingUrlsFromRequest(request, env)
                response = new Response(renderLandingPage({...urls, version: ADDON_VERSION}), {status: 200, headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'}})
            } else if (url.pathname === '/configure' || url.pathname === '/configure/') {
                const urls = landingUrlsFromRequest(request, env)
                const origin = String(urls.manifestUrl || '').replace(/\/manifest\.json$/i, '')
                response = new Response(renderConfigurePage({logoUrl: urls.logoUrl, version: ADDON_VERSION, origin: origin || url.origin}), {status: 200, headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'}})
            } else if (url.pathname === '/guide' || url.pathname === '/guide/') {
                const urls = landingUrlsFromRequest(request, env)
                response = new Response(renderGuidePage({logoUrl: urls.logoUrl, version: ADDON_VERSION, manifestUrl: urls.manifestUrl}), {status: 200, headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store'}})
            } else if (url.pathname === '/logo.png') {
                response = Response.redirect('https://raw.githubusercontent.com/TheNerdCow/CinemaGraphy/refs/heads/master/logo.png', 302)
            } else if (url.pathname === '/manifest.json') {
                const httpClient = options.httpClient ?? createFetchHttpClient(options.fetcher ?? fetch)
                const manifest = createWorkerManifest(env)
                try {
                    const externalSources = await getExternalCatalogSources(env, httpClient, logger)
                    for (const source of externalSources) {
                        if (source.hasMeta) {
                            const metaResource = manifest.resources.find((r) => r?.name === 'meta')
                            for (const prefix of source.idPrefixes) if (metaResource && !metaResource.idPrefixes.includes(prefix)) metaResource.idPrefixes.push(prefix)
                        }
                        if (source.hasStream) {
                            const streamResource = manifest.resources.find((r) => r?.name === 'stream')
                            for (const prefix of source.idPrefixes) if (streamResource && !streamResource.idPrefixes.includes(prefix)) streamResource.idPrefixes.push(prefix)
                        }
                    }
                    const catalogLang = String(env.ADDON_LANG || 'fa').trim().toLowerCase().startsWith('en') ? 'en' : 'fa'
                    const orderedExternal = buildOrderedExternalCatalogs(externalSources, (catalog) => ({
                        ...catalog,
                        name: translateCatalogName(catalog.name, catalog.type, catalogLang),
                    }))
                    manifest.catalogs.push(...orderedExternal)
                } catch (error) {
                    logResourceError(logger, 'External catalogs unavailable', error)
                }
                try {
                    if (isF2TurkishEnabled(env)) {
                        const lang = String(env.ADDON_LANG || 'fa').toLowerCase().startsWith('en') ? 'en' : 'fa'
                        for (const c of f2turkishManifestCatalogs(env, lang)) {
                            if (!manifest.catalogs.some((x) => x.id === c.id)) {
                                let insertAt = manifest.catalogs.findIndex((x) => /anime|انیمه|myanimelist|kitsu/i.test(`${x?.name || ''} ${x?.id || ''}`))
                                if (insertAt < 0) insertAt = manifest.catalogs.length
                                manifest.catalogs.splice(insertAt, 0, c)
                            }
                        }
                    }
                    if (isAnimexCatalogEnabled(env)) {
                        const lang = String(env.ADDON_LANG || 'fa').toLowerCase().startsWith('en') ? 'en' : 'fa'
                        for (const c of animexCatalogManifestCatalogs(env, lang).map((x) => ({
                            ...x,
                            // FORCE_AX_NAME
                            name: lang === 'en' ? 'animex' : 'انیمکس',
                        }))) {
                            if (!manifest.catalogs.some((x) => x.id === c.id)) {
                                let insertAt = manifest.catalogs.findIndex((x) => x.id === F2TURKISH_CATALOG_ID)
                                if (insertAt >= 0) insertAt += 1
                                else {
                                    insertAt = manifest.catalogs.findIndex((x) => /anime|انیمه|myanimelist|kitsu/i.test(`${x?.name || ''} ${x?.id || ''}`))
                                    if (insertAt < 0) insertAt = manifest.catalogs.length
                                }
                                manifest.catalogs.splice(insertAt, 0, c)
                            }
                        }
                    }
                } catch (e) {
                    logger.warn?.('F2Turkish manifest attach failed', {message: e?.message})
                }
                response = json(manifest)
            } else if (url.pathname === '/tmdb/landing.json') {
                const httpClient = options.httpClient ?? createFetchHttpClient(options.fetcher ?? fetch)
                response = json(await getLandingTmdbCatalogs(httpClient, env.TMDB_API_KEY, logger))
            } else if (url.pathname === '/providers.json') {
                const REG = [
                    {key:'f2media',name:'F2Media',envKey:'F2MEDIA_BASEURL'},
                    {key:'peepboxtv',name:'PeepBoxTv',envKey:'PEEPBOXTV_BASEURL'},
                    {key:'cinamatic',name:'Cinamatic',envKey:'CINAMATIC_BASEURL'},
                    {key:'aslmoviez',name:'AslMoviez',envKey:'ASLMOVIEZ_BASEURL'},
                    {key:'serialblog',name:'SerialBlog',envKey:'SERIALBLOG_BASEURL'},
                    {key:'digimovie',name:'DigiMovie',envKey:'DIGIMOVIE_BASEURL'},{key:'avamovie',name:'AvaMovie',envKey:'AVAMOVIE_BASEURL'},
                    {key:'donyayeserial',name:'DonyayeSerial',envKey:'DONYAYESERIAL_BASEURL'},
                    {key:'animex',name:'Animex',envKey:'ANIMEX_BASEURL'},
                ]
                const httpClient = options.httpClient ?? createFetchHttpClient(options.fetcher ?? fetch)
                const providers = await Promise.all(REG.map(async (entry) => {
                    const baseUrl = String(env[entry.envKey] ?? '').trim()
                    if (!baseUrl) return {key:entry.key,name:entry.name,configured:false,online:false,latencyMs:null}
                    const t0 = Date.now()
                    try {
                        await httpClient.get(baseUrl, {timeout: 4000, validateStatus: (s) => s > 0 && s < 500})
                        return {key:entry.key,name:entry.name,configured:true,online:true,latencyMs:Date.now()-t0}
                    } catch {
                        return {key:entry.key,name:entry.name,configured:true,online:false,latencyMs:Date.now()-t0}
                    }
                }))
                const torrentUrl = String(env.TORRENT_METEOR_MANIFEST_URL ?? '').trim()
                if (torrentUrl) {
                    const t0 = Date.now()
                    try {
                        await httpClient.get(torrentUrl, {timeout: 4000, validateStatus: (s) => s > 0 && s < 500})
                        providers.push({key:'torrent',name:'Torrent (Meteor)',configured:true,online:true,latencyMs:Date.now()-t0})
                    } catch {
                        providers.push({key:'torrent',name:'Torrent (Meteor)',configured:true,online:false,latencyMs:Date.now()-t0})
                    }
                } else providers.push({key:'torrent',name:'Torrent (Meteor)',configured:false,online:false,latencyMs:null})
                response = json({version: ADDON_VERSION, checkedAt: new Date().toISOString(), cacheTtlMs: 300000, providers})
            } else if (url.pathname.startsWith('/api/tmdb-image/')) {
                const rest = url.pathname.slice('/api/tmdb-image/'.length)
                const slash = rest.indexOf('/')
                response = await handleTmdbImageProxy(request, slash >= 0 ? rest.slice(0, slash) : rest, slash >= 0 ? rest.slice(slash + 1) : '', options.fetcher ?? fetch)
            } else if (url.pathname === '/health') {
                response = new Response('ok', {headers: {'content-type': 'text/plain; charset=utf-8'}})
            } else if (url.pathname === `/${createWorkerProxyConfig(env).path}`) {
                response = await handleProxyRequest(request, env, options.fetcher ?? fetch, logger)
            } else {
                const route = matchRoute(url.pathname)
                if (!route || Object.values(route).some((value) => value === null)) {
                    response = new Response('Not Found', {status: 404})
                } else {
                    const httpClient = options.httpClient ?? createFetchHttpClient(options.fetcher ?? fetch)
                    const providers = options.providers ?? createWorkerProviders({env, logger, httpClient})
                    const services = options.services ?? {
                        getCinemeta: (type, id) => getCinemeta(type, id, httpClient),
                        getSubtitle: (type, id) => getSubtitle(type, id, httpClient),
                    }
                    if (route.resource === 'catalog') response = await catalogResponse(route, providers, logger, env, httpClient)
                    else if (route.resource === 'meta') response = await metaResponse(route, providers, services, env, request.url, logger, httpClient)
                    else if (route.resource === 'stream') {
                        response = await streamResponse(route, providers, services, logger, httpClient, env, request)
                        // Cache successful stream payloads at the edge (90s) — stabilizes CF cold paths
                        try {
                            if (response && response.status === 200 && typeof caches !== 'undefined' && caches.default) {
                                const bodyText = await response.clone().text()
                                let ok = false
                                try {
                                    const parsed = JSON.parse(bodyText)
                                    ok = Array.isArray(parsed?.streams) && parsed.streams.length > 0
                                } catch { ok = false }
                                if (ok) {
                                    const ck = new Request(new URL(request.url).origin + `/__stream_cache/${route.type}/${encodeURIComponent(route.id)}`)
                                    const headers = new Headers(response.headers)
                                    headers.set('content-type', 'application/json; charset=utf-8')
                                    headers.set('cache-control', 'public, max-age=90, s-maxage=90')
                                    headers.set('x-cg-cache', 'store')
                                    await caches.default.put(ck, new Response(bodyText, {status: 200, headers}))
                                    response = new Response(bodyText, {status: 200, headers})
                                }
                            }
                        } catch (_) { /* ignore cache write */ }
                    }
                    else response = await subtitleResponse(route, providers, services, env, httpClient, logger)
                }
            }
            try {
                const ct = response?.headers?.get?.('content-type') || ''
                if (ct.includes('application/json') && response.status === 200) {
                    const text = await response.clone().text()
                    let data
                    try { data = JSON.parse(text) } catch { data = null }
                    if (data && typeof data === 'object') {
                        const base = publicOrigin(request, env)
                        if (base) {
                            data = rewriteTmdbImageUrls(data, base)
                            const headers = new Headers(response.headers)
                            headers.set('content-type', 'application/json; charset=utf-8')
                            response = new Response(JSON.stringify(data), {status: response.status, headers})
                        }
                    }
                }
            } catch (e) {
                logger.warn?.('tmdb image rewrite skipped', {message: e?.message})
            }
            return withCors(response, headOnly)
        } catch (error) {
            logger.error('Unhandled Worker request error', {message: error?.message ?? String(error)})
            return withCors(json({error: 'Internal Server Error'}, 500))
        }
    }
}
