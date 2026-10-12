/**
 * Addon config decoding and env merge for custom /c/{config}/ installs.
 * Extracted from app.js for modularity — behavior must stay identical.
 */

export const PROVIDER_BASEURL_KEYS = [
    'F2MEDIA_BASEURL',
    'PEEPBOXTV_BASEURL',
    'CINAMATIC_BASEURL',
    'ASLMOVIEZ_BASEURL',
    'SERIALBLOG_BASEURL',
    'DIGIMOVIE_BASEURL',
    'AVAMOVIE_BASEURL',
    'DONYAYESERIAL_BASEURL',
    'ANIMEX_BASEURL',
]

export const PROVIDER_KEY_TO_ENV = {
    f2media: 'F2MEDIA_BASEURL',
    peepboxtv: 'PEEPBOXTV_BASEURL',
    cinamatic: 'CINAMATIC_BASEURL',
    aslmoviez: 'ASLMOVIEZ_BASEURL',
    serialblog: 'SERIALBLOG_BASEURL',
    digimovie: 'DIGIMOVIE_BASEURL',
    avamovie: 'AVAMOVIE_BASEURL',
    donyayeserial: 'DONYAYESERIAL_BASEURL',
    animex: 'ANIMEX_BASEURL',
}

/** Public default when ENABLE_IPTV is on and no custom URL / env is set. */
export const DEFAULT_IPTV_BRIDGE_MANIFEST_URL = 'https://iptvbridge.vercel.app/manifest.json'

const CONFIG_ALLOW = new Set([
    'TMDB_API_KEY',
    'ENABLED_PROVIDERS',
    'TORRENT_METEOR_MANIFEST_URL',
    'EXTERNAL_CATALOG_MANIFEST_URLS',
    'CATALOG_AIO_MANIFEST_URL',
    'CATALOG_AIOCATALOGS_MANIFEST_URL',
    'CATALOG101_MANIFEST_URL',
    'CATALOG_ANIME_MANIFEST_URL',
    'CATALOG_IPTVBRIDGE_MANIFEST_URL',
    'CATALOG_TMDB_MANIFEST_URL',
    'PROVIDER_TIMEOUT_MS',
    'DIGIMOVIE_USERNAME',
    'DIGIMOVIE_PASSWORD',
    'DIGIMOVIE_COOKIE',
    'AVAMOVIE_USERNAME',
    'AVAMOVIE_PASSWORD',
    'AVAMOVIE_COOKIE',
    'PROXY_ENABLE',
    'PROXY_URL',
    'PROXY_PATH',
    'DISABLE_META',
    'DISABLE_CATALOG',
    'DISABLE_SUBTITLES',
    'STREAMS_ONLY',
    'ADDON_NAME_SUFFIX',
    'META_LANG',
    'ADDON_LANG',
    'ENABLE_IPTV',
    'ENABLE_NAMAKADE',
    'ENABLE_F2_TURKISH',
    'ENABLE_FARSIPLEX',
    'FARSIPLEX_BASEURL',
    'NAMAKADE_BASEURL',
    ...PROVIDER_BASEURL_KEYS,
])

export function isConfigFlagOn(env, key) {
    const v = String(env?.[key] ?? '').trim().toLowerCase()
    return v === '1' || v === 'true' || v === 'yes' || v === 'on'
}

export function decodeAddonConfig(encoded) {
    if (!encoded) return null
    try {
        const json = Buffer.from(String(encoded), 'base64url').toString('utf8')
        const obj = JSON.parse(json)
        if (!obj || typeof obj !== 'object') return null
        const out = {}
        for (const [k, v] of Object.entries(obj)) {
            if (!CONFIG_ALLOW.has(k)) continue
            if (v == null) continue
            const s = String(v).trim()
            if (s) out[k] = s
        }
        return Object.keys(out).length ? out : null
    } catch {
        return null
    }
}

/**
 * When a custom /c/<config>/ install is used, provider BASEURLs from the
 * public server env must NOT leak in. Only providers the user selected
 * (ENABLED_PROVIDERS and/or explicit *_BASEURL) stay active.
 */
export function mergeEnv(baseEnv = {}, config) {
    if (!config) return baseEnv
    const e = {...baseEnv, ...config}

    const enabled = String(config.ENABLED_PROVIDERS || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)

    const explicitBase = PROVIDER_BASEURL_KEYS.filter((k) => String(config[k] || '').trim())

    if (enabled.length || explicitBase.length) {
        for (const k of PROVIDER_BASEURL_KEYS) {
            delete e[k]
        }
        for (const k of explicitBase) {
            e[k] = String(config[k]).trim()
        }
        for (const key of enabled) {
            const envKey = PROVIDER_KEY_TO_ENV[key] || PROVIDER_KEY_TO_ENV[key.replace(/_baseurl$/i, '')]
            if (!envKey) continue
            if (String(config[envKey] || '').trim()) {
                e[envKey] = String(config[envKey]).trim()
            } else if (String(baseEnv[envKey] || '').trim()) {
                e[envKey] = String(baseEnv[envKey]).trim()
            }
        }
        // Optional extras stay from config only when exclusive provider mode
        if (!String(config.TORRENT_METEOR_MANIFEST_URL || '').trim()) {
            // keep server torrent unless user cleared — only strip if they set ENABLED without torrent key
            // User expectation: only selected providers → disable torrent unless explicitly set
            if (!('TORRENT_METEOR_MANIFEST_URL' in config)) {
                delete e.TORRENT_METEOR_MANIFEST_URL
            }
        }
    }

    // IPTV / ماهواره — opt-in on custom installs; independent from movie/series catalogs
    {
        const iptvOn = isConfigFlagOn(config, 'ENABLE_IPTV')
            || Boolean(String(config.CATALOG_IPTVBRIDGE_MANIFEST_URL || '').trim())
        const customIptv = String(config.CATALOG_IPTVBRIDGE_MANIFEST_URL || '').trim()
        if (!iptvOn) {
            delete e.CATALOG_IPTVBRIDGE_MANIFEST_URL
        } else if (customIptv) {
            e.CATALOG_IPTVBRIDGE_MANIFEST_URL = customIptv
        } else {
            const fromServer = String(baseEnv.CATALOG_IPTVBRIDGE_MANIFEST_URL || '').trim()
            e.CATALOG_IPTVBRIDGE_MANIFEST_URL = fromServer || DEFAULT_IPTV_BRIDGE_MANIFEST_URL
        }
    }

    // STREAMS_ONLY / DISABLE_CATALOG apply to movie-series catalogs only — not IPTV
    // Namakade: isolated Iranian catalogs — only when user enables
    // نماکده: only ENABLE_NAMAKADE turns it on (BASEURL alone must NOT enable — keeps public manifest clean)
    if (Object.prototype.hasOwnProperty.call(config, 'ENABLE_NAMAKADE')
        || Object.prototype.hasOwnProperty.call(config, 'NAMAKADE_BASEURL')) {
        if (isConfigFlagOn(config, 'ENABLE_NAMAKADE')) {
            e.ENABLE_NAMAKADE = '1'
            if (String(config.NAMAKADE_BASEURL || '').trim()) {
                e.NAMAKADE_BASEURL = String(config.NAMAKADE_BASEURL).trim()
            }
        } else {
            delete e.ENABLE_NAMAKADE
            // keep custom BASEURL if provided for when user later enables
            if (String(config.NAMAKADE_BASEURL || '').trim()) {
                e.NAMAKADE_BASEURL = String(config.NAMAKADE_BASEURL).trim()
            } else {
                delete e.NAMAKADE_BASEURL
            }
        }
    }

    const streamsOnlyCfg = isConfigFlagOn(config, 'STREAMS_ONLY')
    const disableMovieCatalogs = streamsOnlyCfg || isConfigFlagOn(config, 'DISABLE_CATALOG')
    if (disableMovieCatalogs) {
        delete e.CATALOG101_MANIFEST_URL
        delete e.CATALOG_AIO_MANIFEST_URL
        delete e.CATALOG_AIOCATALOGS_MANIFEST_URL
        delete e.CATALOG_TMDB_MANIFEST_URL
        delete e.CATALOG_ANIME_MANIFEST_URL
        delete e.EXTERNAL_CATALOG_MANIFEST_URLS
        // CATALOG_IPTVBRIDGE_MANIFEST_URL intentionally kept when ENABLE_IPTV was set above
    }

        if (Object.prototype.hasOwnProperty.call(config, 'ENABLE_F2_TURKISH')) {
        e.ENABLE_F2_TURKISH = isConfigFlagOn(config, 'ENABLE_F2_TURKISH') ? '1' : '0'
    }
    if (Object.prototype.hasOwnProperty.call(config, 'ENABLE_FARSIPLEX')) {
        e.ENABLE_FARSIPLEX = isConfigFlagOn(config, 'ENABLE_FARSIPLEX') ? '1' : '0'
    }
    if (Object.prototype.hasOwnProperty.call(config, 'FARSIPLEX_BASEURL') && config.FARSIPLEX_BASEURL) {
        e.FARSIPLEX_BASEURL = String(config.FARSIPLEX_BASEURL).trim()
    }
    if (Object.prototype.hasOwnProperty.call(config, 'ENABLE_NAMAKADE')) {
        e.ENABLE_NAMAKADE = isConfigFlagOn(config, 'ENABLE_NAMAKADE') ? '1' : '0'
    }
    return e
}
