import axios from 'axios'
import {
    setUiLangPref,
    getUiLangPref,
    formatStreamTitle,
    formatStreamName,
    PROVIDER_LABELS,
    sortByQuality,
} from './lib/stream-format.js'

// Re-export stream formatting for existing importers (app.js, tests, worker)
export {
    setUiLangPref,
    getUiLangPref,
    formatStreamTitle,
    formatStreamName,
    PROVIDER_LABELS,
    sortByQuality,
}

export const REQUEST_TIMEOUT_MS = 15_000
export const EXTERNAL_CATALOG_TIMEOUT_MS = 30_000

export function logAxiosError(error, logger = console, context = 'HTTP request failed') {
    const details = axios.isAxiosError(error)
        ? {
            message: error.message,
            code: error.code,
            status: error.response?.status,
        }
        : {message: error?.message ?? String(error)}

    // Iran/local: TMDB often ECONNRESET/ETIMEDOUT — not a code bug; keep streams working, less log spam
    const netCodes = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED'])
    const code = details.code
    if (code && netCodes.has(String(code)) && /tmdb|TMDB|Persian metadata|title search/i.test(String(context))) {
        if (typeof logger.warn === 'function') logger.warn(context, details)
        else logger.error(context, details)
        return
    }
    logger.error(context, details)
}

// ---------------------------------------------------------------------------
// TMDB transport: server-side API client + image URL rewrite for clients in IR
// ---------------------------------------------------------------------------

const TMDB_API_BASE = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_HOST = 'image.tmdb.org'
const TMDB_IMAGE_SIZES = new Set([
    'w92', 'w154', 'w185', 'w300', 'w342', 'w500', 'w780', 'w1280',
    'h632', 'original',
])

/** In-memory API cache (language/region aware). */
const tmdbApiCache = new Map()
const TMDB_API_CACHE_TTL_MS = Number(process.env.TMDB_CACHE_TTL_MS || 6 * 60 * 60 * 1000) // 6h default
const TMDB_API_CACHE_MAX = 400

function tmdbCacheKey(path, params = {}) {
    const sorted = Object.keys(params || {})
        .filter((k) => k !== 'api_key' && params[k] != null && params[k] !== '')
        .sort()
        .map((k) => `${k}=${params[k]}`)
        .join('&')
    return `${path}?${sorted}`
}

function tmdbCacheGet(key) {
    const row = tmdbApiCache.get(key)
    if (!row) return null
    if (Date.now() - row.at > TMDB_API_CACHE_TTL_MS) {
        tmdbApiCache.delete(key)
        return null
    }
    return row.data
}

function tmdbCacheSet(key, data) {
    tmdbApiCache.set(key, {at: Date.now(), data})
    if (tmdbApiCache.size > TMDB_API_CACHE_MAX) {
        const first = tmdbApiCache.keys().next().value
        tmdbApiCache.delete(first)
    }
}

/**
 * Central TMDB API client (server-side only). Preserves language/region params.
 * Never exposes api_key in returned data.
 */
export async function tmdbRequest(path, params = {}, httpClient = axios, apiKey = process.env.TMDB_API_KEY, logger = console) {
    if (!apiKey) {
        throw new Error('TMDB_API_KEY missing')
    }
    const cleanPath = String(path || '').replace(/^\/+/, '')
    if (!cleanPath || cleanPath.includes('..')) {
        throw new Error('Invalid TMDB path')
    }
    const key = tmdbCacheKey(cleanPath, params)
    const cached = tmdbCacheGet(key)
    if (cached != null) return cached

    const response = await httpClient.get(`${TMDB_API_BASE}/${cleanPath}`, {
        params: {...params, api_key: apiKey},
        timeout: REQUEST_TIMEOUT_MS,
    })
    const data = response.data ?? null
    if (data != null) tmdbCacheSet(key, data)
    return data
}

/** Build absolute TMDB image URL (upstream). */
export function tmdbImageUpstream(size, filePath) {
    const s = TMDB_IMAGE_SIZES.has(String(size)) ? String(size) : 'w500'
    let p = String(filePath || '').replace(/^\/+/, '')
    if (!p) return null
    return `https://${TMDB_IMAGE_HOST}/t/p/${s}/${p}`
}

/**
 * Rewrite a single image.tmdb.org URL to same-origin proxy.
 * Non-TMDB URLs (RPDB, provider CDNs, …) are left untouched.
 */
export function proxyTmdbImageUrl(url, publicBase) {
    if (!url || typeof url !== 'string') return url
    if (!publicBase) return url
    const m = url.match(/^https?:\/\/image\.tmdb\.org\/t\/p\/([a-zA-Z0-9]+)\/(.+)$/i)
    if (!m) return url
    const size = m[1]
    const file = m[2].replace(/^\/+/, '')
    if (!/^[a-zA-Z0-9]+$/.test(size)) return url
    if (!file || file.includes('..') || /[^\w./-]/.test(file)) return url
    const base = String(publicBase).replace(/\/$/, '')
    return `${base}/api/tmdb-image/${size}/${file}`
}

/** Deep-rewrite image.tmdb.org strings inside meta / catalog JSON. */
export function rewriteTmdbImageUrls(value, publicBase, seen = new WeakSet()) {
    if (!publicBase) return value
    if (typeof value === 'string') {
        return proxyTmdbImageUrl(value, publicBase)
    }
    if (typeof value !== 'object' || value === null) return value
    if (seen.has(value)) return value
    seen.add(value)
    if (Array.isArray(value)) {
        return value.map((v) => rewriteTmdbImageUrls(v, publicBase, seen))
    }
    const out = {}
    for (const [k, child] of Object.entries(value)) {
        out[k] = rewriteTmdbImageUrls(child, publicBase, seen)
    }
    return out
}

/** Validate image proxy path segment (no open-proxy / SSRF). */
export function parseTmdbImageProxyPath(size, filePath) {
    const s = String(size || '')
    if (!/^[a-zA-Z0-9]+$/.test(s)) return null
    let file = String(filePath || '').replace(/^\/+/, '')
    if (!file || file.includes('..') || file.includes('\\') || /[^\w./-]/.test(file)) return null
    return {size: s, file, upstream: `https://${TMDB_IMAGE_HOST}/t/p/${s}/${file}`}
}


export async function getCinemeta(type, imdbId, httpClient = axios) {
    if (!imdbId) {
        return null
    }

    try {
        const response = await httpClient.get(
            `https://v3-cinemeta.strem.io/meta/${type}/${encodeURIComponent(imdbId)}.json`,
            {timeout: REQUEST_TIMEOUT_MS},
        )
        return response.data ?? null
    } catch (error) {
        logAxiosError(error, console, 'Unable to get Cinemeta metadata')
        return null
    }
}

export async function searchAndGetTMDB(
    title,
    type,
    httpClient = axios,
    logger = console,
    apiKey = process.env.TMDB_API_KEY,
) {
    if (!apiKey || !title) {
        logger.warn('TMDB_API_KEY is required to resolve IMDb IDs')
        return null
    }

    try {
        const searchData = await tmdbRequest('search/multi', {query: title}, httpClient, apiKey, logger)
        const expectedMediaType = type === 'series' ? 'tv' : type
        const results = Array.isArray(searchData?.results) ? searchData.results : []
        const item = results.find((result) => result.media_type === expectedMediaType)
        if (!item?.id || !['movie', 'tv'].includes(item.media_type)) {
            return null
        }

        return await tmdbRequest(
            `${item.media_type}/${item.id}`,
            {append_to_response: 'external_ids'},
            httpClient,
            apiKey,
            logger,
        )
    } catch (error) {
        logAxiosError(error, logger, 'Unable to resolve IMDb ID through TMDB')
        return null
    }
}

export async function getSubtitle(type, imdbId, httpClient = axios) {
    if (!imdbId) {
        return {subtitles: []}
    }

    try {
        const response = await httpClient.get(
            `https://opensubtitles-v3.strem.io/subtitles/${type}/${encodeURIComponent(imdbId)}.json`,
            {timeout: REQUEST_TIMEOUT_MS},
        )
        return response.data ?? {subtitles: []}
    } catch (error) {
        logAxiosError(error, console, 'Unable to get subtitles')
        return {subtitles: []}
    }
}

const TMDB_GENRE_CACHE_TTL_MS = 24 * 60 * 60 * 1_000 // 24h
const tmdbGenreCache = new Map() // `${type}` -> {timestamp, genres: Map(id -> name)}

async function getTMDBGenreMap(type, httpClient, apiKey, logger) {
    const cached = tmdbGenreCache.get(type)
    if (cached && Date.now() - cached.timestamp < TMDB_GENRE_CACHE_TTL_MS) {
        return cached.genres
    }
    try {
        const data = await tmdbRequest(
            `genre/${type === 'series' ? 'tv' : 'movie'}/list`,
            {language: 'fa-IR'},
            httpClient,
            apiKey,
            logger,
        )
        const genres = new Map((data?.genres ?? []).map((g) => [g.id, g.name]))
        tmdbGenreCache.set(type, {timestamp: Date.now(), genres})
        return genres
    } catch (error) {
        logAxiosError(error, logger, 'Unable to get TMDB genre list')
        return cached?.genres ?? new Map()
    }
}

/**
 * Persian (fa-IR) metadata for a piece of IMDb-id'd content — poster,
 * backdrop, overview, and genre names all localized via TMDB, so Iranian
 * posters/covers and Persian descriptions show up in the catalog instead of
 * the English Cinemeta defaults. Requires TMDB_API_KEY; returns null (so the
 * caller can fall back to Cinemeta) if unavailable or nothing is found.
 */

/** True if string contains Persian/Arabic letters. */
export function hasPersianScript(text) {
    return /[\u0600-\u06FF]/.test(String(text || ''))
}

/** Remove bidi control chars that can confuse native Stremio UI. */
export function stripBidi(text) {
    return String(text || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim()
}

/**
 * Prefer Persian TMDB text; if missing or not localized, use English — never
 * fall back to original_title (Korean/Japanese/etc.) for display names.
 */
/** Request-scoped preference: 'fa' (default) or 'en' for TMDB text. */
let _metaLangPref = 'fa'

export function setMetaLangPref(lang) {
    const v = String(lang || 'fa').trim().toLowerCase()
    _metaLangPref = v === 'en' || v === 'en-us' || v === 'english' ? 'en' : 'fa'
}

export function getMetaLangPref() {
    return _metaLangPref
}

export function preferFaThenEn(faVal, enVal) {
    const fa = String(faVal || '').trim()
    const en = String(enVal || '').trim()
    if (_metaLangPref === 'en') {
        if (en) return en
        if (fa) return fa
        return null
    }
    if (fa && hasPersianScript(fa)) return fa
    if (en) return en
    if (fa) return fa
    return null
}

/** Prefer Persian genre labels; if TMDB fa list is still Latin, use English list. */
export function pickFaOrEnGenres(genresFa, genresEn) {
    const fa = (genresFa || []).filter(Boolean)
    const en = (genresEn || []).filter(Boolean)
    if (_metaLangPref === 'en') {
        if (en.length) return en
        return fa.length ? fa : undefined
    }
    if (fa.some((g) => hasPersianScript(g))) return fa
    if (en.length) return en
    return fa.length ? fa : undefined
}


async function fetchTmdbDetailLang(kind, tmdbId, lang, httpClient, apiKey) {
    const data = await tmdbRequest(
        `${kind}/${tmdbId}`,
        {language: lang, append_to_response: 'external_ids'},
        httpClient,
        apiKey,
    )
    return data ?? {}
}

export async function getTMDBMetaFa(type, imdbId, httpClient = axios, apiKey, logger = console) {
    if (!apiKey || !imdbId) {
        return null
    }

    try {
        const findData = await tmdbRequest(
            `find/${encodeURIComponent(imdbId)}`,
            {external_source: 'imdb_id', language: 'fa-IR'},
            httpClient,
            apiKey,
            logger,
        )
        const resultsKey = type === 'series' ? 'tv_results' : 'movie_results'
        const item = findData?.[resultsKey]?.[0]
        if (!item?.id) {
            return null
        }

        const kind = type === 'series' ? 'tv' : 'movie'
        let detailFa = item
        let detailEn = null
        try {
            const [faRes, enRes] = await Promise.all([
                fetchTmdbDetailLang(kind, item.id, 'fa-IR', httpClient, apiKey),
                fetchTmdbDetailLang(kind, item.id, 'en-US', httpClient, apiKey),
            ])
            if (faRes) detailFa = faRes
            detailEn = enRes
        } catch {
            try {
                detailFa = await fetchTmdbDetailLang(kind, item.id, 'fa-IR', httpClient, apiKey)
            } catch { /* keep find payload */ }
        }

        const genreMap = await getTMDBGenreMap(type, httpClient, apiKey, logger)
        const genresFa = (detailFa.genres ?? []).map((g) => g.name).filter(Boolean)
        const genresEn = (detailEn?.genres ?? []).map((g) => g.name).filter(Boolean)
        const genresFallback = (item.genre_ids ?? []).map((id) => genreMap.get(id)).filter(Boolean)
        const genres = pickFaOrEnGenres(genresFa, genresEn) || (genresFallback.length ? genresFallback : undefined)
        const year = (
            detailFa.release_date || detailFa.first_air_date
            || detailEn?.release_date || detailEn?.first_air_date
            || item.release_date || item.first_air_date || ''
        ).slice(0, 4) || null
        const vote = detailFa.vote_average ?? detailEn?.vote_average ?? item.vote_average

        const name = preferFaThenEn(
            detailFa.title || detailFa.name,
            detailEn?.title || detailEn?.name,
        )
        const description = preferFaThenEn(detailFa.overview, detailEn?.overview)
        const posterPath = _metaLangPref === 'en'
            ? (detailEn?.poster_path || detailFa.poster_path || item.poster_path)
            : (detailFa.poster_path || detailEn?.poster_path || item.poster_path)
        const backdropPath = _metaLangPref === 'en'
            ? (detailEn?.backdrop_path || detailFa.backdrop_path || item.backdrop_path)
            : (detailFa.backdrop_path || detailEn?.backdrop_path || item.backdrop_path)

        return {
            id: imdbId,
            type,
            name,
            poster: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
            background: backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : null,
            description,
            releaseInfo: year,
            imdbRating: vote ? String(Math.round(vote * 10) / 10) : null,
            genres: genres.length ? genres : undefined,
        }
    } catch (error) {
        logAxiosError(error, logger, 'Unable to get TMDB Persian metadata')
        return null
    }
}

export function extractImdbIdFromMeta(meta, fallbackId = '') {
    if (!meta || typeof meta !== 'object') {
        const m = String(fallbackId || '').match(/^(tt\d+)/)
        return m ? m[1] : null
    }
    for (const key of ['imdb_id', 'imdbId', 'imdb']) {
        const v = meta[key]
        if (typeof v === 'string' && /^tt\d+/.test(v)) return v.split(/[^a-z0-9]/i)[0]
    }
    const id = String(meta.id || fallbackId || '')
    if (/^tt\d+/.test(id)) return id.split(/[^a-z0-9]/i)[0]
    const m = id.match(/(tt\d{5,})/)
    return m ? m[1] : null
}

export async function enrichMetaWithFaTmdb(
    meta,
    type,
    httpClient = axios,
    apiKey,
    logger = console,
    fallbackId = '',
) {
    if (!meta || typeof meta !== 'object' || !apiKey) {
        return meta
    }
    // Skip pure live/tv channel style ids without imdb
    const imdbId = extractImdbIdFromMeta(meta, fallbackId)
    if (!imdbId) {
        return meta
    }
    try {
        const fa = await getTMDBMetaFa(type, imdbId, httpClient, apiKey, logger)
        if (!fa) return meta
        const out = {...meta}
        if (fa.name) out.name = fa.name
        if (fa.description) out.description = fa.description
        if (Array.isArray(fa.genres) && fa.genres.length) out.genres = fa.genres
        if (fa.releaseInfo && !out.releaseInfo) out.releaseInfo = fa.releaseInfo
        if (fa.imdbRating && !out.imdbRating) out.imdbRating = fa.imdbRating
        // Poster: keep RPDB/addon (ratings baked into image). Only fill if missing.
        if (!out.poster && fa.poster) out.poster = fa.poster
        // Background: prefer clean TMDB backdrop (no rating badges)
        if (fa.background) out.background = fa.background
        // Episode titles/overviews (series)
        if (type === 'series' && Array.isArray(out.videos) && out.videos.length) {
            try {
                const tvId = await resolveTmdbTvId(out, httpClient, apiKey, logger)
                if (tvId) {
                    const enriched = await raceTimeout(
                        enrichSeriesVideosFa(
                            out.videos, tvId, httpClient, apiKey, logger,
                            {maxSeasons: 3, budgetMs: 4000},
                        ),
                        4500,
                        null,
                    )
                    if (Array.isArray(enriched) && enriched.length) {
                        out.videos = enriched
                    } else {
                        // At least normalize episode fields for Stremio
                        out.videos = out.videos
                            .map((v) => normalizeStremioVideo({...v, episode: v.episode ?? v.number}, tvId))
                            .filter(Boolean)
                    }
                }
            } catch (error) {
                logAxiosError(error, logger, 'enrichMeta videos FA failed')
            }
        }
        return out
    } catch (error) {
        logAxiosError(error, logger, 'enrichMetaWithFaTmdb failed')
        return meta
    }
}

function isRpdbPosterUrl(url) {
    return /ratingposterdb|\brpdb\b/i.test(String(url || ''))
}

/** Short-lived cache for catalog-list TMDB enrich (avoid N identical finds). */
const catalogFaCache = new Map()
const CATALOG_FA_CACHE_TTL_MS = 2 * 60 * 60 * 1000 // 2h — protect shared TMDB key

function catalogFaCacheGet(key) {
    const row = catalogFaCache.get(key)
    if (!row) return null
    if (Date.now() - row.at > CATALOG_FA_CACHE_TTL_MS) {
        catalogFaCache.delete(key)
        return null
    }
    return row.value
}

function catalogFaCacheSet(key, value) {
    catalogFaCache.set(key, {at: Date.now(), value})
    if (catalogFaCache.size > 800) {
        const first = catalogFaCache.keys().next().value
        catalogFaCache.delete(first)
    }
}

/**
 * For catalog grids (e.g. 101 without RPDB): if a meta has no RPDB poster,
 * fill poster/name/description/genres from TMDB fa-IR using the user's key.
 * Items that already have RPDB posters are left untouched (ratings stay).
 */

async function searchTmdbMetaByTitle(title, type, httpClient, apiKey, logger = console) {
    if (!title || !apiKey) return null
    try {
        const kind = type === 'series' || type === 'tv' ? 'tv' : 'multi'
        const path = kind === 'tv' ? 'search/tv' : (type === 'movie' ? 'search/movie' : 'search/multi')
        const data = await tmdbRequest(path, {
            query: String(title).replace(/\s*season\s*\d+/ig, '').trim(),
            language: 'fa-IR',
            include_adult: false,
            page: 1,
        }, httpClient, apiKey, logger)
        const results = data?.results || []
        let hit = results[0]
        if (path === 'search/multi') {
            hit = results.find((r) => r.media_type === 'movie' || r.media_type === 'tv') || results[0]
        }
        if (!hit?.id) return null
        const mediaType = hit.media_type === 'tv' || type === 'series' || type === 'tv' ? 'series' : 'movie'
        if (hit.media_type === 'movie') {
            /* keep movie */
        }
        const tmdbType = (hit.media_type === 'tv' || mediaType === 'series') ? 'series' : 'movie'
        return getTMDBMetaByTmdbId(tmdbType, hit.id, httpClient, apiKey, logger, null)
    } catch (error) {
        logAxiosError(error, logger, 'TMDB title search failed')
        return null
    }
}

export async function enrichCatalogMetasWithoutRpdb(
    metas,
    type,
    httpClient = axios,
    apiKey,
    logger = console,
    {concurrency = 4} = {},
) {
    if (!apiKey || !Array.isArray(metas) || !metas.length) {
        return metas
    }

    const work = metas.map((meta, index) => ({meta, index}))
    const out = metas.map((m) => (m && typeof m === 'object' ? {...m} : m))

    let cursor = 0
    async function worker() {
        while (cursor < work.length) {
            const my = cursor++
            const {meta, index} = work[my]
            if (!meta || typeof meta !== 'object') continue
            const keepRpdbPoster = isRpdbPosterUrl(meta.poster)

            const imdbId = extractImdbIdFromMeta(meta, meta.id)
            let tmdbNumeric = null
            const idStr = String(meta.id || '')
            if (idStr.startsWith('tmdb:')) {
                tmdbNumeric = idStr.split(':')[1]
            } else if (meta.tmdb_id || meta.tmdbId) {
                tmdbNumeric = String(meta.tmdb_id || meta.tmdbId)
            }

            let cacheKey = imdbId
                ? `imdb:${type}:${imdbId}`
                : (tmdbNumeric ? `tmdb:${type}:${tmdbNumeric}` : null)

            // Anime / kitsu often has no imdb in list — search TMDB by title
            if (!cacheKey && meta.name) {
                cacheKey = `q:${type}:${String(meta.name).slice(0, 80)}`
            }
            if (!cacheKey) continue

            try {
                let fa = catalogFaCacheGet(cacheKey)
                if (!fa) {
                    if (imdbId) {
                        fa = await getTMDBMetaFa(type, imdbId, httpClient, apiKey, logger)
                    } else if (tmdbNumeric) {
                        fa = await getTMDBMetaByTmdbId(type, tmdbNumeric, httpClient, apiKey, logger, null, {skipVideos: true})
                    } else if (meta.name) {
                        fa = await searchTmdbMetaByTitle(meta.name, type, httpClient, apiKey, logger)
                    }
                    if (fa) catalogFaCacheSet(cacheKey, fa)
                }
                if (!fa) continue

                const row = out[index]
                // CRITICAL for Stremio: rewrite tmdb: → imdb tt…
                // Platform catalogs already use tt and work; داغ/ترند use tmdb: and
                // Stremio clients often fail to display meta for tmdb: series ids.
                const faImdb = fa.imdb_id && /^tt\d+$/.test(String(fa.imdb_id)) ? String(fa.imdb_id) : null
                if (faImdb) {
                    row.id = faImdb
                    row.imdb_id = faImdb
                } else if (fa.id && String(fa.id).startsWith('tt')) {
                    row.id = fa.id
                    row.imdb_id = fa.id
                }
                // RPDB poster (ratings) stays; otherwise TMDB poster
                if (!keepRpdbPoster && fa.poster) row.poster = fa.poster
                if (fa.background) row.background = fa.background
                if (fa.name) row.name = fa.name
                if (fa.description) row.description = fa.description
                if (Array.isArray(fa.genres) && fa.genres.length) row.genres = fa.genres
                if (fa.releaseInfo && !row.releaseInfo) row.releaseInfo = fa.releaseInfo
            } catch (error) {
                logAxiosError(error, logger, 'catalog TMDB fa enrich failed')
            }
        }
    }

    const n = Math.min(concurrency, work.length)
    await Promise.all(Array.from({length: n}, () => worker()))
    return out
}




/**
 * Localize series episode titles/overviews via TMDB (fa-IR then en-US).
 * Uses one request per season (cached by tmdbRequest). Safe no-op on failure.
 */
function parseVideoSeasonEpisode(v) {
    let s = Number(v?.season)
    let e = Number(v?.episode ?? v?.number)
    if (!Number.isInteger(s) || !Number.isInteger(e)) {
        const m = String(v?.id || '').match(/:(\d+):(\d+)\s*$/)
        if (m) {
            s = Number(m[1])
            e = Number(m[2])
        }
    }
    return {
        season: Number.isInteger(s) ? s : null,
        episode: Number.isInteger(e) ? e : null,
    }
}

/** Prefer FA episode title; generic "Episode 5" → «قسمت ۵» when FA missing. */
function localizeEpisodeName(faName, enName, episodeNum) {
    const picked = preferFaThenEn(faName, enName)
    if (picked && hasPersianScript(picked)) return picked
    const eng = String(picked || enName || faName || '').trim()
    if (!eng || /^(episode|ep\.?|part)\s*\d+$/i.test(eng) || /^e\d+$/i.test(eng)) {
        if (Number.isInteger(episodeNum) && episodeNum >= 0) return `قسمت ${episodeNum}`
    }
    return picked || eng || null
}

function raceTimeout(promise, ms, fallback = null) {
    return Promise.race([
        promise,
        new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
    ])
}

/** Stremio-safe video object (integers + title + optional TMDB still). */
function normalizeStremioVideo(v, tmdbId) {
    if (!v || typeof v !== 'object') return null
    const {season, episode} = parseVideoSeasonEpisode(v)
    if (season == null || episode == null) return null
    const name = stripBidi(v.title || v.name || `قسمت ${episode}`)
    const overview = stripBidi(v.overview || v.description || '')
    const id = `tmdb:${tmdbId}:${season}:${episode}`
    const out = {
        id,
        title: name,
        name,
        season,
        episode,
        overview,
        description: overview,
    }
    if (v.released || v.firstAired) {
        out.released = v.released || v.firstAired
    }
    // Prefer TMDB still (works via our image proxy in Iran); drop metahub if we have still
    if (v.thumbnail && /image\.tmdb\.org/i.test(String(v.thumbnail))) {
        out.thumbnail = v.thumbnail
    } else if (v.still_path) {
        const path = String(v.still_path).startsWith('/') ? v.still_path : `/${v.still_path}`
        out.thumbnail = `https://image.tmdb.org/t/p/w300${path}`
    } else if (v.thumbnail && !/metahub\.space/i.test(String(v.thumbnail))) {
        out.thumbnail = v.thumbnail
    }
    // Skip metahub.space — often blocked in IR and causes empty episode art in Stremio
    return out
}

/**
 * Build episode list from TMDB only (stable, no Cinemeta dependency).
 * Limited seasons to stay under serverless time limits.
 */
export async function buildSeriesVideosFromTmdb(
    tmdbId,
    httpClient = axios,
    apiKey = process.env.TMDB_API_KEY,
    logger = console,
    {maxSeasons = 20, enrichSeasons = 1, budgetMs = 4000} = {},
) {
    if (!apiKey || !tmdbId) return []
    const started = Date.now()
    let showFa = null
    let showEn = null
    try {
        ;[showFa, showEn] = await Promise.all([
            tmdbRequest(`tv/${tmdbId}`, {language: 'fa-IR'}, httpClient, apiKey, logger).catch(() => null),
            tmdbRequest(`tv/${tmdbId}`, {language: 'en-US'}, httpClient, apiKey, logger).catch(() => null),
        ])
    } catch (error) {
        logAxiosError(error, logger, 'TMDB tv detail for videos failed')
        return []
    }

    const seasonsMeta = Array.isArray(showFa?.seasons) && showFa.seasons.length
        ? showFa.seasons
        : (Array.isArray(showEn?.seasons) ? showEn.seasons : [])

    // Instant skeleton from season episode_count — no per-season roundtrips
    const videos = []
    for (const s of seasonsMeta) {
        const season = Number(s?.season_number)
        if (!Number.isInteger(season) || season < 1) continue
        if (season > maxSeasons) continue
        const count = Number(s?.episode_count) || 0
        if (count <= 0 || count > 80) continue
        for (let episode = 1; episode <= count; episode++) {
            const title = `فصل ${season} — قسمت ${episode}`
            videos.push({
                id: `tmdb:${tmdbId}:${season}:${episode}`,
                title,
                name: title,
                season,
                episode,
            })
        }
    }

    // Optional: enrich first N seasons with real FA titles + stills (time-boxed)
    if (enrichSeasons > 0 && videos.length && Date.now() - started < budgetMs) {
        const seasonsToEnrich = [...new Set(videos.map((v) => v.season))]
            .sort((a, b) => a - b)
            .slice(0, enrichSeasons)
        const byKey = new Map(videos.map((v) => [`${v.season}:${v.episode}`, v]))
        await Promise.all(
            seasonsToEnrich.map(async (season) => {
                if (Date.now() - started > budgetMs) return
                try {
                    const [fa, en] = await Promise.all([
                        tmdbRequest(
                            `tv/${tmdbId}/season/${season}`,
                            {language: 'fa-IR'},
                            httpClient,
                            apiKey,
                            logger,
                        ).catch(() => null),
                        tmdbRequest(
                            `tv/${tmdbId}/season/${season}`,
                            {language: 'en-US'},
                            httpClient,
                            apiKey,
                            logger,
                        ).catch(() => null),
                    ])
                    const enBy = new Map((en?.episodes || []).map((ep) => [ep.episode_number, ep]))
                    for (const ep of fa?.episodes || []) {
                        const key = `${season}:${ep.episode_number}`
                        const row = byKey.get(key)
                        if (!row) continue
                        const enEp = enBy.get(ep.episode_number)
                        const name = localizeEpisodeName(ep.name, enEp?.name, ep.episode_number)
                        if (name) {
                            row.title = name
                            row.name = name
                        }
                        const overview = preferFaThenEn(ep.overview, enEp?.overview)
                        if (overview) {
                            row.overview = overview
                            row.description = overview
                        }
                        const still = ep.still_path || enEp?.still_path
                        if (still) {
                            const path = String(still).startsWith('/') ? still : `/${still}`
                            row.thumbnail = `https://image.tmdb.org/t/p/w300${path}`
                        }
                        const air = ep.air_date || enEp?.air_date
                        if (air) row.released = `${air}T00:00:00.000Z`
                    }
                    // EN-only episodes stills/dates
                    for (const [num, ep] of enBy) {
                        const row = byKey.get(`${season}:${num}`)
                        if (!row) continue
                        if (!row.thumbnail && ep.still_path) {
                            const path = String(ep.still_path).startsWith('/') ? ep.still_path : `/${ep.still_path}`
                            row.thumbnail = `https://image.tmdb.org/t/p/w300${path}`
                        }
                        if (!row.released && ep.air_date) {
                            row.released = `${ep.air_date}T00:00:00.000Z`
                        }
                    }
                } catch (error) {
                    logAxiosError(error, logger, `TMDB enrich season ${season} failed`)
                }
            }),
        )
    }

    return videos
}

export async function enrichSeriesVideosFa(
    videos,
    tmdbId,
    httpClient = axios,
    apiKey = process.env.TMDB_API_KEY,
    logger = console,
    {maxSeasons = 4, budgetMs = 5000} = {},
) {
    if (!apiKey || !tmdbId || !Array.isArray(videos) || !videos.length) {
        return videos
    }
    const seasons = new Set()
    for (const v of videos) {
        const {season: s} = parseVideoSeasonEpisode(v)
        if (s != null && s > 0) seasons.add(s)
    }
    if (!seasons.size) return videos

    let seasonList = [...seasons].sort((a, b) => a - b)
    if (seasonList.length > maxSeasons) {
        seasonList = seasonList.slice(0, maxSeasons)
    }

    const bySeason = new Map()
    const started = Date.now()
    await Promise.all(
        seasonList.map(async (season) => {
            if (Date.now() - started > budgetMs) return
            try {
                const [fa, en] = await Promise.all([
                    tmdbRequest(
                        `tv/${tmdbId}/season/${season}`,
                        {language: 'fa-IR'},
                        httpClient,
                        apiKey,
                        logger,
                    ).catch(() => null),
                    tmdbRequest(
                        `tv/${tmdbId}/season/${season}`,
                        {language: 'en-US'},
                        httpClient,
                        apiKey,
                        logger,
                    ).catch(() => null),
                ])
                const enEps = new Map(
                    (en?.episodes || []).map((ep) => [ep.episode_number, ep]),
                )
                const map = new Map()
                for (const ep of fa?.episodes || []) {
                    const enEp = enEps.get(ep.episode_number)
                    map.set(ep.episode_number, {
                        name: localizeEpisodeName(ep.name, enEp?.name, ep.episode_number),
                        overview: preferFaThenEn(ep.overview, enEp?.overview),
                        still_path: ep.still_path || enEp?.still_path || null,
                    })
                }
                for (const [num, ep] of enEps) {
                    if (!map.has(num)) {
                        map.set(num, {
                            name: localizeEpisodeName(null, ep.name, num),
                            overview: ep.overview || null,
                            still_path: ep.still_path || null,
                        })
                    }
                }
                bySeason.set(season, map)
            } catch (error) {
                logAxiosError(error, logger, `TMDB season ${season} FA enrich failed`)
            }
        }),
    )

    if (!bySeason.size) {
        return videos.map((v) => normalizeStremioVideo(v, tmdbId)).filter(Boolean)
    }

    return videos.map((v) => {
        const {season: s, episode: e} = parseVideoSeasonEpisode(v)
        if (s == null || e == null) return normalizeStremioVideo(v, tmdbId)
        const hit = bySeason.get(s)?.get(e)
        const merged = {
            ...v,
            season: s,
            episode: e,
            number: e,
            name: hit?.name || v.name || v.title,
            title: hit?.name || v.title || v.name,
            overview: hit?.overview || v.overview || v.description,
            description: hit?.overview || v.description || v.overview,
            still_path: hit?.still_path || v.still_path,
        }
        return normalizeStremioVideo(merged, tmdbId)
    }).filter(Boolean)
}

/** Resolve numeric TMDB tv id from meta / imdb for episode localization. */
async function resolveTmdbTvId(meta, httpClient, apiKey, logger) {
    if (!meta || !apiKey) return null
    const idStr = String(meta.id || '')
    if (idStr.startsWith('tmdb:')) {
        const n = idStr.split(':')[1]
        if (n && /^\d+$/.test(n)) return n
    }
    if (meta.tmdb_id || meta.tmdbId) {
        const n = String(meta.tmdb_id || meta.tmdbId)
        if (/^\d+$/.test(n)) return n
    }
    const imdbId = extractImdbIdFromMeta(meta, meta.id)
    if (!imdbId) return null
    try {
        const findData = await tmdbRequest(
            `find/${encodeURIComponent(imdbId)}`,
            {external_source: 'imdb_id', language: 'fa-IR'},
            httpClient,
            apiKey,
            logger,
        )
        const item = findData?.tv_results?.[0]
        return item?.id ? String(item.id) : null
    } catch {
        return null
    }
}

/**
 * Build Stremio meta for a tmdb: id (used by 101 Catalogs popular/trending).
 * Optimized for serverless time limits — videos from TMDB first, Cinemeta optional.
 */
export async function getTMDBMetaByTmdbId(
    type,
    tmdbId,
    httpClient = axios,
    apiKey,
    logger = console,
    getCinemetaFn = null,
    {skipVideos = false} = {},
) {
    if (!apiKey || !tmdbId) {
        return null
    }
    const isSeries = type === 'series' || type === 'tv'
    const stremioType = isSeries ? 'series' : 'movie'
    let kind = isSeries ? 'tv' : 'movie'
    try {
        let data = {}
        let dataEn = null
        async function loadPair(k) {
            try {
                const [faRes, enRes] = await Promise.all([
                    fetchTmdbDetailLang(k, tmdbId, 'fa-IR', httpClient, apiKey),
                    fetchTmdbDetailLang(k, tmdbId, 'en-US', httpClient, apiKey),
                ])
                return {fa: faRes || {}, en: enRes}
            } catch {
                try {
                    const fa = await fetchTmdbDetailLang(k, tmdbId, 'fa-IR', httpClient, apiKey)
                    return {fa: fa || {}, en: null}
                } catch {
                    return {fa: {}, en: null}
                }
            }
        }

        let pair = await loadPair(kind)
        data = pair.fa
        dataEn = pair.en
        const hasName = Boolean(data.name || data.title || dataEn?.name || dataEn?.title)
        if (!hasName) {
            const alt = kind === 'tv' ? 'movie' : 'tv'
            pair = await loadPair(alt)
            if (pair.fa?.name || pair.fa?.title || pair.en?.name || pair.en?.title) {
                kind = alt
                data = pair.fa
                dataEn = pair.en
            }
        }

        const imdbId = data.external_ids?.imdb_id || data.imdb_id || dataEn?.external_ids?.imdb_id || null
        const validImdb = imdbId && /^tt\d+$/.test(imdbId) ? imdbId : null
        const name = preferFaThenEn(
            data.title || data.name,
            dataEn?.title || dataEn?.name,
        )
        if (!name) {
            logger.warn?.('TMDB meta empty name', {tmdbId, type, kind})
            return null
        }
        const description = preferFaThenEn(data.overview, dataEn?.overview)
        const year = (data.release_date || data.first_air_date || dataEn?.release_date || dataEn?.first_air_date || '').slice(0, 4) || null
        const endYear = (data.last_air_date || dataEn?.last_air_date || '').slice(0, 4) || null
        const releaseInfo = year && endYear && endYear !== year ? `${year}-${endYear}` : year
        const genreMap = await getTMDBGenreMap(stremioType, httpClient, apiKey, logger).catch(() => new Map())
        const genresFa = (data.genres ?? []).map((g) => g.name || genreMap.get(g.id)).filter(Boolean)
        const genresEn = (dataEn?.genres ?? []).map((g) => g.name || genreMap.get(g.id)).filter(Boolean)
        const genres = pickFaOrEnGenres(genresFa, genresEn)
        const posterPath = _metaLangPref === 'en'
            ? (dataEn?.poster_path || data.poster_path)
            : (data.poster_path || dataEn?.poster_path)
        const backdropPath = _metaLangPref === 'en'
            ? (dataEn?.backdrop_path || data.backdrop_path)
            : (data.backdrop_path || dataEn?.backdrop_path)
        const vote = data.vote_average ?? dataEn?.vote_average

        const meta = {
            id: `tmdb:${tmdbId}`,
            type: stremioType,
            name: stripBidi(name),
            poster: posterPath ? `https://image.tmdb.org/t/p/w500${posterPath}` : null,
            background: backdropPath ? `https://image.tmdb.org/t/p/original${backdropPath}` : null,
            description: description ? stripBidi(description) : undefined,
            releaseInfo: releaseInfo || undefined,
            imdbRating: vote != null ? String(Math.round(vote * 10) / 10) : undefined,
            genres: genres?.length ? genres.map((g) => stripBidi(g)) : undefined,
            imdb_id: validImdb || undefined,
        }

        // Catalog enrichment only needs id/name/poster — skip heavy videos list
        if (isSeries && !skipVideos) {
            // Primary: TMDB episodes (fast skeleton + light enrich)
            try {
                const tmdbVideos = await raceTimeout(
                    buildSeriesVideosFromTmdb(tmdbId, httpClient, apiKey, logger, {
                        maxSeasons: 30,
                        enrichSeasons: 2,
                        budgetMs: 3500,
                    }),
                    4000,
                    [],
                )
                if (Array.isArray(tmdbVideos) && tmdbVideos.length) {
                    meta.videos = tmdbVideos
                }
            } catch (error) {
                logAxiosError(error, logger, 'TMDB videos build failed')
            }

            // Optional short Cinemeta attempt only if TMDB gave nothing
            if ((!meta.videos || !meta.videos.length) && validImdb && typeof getCinemetaFn === 'function') {
                try {
                    const cin = await raceTimeout(getCinemetaFn('series', validImdb), 2500, null)
                    const videos = cin?.meta?.videos
                    if (Array.isArray(videos) && videos.length) {
                        meta.videos = videos
                            .map((v) => {
                                const season = Number(v.season)
                                const episode = Number(v.episode ?? v.number)
                                return normalizeStremioVideo(
                                    {...v, season, episode, number: episode},
                                    tmdbId,
                                )
                            })
                            .filter(Boolean)
                    }
                } catch (error) {
                    logAxiosError(error, logger, 'Cinemeta videos fallback failed')
                }
            }
        }

        if (stremioType === 'movie') {
            meta.behaviorHints = {defaultVideoId: meta.id}
        }

        return meta
    } catch (error) {
        logAxiosError(error, logger, 'Unable to get TMDB meta by tmdb id')
        return null
    }
}

// ---------------------------------------------------------------------------
// Persian catalog-name translation for external aggregated catalogs
// Natural Iranian movie-site tone; never emit "سریال - سریال" style clones.
// ---------------------------------------------------------------------------

const CATALOG_BRAND_STRIP_RE = /\b(myanimelist|anidb|anilist|anisearch|livechart(\.me)?|notify\.moe|kitsu|rpdb|101catalogs?|mdblist|imdb|tmdb)\b/gi

/** Exact / high-priority phrases (first match wins). Everyday Persian. */
const CATALOG_EXACT_PHRASES = [
    // Hot first-name style
    [/trending\s*movies?/i, 'داغ — فیلم'],
    [/trending\s*(tv\s*)?series/i, 'داغ — سریال'],
    [/trending\s*tv\s*shows?/i, 'داغ — سریال'],
    [/popular\s*movies?/i, 'محبوب — فیلم'],
    [/popular\s*(tv\s*)?series/i, 'محبوب — سریال'],

    // Top history / airing (anime + general)
    [/top[\s-]*all[\s-]*time[\s-]*(anime)?/i, 'برترین‌های تاریخ'],
    [/all[\s-]*time[\s-]*top[\s-]*(anime)?/i, 'برترین‌های تاریخ'],
    [/top\s*rated\s*movies?/i, 'برترین‌های تاریخ — فیلم'],
    [/top\s*rated\s*(tv\s*)?(series|shows?)/i, 'برترین‌های تاریخ — سریال'],
    [/top\s*rated/i, 'برترین‌های تاریخ'],
    [/top[\s-]*airing[\s-]*(anime)?/i, 'برترین‌های در حال پخش'],
    [/currently[\s-]*airing/i, 'در حال پخش'],

    [/iptv\s*live\s*channels?/i, 'پخش زنده ماهواره'],
    [/iptv\s*movies?/i, 'فیلم‌های ماهواره'],
    [/iptv\s*series/i, 'سریال‌های ماهواره'],
    [/iptv\s*tv\s*shows?/i, 'سریال‌های ماهواره'],
    [/\biptv\b/i, 'ماهواره'],

    [/rotten\s*tomatoes\s*certified\s*fresh/i, 'تأییدشده راتن تومیتوز'],
    [/rt\s*fresh\s*-\s*action/i, 'تازه‌های راتن — اکشن'],
    [/rt\s*fresh\s*-\s*adventure/i, 'تازه‌های راتن — ماجراجویی'],
    [/rt\s*fresh\s*-\s*animation/i, 'تازه‌های راتن — انیمیشن'],
    [/rt\s*fresh\s*-\s*anime/i, 'تازه‌های راتن — انیمه'],
    [/rt\s*fresh\s*-\s*biography/i, 'تازه‌های راتن — زندگینامه'],
    [/rt\s*fresh/i, 'تازه‌های راتن تومیتوز'],

    [/top\s*seeded\s*-\s*all\s*time/i, 'پرطرفدارترین تورنت‌ها (همه زمان‌ها)'],
    [/top\s*seeded\s*-\s*last\s*month/i, 'پرطرفدارترین تورنت‌ها (ماه قبل)'],
    [/top\s*seeded\s*-\s*last\s*week/i, 'پرطرفدارترین تورنت‌ها (هفته قبل)'],
    [/top\s*seeded\s*-\s*this\s*month/i, 'پرطرفدارترین تورنت‌ها (این ماه)'],
    [/top\s*seeded\s*-\s*this\s*week/i, 'پرطرفدارترین تورنت‌ها (این هفته)'],
    [/top\s*seeded/i, 'پرطرفدارترین تورنت‌ها'],

    [/latest\s*releases?\s*(movies?|films?)/i, 'آخرین منتشرشده‌ها — فیلم'],
    [/latest\s*releases?\s*(tv\s*)?(series|shows?)/i, 'آخرین منتشرشده‌ها — سریال'],
    [/latest\s*releases?/i, 'آخرین منتشرشده‌ها'],
    [/latest\s*stand[\s-]*up\s*comedy/i, 'جدیدترین استندآپ‌ها'],
    [/all\s*family/i, 'همه آثار خانوادگی'],
    [/family\s*0\s*-\s*5/i, 'کودکانه (۰ تا ۵ سال)'],
    [/family\s*0-5/i, 'کودکانه (۰ تا ۵ سال)'],
    [/hanna\s*barbera/i, 'هانا‌باربرا'],
    [/cartoon\s*network/i, 'کارتون نتورک'],
    [/pixar\s*movies/i, 'فیلم‌های پیکسار'],
    
    [/pixar\s*shorts?/i, 'کوتاه‌های پیکسار'],

    // Regions / languages — full natural titles (before generic word pass)
    [/chinese\s*(tv\s*)?(series|shows?|dramas?)/i, 'سریال‌های چینی'],
    [/chinese\s*movies?/i, 'فیلم‌های چینی'],
    [/chinese\s*animation/i, 'انیمیشن چینی'],
    [/\bc-?drama\b/i, 'درام چینی'],
    [/\bchinese\b/i, 'چینی'],

    [/japanese\s*(tv\s*)?(series|shows?|dramas?)/i, 'سریال‌های ژاپنی'],
    [/japanese\s*movies?/i, 'فیلم‌های ژاپنی'],
    [/japanese\s*animation/i, 'انیمیشن ژاپنی'],
    [/\bj-?drama\b/i, 'درام ژاپنی'],
    [/\bjapanese\b/i, 'ژاپنی'],

    [/korean\s*(tv\s*)?(series|shows?|dramas?)/i, 'سریال‌های کره‌ای'],
    [/korean\s*movies?/i, 'فیلم‌های کره‌ای'],
    [/\bk-?drama\b/i, 'درام کره‌ای'],
    [/\bkorean\b/i, 'کره‌ای'],

    [/indian\s*(tv\s*)?(series|shows?|dramas?)/i, 'سریال‌های هندی'],
    [/indian\s*movies?/i, 'فیلم‌های هندی'],
    [/\bbollywood\b/i, 'بالیوود'],
    [/\bindian\b/i, 'هندی'],

    [/turkish\s*(tv\s*)?(series|shows?|dramas?)/i, 'سریال‌های ترکی'],
    [/turkish\s*movies?/i, 'فیلم‌های ترکی'],
    [/\bturkish\b/i, 'ترکی'],

    [/arabic\s*(tv\s*)?(series|shows?|dramas?)/i, 'سریال‌های عربی'],
    [/arabic\s*movies?/i, 'فیلم‌های عربی'],
    [/\barabic\b/i, 'عربی'],

    [/french\s*(tv\s*)?(series|shows?)/i, 'سریال‌های فرانسوی'],
    [/french\s*movies?/i, 'فیلم‌های فرانسوی'],
    [/\bfrench\b/i, 'فرانسوی'],

    [/spanish\s*(tv\s*)?(series|shows?)/i, 'سریال‌های اسپانیایی'],
    [/spanish\s*movies?/i, 'فیلم‌های اسپانیایی'],
    [/latin\s*american/i, 'آمریکای لاتین'],
    [/\bspanish\b/i, 'اسپانیایی'],

    [/german\s*(tv\s*)?(series|shows?)/i, 'سریال‌های آلمانی'],
    [/german\s*movies?/i, 'فیلم‌های آلمانی'],
    [/\bgerman\b/i, 'آلمانی'],

    [/italian\s*(tv\s*)?(series|shows?)/i, 'سریال‌های ایتالیایی'],
    [/italian\s*movies?/i, 'فیلم‌های ایتالیایی'],
    [/\bitalian\b/i, 'ایتالیایی'],

    [/russian\s*(tv\s*)?(series|shows?)/i, 'سریال‌های روسی'],
    [/russian\s*movies?/i, 'فیلم‌های روسی'],
    [/\brussian\b/i, 'روسی'],

    [/thai\s*(tv\s*)?(series|shows?|dramas?)/i, 'سریال‌های تایلندی'],
    [/thai\s*movies?/i, 'فیلم‌های تایلندی'],
    [/\bthai\b/i, 'تایلندی'],

    [/vietnamese\s*(tv\s*)?(series|shows?)/i, 'سریال‌های ویتنامی'],
    [/vietnamese\s*movies?/i, 'فیلم‌های ویتنامی'],
    [/\bvietnamese\b/i, 'ویتنامی'],

    [/filipino\s*(tv\s*)?(series|shows?)/i, 'سریال‌های فیلیپینی'],
    [/pinoy\s*(tv\s*)?(series|shows?|movies?)/i, 'آثار فیلیپینی'],
    [/\bfilipino\b/i, 'فیلیپینی'],

    [/hong\s*kong\s*movies?/i, 'فیلم‌های هنگ‌کنگ'],
    [/hong\s*kong/i, 'هنگ‌کنگ'],
    [/taiwan(ese)?\s*(tv\s*)?(series|shows?|movies?)/i, 'آثار تایوانی'],
    [/\btaiwan/i, 'تایوان'],
    [/mainland\s*china/i, 'چین'],
    [/\bbritish\b/i, 'بریتانیایی'],
    [/\buk\s*series/i, 'سریال‌های بریتانیایی'],
    [/\buk\s*movies?/i, 'فیلم‌های بریتانیایی'],
    [/nordic/i, 'نوردیک'],
    [/scandinavian/i, 'اسکاندیناوی'],
    [/brazilian/i, 'برزیلی'],
    [/mexican/i, 'مکزیکی'],
    [/european/i, 'اروپایی'],
    [/asian/i, 'آسیایی'],
    [/african/i, 'آفریقایی'],


    [/^movies?$/i, 'فیلم‌ها'],
    [/^series$/i, 'سریال‌ها'],
    [/^tv\s*shows?$/i, 'سریال‌ها'],
    [/^tv$/i, 'تلویزیون'],
    [/^anime$/i, 'انیمه'],
    [/^search$/i, 'جستجو'],

    [/popular\s*movies?/i, 'فیلم‌های محبوب'],
    [/popular\s*(tv\s*)?series/i, 'سریال‌های محبوب'],
    [/popular\s*tv\s*shows?/i, 'سریال‌های محبوب'],
                        [/now\s*playing/i, 'اکران‌های روز'],
    [/on\s*the\s*air/i, 'در حال پخش'],
    [/airing\s*today/i, 'پخش امروز'],

    [/netflix\s*kids/i, 'نتفلیکس کودک'],
    [/netflix/i, 'نتفلیکس'],
    [/disney\+/i, 'دیزنی پلاس'],
    [/hbo\s*max/i, 'اچ‌بی‌او مکس'],
    [/prime\s*video/i, 'پرایم ویدیو'],
    [/apple\s*tv\+/i, 'اپل تی‌وی پلاس'],
    [/paramount\+/i, 'پارامونت پلاس'],
]

/** Word/phrase replacements (applied in order). */
const CATALOG_NAME_PHRASES = [
    [/tv\s*shows?/gi, 'سریال'],
    [/\bmovies?\b/gi, 'فیلم'],
    [/\bseries\b/gi, 'سریال'],
    [/\banime\b/gi, 'انیمه'],
    [/\bshows?\b/gi, 'سریال'],

    [/\bk-?drama\b/gi, 'درام کره‌ای'],
    [/\bkorean\b/gi, 'کره‌ای'],
    [/\bindian\b/gi, 'هندی'],
    [/\bturkish\b/gi, 'ترکی'],
    [/\bbollywood\b/gi, 'بالیوود'],
    [/\banimation\b/gi, 'انیمیشن'],
    [/\bkids?\b/gi, 'کودک'],
    [/\bfamily\b/gi, 'خانوادگی'],
    [/\bdocumentary\b/gi, 'مستند'],
    [/\bcrime\b/gi, 'جنایی'],
    [/\bfantasy\b/gi, 'فانتزی'],
    [/\badventure\b/gi, 'ماجراجویی'],
    [/\bwar\b/gi, 'جنگی'],
    [/\bwestern\b/gi, 'وسترن'],
    [/\bmusical\b/gi, 'موزیکال'],
    [/\bmusic\b/gi, 'موسیقی'],
    [/\bsports?\b/gi, 'ورزشی'],
    [/\bmystery\b/gi, 'معمایی'],
    [/\bbiography\b/gi, 'زندگینامه'],
    [/\bhistory\b/gi, 'تاریخی'],
    [/\bhorror\b/gi, 'ترسناک'],
    [/\bromance\b/gi, 'عاشقانه'],
    [/\bthriller\b/gi, 'هیجانی'],
    [/\baction\b/gi, 'اکشن'],
    [/\bcomedy\b/gi, 'کمدی'],
    [/\bdramas?\b/gi, 'درام'],
    [/\bsci-?fi\b/gi, 'علمی‌تخیلی'],
    [/\bscience\s*fiction\b/gi, 'علمی‌تخیلی'],

    [/\btop\s*rated\b/gi, 'پرامتیاز'],
    [/\btop\b/gi, 'برترین'],
    [/\bbest\b/gi, 'بهترین'],
    [/\bpopular\b/gi, 'محبوب'],
    [/\btrending\b/gi, 'داغ'],
    [/\bnew\b/gi, 'جدید'],
    [/\blatest\b/gi, 'جدیدترین'],
    [/\bupcoming\b/gi, 'به‌زودی'],
    [/\bairing\b/gi, 'در حال پخش'],
    [/\bongoing\b/gi, 'در حال پخش'],
    [/\bcompleted\b/gi, 'تمام‌شده'],
    [/\bclassic\b/gi, 'کلاسیک'],
    [/\brated\b/gi, 'امتیازدار'],
    [/\bratings?\b/gi, 'امتیاز'],

    [/certified\s*fresh/gi, 'تأییدشده'],
    [/stand[\s-]*up/gi, 'استندآپ'],
    [/\btorrent\b/gi, 'تورنت'],
    [/\bseeded\b/gi, 'سیدشده'],
    [/\bstreaming\b/gi, 'پلتفرم‌ها'],
    [/\bhulu\b/gi, 'هولو'],
    [/\bpeacock\b/gi, 'پیکاک'],
    [/\bcrunchyroll\b/gi, 'کرانچی‌رول'],
    [/\bshudder\b/gi, 'شادر'],
    [/\bstarz\b/gi, 'استارز'],
    [/\byear\b/gi, 'سال'],
    [/\bgenre\b/gi, 'ژانر'],
    [/\bsearch\b/gi, 'جستجو'],
]

function cleanupCatalogFaName(working) {
    let s = String(working || '')
        .replace(/\s*[-–—|/]+\s*/g, ' — ')
        .replace(/\s+/g, ' ')
        .trim()

    // Drop leftover long English tokens (keep years, +)
    if (/[a-z]/i.test(s)) {
        s = s
            .replace(/\b(?!\d{4}\b)[a-z][a-z0-9.'+]{2,}/gi, '')
            .replace(/\s+/g, ' ')
            .trim()
    }

    // Region + type word order: "چینی فیلم" → "فیلم‌های چینی"
    const regions = 'چینی|ژاپنی|کره‌ای|هندی|ترکی|عربی|فرانسوی|اسپانیایی|آلمانی|ایتالیایی|روسی|تایلندی|ویتنامی|فیلیپینی|بریتانیایی|برزیلی|مکزیکی|اروپایی|آسیایی|آفریقایی|نوردیک|اسکاندیناوی|هنگ‌کنگ|تایوانی|بالیوود'
    s = s
        .replace(new RegExp(`^(${regions})\\s+فیلم‌ها$`, 'u'), 'فیلم‌های $1')
        .replace(new RegExp(`^(${regions})\\s+سریال‌ها$`, 'u'), 'سریال‌های $1')
        .replace(new RegExp(`^(${regions})\\s+فیلم$`, 'u'), 'فیلم‌های $1')
        .replace(new RegExp(`^(${regions})\\s+سریال$`, 'u'), 'سریال‌های $1')
        .replace(new RegExp(`^فیلم\\s+(${regions})$`, 'u'), 'فیلم‌های $1')
        .replace(new RegExp(`^سریال\\s+(${regions})$`, 'u'), 'سریال‌های $1')

    // Collapse duplicate type words: "سریال — سریال" / "سریال سریال‌ها" / "فیلم فیلم"
    s = s
        .replace(/(فیلم|سریال|انیمه|کانال)\s*[—\-]\s*\1‌ها/gu, '$1‌ها')
        .replace(/(فیلم|سریال|انیمه|کانال)\s+\1‌ها/gu, '$1‌ها')
        .replace(/(فیلم|سریال|انیمه|کانال)‌ها\s*[—\-]?\s*\1‌ها/gu, '$1‌ها')
        .replace(/(فیلم|سریال|انیمه|کانال)\s*[—\-]\s*\1(?!‌)/gu, '$1‌ها')
        .replace(/(فیلم|سریال|انیمه)(\s+\1)+/gu, '$1')
        .replace(/\s+/g, ' ')
        .trim()

    // Bare type → plural natural form
    if (s === 'فیلم') s = 'فیلم‌ها'
    if (s === 'سریال') s = 'سریال‌ها'
    if (s === 'انیمه') s = 'انیمه'
    if (s === 'کانال') s = 'کانال‌ها'

    // Keep "anime" label Persian in titles (discover/search/catalog)
    s = s
        .replace(/\b[Aa]nime\b/g, 'انیمه')
        .replace(/\s*[—\-]\s*انیمه\s*$/u, ' — انیمه')
        .replace(/برترین\s*های\s*تاریخ\s*$/u, 'برترین‌های تاریخ')
        .replace(/برترین\s*-\s*در حال پخش/u, 'برترین‌های در حال پخش')
        .replace(/برترین‌ها\s*در حال پخش/u, 'برترین‌های در حال پخش')

    // If title is only history/airing without type, leave; Stremio may append type
    if (/^برترین‌های تاریخ$/u.test(s)) {
        /* keep; anime/movie type shown by row or we add nothing to avoid سریال-سریال */
    }
    if (/^برترین‌های در حال پخش$/u.test(s)) {
        /* keep */
    }

    // Tidy dashes
    s = s.replace(/\s*—\s*$/u, '').replace(/^\s*—\s*/u, '').trim()
    return s
}

export function translateCatalogName(name, type, lang = null) {
    // Keep Animex / Turkish fixed labels intact
    const raw = String(name || '').trim()
    const isEn = String(lang || 'fa').toLowerCase().startsWith('en')
    // Fixed Animex catalog label (any dash variant / extra spaces)
    if (/انیمکس/u.test(raw) || /\banimex\b/i.test(raw)) {
        if (/انیمه|anime/i.test(raw) || /انیمکس|animex/i.test(raw)) {
            return isEn ? 'animex' : 'انیمکس'
        }
    }
    if (/^انیمه\s*[-–—]\s*انیمکس$/u.test(raw) || /^anime\s*[-–—]\s*animex$/i.test(raw)) {
        return isEn ? 'animex' : 'انیمکس'
    }
    if (/^ترکی$/u.test(raw) || /^turkish$/i.test(raw)) {
        return isEn ? 'Turkish' : 'ترکی'
    }

    if (!name) return name

    const original = String(name).trim()
    // Catalog labels follow addon UI language (ADDON_LANG): EN keeps source names
    const useEn = String(lang || getUiLangPref() || 'fa').toLowerCase().startsWith('en')
    if (useEn) {
        return original.replace(CATALOG_BRAND_STRIP_RE, ' ').replace(/\s+/g, ' ').trim() || original
    }

    let working = original.replace(CATALOG_BRAND_STRIP_RE, ' ').replace(/\s+/g, ' ').trim()

    for (const [pattern, replacement] of CATALOG_EXACT_PHRASES) {
        if (pattern.test(working)) {
            return cleanupCatalogFaName(replacement)
        }
    }

    for (const [pattern, replacement] of CATALOG_NAME_PHRASES) {
        working = working.replace(pattern, replacement)
    }

    working = cleanupCatalogFaName(working)

    // Lone region adjective → "فیلم/سریال‌های …"
    const regionOnly = {
        'چینی': 1, 'ژاپنی': 1, 'کره‌ای': 1, 'هندی': 1, 'ترکی': 1, 'عربی': 1,
        'فرانسوی': 1, 'اسپانیایی': 1, 'آلمانی': 1, 'ایتالیایی': 1, 'روسی': 1,
        'تایلندی': 1, 'ویتنامی': 1, 'فیلیپینی': 1, 'بریتانیایی': 1, 'برزیلی': 1,
        'مکزیکی': 1, 'اروپایی': 1, 'آسیایی': 1, 'آفریقایی': 1, 'نوردیک': 1,
        'اسکاندیناوی': 1, 'هنگ‌کنگ': 1, 'تایوان': 1, 'بالیوود': 1,
    }
    if (working && regionOnly[working]) {
        if (type === 'movie') working = `فیلم‌های ${working}`
        else if (type === 'series' || type === 'tv') working = `سریال‌های ${working}`
        else if (type === 'anime') working = `انیمه ${working}`
        else working = `آثار ${working}`
    }

    // Anime catalog labels: history / airing get clear Persian + انیمه
    const origLower = original.toLowerCase()
    if (/anime|انیمه|mal|myanimelist|kitsu/i.test(origLower) || type === 'anime') {
        if (/all\s*time|top\s*rated|تاریخ/i.test(origLower + working)) {
            working = 'برترین‌های تاریخ — انیمه'
        } else if (/airing|در حال پخش/i.test(origLower + working)) {
            working = 'برترین‌های در حال پخش — انیمه'
        } else if (working && !/انیمه/.test(working) && !regionOnly[working]) {
            // soft: don't force suffix on every anime list
        }
    }

    if (!working) {
        if (type === 'movie') return 'فیلم‌ها'
        if (type === 'series') return 'سریال‌ها'
        if (type === 'tv') return 'تلویزیون'
        if (type === 'anime') return 'انیمه'
        return original
    }

    return cleanupCatalogFaName(working)
}


/**
 * Reorder external catalogs without Patreon:
 * trending / popular / new / top → first
 * streaming platforms (Netflix, Disney+, …) → last
 */
export function classifyExternalCatalogSource(source = {}) {
    const url = `${source.manifestUrl || ''} ${source.resolvedUrl || ''} ${source.baseUrl || ''}`
    if (/iptvbridge|iptv[\s_-]*bridge|\/iptv/i.test(url)) return 'iptv'
    if (/stremio-anime|anime-catalog|animecatalog|myanimelist|kitsu|baby-beamup.*anime/i.test(url)) {
        return 'anime'
    }
    if (/101catalog|api\.101catalogs/i.test(url)) return '101'
    if (/aiocatalog|aio\.pantelx|jqrw92fchz\.workers\.dev/i.test(url)) return 'aio'
    return 'other'
}

function catalogSortScore(cat) {
    // Score must work on English ids AND Persian translated names (no \b on FA).
    const name = String(cat?.name || '')
    const id = String(cat?.id || '')
    const extra = String(cat?._sortKey || cat?.extra || '')
    const blob = `${name} ${id} ${extra}`.toLowerCase()
    const type = String(cat?.type || '')
    const isMovie = type === 'movie'
    const isSeries = type === 'series' || type === 'tv'

    // IPTV / satellite always after streaming platforms (even inside same AIO/101 group).
    // Otherwise "ماهواره" scores as generic (100) and Crunchyroll (400) sinks below it.
    const iptvRe = /iptv|ماهواره|satellite|live\s*channels?|پخش\s*زنده|iptvbridge|tv\s*channels?/i
    if (iptvRe.test(blob)) return 900

    const platformRe = /netflix|disney\+?|hbo\s*max|(^|[^a-z])max([^a-z]|$)|prime\s*video|amazon\s*prime|apple\s*tv|paramount\+?|hulu|peacock|crunchyroll|starz|showtime|sky\s*showtime|discovery\+?|mubi|shudder|britbox|acorn|hayu|iqiyi|viaplay|canal\+|movistar|zee5|sonyliv|hotstar|jiohotstar|bbc\s*iplayer|itvx|channel\s*4|streaming|پلتفرم|نتفلیکس|دیزنی|اچ‌بی‌او|پرایم|اپل\s*تی‌?وی|پارامونت|هولو|پیکاک|کرانچی|استارز/i
    if (platformRe.test(blob)) {
        // Keep streaming platforms together; Netflix → Crunchyroll → rest
        let base = 420
        if (/netflix|نتفلیکس/i.test(blob)) base = 400
        else if (/crunchyroll|crunchy|کرانچی/i.test(blob)) base = 402
        else if (/disney|دیزنی/i.test(blob)) base = 404
        else if (/prime|پرایم|amazon/i.test(blob)) base = 406
        else if (/apple|اپل/i.test(blob)) base = 408
        else if (/hbo|(^|[^a-z])max([^a-z]|$)|اچ‌بی‌او/i.test(blob)) base = 410
        if (isMovie) return base
        if (isSeries) return base + 1
        return base + 2
    }

    // آخرین منتشرشده‌ها (Latest Releases) — always first among 101 lists
    if (/latest\s*releases?|آخرین\s*منتشر/i.test(blob)) {
        if (isMovie) return -10
        if (isSeries) return -9
        return -10
    }

    // داغ / trending / popular (not top-rated history)
    const isHistoryish = /top\s*rated|top[_\s-]*all[_\s-]*time|all[_\s-]*time|برترین.*تاریخ|برترین‌های تاریخ|top[_\s-]*airing|در حال پخش/i.test(blob)
    const isHot = /trending|داغ|(^|[^a-z])popular([^a-z]|$)|محبوب|پرطرفدار/i.test(blob) && !isHistoryish
    if (isHot) {
        if (isMovie) return 0
        if (isSeries) return 1
        return 2
    }

    // برترین‌های تاریخ (not airing)
    const isTopHistory = /top\s*rated|top[_\s-]*all[_\s-]*time|all[_\s-]*time|برترین.*تاریخ|برترین‌های تاریخ/i.test(blob)
        && !/airing|در حال پخش/i.test(blob)
    if (isTopHistory) {
        if (isMovie) return 10
        if (isSeries) return 11
        return 10
    }

    if (/top[_\s-]*airing|currently[_\s-]*airing|برترین.*در حال پخش|در حال پخش/i.test(blob)) {
        return 15
    }

    if (/korean|k[_\s-]*drama|کره‌|کره\s*ای/i.test(blob)) {
        if (isMovie) return 20
        if (isSeries) return 21
        return 22
    }
    if (/chinese|c[_\s-]*drama|چین|hong[_\s-]*kong|taiwan|هنگ‌کنگ|تایوان/i.test(blob)) {
        if (isMovie) return 30
        if (isSeries) return 31
        return 32
    }

    return 100
}

/** Sort inside one group (101 / AIO / anime / …). */
export function sortCatalogsWithinGroup(catalogs) {
    if (!Array.isArray(catalogs) || catalogs.length < 2) return catalogs || []
    return [...catalogs]
        .sort((a, b) => {
            const d = catalogSortScore(a) - catalogSortScore(b)
            if (d !== 0) return d
            return String(a?.name || '').localeCompare(String(b?.name || ''), 'fa')
        })
        .map((cat) => {
            if (!cat || typeof cat !== 'object') return cat
            const { _sortKey, ...rest } = cat
            return rest
        })
}

/**
 * Full external order:
 * 101 → AIO/other → Anime → IPTV (always last)
 * Inside 101: trend/popular → Korean/Chinese → rest → streaming platforms
 */
export function sortExternalCatalogs(catalogs, sourcesWithCatalogs = null) {
    // Backward-compatible: flat list without source tags — apply within-group score only
    if (!sourcesWithCatalogs) {
        return sortCatalogsWithinGroup(catalogs)
    }
    return catalogs
}


/** Pull every Netflix catalog, then every Crunchyroll, into one contiguous block
 *  (Netflix movies/series first, then all Crunchyroll) so order is stable across
 *  101 / AIO / anime source groups — same in Stremio and Nuvio.
 */
function pinNetflixThenCrunchyroll(catalogs) {
    if (!Array.isArray(catalogs) || catalogs.length < 2) return catalogs || []
    const netflix = []
    const crunchy = []
    const rest = []
    let insertAt = -1
    for (const cat of catalogs) {
        const blob = `${cat?.name || ''} ${cat?.id || ''} ${cat?._sortKey || ''}`.toLowerCase()
        const isNetflix = /netflix|نتفلیکس/i.test(blob)
        const isCrunchy = !isNetflix && /crunchyroll|crunchy|کرانچی/i.test(blob)
        if (isNetflix) {
            if (insertAt < 0) insertAt = rest.length
            netflix.push(cat)
        } else if (isCrunchy) {
            if (insertAt < 0) insertAt = rest.length
            crunchy.push(cat)
        } else {
            rest.push(cat)
        }
    }
    if (!netflix.length && !crunchy.length) return catalogs
    const typeRank = (c) => {
        const t = String(c?.type || '')
        if (t === 'movie') return 0
        if (t === 'series' || t === 'tv') return 1
        return 2
    }
    netflix.sort((a, b) => typeRank(a) - typeRank(b) || String(a?.name || '').localeCompare(String(b?.name || ''), 'en'))
    crunchy.sort((a, b) => typeRank(a) - typeRank(b) || String(a?.name || '').localeCompare(String(b?.name || ''), 'en'))
    const at = insertAt < 0 ? rest.length : insertAt
    return [...rest.slice(0, at), ...netflix, ...crunchy, ...rest.slice(at)]
}

export function buildOrderedExternalCatalogs(externalSources, mapFn) {
    const buckets = {
        '101': [],
        aio: [],
        other: [],
        anime: [],
        iptv: [],
    }
    const looksIptv = (cat, sourceGroup) => {
        if (sourceGroup === 'iptv') return true
        const blob = `${cat?.name || ''} ${cat?.id || ''} ${cat?._sortKey || ''}`.toLowerCase()
        return /iptv|ماهواره|satellite|live\s*channels?|پخش\s*زنده|iptvbridge/i.test(blob)
    }
    for (const source of externalSources || []) {
        const group = classifyExternalCatalogSource(source)
        const list = Array.isArray(source.catalogs) ? source.catalogs : []
        for (const catalog of list) {
            const mapped = typeof mapFn === 'function' ? mapFn(catalog, source) : {...catalog}
            if (!mapped) continue
            // Preserve original EN name/id for reliable sort after FA translate
            mapped._sortKey = `${catalog?.name || ''} ${catalog?.id || ''}`
            const dest = looksIptv(mapped, group) ? 'iptv' : group
            buckets[dest].push(mapped)
        }
    }
    const main = pinNetflixThenCrunchyroll([
        ...sortCatalogsWithinGroup(buckets['101']),
        ...sortCatalogsWithinGroup(buckets.aio),
        ...sortCatalogsWithinGroup(buckets.other),
        ...sortCatalogsWithinGroup(buckets.anime),
    ])
    return [
        ...main,
        ...sortCatalogsWithinGroup(buckets.iptv),
    ]
}


export async function getTMDBDetails(type, tmdbId, httpClient = axios, apiKey, logger = console) {
    if (!apiKey || !tmdbId) {
        return null
    }
    const kind = (type === 'series' || type === 'tv') ? 'tv' : 'movie'
    try {
        const data = (await tmdbRequest(
            `${kind}/${tmdbId}`,
            {append_to_response: 'external_ids'},
            httpClient,
            apiKey,
            logger,
        )) ?? {}
        const title = data.title || data.name || data.original_title || data.original_name || null
        const imdbId = data.external_ids?.imdb_id
            || data.imdb_id
            || null
        return {
            title,
            imdbId: imdbId && /^tt\d+$/.test(imdbId) ? imdbId : null,
            year: (data.release_date || data.first_air_date || '').slice(0, 4) || null,
        }
    } catch (error) {
        logAxiosError(error, logger, 'Unable to get TMDB details')
        return null
    }
}

export async function getTMDBTitle(type, tmdbId, httpClient = axios, apiKey, logger = console) {
    const details = await getTMDBDetails(type, tmdbId, httpClient, apiKey, logger)
    return details?.title ?? null
}

export async function getKitsuTitle(kitsuId, httpClient = axios, logger = console) {
    const numericId = String(kitsuId ?? '').match(/(\d+)$/)?.[1]
    if (!numericId) {
        return null
    }
    try {
        const response = await httpClient.get(`https://kitsu.io/api/edge/anime/${numericId}`, {
            timeout: REQUEST_TIMEOUT_MS,
        })
        const attrs = response.data?.data?.attributes
        return attrs?.canonicalTitle || attrs?.titles?.en || attrs?.titles?.en_jp || null
    } catch (error) {
        logAxiosError(error, logger, 'Unable to get Kitsu title')
        return null
    }
}

// User-provided SubSource subtitle addon (subsource.net) — each self-hoster
// configures SUBSOURCE_MANIFEST_URL with their own personalized manifest link
// (generated on subsource's own configure page, language preference baked
// into the URL itself), we just proxy /subtitles requests straight through.
export async function proxySubtitles(manifestUrl, type, id, extraPath, httpClient = axios, logger = console) {
    if (!manifestUrl) {
        return null
    }
    const baseUrl = manifestUrl.replace(/\/manifest\.json.*$/, '')
    const suffix = extraPath ? `/${extraPath}` : ''
    const url = `${baseUrl}/subtitles/${type}/${encodeURIComponent(id)}${suffix}.json`
    try {
        const response = await httpClient.get(url, {timeout: REQUEST_TIMEOUT_MS})
        return response.data ?? {subtitles: []}
    } catch (error) {
        logAxiosError(error, logger, 'SubSource subtitle proxy failed')
        return {subtitles: []}
    }
}

// External catalog aggregation (e.g. 101Catalogs)
//
// Merges another Stremio addon's catalog list into ours and transparently
// proxies catalog requests to it. These catalogs return standard IMDb
// ("tt"-prefixed) ids, so our existing IMDb-based stream lookup
// (imdbStreamResponse / the main-page flow) already handles playback for
// them automatically — nothing else needs to change for streams to work.
// ---------------------------------------------------------------------------

const EXTERNAL_CATALOGS_TTL_MS = 45 * 1_000 // 45s — AIO configs change often
const EXTERNAL_CATALOG_FAST_MS = 20_000
const EXTERNAL_CATALOG_ANIME_MS = 35_000
/** Soft budget on the critical path so a slow anime host does not delay the whole manifest */
const EXTERNAL_CATALOG_SOFT_WAIT_MS = 4_000

/**
 * AIOCatalogs (and similar) put a JSON blob in the path.
 * Vercel env may store it decoded; axios may mangle braces or double-encode %.
 * Decode path segments fully, then encode once.
 */
export function normalizeExternalManifestUrl(raw) {
    let cleaned = String(raw || '').trim()
    if (
        (cleaned.startsWith('"') && cleaned.endsWith('"'))
        || (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
        cleaned = cleaned.slice(1, -1).trim()
    }
    if (!cleaned) return ''
    try {
        const u = new URL(cleaned)
        const parts = u.pathname.split('/').map((seg) => {
            if (!seg) return ''
            let decoded = seg
            for (let i = 0; i < 4; i++) {
                try {
                    const next = decodeURIComponent(decoded)
                    if (next === decoded) break
                    decoded = next
                } catch {
                    break
                }
            }
            // Encode the whole segment (JSON blob, uuid, "manifest.json", …)
            return encodeURIComponent(decoded)
        })
        u.pathname = parts.join('/')
        u.hash = ''
        return u.toString()
    } catch {
        return cleaned
    }
}

/** @type {{timestamp:number, key:string, sources:any[], failed:string[]} | null} */
let externalCatalogsCache = null
/** In-flight anime (or other slow) fetches so concurrent requests share one promise */
const externalInflight = new Map()
/** @type {Map<string, string>} */
const externalCatalogLastError = new Map()

function externalManifestUrls(env) {
    // Order is intentional and must not be reshuffled:
    // 1) 101  2) AIOCatalogs  3) TMDB catalogs  4) Anime  5) IPTV/satellite
    // If 101 is unset, AIO naturally takes the first slot among dedicated URLs.
    const dedicated = [
        env.CATALOG101_MANIFEST_URL,
        env.CATALOG_AIO_MANIFEST_URL || env.CATALOG_AIOCATALOGS_MANIFEST_URL,
        env.CATALOG_TMDB_MANIFEST_URL,
        env.CATALOG_ANIME_MANIFEST_URL,
        env.CATALOG_IPTVBRIDGE_MANIFEST_URL,
    ]
    const extra = String(env.EXTERNAL_CATALOG_MANIFEST_URLS || '')
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean)
    const seen = new Set()
    const out = []
    for (const url of [...dedicated, ...extra]) {
        const cleaned = normalizeExternalManifestUrl(url)
        if (!cleaned || seen.has(cleaned)) continue
        seen.add(cleaned)
        out.push(cleaned)
    }
    return out
}

function isSlowExternalCatalogUrl(manifestUrl, env = {}) {
    // Only the dedicated anime catalog is soft-deferred. AIO / 101 / IPTV stay on the critical path.
    const anime = String(env.CATALOG_ANIME_MANIFEST_URL || '').trim()
    if (anime && manifestUrl === anime) return true
    try {
        const host = new URL(manifestUrl).hostname.toLowerCase()
        if (host.includes('anime-catalog') || host.includes('animecatalog')) return true
    } catch { /* ignore */ }
    // path segment strongly indicates the community anime catalogs addon
    if (/stremio-anime-catalogs|myanimelist_top/i.test(manifestUrl)) return true
    return false
}

function catalogBaseUrl(manifestUrl) {
    try {
        const u = new URL(normalizeExternalManifestUrl(manifestUrl) || manifestUrl)
        u.hash = ''
        u.search = ''
        let path = u.pathname.replace(/\/manifest\.json$/i, '')
        if (path.endsWith('/')) path = path.slice(0, -1)
        u.pathname = path || '/'
        return u.toString().replace(/\/$/, '')
    } catch {
        return String(manifestUrl).replace(/\/manifest\.json.*$/i, '')
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchOneExternalCatalog(manifestUrl, httpClient, logger, timeoutMs) {
    const primary = normalizeExternalManifestUrl(manifestUrl)
    const candidates = [primary]
    // pantelx and workers.dev can diverge; always try both and pick the richer manifest.
    try {
        const u = new URL(primary)
        if (/(^|\.)aio\.pantelx\.com$/i.test(u.hostname)) {
            const alt = new URL(primary)
            alt.hostname = 'aiocatalogs.jqrw92fchz.workers.dev'
            candidates.push(alt.toString())
        } else if (/(^|\.)aiocatalogs\.jqrw92fchz\.workers\.dev$/i.test(u.hostname)) {
            const alt = new URL(primary)
            alt.hostname = 'aio.pantelx.com'
            candidates.push(alt.toString())
        }
    } catch { /* ignore */ }

    async function fetchManifest(url) {
        let fetchUrl = url
        try {
            const bu = new URL(url)
            bu.searchParams.set('_cg', String(Date.now()))
            fetchUrl = bu.toString()
        } catch { /* keep */ }

        if (typeof fetch === 'function') {
            const ctrl = new AbortController()
            const timer = setTimeout(() => ctrl.abort(), timeoutMs)
            try {
                const response = await fetch(fetchUrl, {
                    signal: ctrl.signal,
                    headers: {
                        Accept: 'application/json,text/plain,*/*',
                        'User-Agent': 'Mozilla/5.0 (compatible; Cinemagraphy/2.1.15; +https://cinemagraphy.vercel.app)',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Cache-Control': 'no-cache',
                        Pragma: 'no-cache',
                    },
                    redirect: 'follow',
                    cache: 'no-store',
                })
                if (!response.ok) {
                    const err = new Error(`HTTP ${response.status}`)
                    err.response = {status: response.status}
                    throw err
                }
                const manifest = await response.json()
                return {url, manifest}
            } finally {
                clearTimeout(timer)
            }
        }

        const response = await httpClient.get(fetchUrl, {
            timeout: timeoutMs,
            headers: {
                Accept: 'application/json,text/plain,*/*',
                'User-Agent': 'Mozilla/5.0 (compatible; Cinemagraphy/2.1.15; +https://cinemagraphy.vercel.app)',
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
            },
            validateStatus: (s) => s >= 200 && s < 300,
            maxRedirects: 5,
        })
        return {url, manifest: response.data ?? {}}
    }

    const settled = await Promise.all(
        candidates.map(async (url) => {
            try {
                return {ok: true, ...(await fetchManifest(url))}
            } catch (error) {
                logger.warn?.('External catalog candidate failed', {
                    url,
                    message: error?.message,
                    status: error?.response?.status,
                })
                return {ok: false, url, error}
            }
        }),
    )

    const successes = settled.filter((row) => row.ok && row.manifest && typeof row.manifest === 'object')
    if (!successes.length) {
        const last = settled.find((row) => row.error)?.error
        throw last || new Error('External catalog manifest fetch failed')
    }

    // Prefer more catalogs (AIO UI vs stale edge), then prefer primary host match
    successes.sort((a, b) => {
        const na = Array.isArray(a.manifest.catalogs) ? a.manifest.catalogs.length : 0
        const nb = Array.isArray(b.manifest.catalogs) ? b.manifest.catalogs.length : 0
        if (nb !== na) return nb - na
        if (a.url === primary) return -1
        if (b.url === primary) return 1
        return 0
    })

    const best = successes[0]
    const usedUrl = best.url
    const manifest = best.manifest
    const catalogs = Array.isArray(manifest.catalogs) ? manifest.catalogs : []
    if (!catalogs.length) {
        logger.warn?.('External catalog manifest has no catalogs', {manifestUrl: usedUrl})
    } else {
        logger.info?.('External catalog selected', {
            primary,
            usedUrl,
            catalogs: catalogs.length,
            tried: successes.map((s) => ({
                url: s.url,
                n: Array.isArray(s.manifest.catalogs) ? s.manifest.catalogs.length : 0,
            })),
        })
    }
    const metaResource = (manifest.resources ?? []).find((r) => (
        r === 'meta' || r?.name === 'meta'
    ))
    const streamResource = (manifest.resources ?? []).find((r) => (
        r === 'stream' || r?.name === 'stream'
    ))
    // Merge top-level + per-resource idPrefixes (IPTV Bridge declares iptv: on meta/stream)
    const prefixSet = new Set()
    for (const p of (manifest.idPrefixes ?? [])) {
        if (p != null && String(p)) prefixSet.add(String(p))
    }
    for (const res of (manifest.resources ?? [])) {
        if (res && typeof res === 'object' && Array.isArray(res.idPrefixes)) {
            for (const p of res.idPrefixes) {
                if (p != null && String(p)) prefixSet.add(String(p))
            }
        }
    }
    const idPrefixes = [...prefixSet]
    return {
        baseUrl: catalogBaseUrl(usedUrl),
        catalogIds: new Set(catalogs.map((catalog) => catalog.id)),
        catalogs,
        idPrefixes,
        hasMeta: Boolean(metaResource),
        hasStream: Boolean(streamResource),
        metaIdPrefixes: Array.isArray(metaResource?.idPrefixes) ? metaResource.idPrefixes.map(String) : idPrefixes,
        streamIdPrefixes: Array.isArray(streamResource?.idPrefixes) ? streamResource.idPrefixes.map(String) : idPrefixes,
        manifestUrl: primary,
        resolvedUrl: usedUrl,
        group: null, // filled by caller optionally
    }
}


function rememberSource(source) {
    if (!source?.manifestUrl) return
    const key = source.manifestUrl
    if (!externalCatalogsCache) {
        externalCatalogsCache = {
            timestamp: Date.now(),
            key: key,
            sources: [source],
            failed: [],
        }
        externalCatalogLastError.delete(key)
        return
    }
    const sources = [...(externalCatalogsCache.sources || [])]
    const idx = sources.findIndex((s) => s.manifestUrl === key || s.resolvedUrl === source.resolvedUrl)
    if (idx >= 0) sources[idx] = source
    else sources.push(source)
    const failed = (externalCatalogsCache.failed || []).filter((u) => u !== key)
    externalCatalogsCache = {
        ...externalCatalogsCache,
        timestamp: Date.now(),
        sources,
        failed,
    }
    externalCatalogLastError.delete(key)
}

export function invalidateExternalCatalogCache() {
    externalCatalogsCache = null
}

export async function getExternalCatalogSources(env = {}, httpClient = axios, logger = console) {
    const manifestUrls = externalManifestUrls(env)
    if (!manifestUrls.length) {
        return []
    }

    const now = Date.now()
    const cacheKey = manifestUrls.join('|')
    const cacheFresh = (
        externalCatalogsCache
        && externalCatalogsCache.key === cacheKey
        && now - externalCatalogsCache.timestamp < EXTERNAL_CATALOGS_TTL_MS
    )
    const cachedSources = cacheFresh ? (externalCatalogsCache.sources || []) : []
    const cachedByUrl = new Map(cachedSources.map((s) => [s.manifestUrl, s]))

    const fastUrls = []
    const slowUrls = []
    for (const url of manifestUrls) {
        if (cachedByUrl.has(url)) continue
        if (isSlowExternalCatalogUrl(url, env)) slowUrls.push(url)
        else fastUrls.push(url)
    }

    // Fast catalogs — full wait (short timeout)
    if (fastUrls.length) {
        const fastSettled = await Promise.all(
            fastUrls.map(async (manifestUrl) => {
                try {
                    const source = await fetchOneExternalCatalog(
                        manifestUrl, httpClient, logger, EXTERNAL_CATALOG_FAST_MS,
                    )
                    externalCatalogLastError.delete(manifestUrl)
                    return {ok: true, manifestUrl, source}
                } catch (error) {
                    const msg = error?.message || String(error)
                    externalCatalogLastError.set(manifestUrl, msg)
                    logAxiosError(error, logger, `External catalog manifest fetch failed (${manifestUrl})`)
                    return {ok: false, manifestUrl}
                }
            }),
        )
        for (const row of fastSettled) {
            if (row.ok) cachedByUrl.set(row.manifestUrl, row.source)
        }
    }

    // Anime catalog can be slow; wait the full anime timeout (do not soft-drop it).
    for (const manifestUrl of slowUrls) {
        try {
            const source = await fetchOneExternalCatalog(
                manifestUrl, httpClient, logger, EXTERNAL_CATALOG_ANIME_MS,
            )
            externalCatalogLastError.delete(manifestUrl)
            rememberSource(source)
            cachedByUrl.set(manifestUrl, source)
        } catch (error) {
            const msg = error?.message || String(error)
            externalCatalogLastError.set(manifestUrl, msg)
            logAxiosError(error, logger, `External catalog manifest fetch failed (${manifestUrl})`)
        }
    }

    const sources = manifestUrls.map((url) => cachedByUrl.get(url)).filter(Boolean)
    const failed = manifestUrls.filter((url) => !cachedByUrl.has(url) && !externalInflight.has(url))
    externalCatalogsCache = {
        timestamp: now,
        key: cacheKey,
        sources,
        failed,
    }
    return sources
}


/** Safe status snapshot for /providers.json (no secrets, host only). */
export function getExternalCatalogStatus(env = {}) {
    const urls = externalManifestUrls(env)
    const cache = externalCatalogsCache
    const sources = cache?.sources || []
    const byUrl = new Map()
    for (const s of sources) {
        if (s.manifestUrl) byUrl.set(s.manifestUrl, s)
        if (s.resolvedUrl) byUrl.set(s.resolvedUrl, s)
    }
    const failed = new Set(cache?.failed || [])
    return urls.map((url) => {
        let host = url
        try { host = new URL(url).host } catch { /* keep */ }
        const src = byUrl.get(url)
        const err = externalCatalogLastError.get(url)
        let resolvedHost = null
        try {
            if (src?.resolvedUrl) resolvedHost = new URL(src.resolvedUrl).host
        } catch { /* ignore */ }
        return {
            host,
            resolvedHost: resolvedHost && resolvedHost !== host ? resolvedHost : null,
            ok: Boolean(src),
            catalogs: src ? (src.catalogs?.length || 0) : 0,
            pending: externalInflight.has(url),
            failed: (failed.has(url) || Boolean(err)) && !src,
            error: src ? null : (err || null),
        }
    })
}

export async function proxyExternalCatalog(source, type, id, extraPath, httpClient = axios, logger = console) {
    const suffix = extraPath ? `/${extraPath}` : ''
    const url = `${source.baseUrl}/catalog/${type}/${id}${suffix}.json`
    try {
        const response = await httpClient.get(url, {timeout: REQUEST_TIMEOUT_MS})
        return response.data ?? {metas: []}
    } catch (error) {
        logAxiosError(error, logger, 'External catalog proxy failed')
        return {metas: []}
    }
}

// For external sources whose items use a non-IMDb id (e.g. Anime Catalogs'
// "kitsu:" ids), Cinemeta has no entry, so we pass the meta request straight
// through to that addon's own /meta endpoint instead.
function sourceMatchesId(source, id, kind = 'any') {
    if (!source || !id) return false
    const prefixes = kind === 'meta'
        ? (source.metaIdPrefixes || source.idPrefixes || [])
        : kind === 'stream'
            ? (source.streamIdPrefixes || source.idPrefixes || [])
            : (source.idPrefixes || [])
    if (Array.isArray(prefixes) && prefixes.length) {
        if (prefixes.some((prefix) => id.startsWith(prefix))) return true
    }
    // IPTV Bridge channel ids always use iptv:
    if (id.startsWith('iptv:') && /iptvbridge|iptv/i.test(`${source.manifestUrl || ''} ${source.baseUrl || ''} ${source.resolvedUrl || ''}`)) {
        return true
    }
    return false
}

export function findExternalMetaSource(sources, id) {
    return (sources || []).find((source) => source.hasMeta && sourceMatchesId(source, id, 'meta'))
}

export async function proxyExternalMeta(source, type, id, httpClient = axios, logger = console) {
    const encoded = encodeURIComponent(id)
    const candidates = [
        `${source.baseUrl}/meta/${type}/${encoded}.json`,
        `${source.baseUrl}/meta/${type}/${id}.json`,
    ]
    for (const url of candidates) {
        try {
            const response = await httpClient.get(url, {timeout: REQUEST_TIMEOUT_MS})
            if (response.data?.meta) return response.data
            if (response.data && Object.keys(response.data).length) return response.data
        } catch (error) {
            logAxiosError(error, logger, `External meta proxy failed (${url})`)
        }
    }
    return {}
}

// IPTV Bridge and similar: own channel ids — proxy stream byte-for-byte.
export function findExternalStreamSource(sources, id) {
    return (sources || []).find((source) => source.hasStream && sourceMatchesId(source, id, 'stream'))
}

export async function proxyExternalStream(source, type, id, extraPath, httpClient = axios, logger = console) {
    const suffix = extraPath ? `/${extraPath}` : ''
    const encoded = encodeURIComponent(id)
    const candidates = [
        `${source.baseUrl}/stream/${type}/${encoded}${suffix}.json`,
        `${source.baseUrl}/stream/${type}/${id}${suffix}.json`,
    ]
    for (const url of candidates) {
        try {
            const response = await httpClient.get(url, {timeout: REQUEST_TIMEOUT_MS})
            if (Array.isArray(response.data?.streams)) return response.data
            if (response.data) return response.data
        } catch (error) {
            logAxiosError(error, logger, `External stream proxy failed (${url})`)
        }
    }
    return {streams: []}
}

// ---------------------------------------------------------------------------
// Torrent provider (Meteor for the Weebs, or any similar manifest-based
// torrent/debrid addon) — appended AFTER Iranian provider streams, never
// before. We only touch the display text (title/name); url, infoHash,
// fileIdx, sources, and behaviorHints (all of which Stremio's torrent/debrid
// engine actually needs to play the stream) are passed through untouched.
// ---------------------------------------------------------------------------

const TORRENT_SOURCE_TTL_MS = 60 * 60 * 1_000
let torrentSourceCache = null

async function getTorrentSource(env, httpClient, logger) {
    const manifestUrl = env.TORRENT_METEOR_MANIFEST_URL
    if (!manifestUrl) {
        logger.info('Torrent provider: TORRENT_METEOR_MANIFEST_URL is not set')
        return null
    }

    const now = Date.now()
    if (torrentSourceCache && now - torrentSourceCache.timestamp < TORRENT_SOURCE_TTL_MS) {
        return torrentSourceCache.source
    }

    try {
        const response = await httpClient.get(manifestUrl, {timeout: REQUEST_TIMEOUT_MS})
        const manifest = response.data ?? {}
        const baseUrl = manifestUrl.replace(/\/manifest\.json.*$/, '')

        // idPrefixes can be declared per-resource (on the "stream" entry) or
        // manifest-wide — per-resource takes priority per the Stremio spec.
        // Only filter by prefix if we actually found one; otherwise try every id
        // rather than risk silently skipping valid results with a guessed default.
        const streamResource = (manifest.resources ?? []).find((r) => r?.name === 'stream')
        const idPrefixes = streamResource?.idPrefixes ?? manifest.idPrefixes ?? null

        const source = {baseUrl, idPrefixes: Array.isArray(idPrefixes) ? idPrefixes : []}
        logger.info('Torrent provider manifest resolved', {
            baseUrl,
            idPrefixes: source.idPrefixes,
            resources: manifest.resources,
        })
        torrentSourceCache = {timestamp: now, source}
        return source
    } catch (error) {
        logAxiosError(error, logger, 'Meteor torrent manifest fetch failed')
        return torrentSourceCache?.source ?? null
    }
}

function extractSeeders(text) {
    const match = text.match(/👤\s*(\d+)|🌱\s*(\d+)|seeds?:?\s*(\d+)/i)
    const value = match?.[1] ?? match?.[2] ?? match?.[3]
    return value != null ? Number(value) : null
}

function extractPeers(text) {
    const match = text.match(/👥\s*(\d+)|peers?:?\s*(\d+)|leech(?:ers)?:?\s*(\d+)/i)
    const value = match?.[1] ?? match?.[2] ?? match?.[3]
    return value != null ? Number(value) : null
}

function extractTorrentSize(text) {
    return text.match(/(\d+(?:\.\d+)?\s*(?:GB|MB))/i)?.[1] ?? null
}

// Fetches Meteor's raw streams for this id and re-renders them with
// CinemaGraphy's own formatting/branding. Resilient by design: any failure
// (bad manifest, timeout, unexpected shape) just yields an empty array —
// the caller appends this to the Iranian providers' results, so a Meteor
// outage never affects anything else.
export async function getTorrentStreams(type, id, env = {}, httpClient = axios, logger = console) {
    const source = await getTorrentSource(env, httpClient, logger)
    if (!source) {
        logger.info('Torrent provider not configured or manifest unreachable')
        return []
    }
    if (source.idPrefixes.length && !source.idPrefixes.some((prefix) => id.startsWith(prefix))) {
        logger.info('Torrent provider skipped id (idPrefixes mismatch)', {id, idPrefixes: source.idPrefixes})
        return []
    }

    try {
        const url = `${source.baseUrl}/stream/${type}/${encodeURIComponent(id)}.json`
        const response = await httpClient.get(url, {timeout: REQUEST_TIMEOUT_MS})
        const streams = Array.isArray(response.data?.streams) ? response.data.streams : []
        logger.info('Torrent provider response', {url, status: response.status, streamCount: streams.length})

        return streams.map((raw) => ({
            ...raw,
            // Light-touch branding only — the original name/description (which
            // Meteor already fills with quality/size/seeders/audio info) are left
            // completely untouched. Earlier attempts to reformat them (adding a
            // separate `title` field alongside Meteor's own name/description)
            // caused Stremio to silently drop these streams in every client.
            name: (() => {
                const brand = getUiLangPref() === 'en' ? 'CinemaGraphy' : 'سینماگرافی'
                return raw.name ? `${brand} | ${raw.name}` : `${brand} [P2P]`
            })(),
        }))
    } catch (error) {
        logAxiosError(error, logger, 'Meteor torrent streams fetch failed')
        return []
    }
}

export function modifyUrls(value, prepend, seen = new WeakSet()) {
    if (typeof value !== 'object' || value === null) {
        return value
    }
    if (seen.has(value)) {
        return value
    }
    seen.add(value)

    const result = Array.isArray(value) ? [] : {}
    for (const [key, child] of Object.entries(value)) {
        if (typeof child === 'string' && /^https?:\/\//i.test(child)) {
            result[key] = `${prepend}${encodeURIComponent(child)}`
        } else {
            result[key] = modifyUrls(child, prepend, seen)
        }
    }
    return result
}


// ---------------------------------------------------------------------------
// Landing-only TMDB catalogs (NOT added to Stremio manifest)
// ---------------------------------------------------------------------------

const LANDING_TMDB_TTL_MS = 60 * 60 * 1000 // 1 hour
let landingTmdbCache = null

function mapTmdbListItem(item, mediaTypeHint = null, itemEn = null) {
    const mediaType = item.media_type || mediaTypeHint || (item.title ? 'movie' : 'tv')
    const titleFa = String(item.title || item.name || '').trim() || null
    const titleEn = String(itemEn?.title || itemEn?.name || titleFa || '').trim() || null
    const title = preferFaThenEn(titleFa, titleEn)
    const overviewFa = String(item.overview || '').trim() || null
    const overviewEn = String(itemEn?.overview || overviewFa || '').trim() || null
    const overview = preferFaThenEn(overviewFa, overviewEn)
    const original = item.original_title || item.original_name || itemEn?.original_title || itemEn?.original_name || null
    const year = (item.release_date || item.first_air_date || itemEn?.release_date || itemEn?.first_air_date || '').slice(0, 4) || null
    const pathFa = item.poster_path || itemEn?.poster_path || null
    const pathEn = itemEn?.poster_path || item.poster_path || null
    const bgFa = item.backdrop_path || itemEn?.backdrop_path || null
    const bgEn = itemEn?.backdrop_path || item.backdrop_path || null
    // Default fields follow server meta pref; client landing can switch via *Fa/*En
    const posterPath = _metaLangPref === 'en' ? pathEn : pathFa
    const backdropPath = _metaLangPref === 'en' ? bgEn : bgFa
    const toPoster = (p) => (p ? `https://image.tmdb.org/t/p/w342${p}` : null)
    const toBg = (p) => (p ? `https://image.tmdb.org/t/p/w780${p}` : null)
    return {
        id: item.id,
        mediaType: mediaType === 'tv' ? 'tv' : 'movie',
        title,
        titleFa: titleFa || title,
        titleEn: titleEn || title,
        originalTitle: original && original !== title ? original : null,
        overview,
        overviewFa: overviewFa || overview,
        overviewEn: overviewEn || overview,
        rating: item.vote_average != null ? Math.round(item.vote_average * 10) / 10 : null,
        year,
        poster: toPoster(posterPath),
        posterFa: toPoster(pathFa),
        posterEn: toPoster(pathEn),
        backdrop: toBg(backdropPath),
        backdropFa: toBg(bgFa),
        backdropEn: toBg(bgEn),
    }
}

async function tmdbListMerged(path, params, httpClient, apiKey) {
    const [faRows, enRows] = await Promise.all([
        tmdbList(path, {...params, language: 'fa-IR'}, httpClient, apiKey).catch(() => []),
        tmdbList(path, {...params, language: 'en-US'}, httpClient, apiKey).catch(() => []),
    ])
    const enById = new Map((enRows || []).map((r) => [r.id, r]))
    return (faRows || []).map((row) => mapTmdbListItem(row, null, enById.get(row.id)))
}

async function tmdbList(path, params, httpClient, apiKey) {
    const data = await tmdbRequest(path, {language: 'fa-IR', ...params}, httpClient, apiKey)
    return Array.isArray(data?.results) ? data.results : []
}

async function tmdbVideos(mediaType, id, httpClient, apiKey) {
    try {
        const kind = mediaType === 'tv' ? 'tv' : 'movie'
        const data = await tmdbRequest(`${kind}/${id}/videos`, {language: 'en-US'}, httpClient, apiKey)
        const results = Array.isArray(data?.results) ? data.results : []
        const trailer = results.find((v) => v.site === 'YouTube' && /trailer/i.test(v.type))
            || results.find((v) => v.site === 'YouTube')
        return trailer ? {key: trailer.key, name: trailer.name, site: trailer.site} : null
    } catch {
        return null
    }
}

/**
 * Cached TMDB showcase data for the landing page only.
 * Never throws a hard failure — returns empty sections on error.
 */
export async function getLandingTmdbCatalogs(httpClient = axios, apiKey = process.env.TMDB_API_KEY, logger = console) {
    if (!apiKey) {
        return {
            ok: false,
            reason: 'TMDB_API_KEY missing',
            checkedAt: new Date().toISOString(),
            trendingDay: [],
            trendingWeek: [],
            nowPlaying: [],
            trailers: [],
        }
    }

    if (landingTmdbCache && Date.now() - landingTmdbCache.at < LANDING_TMDB_TTL_MS) {
        return landingTmdbCache.payload
    }

    try {
        const [trendingDay, trendingWeek, nowPlaying] = await Promise.all([
            tmdbListMerged('trending/all/day', {page: 1}, httpClient, apiKey).then((rows) => rows.slice(0, 12)),
            tmdbListMerged('trending/all/week', {page: 1}, httpClient, apiKey).then((rows) => rows.slice(0, 12)),
            tmdbListMerged('movie/now_playing', {page: 1, region: 'US'}, httpClient, apiKey).then((rows) => (
                rows.slice(0, 12).map((row) => ({...row, mediaType: 'movie'}))
            )),
        ])

        // Trailers from top trending day items (limit concurrent video lookups)
        const trailerSource = trendingDay.slice(0, 8)
        const trailerSettled = await Promise.all(
            trailerSource.map(async (item) => {
                const video = await tmdbVideos(item.mediaType, item.id, httpClient, apiKey)
                if (!video?.key) return null
                return {...item, trailer: video}
            }),
        )
        const trailers = trailerSettled.filter(Boolean).slice(0, 6)

        const payload = {
            ok: true,
            checkedAt: new Date().toISOString(),
            cacheTtlMs: LANDING_TMDB_TTL_MS,
            trendingDay,
            trendingWeek,
            nowPlaying,
            trailers,
        }
        landingTmdbCache = {at: Date.now(), payload}
        return payload
    } catch (error) {
        logAxiosError(error, logger, 'Landing TMDB catalogs failed')
        if (landingTmdbCache?.payload) {
            return {...landingTmdbCache.payload, stale: true}
        }
        return {
            ok: false,
            reason: error?.message ?? 'tmdb error',
            checkedAt: new Date().toISOString(),
            trendingDay: [],
            trendingWeek: [],
            nowPlaying: [],
            trailers: [],
        }
    }
}
