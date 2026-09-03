import axios from 'axios'
import cors from 'cors'
import express from 'express'
import winston from 'winston'

import {readFileSync} from 'node:fs'
import {dirname, join} from 'node:path'
import {fileURLToPath} from 'node:url'

import {createErrorHandler} from './errorMiddleware.js'
import {landingUrlsFromRequest, renderLandingPage, renderGuidePage, renderConfigurePage} from './landing.js'
import Aslmoviez from './sources/aslmoviez.js'
import Cinamatic from './sources/cinamatic.js'
import Digimovie from './sources/digimovie.js'
import Avamovie from './sources/avamovie.js'
import Animex from './sources/animex.js'
import {
    isNamakadeEnabled,
    namakadeManifestCatalogs,
    namakadeListCatalog,
    namakadeGetMeta,
    namakadeGetStreams,
    NAMAKADE_PREFIX,
    decodeMediaProxyToken,
} from './sources/namakade.js'
import {
    isF2TurkishEnabled,
    f2turkishManifestCatalogs,
    f2turkishListCatalog,
    F2TURKISH_CATALOG_ID,
} from './sources/f2turkish.js'
import {
    isAnimexCatalogEnabled,
    animexCatalogManifestCatalogs,
    animexCatalogList,
    ANIMEX_CATALOG_ID,
} from './sources/animex-catalog.js'
import Donyayeserial from './sources/donyayeserial.js'
import F2Media, {DEFAULT_F2MEDIA_BASEURL} from './sources/f2media.js'
import Peepboxtv from './sources/peepboxtv.js'
import Serialblog from './sources/serialblog.js'
import {ID_SEPARATOR, METADATA_SOURCE} from './sources/source.js'
import {findExternalMetaSource, findExternalStreamSource, formatStreamTitle, getCinemeta, getExternalCatalogSources, getExternalCatalogStatus, invalidateExternalCatalogCache, getKitsuTitle, getSubtitle, getTMDBMetaFa, enrichMetaWithFaTmdb, enrichCatalogMetasWithoutRpdb, getTMDBMetaByTmdbId, getTMDBDetails, getTMDBTitle, getLandingTmdbCatalogs, getTorrentStreams, modifyUrls, proxyExternalCatalog, proxyExternalMeta, proxyExternalStream, proxySubtitles, translateCatalogName, buildOrderedExternalCatalogs, classifyExternalCatalogSource, rewriteTmdbImageUrls, parseTmdbImageProxyPath, tmdbRequest, setMetaLangPref, setUiLangPref} from './utils.js'
import {
    PROVIDER_BASEURL_KEYS,
    PROVIDER_KEY_TO_ENV,
    DEFAULT_IPTV_BRIDGE_MANIFEST_URL,
    isConfigFlagOn,
    decodeAddonConfig,
    mergeEnv,
} from './lib/config.js'
import {sortByQuality} from './lib/stream-format.js'
import {cacheStats} from './lib/cache.js'
import {configShareWarning} from './lib/security.js'
import {createRateLimitMiddleware} from './lib/rate-limit.js'
import {registerAdminRoutes} from './lib/admin.js'

export const ADDON_PREFIX = 'ip'
export const ADDON_VERSION = '3.2.8'

// Re-export config helpers for tests / external consumers
export {decodeAddonConfig, mergeEnv, DEFAULT_IPTV_BRIDGE_MANIFEST_URL, isConfigFlagOn}


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

export function createLogger(env = process.env) {
    return winston.createLogger({
        level: env.LOG_LEVEL || 'info',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        transports: [new winston.transports.Console()],
    })
}

export function createManifest(env = process.env) {
    const developmentSuffix = env.DEV_MODE === 'true' ? ' - DEV' : ''
    const streamsOnly = isConfigFlagOn(env, 'STREAMS_ONLY')
    const disableMeta = streamsOnly || isConfigFlagOn(env, 'DISABLE_META')
    const disableCatalog = streamsOnly || isConfigFlagOn(env, 'DISABLE_CATALOG')
    const disableSubs = isConfigFlagOn(env, 'DISABLE_SUBTITLES')
    const nameSuffix = String(env.ADDON_NAME_SUFFIX || '').trim()
        || (streamsOnly || (disableMeta && disableCatalog) ? ' · استریم' : '')
        || (disableMeta ? ' · بدون متا' : '')
        || (disableCatalog ? ' · بدون کاتالوگ' : '')

    const iptvEnabled = Boolean(String(env.CATALOG_IPTVBRIDGE_MANIFEST_URL || '').trim())
    const namakadeEnabled = isNamakadeEnabled(env)
    // Provider search catalogs (movie/series) — not IPTV
    const catalogs = disableCatalog
        ? []
        : CATALOGS.filter((cfg) => {
            const envKey = PROVIDER_KEY_TO_ENV[cfg.key]
            return Boolean(envKey && String(env[envKey] || '').trim())
        }).flatMap((cfg) => {
            const types = cfg.catalogType === 'tv' ? ['tv'] : ['movie', 'series']
            return types.map((type) => ({
                name: `${cfg.name}${developmentSuffix}`,
                type,
                id: `${cfg.key}_${cfg.catalogType === 'tv' ? 'tv' : (type === 'movie' ? 'movies' : 'series')}`,
                extra: [{name: 'search', isRequired: true}],
            }))
        })

    const resources = []
    // Catalog resource stays if movie catalogs OR IPTV/satellite catalogs are active
    if (!disableCatalog || iptvEnabled || namakadeEnabled) resources.push('catalog')
    if (!disableMeta) {
        resources.push({
            name: 'meta',
            types: ['series', 'movie', 'tv'],
            idPrefixes: [
                ADDON_PREFIX, 'tt', 'tmdb:', 'tmdb', 'kitsu:',
                ...(iptvEnabled ? ['iptv:'] : []),
                ...(namakadeEnabled ? [NAMAKADE_PREFIX] : []),
            ],
        })
    } else if (iptvEnabled || namakadeEnabled) {
        // STREAMS_ONLY / DISABLE_META must NOT kill IPTV / Namakade meta
        const prefixes = []
        if (iptvEnabled) prefixes.push('iptv:')
        if (namakadeEnabled) prefixes.push(NAMAKADE_PREFIX)
        resources.push({
            name: 'meta',
            types: ['tv', 'movie', 'series'],
            idPrefixes: prefixes,
        })
    }
    resources.push({
        name: 'stream',
        types: ['series', 'movie', 'tv'],
        idPrefixes: [
            ADDON_PREFIX, 'tt', 'kitsu:', 'tmdb:', 'tmdb',
            ...(iptvEnabled ? ['iptv:'] : []),
            ...(namakadeEnabled ? [NAMAKADE_PREFIX] : []),
        ],
    })
    if (!disableSubs) {
        resources.push({
            name: 'subtitles',
            types: ['series', 'movie'],
            idPrefixes: [ADDON_PREFIX, 'tt', 'kitsu:', 'tmdb:', 'tmdb'],
        })
    }

    const instanceId = (streamsOnly || (disableMeta && disableCatalog))
        ? 'com.cinemagraphy.stremio.streams'
        : 'com.cinemagraphy.stremio'

    const addonLang = String(env.ADDON_LANG || 'fa').trim().toLowerCase() === 'en' ? 'en' : 'fa'
    const nameBase = addonLang === 'en' ? 'CinemaGraphy' : 'سینماگرافی'
    let suffix = nameSuffix
    if (addonLang === 'en') {
        if (streamsOnly || (disableMeta && disableCatalog)) suffix = String(env.ADDON_NAME_SUFFIX || '').trim() || ' · Streams'
        else if (disableMeta) suffix = String(env.ADDON_NAME_SUFFIX || '').trim() || ' · No meta'
        else if (disableCatalog) suffix = String(env.ADDON_NAME_SUFFIX || '').trim() || ' · No catalogs'
        else suffix = String(env.ADDON_NAME_SUFFIX || '').trim()
    }
    let description
    if (addonLang === 'en') {
        description = (disableMeta && disableCatalog)
            ? 'CinemaGraphy — streams only from Iranian sources (use another addon for meta/catalogs).'
            : 'CinemaGraphy — movies & series from Iranian and international sources.'
    } else {
        description = (disableMeta && disableCatalog)
            ? 'سینماگرافی — فقط استریم از منابع ایرانی (متا/کاتالوگ از افزونه‌های دیگر).'
            : 'سینماگرافی — دانلود و تماشای فیلم و سریال از منابع ایرانی و بین‌المللی.'
    }

    return {
        id: instanceId,
        version: ADDON_VERSION,
        contactEmail: 'thenerdcow@gmail.com',
        description,
        logo: 'https://raw.githubusercontent.com/TheNerdCow/CinemaGraphy/refs/heads/master/logo.png',
        name: `${nameBase}${suffix}${developmentSuffix}`,
        catalogs,
        resources,
        types: ['movie', 'series', 'tv'],
        behaviorHints: {
            p2p: Boolean(env.TORRENT_METEOR_MANIFEST_URL),
            // Shows «Configure» next to Install in Stremio / Nuvio addon list
            configurable: true,
            configurationRequired: false,
        },
        stremioAddonsConfig: {
            issuer: 'https://stremio-addons.net',
            signature: 'eyJhbGciOiJkaXIiLCJlbmMiOiJBMTI4Q0JDLUhTMjU2In0..qYqYdUtntg-bF3wGDjsiww.IBIrE7RSO9aaALvNQROynW-pBh-OQLl3t-nFXqhEAO4AYl2qHvSGJWNP6WTwzU1yD8DjmYbnjDVdgkIDYw75MtInyH_cG0uEYr2VXEIGbHNZVlWlPH-C5go_8UyAMxCc.bM45Z1wp81dep2eCW5dt8A',
        },
    }
}

export function createProviders({env = process.env, logger = console, httpClient} = {}) {
    // Skip providers without a base URL so public instances don't waste time
    // on PeepBoxTV (paid) or any unconfigured source.
    const candidates = [
        new F2Media(env.F2MEDIA_BASEURL || DEFAULT_F2MEDIA_BASEURL, logger, httpClient, env),
        new Peepboxtv(env.PEEPBOXTV_BASEURL, logger, httpClient, env),
        new Cinamatic(env.CINAMATIC_BASEURL, logger, httpClient, env),
        new Aslmoviez(env.ASLMOVIEZ_BASEURL, logger, httpClient, env),
        new Serialblog(env.SERIALBLOG_BASEURL, logger, httpClient, env),
        new Digimovie(env.DIGIMOVIE_BASEURL, logger, httpClient, env),
        new Avamovie(env.AVAMOVIE_BASEURL, logger, httpClient, env),
        new Donyayeserial(env.DONYAYESERIAL_BASEURL, logger, httpClient),
        new Animex(env.ANIMEX_BASEURL, logger, httpClient),
    ]
    return candidates.filter((provider) => {
        const ok = Boolean(provider?.baseUrl)
        if (!ok) {
            logger.info?.(`Provider ${provider?.key ?? '?'} skipped (no BASEURL)`)
        }
        return ok
    })
}


/** Full registry for landing status — includes providers even if BASEURL missing. */
export const PROVIDER_REGISTRY = [
    {key: 'f2media', name: 'F2Media', envKey: 'F2MEDIA_BASEURL'},
    {key: 'peepboxtv', name: 'PeepBoxTv', envKey: 'PEEPBOXTV_BASEURL'},
    {key: 'cinamatic', name: 'Cinamatic', envKey: 'CINAMATIC_BASEURL'},
    {key: 'aslmoviez', name: 'AslMoviez', envKey: 'ASLMOVIEZ_BASEURL'},
    {key: 'serialblog', name: 'SerialBlog', envKey: 'SERIALBLOG_BASEURL'},
    {key: 'digimovie', name: 'DigiMovie', envKey: 'DIGIMOVIE_BASEURL'},
    {key: 'avamovie', name: 'AvaMovie', envKey: 'AVAMOVIE_BASEURL'},
    {key: 'donyayeserial', name: 'DonyayeSerial', envKey: 'DONYAYESERIAL_BASEURL'},
    {key: 'animex', name: 'Animex', envKey: 'ANIMEX_BASEURL'},
]

const PROVIDER_STATUS_TTL_MS = 5 * 60 * 1000
const PROVIDER_PROBE_TIMEOUT_MS = 4_000
let providerStatusCache = null

async function probeProviderUrl(url, httpClient) {
    const started = Date.now()
    try {
        const response = await httpClient.get(url, {
            timeout: PROVIDER_PROBE_TIMEOUT_MS,
            maxRedirects: 5,
            validateStatus: (status) => status > 0 && status < 500,
            headers: {
                'User-Agent': 'Cinemagraphy/2.0 (provider-status)',
                Accept: 'text/html,application/json,*/*',
            },
        })
        return {
            online: Boolean(response),
            latencyMs: Date.now() - started,
        }
    } catch {
        return {online: false, latencyMs: Date.now() - started}
    }
}

/**
 * Cached provider status for the landing page.
 * Never throws — individual probe failures mark that provider offline only.
 */
export async function getProvidersStatus(env = process.env, httpClient = axios) {
    const cacheHit = providerStatusCache && Date.now() - providerStatusCache.at < PROVIDER_STATUS_TTL_MS
    if (cacheHit) {
        // Provider probe cache stays, but always refresh external catalog snapshot
        try {
            // force re-fetch by clearing only external side is internal; call get again
            const externalCatalogs = await (async () => {
                invalidateExternalCatalogCache()
                await getExternalCatalogSources(env, httpClient)
                return getExternalCatalogStatus(env)
            })()
            const externalCatalogEnv = {
                CATALOG101_MANIFEST_URL: Boolean(String(env.CATALOG101_MANIFEST_URL || '').trim()),
                CATALOG_AIO_MANIFEST_URL: Boolean(String(env.CATALOG_AIO_MANIFEST_URL || env.CATALOG_AIOCATALOGS_MANIFEST_URL || '').trim()),
                CATALOG_TMDB_MANIFEST_URL: Boolean(String(env.CATALOG_TMDB_MANIFEST_URL || '').trim()),
                CATALOG_ANIME_MANIFEST_URL: Boolean(String(env.CATALOG_ANIME_MANIFEST_URL || '').trim()),
                CATALOG_IPTVBRIDGE_MANIFEST_URL: Boolean(String(env.CATALOG_IPTVBRIDGE_MANIFEST_URL || '').trim()),
                EXTERNAL_CATALOG_MANIFEST_URLS: Boolean(String(env.EXTERNAL_CATALOG_MANIFEST_URLS || '').trim()),
            }
            return {
                ...providerStatusCache.payload,
                checkedAt: new Date().toISOString(),
                externalCatalogs,
                externalCatalogEnv,
            }
        } catch {
            return providerStatusCache.payload
        }
    }

    const items = await Promise.all(
        PROVIDER_REGISTRY.map(async (entry) => {
            const baseUrl = String(env[entry.envKey] ?? '').trim()
            if (!baseUrl) {
                return {
                    key: entry.key,
                    name: entry.name,
                    configured: false,
                    online: false,
                    latencyMs: null,
                }
            }
            const probe = await probeProviderUrl(baseUrl, httpClient)
            return {
                key: entry.key,
                name: entry.name,
                configured: true,
                online: probe.online,
                latencyMs: probe.latencyMs,
            }
        }),
    )

    // Optional torrent companion (not an Iranian HTML provider)
    const torrentUrl = String(env.TORRENT_METEOR_MANIFEST_URL ?? '').trim()
    if (torrentUrl) {
        const probe = await probeProviderUrl(torrentUrl, httpClient)
        items.push({
            key: 'torrent',
            name: 'Torrent (Meteor)',
            configured: true,
            online: probe.online,
            latencyMs: probe.latencyMs,
        })
    } else {
        items.push({
            key: 'torrent',
            name: 'Torrent (Meteor)',
            configured: false,
            online: false,
            latencyMs: null,
        })
    }

    // Warm external catalog cache so /manifest.json can include AIO/101/anime quickly.
    let externalCatalogs = []
    try {
        invalidateExternalCatalogCache()
        await getExternalCatalogSources(env, httpClient)
        externalCatalogs = getExternalCatalogStatus(env)
    } catch {
        try {
            externalCatalogs = getExternalCatalogStatus(env)
        } catch {
            externalCatalogs = []
        }
    }

    // Which catalog env keys are present (boolean only — never leak URL values)
    const externalCatalogEnv = {
        CATALOG101_MANIFEST_URL: Boolean(String(env.CATALOG101_MANIFEST_URL || '').trim()),
        CATALOG_AIO_MANIFEST_URL: Boolean(String(env.CATALOG_AIO_MANIFEST_URL || env.CATALOG_AIOCATALOGS_MANIFEST_URL || '').trim()),
        CATALOG_TMDB_MANIFEST_URL: Boolean(String(env.CATALOG_TMDB_MANIFEST_URL || '').trim()),
        CATALOG_ANIME_MANIFEST_URL: Boolean(String(env.CATALOG_ANIME_MANIFEST_URL || '').trim()),
        CATALOG_IPTVBRIDGE_MANIFEST_URL: Boolean(String(env.CATALOG_IPTVBRIDGE_MANIFEST_URL || '').trim()),
        EXTERNAL_CATALOG_MANIFEST_URLS: Boolean(String(env.EXTERNAL_CATALOG_MANIFEST_URLS || '').trim()),
    }

    const payload = {
        version: ADDON_VERSION,
        checkedAt: new Date().toISOString(),
        cacheTtlMs: PROVIDER_STATUS_TTL_MS,
        providers: items,
        externalCatalogs,
        externalCatalogEnv,
        cache: cacheStats(),
        securityNote: configShareWarning('fa'),
    }
    providerStatusCache = {at: Date.now(), payload}
    return payload
}

export function parseAddonId(id, providers) {
    const parts = String(id ?? '').split(ID_SEPARATOR)
    const provider = providers.find((item) => parts[0] === `${ADDON_PREFIX}${item.key}`)
    if (!provider || !parts[1]) {
        return null
    }
    return {
        provider,
        providerItemId: parts[1],
        videoId: parts.slice(2).join(ID_SEPARATOR) || null,
    }
}

function findCatalogProvider(catalogId, providers) {
    return providers.find((provider) => {
        const cfg = CATALOGS.find((c) => c.key === provider.key)
        if (cfg?.catalogType === 'tv') {
            return catalogId === `${provider.key}_tv`
        }
        return catalogId === `${provider.key}_movies` || catalogId === `${provider.key}_series`
    })
}

function parseExtraArgs(extraArgs = '') {
    return Object.fromEntries(new URLSearchParams(extraArgs))
}

function proxyPrefix(env) {
    const baseUrl = String(env.PROXY_URL ?? '').replace(/\/$/, '')
    const path = String(env.PROXY_PATH ?? 'proxy').replace(/^\/+|\/+$/g, '')
    return baseUrl && path ? `${baseUrl}/${path}?url=` : null
}

function logResourceError(logger, resource, error) {
    logger.error(`${resource} request failed`, {message: error?.message ?? String(error)})
}

function parseImdbId(value) {
    const parts = String(value ?? '').split(':')
    const imdbId = parts[0]
    if (!/^tt\d+$/.test(imdbId)) {
        return null
    }
    return {
        imdbId,
        season: parts[1] ? Number(parts[1]) : null,
        episode: parts[2] ? Number(parts[2]) : null,
    }
}

async function getCinemetaName(type, imdbId, services) {
    const cinemeta = await services.getCinemeta(type, imdbId)
    return cinemeta?.meta?.name ?? null
}

function withTimeout(promise, ms, label = 'operation') {
    return Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        }),
    ])
}

// Short in-memory cache: concurrent users / repeated opens of the same title
// skip re-hitting every Iranian site. Instance-local but helps a lot on spikes.
const STREAM_CACHE_TTL_MS = 45_000
const streamTitleCache = new Map()

function streamCacheKey(title, type, season, episode) {
    return `${type}|${season ?? ''}|${episode ?? ''}|${String(title).toLowerCase().trim()}`
}

function extractYearHint(value) {
    const m = String(value ?? '').match(/\b((?:19|20)\d{2})\b/)
    return m ? Number(m[1]) : null
}

/** Trailing franchise number 1–20 (Toy Story 5), ignoring years. */
function extractSequelHint(value) {
    const noYear = String(value ?? '').replace(/\b(?:19|20)\d{2}\b/g, ' ')
    const nums = [...noYear.matchAll(/\b(\d{1,2})\b/g)]
        .map((x) => Number(x[1]))
        .filter((n) => n >= 1 && n <= 20)
    return nums.length ? nums[nums.length - 1] : null
}

function normalizeForMatch(value) {
    return String(value ?? '')
        .replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, '')
        .replace(/\b(season|series|s)\s*\d+\b/gi, ' ')
        .replace(/\b(episode|ep|e)\s*\d+\b/gi, ' ')
        .replace(/\bs\d{1,2}\s*e\d{1,3}\b/gi, ' ')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\b(19|20)\d{2}\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
}

function titlesMatch(a, b) {
    if (!a || !b) return false
    if (a === b) return true
    // Avoid "toy story" ≈ "toy story 5": only allow includes when lengths are close
    // or neither side has a conflicting sequel number.
    const sa = extractSequelHint(a)
    const sb = extractSequelHint(b)
    if (sa != null && sb != null && sa !== sb) return false
    if (sa != null && sb == null && a.length > b.length + 2) {
        // query has sequel, candidate is shorter base name — weak, still allow as candidate
    }
    if (a.includes(b) || b.includes(a)) {
        const longer = a.length >= b.length ? a : b
        const shorter = a.length >= b.length ? b : a
        if (longer.length - shorter.length > 12 && !longer.startsWith(shorter)) return false
        return true
    }
    const ca = a.replace(/\s+/g, '')
    const cb = b.replace(/\s+/g, '')
    if (ca.length > 3 && cb.length > 3 && (ca.includes(cb) || cb.includes(ca))) {
        if (sa != null && sb != null && sa !== sb) return false
        return true
    }
    const ta = a.split(' ').filter((t) => t.length > 2)
    const tb = b.split(' ').filter((t) => t.length > 2)
    if (!ta.length || !tb.length) return false
    const setB = new Set(tb)
    const hits = ta.filter((t) => setB.has(t)).length
    const need = Math.min(2, ta.length, tb.length)
    return hits >= Math.max(1, need === 2 && Math.min(ta.length, tb.length) === 1 ? 1 : need)
}

/** Higher is better. opts: { year, imdbId } from Cinemeta/TMDB. */
function scoreTitleCandidate(result, cleanTitle, opts = {}) {
    const rawName = String(result?.name ?? '')
    const n = normalizeForMatch(rawName)
    if (!n || !cleanTitle) return -100
    let score = 0
    if (n === cleanTitle) score += 100
    else if (n.includes(cleanTitle) || cleanTitle.includes(n)) score += 40
    else {
        const ta = cleanTitle.split(' ').filter((t) => t.length > 2)
        const tb = n.split(' ').filter((t) => t.length > 2)
        const setB = new Set(tb)
        const hits = ta.filter((t) => setB.has(t)).length
        if (!hits) return -50
        score += hits * 12
    }
    // Prefer similar length (exact franchise entry)
    score -= Math.min(30, Math.abs(n.length - cleanTitle.length))

    const wantSeq = extractSequelHint(cleanTitle)
    const gotSeq = extractSequelHint(n)
    if (wantSeq != null && gotSeq != null) {
        score += wantSeq === gotSeq ? 50 : -60
    } else if (wantSeq != null && gotSeq == null) {
        score -= 25 // provider listed base "Toy Story" for "Toy Story 5"
    } else if (wantSeq == null && gotSeq != null) {
        score -= 20
    }

    const wantYear = opts.year != null ? Number(opts.year) : extractYearHint(cleanTitle)
    const gotYear = extractYearHint(rawName)
    if (wantYear && gotYear) {
        score += wantYear === gotYear ? 35 : -45
    }

    const wantImdb = opts.imdbId && /^tt\d+$/.test(String(opts.imdbId)) ? String(opts.imdbId) : null
    const gotImdb = result.imdbId || result.imdb_id || null
    if (wantImdb && gotImdb && /^tt\d+$/.test(String(gotImdb))) {
        score += String(gotImdb) === wantImdb ? 80 : -80
    }
    return score
}

function searchQueryVariants(title) {
    const raw = String(title ?? '').trim()
    if (!raw) return []
    const variants = [raw]
    // Providers like F2Media filter with name.includes(query) — keep punctuation
    // in the primary query; also try softer forms for sites that strip "&".
    const noAmp = raw.replace(/&/g, ' and ').replace(/\s+/g, ' ').trim()
    if (noAmp !== raw) variants.push(noAmp)
    const stripped = raw.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
    if (stripped && !variants.some((v) => v.toLowerCase() === stripped.toLowerCase())) {
        variants.push(stripped)
    }
    // de-dupe case-insensitively, keep order
    const seen = new Set()
    return variants.filter((v) => {
        const k = v.toLowerCase()
        if (seen.has(k)) return false
        seen.add(k)
        return true
    })
}

function bestTitleMatch(results, type, cleanTitle, opts = {}) {
    const list = Array.isArray(results) ? results : []
    const typed = list.filter((r) => r && r.id != null && (!r.type || r.type === type))
    if (!typed.length) return null

    const scored = typed.map((r) => ({
        r,
        s: scoreTitleCandidate(r, cleanTitle, opts),
    })).sort((a, b) => b.s - a.s || normalizeForMatch(a.r.name).length - normalizeForMatch(b.r.name).length)

    const best = scored[0]
    // Strong enough match
    if (best && best.s >= 25) return best.r

    // Single search hit from provider — keep old permissive behavior for Persian-only pages
    if (typed.length === 1 && best && best.s >= 0) return best.r

    // Multiple weak hits: take best only if clearly better than runner-up and not hostile
    if (best && best.s >= 10) {
        const second = scored[1]?.s ?? -999
        if (best.s >= second + 15) return best.r
    }

    // Soft latin token fallback (Persian titles) — never prefer conflicting sequel
    if (cleanTitle) {
        const wantSeq = extractSequelHint(cleanTitle)
        const latin = cleanTitle.split(' ').filter((t) => t.length > 2 && !/^\d+$/.test(t))
        const soft = typed.find((r) => {
            const raw = String(r.name ?? '').toLowerCase()
            if (!latin.some((tok) => raw.includes(tok))) return false
            if (wantSeq != null) {
                const got = extractSequelHint(normalizeForMatch(r.name))
                if (got != null && got !== wantSeq) return false
            }
            return true
        })
        if (soft) return soft
    }
    return null
}

async function streamsByTitle(title, type, season, episode, providers, matchOpts = {}) {
    const cleanTitle = normalizeForMatch(title)
    const cacheKey = streamCacheKey(cleanTitle, type, season, episode)
    const cached = streamTitleCache.get(cacheKey)
    if (cached && Date.now() - cached.at < STREAM_CACHE_TTL_MS) {
        return cached.streams
    }

    // Series detail pages (esp. F2Media) are large and often need longer than movies.
    // Env PROVIDER_TIMEOUT_MS still overrides when set.
    const PROVIDER_BUDGET_MS = Number(process.env.PROVIDER_TIMEOUT_MS)
        || (type === 'series' ? 22_000 : 12_000)
    const queries = searchQueryVariants(title)

    const settled = await Promise.allSettled(
        providers.map(async (provider) => {
            const work = (async () => {
                let match = null
                for (const q of queries) {
                    const results = await provider.search(q)
                    match = bestTitleMatch(results, type, cleanTitle, matchOpts)
                    if (match) break
                }
                if (!match) {
                    return {key: provider.key, streams: []}
                }

                const movieData = await provider.getMovieData(match.type || type, match.id)
                if (!movieData) {
                    return {key: provider.key, streams: []}
                }

                const videoId = season && episode ? `${match.id}:${season}:${episode}` : null
                const links = provider.getLinks(match.type || type, videoId, movieData)

                return {
                    key: provider.key,
                    streams: (Array.isArray(links) ? links : []).map((link) => {
                        const fmt = {
                            providerKey: provider.key,
                            quality: link.quality,
                            size: link.size,
                            audioType: link.audioType,
                            extraText: link.title,
                            url: link.url || link.externalUrl,
                        }
                        // Same structure as original: only multi-line `title`.
                        // Do NOT set `name` to the same text (Nuvio shows both → duplicate).
                        const stream = {
                            title: formatStreamTitle(fmt),
                        }
                        if (link.externalUrl) {
                            stream.externalUrl = link.externalUrl
                        }
                        if (link.url) {
                            stream.url = link.url
                        }
                        return stream
                    }).filter((s) => s.url || s.externalUrl),
                }
            })()
            try {
                return await withTimeout(work, PROVIDER_BUDGET_MS, provider.key)
            } catch {
                return {key: provider.key, streams: []}
            }
        }),
    )

    const streams = sortByQuality(
        settled
            .filter((r) => r.status === 'fulfilled')
            .flatMap((r) => r.value.streams),
    )
    streamTitleCache.set(cacheKey, {at: Date.now(), streams})
    if (streamTitleCache.size > 200) {
        const oldest = streamTitleCache.keys().next().value
        streamTitleCache.delete(oldest)
    }
    return streams
}

async function imdbStreamResponse(type, id, providers, services, env, httpClient, logger) {
    const torrentPromise = getTorrentStreams(type, id, env, httpClient, logger).catch(() => [])
    const parsed = parseImdbId(id)
    if (!parsed) {
        return {streams: await torrentPromise}
    }

    const cinemeta = await services.getCinemeta(type, parsed.imdbId)
    const title = cinemeta?.meta?.name ?? null
    const yearHint = extractYearHint(cinemeta?.meta?.releaseInfo)
        || extractYearHint(cinemeta?.meta?.year)
        || extractYearHint(title)
    const streams = title
        ? await streamsByTitle(title, type, parsed.season, parsed.episode, providers, {
            year: yearHint,
            imdbId: parsed.imdbId,
        })
        : []
    // Iranian providers always come first — torrent results are appended,
    // never prepended, regardless of whether Iranian results exist.
    return {streams: [...streams, ...await torrentPromise]}
}

function parseKitsuId(value) {
    const match = String(value ?? '').match(/^kitsu:(\d+)(?::(\d+))?$/)
    if (!match) {
        return null
    }
    return {kitsuId: `kitsu:${match[1]}`, episode: match[2] ? Number(match[2]) : null}
}

async function kitsuStreamResponse(type, id, providers, env, httpClient, logger) {
    const torrentPromise = getTorrentStreams(type, id, env, httpClient, logger).catch(() => [])
    const parsed = parseKitsuId(id)
    if (!parsed) {
        return {streams: await torrentPromise}
    }

    const title = await getKitsuTitle(parsed.kitsuId, httpClient, logger)
    // Anime catalogs use kitsu: ids. Animex stores anime under /anime/ as type series.
    // Prefer season 1 when only episode is present (common for continuous anime).
    let streams = []
    if (title) {
        const season = parsed.episode ? 1 : null
        const episode = parsed.episode ?? null
        streams = await streamsByTitle(title, 'series', season, episode, providers)
        // Retry without season/episode filter if detail page has flat episode lists
        if (!streams.length && episode) {
            streams = await streamsByTitle(title, 'series', null, null, providers)
        }
    }
    return {streams: [...streams, ...await torrentPromise]}
}

function parseTmdbId(value) {
    const match = String(value ?? '').match(/^tmdb:(\d+)(?::(\d+):(\d+))?$/)
    if (!match) {
        return null
    }
    return {
        tmdbId: match[1],
        season: match[2] ? Number(match[2]) : null,
        episode: match[3] ? Number(match[3]) : null,
    }
}

async function tmdbStreamResponse(type, id, providers, httpClient, apiKey, env, logger) {
    const parsed = parseTmdbId(id)
    if (!parsed) {
        return {streams: await getTorrentStreams(type, id, env, httpClient, logger).catch(() => [])}
    }

    // 101 Catalogs (and similar) use tmdb: ids. Meteor/torrent addons usually
    // only accept tt: IMDb ids — resolve both title and imdb_id via TMDB so
    // Iranian providers + torrent both work for "پرطرفدار / ترند".
    const details = await getTMDBDetails(type, parsed.tmdbId, httpClient, apiKey, logger)
    const title = details?.title ?? null
    const imdbId = details?.imdbId ?? null

    const torrentId = imdbId
        ? (parsed.season != null && parsed.episode != null
            ? `${imdbId}:${parsed.season}:${parsed.episode}`
            : imdbId)
        : id
    const torrentPromise = getTorrentStreams(type, torrentId, env, httpClient, logger).catch(() => [])

    const streams = title
        ? await streamsByTitle(title, type, parsed.season, parsed.episode, providers, {
            year: extractYearHint(details?.year) || extractYearHint(details?.releaseDate) || extractYearHint(title),
            imdbId: imdbId || null,
        })
        : []
    return {streams: [...streams, ...await torrentPromise]}
}

async function getProviderMetadata(provider, type, itemId, movieData, services) {
    if (provider.metadataSource === METADATA_SOURCE.PROVIDER) {
        const meta = await provider.getMeta(type, itemId, movieData)
        return meta ? {meta} : null
    }

    const imdbId = await provider.imdbID(movieData, type)
    return imdbId ? services.getCinemeta(type, imdbId) : null
}

export function createAddon({
    env = process.env,
    logger = createLogger(env),
    providers = createProviders({env, logger}),
    services = {getCinemeta, getSubtitle},
} = {}) {
    const addon = express()
    addon.disable('x-powered-by')
    addon.use(cors())
    addon.use(createRateLimitMiddleware(env))
    addon.use((req, _res, next) => {
        try {
            const pathOnly = (req.url || '').split('?')[0]
            const qs = (req.url || '').includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
            const m = pathOnly.match(/^\/c\/([^/]+)(\/.*)?$/)
            if (m) {
                req.addonConfig = decodeAddonConfig(decodeURIComponent(m[1]))
                req.url = (m[2] && m[2].length ? m[2] : '/') + qs
            }
        } catch {
            /* ignore bad config segment */
        }
        next()
    })


    function requestScope(req) {
        const e = mergeEnv(env, req?.addonConfig)
        // Public default is ALWAYS Persian. English only via /c/ personalization.
        // Do not let server env ADDON_LANG/META_LANG flip the public install to EN.
        try {
            if (!req?.addonConfig) {
                e.ADDON_LANG = 'fa'
                e.META_LANG = 'fa'
            } else {
                if (!String(e.ADDON_LANG || '').trim()) e.ADDON_LANG = 'fa'
                if (!String(e.META_LANG || '').trim()) e.META_LANG = String(e.ADDON_LANG || 'fa')
            }
            setMetaLangPref(e.META_LANG || 'fa')
            setUiLangPref(e.ADDON_LANG || 'fa')
        } catch { /* ignore */ }
        const p = req?.addonConfig ? createProviders({env: e, logger}) : providers
        return {env: e, providers: p}
    }

    const rootDir = dirname(fileURLToPath(import.meta.url))
    let logoBytes = null
    try {
        logoBytes = readFileSync(join(rootDir, 'logo.png'))
    } catch {
        logoBytes = null
    }

    addon.get('/logo.png', (req, res) => {
        if (!logoBytes) {
            return res.status(404).type('text/plain').send('logo not found')
        }
        res.type('png').set('cache-control', 'public, max-age=86400').send(logoBytes)
    })

    /** Public base for rewriting TMDB image URLs in this request. */
    function publicBase(req) {
        try {
            const urls = landingUrlsFromRequest(req, env)
            let base = String(urls.manifestUrl || '').replace(/\/manifest\.json$/i, '')
            // Stremio local streaming server often sets Host to localhost — image
            // URLs must stay on the public addon origin or posters break in IR.
            if (!base || /localhost|127\.0\.0\.1/i.test(base)) {
                const pub = String(env.PUBLIC_BASE_URL || process.env.PUBLIC_BASE_URL || 'https://cinemagraphy.vercel.app').replace(/\/$/, '')
                base = pub
            }
            return base
        } catch {
            return String(env.PUBLIC_BASE_URL || 'https://cinemagraphy.vercel.app').replace(/\/$/, '')
        }
    }

    function jsonWithTmdbImages(req, res, payload, cacheControl) {
        const base = publicBase(req)
        const body = base ? rewriteTmdbImageUrls(payload, base) : payload
        if (cacheControl) res.set('cache-control', cacheControl)
        return res.status(200).type('json').json(body)
    }

    // TMDB Image Proxy — client in Iran never hits image.tmdb.org directly
    // GET /api/tmdb-image/w500/abc123.jpg
    
    // Media proxy for Namakade CDN posters (site pages filtered in IR)
    addon.get(/^\/api\/media-proxy\/(.+)$/, async (req, res) => {
        try {
            const token = (req.params && (req.params[0] || req.params[1])) || ''
            // Express may put capture in req.params[0] for regex routes
            const raw = token || (req.path || '').split('/api/media-proxy/')[1] || ''
            const target = decodeMediaProxyToken(decodeURIComponent(raw))
            if (!target) {
                res.status(400).json({error: 'invalid media proxy url'})
                return
            }
            const upstream = await axios.get(target, {
                responseType: 'arraybuffer',
                timeout: 20_000,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; CinemaGraphy/2.1)',
                    Accept: 'image/*,*/*',
                    Referer: 'https://namakade.com/',
                },
                validateStatus: (s) => s >= 200 && s < 400,
            })
            const ctype = upstream.headers['content-type'] || 'image/jpeg'
            res.setHeader('Content-Type', ctype)
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.status(200).send(Buffer.from(upstream.data))
        } catch (err) {
            logger.warn?.({err: err?.message}, 'media-proxy failed')
            res.status(502).json({error: 'media proxy failed'})
        }
    })

addon.get(/^\/api\/tmdb-image\/([^/]+)\/(.+)$/, async (req, res) => {
        try {
            const size = req.params[0]
            const fileParam = req.params[1]
            const parsed = parseTmdbImageProxyPath(size, fileParam)
            if (!parsed) {
                return res.status(400).type('text/plain').send('invalid tmdb image path')
            }
            const upstream = await axios.get(parsed.upstream, {
                responseType: 'arraybuffer',
                timeout: 20_000,
                maxRedirects: 2,
                validateStatus: (s) => s >= 200 && s < 400,
                headers: {Accept: 'image/*,*/*'},
            })
            const ct = upstream.headers?.['content-type'] || 'image/jpeg'
            if (!String(ct).startsWith('image/') && !String(ct).includes('octet-stream')) {
                return res.status(502).type('text/plain').send('upstream not image')
            }
            const buf = Buffer.from(upstream.data)
            if (buf.length > 8 * 1024 * 1024) {
                return res.status(502).type('text/plain').send('image too large')
            }
            res.status(200)
                .type(ct)
                .set({
                    'cache-control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
                    'cdn-cache-control': 'public, s-maxage=604800',
                })
                .send(buf)
        } catch (error) {
            const status = error?.response?.status
            logger.error('TMDB image proxy failed', {
                message: error?.message ?? String(error),
                status: status || undefined,
            })
            if (status === 404) return res.status(404).type('text/plain').send('not found')
            return res.status(502).type('text/plain').send('TMDB image proxy failed')
        }
    })

    // Optional TMDB API proxy (server-side key only; query language/region preserved)
    // GET /api/tmdb/movie/550?language=fa-IR
    addon.get(/^\/api\/tmdb\/(.+)$/, async (req, res) => {
        try {
            const apiKey = env.TMDB_API_KEY
            if (!apiKey) {
                return res.status(503).type('json').json({error: 'TMDB_API_KEY not configured'})
            }
            const pathPart = String(req.params[0] || '').replace(/^\/+/, '')
            if (!pathPart || pathPart.includes('..') || !/^[a-zA-Z0-9_/.-]+$/.test(pathPart)) {
                return res.status(400).type('json').json({error: 'invalid path'})
            }
            const params = {...(req.query || {})}
            delete params.api_key
            delete params.apiKey
            const data = await tmdbRequest(pathPart, params, axios, apiKey, logger)
            res.status(200)
                .type('json')
                .set('cache-control', 'public, max-age=300, s-maxage=3600')
                .json(data)
        } catch (error) {
            const status = error?.response?.status
            logger.error('TMDB proxy request failed', {
                message: error?.message ?? String(error),
                status: status || undefined,
            })
            if (status === 429) return res.status(429).type('json').json({error: 'rate limited'})
            if (status === 404) return res.status(404).type('json').json({error: 'not found'})
            return res.status(502).type('json').json({error: 'TMDB upstream error'})
        }
    })


    addon.get('/guide', (req, res) => {
        try {
            const urls = landingUrlsFromRequest(req, env)
            const html = renderGuidePage({
                logoUrl: urls.logoUrl,
                version: ADDON_VERSION,
                manifestUrl: urls.manifestUrl,
            })
            res.status(200).type('html').set('cache-control', 'no-store').send(html)
        } catch (error) {
            logger.error('Guide page failed', {message: error?.message ?? String(error)})
            res.status(500).type('text/plain').send('Guide error')
        }
    })

    addon.get('/configure', (req, res) => {
        try {
            const urls = landingUrlsFromRequest(req, env)
            const origin = urls.manifestUrl.replace(/\/manifest.json$/i, '')
            const html = renderConfigurePage({
                logoUrl: urls.logoUrl,
                version: ADDON_VERSION,
                origin: origin || urls.manifestUrl.replace('/manifest.json', ''),
            })
            res.status(200).type('html').set('cache-control', 'no-store').send(html)
        } catch (error) {
            logger.error('Configure page failed', {message: error?.message ?? String(error)})
            res.status(500).type('text/plain').send('Configure error')
        }
    })

    addon.get('/', (req, res) => {
        try {
            const urls = landingUrlsFromRequest(req, env)
            const html = renderLandingPage({
                ...urls,
                version: ADDON_VERSION,
            })
            res.status(200).type('html').set('cache-control', 'no-store').send(html)
        } catch (error) {
            logger.error('Landing page failed', {message: error?.message ?? String(error)})
            res.status(500).type('text/plain').send('Landing page error')
        }
    })

    addon.get('/manifest.json', async (req, res) => {
        const {env: activeEnv} = requestScope(req)
        const manifest = createManifest(activeEnv)
        const streamsOnly = isConfigFlagOn(activeEnv, 'STREAMS_ONLY')
        const disableMeta = streamsOnly || isConfigFlagOn(activeEnv, 'DISABLE_META')
        const disableCatalog = streamsOnly || isConfigFlagOn(activeEnv, 'DISABLE_CATALOG')
        const iptvEnabled = Boolean(String(activeEnv.CATALOG_IPTVBRIDGE_MANIFEST_URL || '').trim())
        try {
            if (String(req.query?.refresh || '') === '1') {
                invalidateExternalCatalogCache()
            }
            // Movie/series external catalogs OR IPTV (IPTV is independent of STREAMS_ONLY)
            if (!disableCatalog || !disableMeta || iptvEnabled) {
                let externalSources = await getExternalCatalogSources(activeEnv, axios, logger)
                // When movie catalogs are off, only keep IPTV/satellite sources
                if (disableCatalog) {
                    externalSources = (externalSources || []).filter(
                        (s) => classifyExternalCatalogSource(s) === 'iptv',
                    )
                }
                for (const source of externalSources) {
                    if (!disableMeta && source.hasMeta) {
                        const metaResource = manifest.resources.find((r) => r?.name === 'meta')
                        for (const prefix of source.idPrefixes) {
                            if (metaResource && !metaResource.idPrefixes.includes(prefix)) {
                                metaResource.idPrefixes.push(prefix)
                            }
                        }
                    }
                    if (source.hasStream) {
                        const streamResource = manifest.resources.find((r) => r?.name === 'stream')
                        for (const prefix of source.idPrefixes) {
                            if (streamResource && !streamResource.idPrefixes.includes(prefix)) {
                                streamResource.idPrefixes.push(prefix)
                            }
                        }
                    }
                }
                if (!disableCatalog || iptvEnabled) {
                    const catalogLang = String(activeEnv.ADDON_LANG || 'fa').trim().toLowerCase().startsWith('en') ? 'en' : 'fa'
                    const orderedExternal = buildOrderedExternalCatalogs(externalSources, (catalog) => ({
                        ...catalog,
                        name: translateCatalogName(catalog.name, catalog.type, catalogLang),
                    }))
                    manifest.catalogs.push(...orderedExternal)
                }
            }
        } catch (error) {
            logAxiosError(error, logger, 'External catalogs unavailable, serving own catalogs only')
        }

        // Isolated catalogs — always attach even if external 101/AIO/anime failed
        if (!disableCatalog) {
            const catalogLang = String(activeEnv.ADDON_LANG || 'fa').trim().toLowerCase().startsWith('en') ? 'en' : 'fa'
            if (isF2TurkishEnabled(activeEnv)) {
                const trCats = f2turkishManifestCatalogs(activeEnv, catalogLang)
                const already = manifest.catalogs.some((c) => c?.id === F2TURKISH_CATALOG_ID)
                if (!already && trCats.length) {
                    let insertAt = manifest.catalogs.findIndex((c) =>
                        /anime|انیمه|myanimelist|kitsu|mal[_-]/i.test(`${c?.name || ''} ${c?.id || ''}`),
                    )
                    if (insertAt < 0) {
                        insertAt = manifest.catalogs.findIndex((c) =>
                            /iptv|ماهواره|satellite|namakade/i.test(`${c?.name || ''} ${c?.id || ''}`),
                        )
                    }
                    if (insertAt < 0) insertAt = manifest.catalogs.length
                    manifest.catalogs.splice(insertAt, 0, ...trCats)
                }
            }
            // Anime - Animex catalog: right after Turkish, before external anime / IPTV
            if (isAnimexCatalogEnabled(activeEnv)) {
                const axCats = animexCatalogManifestCatalogs(activeEnv, catalogLang).map((c) => ({
                    ...c,
                    // FORCE_AX_NAME
                    name: String(catalogLang || 'fa').startsWith('en') ? 'animex' : 'انیمکس',
                }))
                const alreadyAx = manifest.catalogs.some((c) => c?.id === ANIMEX_CATALOG_ID)
                if (!alreadyAx && axCats.length) {
                    let insertAt = manifest.catalogs.findIndex((c) => c?.id === F2TURKISH_CATALOG_ID)
                    if (insertAt >= 0) {
                        insertAt += 1
                    } else {
                        insertAt = manifest.catalogs.findIndex((c) =>
                            /anime|انیمه|myanimelist|kitsu|mal[_-]/i.test(`${c?.name || ''} ${c?.id || ''}`),
                        )
                        if (insertAt < 0) {
                            insertAt = manifest.catalogs.findIndex((c) =>
                                /iptv|ماهواره|satellite|namakade/i.test(`${c?.name || ''} ${c?.id || ''}`),
                            )
                        }
                        if (insertAt < 0) insertAt = manifest.catalogs.length
                    }
                    manifest.catalogs.splice(insertAt, 0, ...axCats)
                }
            }
            if (isNamakadeEnabled(activeEnv)) {
                const nkLang = catalogLang
                const nkCats = namakadeManifestCatalogs(activeEnv, nkLang)
                for (const nk of nkCats) {
                    if (!manifest.catalogs.some((c) => c?.id === nk.id)) {
                        manifest.catalogs.push(nk)
                    }
                }
            }
        }
        res.status(200)
            .type('json')
            .set('cache-control', 'no-store, max-age=0')
            .json(manifest)
    })

    const catalogHandler = async (req, res) => {
        try {
            const {env: activeEnv, providers: activeProviders} = requestScope(req)
            const streamsOnly = isConfigFlagOn(activeEnv, 'STREAMS_ONLY')
            const disableCatalog = streamsOnly || isConfigFlagOn(activeEnv, 'DISABLE_CATALOG')
            // Isolated Namakade catalogs (no external proxy)
            if (String(req.params.id || '') === ANIMEX_CATALOG_ID && isAnimexCatalogEnabled(activeEnv)) {
                try {
                    const extra = parseExtraArgs(req.params.extraArgs)
                    const search = extra.search || (req.query || {}).search || ''
                    const data = await animexCatalogList(req.params.id, search, activeEnv, axios)
                    return res.status(200).type('json').set('cache-control', 'public, max-age=300').json(data)
                } catch (error) {
                    logger.error('animex catalog failed', {message: error?.message ?? String(error)})
                    return res.status(200).type('json').json({metas: []})
                }
            }
            if (String(req.params.id || '') === F2TURKISH_CATALOG_ID && isF2TurkishEnabled(activeEnv)) {
                try {
                    const extra = parseExtraArgs(req.params.extraArgs)
                    const search = extra.search || (req.query || {}).search || ''
                    const data = await f2turkishListCatalog(req.params.id, search, activeEnv, axios)
                    return jsonWithTmdbImages(req, res, data || {metas: []}, 'public, max-age=300')
                } catch (err) {
                    logger.error?.({err: err?.message}, 'F2Turkish catalog failed')
                    return res.json({metas: []})
                }
            }

            if (String(req.params.id || '').startsWith('namakade_') && isNamakadeEnabled(activeEnv)) {
                try {
                    const search = (req.query || {}).search || ''
                    const pb = publicBase(req, activeEnv)
                    const data = await namakadeListCatalog(req.params.id, search, activeEnv, axios, pb)
                    return res.json(data)
                } catch (err) {
                    logger.error?.({err: err?.message}, 'Namakade catalog failed')
                    return res.json({metas: []})
                }
            }

            const iptvEnabled = Boolean(String(activeEnv.CATALOG_IPTVBRIDGE_MANIFEST_URL || '').trim())
            let externalSources = await getExternalCatalogSources(activeEnv, axios, logger)
            if (disableCatalog) {
                // Movie/series catalogs off — IPTV still served when enabled
                externalSources = (externalSources || []).filter(
                    (s) => classifyExternalCatalogSource(s) === 'iptv',
                )
                const externalSource = externalSources.find((source) => source.catalogIds.has(req.params.id))
                if (externalSource && iptvEnabled) {
                    const data = await proxyExternalCatalog(
                        externalSource, req.params.type, req.params.id, req.params.extraArgs, axios, logger,
                    )
                    return jsonWithTmdbImages(req, res, data || {metas: []}, 'public, max-age=120')
                }
                return res.json({metas: []})
            }
            const externalSource = externalSources.find((source) => source.catalogIds.has(req.params.id))
            if (externalSource) {
                let data = await proxyExternalCatalog(
                    externalSource, req.params.type, req.params.id, req.params.extraArgs, axios, logger,
                )
                // 101 / external grids without RPDB → TMDB fa poster + text (user TMDB_API_KEY)
                if (activeEnv.TMDB_API_KEY && Array.isArray(data?.metas) && data.metas.length) {
                    try {
                        data = {
                            ...data,
                            metas: await enrichCatalogMetasWithoutRpdb(
                                data.metas,
                                req.params.type,
                                axios,
                                activeEnv.TMDB_API_KEY,
                                logger,
                            ),
                        }
                    } catch (error) {
                        logger.warn?.('Catalog FA enrich skipped', {message: error?.message})
                    }
                }
                return jsonWithTmdbImages(req, res, data)
            }

            const provider = findCatalogProvider(req.params.id, activeProviders)
            if (!provider) {
                return res.json({metas: []})
            }

            const extraArgs = parseExtraArgs(req.params.extraArgs)
            const search = extraArgs.search?.trim()
            if (!search || !['movie', 'series', 'anime', 'tv'].includes(req.params.type)) {
                return res.json({metas: []})
            }

            const results = await provider.search(search)
            const list = Array.isArray(results) ? results : []
            let filtered = list.filter((item) => item?.id != null && item.type === req.params.type)
            // If the catalog type filter wipes everything but the provider did find
            // rows (common when a series query hits a movie page first), keep
            // same-type when possible; otherwise surface provider hits so the
            // user is not stuck with an empty board.
            if (!filtered.length && list.length) {
                filtered = list.filter((item) => item?.id != null)
                logger.info('Catalog type filter empty; returning untyped hits', {
                    provider: provider.key,
                    type: req.params.type,
                    query: search,
                    resultCount: list.length,
                })
            }
            const metas = filtered.map((item) => ({
                ...item,
                type: item.type === 'series' || item.type === 'movie' ? item.type : req.params.type,
                id: `${ADDON_PREFIX}${provider.providerID}${item.id}`,
            }))
            logger.info('Catalog search completed', {
                provider: provider.key,
                type: req.params.type,
                query: search,
                resultCount: list.length,
                metaCount: metas.length,
            })
            return jsonWithTmdbImages(req, res, {metas})
        } catch (error) {
            logResourceError(logger, 'Catalog', error)
            return res.json({metas: []})
        }
    }
    addon.get('/catalog/:type/:id/:extraArgs.json', catalogHandler)
    addon.get('/catalog/:type/:id.json', catalogHandler)

    addon.get('/meta/:type/:id.json', async (req, res) => {
        try {
            const {env: activeEnv, providers: activeProviders} = requestScope(req)
            const env = activeEnv
            const providers = activeProviders
            // Normalize id (Stremio may encode colon)
            req.params.id = decodeURIComponent(String(req.params.id || '')).trim()

            // IPTV / ماهواره — always independent of STREAMS_ONLY / DISABLE_META
            if (String(req.params.id || '').startsWith(NAMAKADE_PREFIX) && isNamakadeEnabled(env)) {
                try {
                    const pb = publicBase(req, env)
                    const nkLang = String(env.ADDON_LANG || 'fa').trim().toLowerCase().startsWith('en') ? 'en' : 'fa'
                    const data = await namakadeGetMeta(req.params.id, env, axios, pb, nkLang)
                    return res.json(data && data.meta ? data : {meta: null})
                } catch (err) {
                    logger.error?.({err: err?.message}, 'Namakade meta failed')
                    return res.json({meta: null})
                }
            }
            if (req.params.id.startsWith('iptv:') && String(env.CATALOG_IPTVBRIDGE_MANIFEST_URL || '').trim()) {
                const externalSources = await getExternalCatalogSources(env, axios, logger)
                const metaSource = findExternalMetaSource(externalSources, req.params.id)
                    || (externalSources || []).find((s) => classifyExternalCatalogSource(s) === 'iptv' && s.hasMeta)
                if (metaSource) {
                    const data = await proxyExternalMeta(metaSource, req.params.type, req.params.id, axios, logger)
                    return jsonWithTmdbImages(req, res, data || {})
                }
            }

            if (isConfigFlagOn(env, 'STREAMS_ONLY') || isConfigFlagOn(env, 'DISABLE_META')) {
                return res.json({})
            }
            // IMDb ids → Persian TMDB meta (fallback Cinemeta if TMDB misses)
            if (req.params.id.startsWith('tt')) {
                if (env.TMDB_API_KEY) {
                    const tmdbMeta = await getTMDBMetaFa(
                        req.params.type, req.params.id, axios, env.TMDB_API_KEY, logger,
                    )
                    if (tmdbMeta) {
                        // Attach episode list from Cinemeta, then FA-localize titles
                        if (req.params.type === 'series') {
                            try {
                                const cin = await services.getCinemeta(req.params.type, req.params.id)
                                if (Array.isArray(cin?.meta?.videos) && cin.meta.videos.length) {
                                    tmdbMeta.videos = cin.meta.videos
                                    const enriched = await enrichMetaWithFaTmdb(
                                        tmdbMeta,
                                        req.params.type,
                                        axios,
                                        env.TMDB_API_KEY,
                                        logger,
                                        req.params.id,
                                    )
                                    return jsonWithTmdbImages(req, res, {meta: enriched})
                                }
                            } catch { /* keep tmdbMeta without videos */ }
                        }
                        return jsonWithTmdbImages(req, res, {meta: tmdbMeta})
                    }
                }
                try {
                    const cin = await services.getCinemeta(req.params.type, req.params.id)
                    if (cin?.meta) {
                        if (env.TMDB_API_KEY) {
                            cin.meta = await enrichMetaWithFaTmdb(
                                cin.meta, req.params.type, axios, env.TMDB_API_KEY, logger, req.params.id,
                            )
                        }
                        return jsonWithTmdbImages(req, res, cin)
                    }
                    if (cin && cin.id) {
                        return jsonWithTmdbImages(req, res, {meta: cin})
                    }
                } catch { /* ignore */ }
                return res.json({})
            }

            // 101 Catalogs popular/trending use tmdb:<id> — must return real meta
            // or Stremio shows "no metadata / no streams" even when streams exist.
            if (req.params.id.startsWith('tmdb:') && env.TMDB_API_KEY) {
                const tmdbNumeric = String(req.params.id).split(':')[1]
                // Prefer catalog type; fall back series↔movie if needed is inside getTMDBMetaByTmdbId
                const meta = await getTMDBMetaByTmdbId(
                    req.params.type === 'tv' ? 'series' : req.params.type,
                    tmdbNumeric,
                    axios,
                    env.TMDB_API_KEY,
                    logger,
                    services.getCinemeta,
                )
                if (meta) {
                    return jsonWithTmdbImages(req, res, {meta}, 'public, max-age=300, s-maxage=600')
                }
                return res.json({})
            }

            // Bare numeric id from some clients → treat as tmdb
            if (/^\d+$/.test(req.params.id) && env.TMDB_API_KEY) {
                const meta = await getTMDBMetaByTmdbId(
                    req.params.type === 'tv' ? 'series' : req.params.type,
                    req.params.id,
                    axios,
                    env.TMDB_API_KEY,
                    logger,
                    services.getCinemeta,
                )
                if (meta) {
                    return jsonWithTmdbImages(req, res, {meta}, 'public, max-age=300, s-maxage=600')
                }
            }

            const externalSources = await getExternalCatalogSources(env, axios, logger)
            const metaSource = findExternalMetaSource(externalSources, req.params.id)
            if (metaSource) {
                const data = await proxyExternalMeta(metaSource, req.params.type, req.params.id, axios, logger)
                if (data?.meta && env.TMDB_API_KEY) {
                    data.meta = await enrichMetaWithFaTmdb(
                        data.meta,
                        req.params.type,
                        axios,
                        env.TMDB_API_KEY,
                        logger,
                        req.params.id,
                    )
                }
                return jsonWithTmdbImages(req, res, data)
            }

            const parsedId = parseAddonId(req.params.id, providers)
            if (!parsedId || !['movie', 'series', 'tv'].includes(req.params.type)) {
                return res.json({})
            }

            let movieData = await parsedId.provider.getMovieData(req.params.type, parsedId.providerItemId)
            if (!movieData && parsedId.provider?.key === 'animex') {
                try {
                    const {decodePagePath} = await import('./sources/html-source.js')
                    const path = decodePagePath(parsedId.providerItemId)
                    const slug = String(path || '').split('/').filter(Boolean).pop() || ''
                    const titleGuess = slug.replace(/-/g, ' ').trim()
                    if (titleGuess) {
                        movieData = {
                            path: path || `/anime/${slug}/`,
                            title: titleGuess,
                            imdbId: null,
                            isSeries: true,
                            pageSeason: null,
                            links: [],
                        }
                    }
                } catch { /* ignore */ }
            }
            if (!movieData) {
                return res.json({})
            }
            let upstreamMeta = await getProviderMetadata(
                parsedId.provider,
                req.params.type,
                parsedId.providerItemId,
                movieData,
                services,
            )
            // When Cinemeta/TMDB has no match (common for some Turkish titles),
            // build a minimal meta from provider links so the detail page still opens.
            if (!upstreamMeta?.meta && movieData) {
                const title = String(movieData.title || '').trim() || 'Unknown'
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
                upstreamMeta = {
                    meta: {
                        id: req.params.id,
                        type: req.params.type === 'tv' ? 'series' : req.params.type,
                        name: title,
                        poster: null,
                        background: null,
                        description: '',
                        videos: req.params.type === 'series' || req.params.type === 'tv' ? videos : undefined,
                    },
                }
            }
            if (!upstreamMeta?.meta) {
                return res.json({})
            }
            let result = structuredClone(upstreamMeta)

            if (env.PROXY_ENABLE === 'true' || env.PROXY_ENABLE === '1') {
                const prepend = proxyPrefix(env)
                if (prepend) {
                    result = modifyUrls(result, prepend)
                }
            }

            if (env.TMDB_API_KEY && result.meta) {
                result.meta = await enrichMetaWithFaTmdb(
                    result.meta,
                    req.params.type,
                    axios,
                    env.TMDB_API_KEY,
                    logger,
                    result.meta.id,
                )
            }
            if (req.params.type === 'series') {
                const videos = Array.isArray(result.meta.videos) ? result.meta.videos : []
                result.meta.videos = videos
                    .filter((video) => video?.id)
                    .map((video) => ({
                        ...video,
                        id: `${ADDON_PREFIX}${parsedId.provider.providerID}${parsedId.providerItemId}${ID_SEPARATOR}${video.id}`,
                    }))
                result.meta.id = req.params.id
            } else {
                result.meta.id = `${ADDON_PREFIX}${parsedId.provider.providerID}${parsedId.providerItemId}${ID_SEPARATOR}${result.meta.id}`
                result.meta.behaviorHints = {
                    ...(result.meta.behaviorHints ?? {}),
                    defaultVideoId: result.meta.id,
                }
            }
            return jsonWithTmdbImages(req, res, result)
        } catch (error) {
            logResourceError(logger, 'Meta', error)
            return res.json({})
        }
    })

    addon.get('/stream/:type/:id.json', async (req, res) => {
        try {
            const {env: activeEnv, providers: activeProviders} = requestScope(req)
            const env = activeEnv
            const providers = activeProviders
            const {type, id} = req.params
            if (!['movie', 'series', 'tv'].includes(type)) {
                return res.json({streams: []})
            }

            const parsedId = parseAddonId(id, providers)
            if (parsedId) {
                const movieData = await parsedId.provider.getMovieData(type, parsedId.providerItemId)
                let streams = movieData
                    ? parsedId.provider.getLinks(type, parsedId.videoId, movieData)
                    : []
                if (Array.isArray(streams)) {
                    streams = streams.map((link) => {
                        const stream = {
                            title: formatStreamTitle({
                                providerKey: parsedId.provider.key,
                                quality: link.quality,
                                size: link.size,
                                audioType: link.audioType,
                                extraText: link.title,
                                url: link.url,
                            }),
                        }
                        if (link.externalUrl) {
                            stream.externalUrl = link.externalUrl
                            stream.name = stream.title
                        } else if (link.url) {
                            stream.url = link.url
                        }
                        return stream
                    }).filter((s) => s.url || s.externalUrl)
                }
                return res.json({streams: sortByQuality(Array.isArray(streams) ? streams : [])})
            }

            if (id.startsWith('tmdb:')) {
                const result = await tmdbStreamResponse(type, id, providers, axios, env.TMDB_API_KEY, env, logger)
                return res.json(result)
            }

            if (id.startsWith('kitsu:')) {
                const result = await kitsuStreamResponse(type, id, providers, env, axios, logger)
                return res.json(result)
            }

            if (/^tt/.test(id)) {
                const result = await imdbStreamResponse(type, id, providers, services, env, axios, logger)
                return res.json(result)
            }

            // Namakade Iranian content — independent of other providers
            if (String(id || '').startsWith(NAMAKADE_PREFIX) && isNamakadeEnabled(env)) {
                try {
                    const data = await namakadeGetStreams(id, env, axios)
                    return res.json(data || {streams: []})
                } catch (err) {
                    logger.error?.({err: err?.message}, 'Namakade stream failed')
                    return res.json({streams: []})
                }
            }

            // IPTV Bridge channel / VOD ids — independent of STREAMS_ONLY
            if (id.startsWith('iptv:') && String(env.CATALOG_IPTVBRIDGE_MANIFEST_URL || '').trim()) {
                const externalSources = await getExternalCatalogSources(env, axios, logger)
                const streamSource = findExternalStreamSource(externalSources, id)
                    || (externalSources || []).find((s) => classifyExternalCatalogSource(s) === 'iptv' && s.hasStream)
                if (streamSource) {
                    const result = await proxyExternalStream(streamSource, type, id, null, axios, logger)
                    return res.json(result || {streams: []})
                }
            }

            // Other external stream addons (non-IMDb schemes)
            const externalSources = await getExternalCatalogSources(env, axios, logger)
            const streamSource = findExternalStreamSource(externalSources, id)
            if (streamSource) {
                const result = await proxyExternalStream(streamSource, type, id, null, axios, logger)
                return res.json(result)
            }

            return res.json({streams: []})
        } catch (error) {
            logResourceError(logger, 'Stream', error)
            return res.json({streams: []})
        }
    })

    const subtitleHandler = async (req, res) => {
        try {
            if (!['movie', 'series'].includes(req.params.type)) {
                return res.json({subtitles: []})
            }

            const isOwnId = req.params.id.startsWith(ADDON_PREFIX)
            if (!isOwnId && env.SUBSOURCE_MANIFEST_URL) {
                const result = await proxySubtitles(
                    env.SUBSOURCE_MANIFEST_URL, req.params.type, req.params.id, req.params.extraArgs, axios, logger,
                )
                if (result) {
                    return res.json(result)
                }
            }

            const parsedId = parseAddonId(req.params.id, providers)
            if (!parsedId || !parsedId.videoId) {
                return res.json({subtitles: []})
            }
            const result = await services.getSubtitle(req.params.type, parsedId.videoId)
            return res.json(result?.subtitles ? result : {subtitles: []})
        } catch (error) {
            logResourceError(logger, 'Subtitle', error)
            return res.json({subtitles: []})
        }
    }
    addon.get('/subtitles/:type/:id/:extraArgs.json', subtitleHandler)
    addon.get('/subtitles/:type/:id.json', subtitleHandler)

    addon.get('/tmdb/landing.json', async (req, res) => {
        try {
            const data = await getLandingTmdbCatalogs(axios, env.TMDB_API_KEY, logger)
            return jsonWithTmdbImages(req, res, data, 'public, max-age=300, s-maxage=600')
        } catch (error) {
            logger.error('tmdb/landing.json failed', {message: error?.message ?? String(error)})
            res.status(200).type('json').json({
                ok: false,
                trendingDay: [],
                trendingWeek: [],
                nowPlaying: [],
                trailers: [],
            })
        }
    })

    addon.get('/providers.json', async (req, res) => {
        try {
            const data = await getProvidersStatus(env, axios)
            res.status(200)
                .type('json')
                .set('cache-control', 'public, max-age=60, s-maxage=120')
                .json(data)
        } catch (error) {
            logger.error('providers.json failed', {message: error?.message ?? String(error)})
            res.status(200).type('json').json({
                version: ADDON_VERSION,
                checkedAt: new Date().toISOString(),
                cacheTtlMs: PROVIDER_STATUS_TTL_MS,
                providers: PROVIDER_REGISTRY.map((entry) => ({
                    key: entry.key,
                    name: entry.name,
                    configured: Boolean(String(env[entry.envKey] ?? '').trim()),
                    online: false,
                    latencyMs: null,
                })),
            })
        }
    })

    addon.get('/health', (req, res) => res.type('text/plain').send('ok'))

    registerAdminRoutes(addon, {
        env,
        logger,
        getProvidersStatus,
        version: ADDON_VERSION,
    })

    addon.use(createErrorHandler(logger))
    return addon
}

// Vercel Express framework expects a default-exported app instance.
// Named exports (createAddon, …) remain for api/index.js, Docker, and Workers.
export default createAddon({env: process.env})
