import axios from 'axios'

import HtmlSource, {decodePagePath, isHttpUrl, normalizeText} from './html-source.js'
import {logAxiosError} from '../utils.js'

const TYPE_PATH_PREFIXES = ['movie', 'serial', 'anime', 'korean', 'turkey']

function pathType(path) {
    const segment = String(path ?? '').split('/').filter(Boolean)[0]
    if (!TYPE_PATH_PREFIXES.includes(segment)) {
        return null
    }
    return segment === 'movie' ? 'movie' : 'series'
}

function isDetailPath(path) {
    return /^\/(movie|serial|anime|korean|turkey)\/[^/]+\/?$/.test(String(path ?? ''))
}

function uniqueLinks(items, keyFor = (item) => item.url) {
    const seen = new Set()
    return items.filter((item) => {
        const key = keyFor(item)
        if (!item.url || seen.has(key)) {
            return false
        }
        seen.add(key)
        return true
    })
}

// Every download button links to `/?animex_go=<base64 JSON>.<signature>` —
// the base64 payload is plain JSON with the real target URL.
function decodeAnimexGoToken(href) {
    try {
        const url = new URL(href, 'https://animex.click/')
        const raw = url.searchParams.get('animex_go')
        if (!raw) {
            return null
        }
        const [payload] = raw.split('.')
        let b64 = payload.replace(/-/g, '+').replace(/_/g, '/')
        const pad = (4 - (b64.length % 4)) % 4
        if (pad) b64 += '='.repeat(pad)
        const json = Buffer.from(b64, 'base64').toString('utf-8')
        return JSON.parse(json)
    } catch {
        return null
    }
}

function isDirectVideoUrl(url) {
    return /\.(mkv|mp4|avi|m4v|mov)(\?|$)/i.test(String(url ?? ''))
}

function isDirectoryUrl(url) {
    const s = String(url ?? '')
    return /[?&]dir=/i.test(s)
        || /hollowofthealley\.space/i.test(s)
        || /\/\?dir=/i.test(s)
}

/** فصل سوم / Season 3 / S03 → number */
function extractSeasonNumber(...texts) {
    const blob = texts.filter(Boolean).join(' ')
    const en = blob.match(/(?:season|s)\s*([0-9]{1,2})\b/i)
    if (en) return Number(en[1])
    const faDigits = blob
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
        .match(/فصل\s*([0-9]{1,2})/)
    if (faDigits) return Number(faDigits[1])
    const words = {
        اول: 1, یک: 1, دوم: 2, دو: 2, سوم: 3, سه: 3, چهارم: 4, چهار: 4,
        پنجم: 5, پنج: 5, ششم: 6, شش: 6, هفتم: 7, هفت: 7, هشتم: 8, هشت: 8,
        نهم: 9, نه: 9, دهم: 10, ده: 10,
    }
    const faWord = blob.match(/فصل\s*(اول|دوم|سوم|چهارم|پنجم|ششم|هفتم|هشتم|نهم|دهم|یک|دو|سه|چهار|پنج|شش|هفت|هشت|نه|ده)/)
    if (faWord && words[faWord[1]]) return words[faWord[1]]
    return null
}

/**
 * "Toukutsu Ou - 01.[SS][1080p][x265].mkv" → 1
 * "Name - 02 " / S01E03 / E12 / قسمت ۱۲
 */
function extractEpisodeNumber(name) {
    const s = String(name ?? '')
        .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))

    // Prefer explicit " - 01." / " - 01[" / " - 01 " before quality tags
    let m = s.match(/\s[-–—]\s*0*(\d{1,3})\s*[.\[\(\s_]/)
        || s.match(/\s[-–—]\s*0*(\d{1,3})\.(?:mkv|mp4|avi)/i)
        || s.match(/S\s*\d+\s*[-._\s]*E\s*(\d{1,3})\b/i)
        || s.match(/\bE(?:P)?\s*(\d{1,3})\b/i)
        || s.match(/(?:قسمت|ep(?:isode)?)\s*[:.\-]?\s*(\d{1,3})/i)
        || s.match(/[-_\s]0*(\d{1,3})\s*\[\s*(?:SS|WEB|1080|720|480|2160|x26)/i)
        || s.match(/[-_\s]0*(\d{1,3})\.(?:mkv|mp4)/i)
    return m ? Number(m[1]) : null
}

function qualityFromText(...texts) {
    const blob = texts.filter(Boolean).join(' ')
    const m = blob.match(/\b(2160p|1080p|720p|480p|360p|4k)\b/i)
        || blob.match(/\b(1080|720|480)\s*x?\s*265\b/i)
    if (!m) return null
    const raw = m[1].toLowerCase()
    if (raw === '4k' || raw === '2160p') return '2160p'
    if (raw.startsWith('1080')) return '1080p'
    if (raw.startsWith('720')) return '720p'
    if (raw.startsWith('480')) return '480p'
    if (raw.startsWith('360')) return '360p'
    return m[1]
}

/** Build direct file URL from a directory listing base + filename. */
function resolveListingFileUrl(directoryUrl, hrefOrName) {
    const raw = String(hrefOrName || '').trim()
    if (!raw) return null
    if (/^https?:\/\//i.test(raw)) return raw
    try {
        const base = new URL(directoryUrl)
        // Query-style file browsers: keep host, join path under dir=
        if (/[?&]dir=/i.test(directoryUrl) && !raw.includes('/') && !raw.startsWith('?')) {
            // Try path-style under same origin: /{dir}/{file}
            const dir = base.searchParams.get('dir') || ''
            if (dir) {
                const pathJoin = `/${dir.split('/').map(encodeURIComponent).join('/').replace(/%2F/gi, '/')}/${encodeURIComponent(raw)}`
                // Many rdl hosts serve files as absolute path (not ?dir=)
                return `${base.origin}${pathJoin.replace(/\/+/g, '/')}`
            }
        }
        return new URL(raw, directoryUrl).toString()
    } catch {
        return null
    }
}

export default class Animex extends HtmlSource {
    key = 'animex'

    constructor(baseUrl, logger = console, httpClient = axios) {
        super(baseUrl || 'https://animex.click', logger, httpClient)
        this.providerID = `${this.key}${this.idSeparator}`
        if (!this.baseUrl) {
            this.baseUrl = 'https://animex.click'
            this.baseURL = this.baseUrl
        }
    }

    requestConfig() {
        const base = super.requestConfig?.() || {}
        return {
            ...base,
            timeout: Math.max(Number(base.timeout) || 15000, 28000),
            headers: {
                ...(base.headers || {}),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
                Referer: this.baseUrl || 'https://animex.click/',
            },
        }
    }

    async search(text) {
        const query = normalizeText(text)
        if (!this.baseUrl || !query) {
            return []
        }

        try {
            // Prefer pretty search path used by the site, fall back to ?s=
            let $ = await this.fetchDocument(`/search/${encodeURIComponent(query).replace(/%20/g, '+')}/`)
            if (!$) {
                $ = await this.fetchDocument('/', {
                    params: {
                        s: query,
                        'customset[]': ['movie', 'serial', 'anime', 'korean', 'turkey'],
                    },
                })
            }
            if (!$) {
                return []
            }

            const results = []
            const lcQuery = query.toLowerCase().replace(/\s+/g, ' ').trim()
            const compactQuery = lcQuery.replace(/\s+/g, '')
            const queryCore = lcQuery
                .replace(/\b(season|series|s)\s*\d+\b/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim()

            $('a[href]').each((_, anchor) => {
                const href = $(anchor).attr('href')
                const path = this.pagePath(href)
                if (!path || !isDetailPath(path)) {
                    return
                }

                const id = this.pageId(path)
                const name = normalizeText(
                    $(anchor).attr('title')
                        || $(anchor).text()
                        || $(anchor).find('img').attr('alt')
                        || '',
                )
                if (!id || !name) {
                    return
                }
                const lcName = name.toLowerCase().replace(/\s+/g, ' ').trim()
                const compactName = lcName.replace(/\s+/g, '')
                const nameCore = lcName
                    .replace(/\b(season|series|s)\s*\d+\b/gi, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                const matched = lcName.includes(lcQuery)
                    || compactName.includes(compactQuery)
                    || (queryCore && nameCore.includes(queryCore))
                    || (queryCore && nameCore.replace(/\s+/g, '').includes(queryCore.replace(/\s+/g, '')))
                    || path.toLowerCase().includes(compactQuery)
                    || path.toLowerCase().replace(/-/g, '').includes(compactQuery)
                if (!matched) {
                    return
                }

                const type = pathType(path)
                const poster = $(anchor).find('img').attr('src')
                    ?? $(anchor).closest('article, .item, li, .post').find('img').first().attr('src')
                    ?? null

                results.push({id, name, poster, type, genres: []})
            })

            return uniqueLinks(
                results.map((r) => ({...r, url: r.id})),
                (r) => r.id,
            ).map(({url, ...rest}) => rest)
        } catch (error) {
            logAxiosError(error, this.logger, 'Animex search failed')
            return []
        }
    }

    /**
     * Directory listing (multi-episode / multi-quality folder).
     * Often IR-only; tries HTML table + li + JSON endpoints.
     */
    async fetchDirectoryFiles(directoryUrl, groupLabel, defaultSeason = null) {
        const headers = {
            ...(this.requestConfig()?.headers || {}),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
            'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
            Referer: this.baseUrl || 'https://animex.click/',
        }
        const timeout = Math.max(this.requestConfig()?.timeout || 15000, 22000)

        const files = []
        const pushFile = (name, url, size) => {
            const fileName = normalizeText(name) || String(name || '')
            let absolute = url
            if (!absolute || !isHttpUrl(absolute)) {
                absolute = resolveListingFileUrl(directoryUrl, url || fileName)
            }
            if (!absolute || !isHttpUrl(absolute)) return
            // Must look like a video (url or name)
            if (!isDirectVideoUrl(absolute) && !/\.(mkv|mp4|avi|m4v)(\?|$)/i.test(fileName)) return
            // If URL is still a directory, skip
            if (isDirectoryUrl(absolute) && !isDirectVideoUrl(absolute)) return
            const episode = extractEpisodeNumber(fileName) ?? extractEpisodeNumber(absolute)
            const season = extractSeasonNumber(fileName, groupLabel) ?? defaultSeason
            const quality = qualityFromText(groupLabel, fileName) || groupLabel || null
            files.push({
                url: absolute,
                season,
                episode,
                quality,
                size: size || null,
                title: fileName,
            })
        }

        // 1) Try JSON-style APIs some directory frontends expose
        const jsonCandidates = []
        try {
            const u = new URL(directoryUrl)
            jsonCandidates.push(`${directoryUrl}${directoryUrl.includes('?') ? '&' : '?'}format=json`)
            jsonCandidates.push(`${directoryUrl}${directoryUrl.includes('?') ? '&' : '?'}json=1`)
            if (u.searchParams.get('dir')) {
                const api = new URL('/api/list', u.origin)
                api.searchParams.set('dir', u.searchParams.get('dir'))
                jsonCandidates.push(api.toString())
            }
        } catch { /* ignore */ }

        for (const jsonUrl of jsonCandidates.slice(0, 3)) {
            try {
                const response = await this.httpClient.get(jsonUrl, {
                    ...this.requestConfig(),
                    timeout,
                    maxRedirects: 5,
                    headers: {...headers, Accept: 'application/json,text/plain,*/*'},
                    validateStatus: (s) => s >= 200 && s < 400,
                })
                let data = response.data
                if (typeof data === 'string') {
                    try { data = JSON.parse(data) } catch { data = null }
                }
                const rows = Array.isArray(data) ? data
                    : Array.isArray(data?.files) ? data.files
                        : Array.isArray(data?.data) ? data.data
                            : Array.isArray(data?.items) ? data.items
                                : []
                for (const row of rows) {
                    if (!row || typeof row !== 'object') continue
                    const name = row.name || row.filename || row.file || row.title
                    const url = row.url || row.href || row.link || row.download || name
                    const size = row.size || row.filesize || row.length || null
                    const type = String(row.type || row.kind || '')
                    if (/dir|folder/i.test(type) && !isDirectVideoUrl(String(url))) continue
                    pushFile(name, url, size != null ? String(size) : null)
                }
                if (files.length) return files
            } catch {
                /* try next */
            }
        }

        // 2) HTML listing
        try {
            const response = await this.httpClient.get(directoryUrl, {
                ...this.requestConfig(),
                timeout,
                maxRedirects: 5,
                headers,
            })
            const html = typeof response.data === 'string' ? response.data : ''
            if (!html || html.length < 40) {
                return files
            }
            const {load} = await import('cheerio')
            const $ = load(html)

            // Structured file rows (various directory UIs)
            $('li[data-type="file"], tr[data-type="file"], .file-row, .file, li.file').each((_, item) => {
                const name = $(item).attr('data-name')
                    || $(item).find('.name-text, .file-name, .name, a').first().text()
                const href = $(item).find('a[href]').first().attr('href')
                    || $(item).attr('data-href')
                    || $(item).attr('data-url')
                const size = normalizeText(
                    $(item).find('.file-size, .size, [data-size]').first().text()
                    || $(item).attr('data-size')
                    || '',
                ) || null
                pushFile(normalizeText(name), href, size)
            })

            // Table rows with a video-looking link or filename cell
            if (!files.length) {
                $('table tr').each((_, tr) => {
                    const $tr = $(tr)
                    const anchor = $tr.find('a[href]').first()
                    const href = anchor.attr('href')
                    const name = normalizeText(
                        anchor.attr('data-name')
                        || anchor.text()
                        || $tr.find('td').first().text()
                        || '',
                    )
                    if (!name && !href) return
                    if (!/\.(mkv|mp4|avi)/i.test(name) && !(href && isDirectVideoUrl(href))) return
                    const size = normalizeText($tr.find('td').eq(1).text()) || null
                    pushFile(name, href || name, size)
                })
            }

            // Any direct video anchors
            if (!files.length) {
                $('a[href]').each((_, a) => {
                    const href = $(a).attr('href')
                    const name = normalizeText($(a).attr('data-name') || $(a).text() || href)
                    if (href && (isDirectVideoUrl(href) || /\.(mkv|mp4)/i.test(name))) {
                        pushFile(name, href, null)
                    }
                })
            }

            // Regex fallback over raw HTML for ".mkv" filenames
            if (!files.length) {
                const re = /([A-Za-z0-9][^<>"'\\\n\r]*?\.(?:mkv|mp4|avi|m4v))/gi
                let match
                const seen = new Set()
                while ((match = re.exec(html)) !== null) {
                    const name = match[1].replace(/&amp;/g, '&').trim()
                    if (seen.has(name) || name.length > 240) continue
                    seen.add(name)
                    pushFile(name, name, null)
                }
            }

            return files
        } catch (error) {
            logAxiosError(error, this.logger, 'Animex directory listing fetch failed')
            return files
        }
    }

    async getMovieData(type, id) {
        const path = decodePagePath(id)
        if (!this.baseUrl || !path || !isDetailPath(path)) {
            return null
        }

        try {
            let $ = await this.fetchDocument(path)
            if (!$) {
                // CF/Worker: fetchDocument can fail; raw GET + cheerio
                try {
                    const url = this.endpoint(path)
                    const res = await this.httpClient.get(url, {
                        ...this.requestConfig(),
                        timeout: 28000,
                        responseType: 'text',
                        transformResponse: [(d) => d],
                        validateStatus: (s) => s >= 200 && s < 400,
                    })
                    const html = typeof res.data === 'string' ? res.data : ''
                    if (html && html.length > 200) {
                        const {load} = await import('cheerio')
                        $ = load(html)
                    }
                } catch (e) {
                    this.logger?.warn?.({err: e?.message}, 'Animex raw fetch failed')
                }
            }
            if (!$) {
                // Last resort: title from slug so meta endpoint can still open
                const slug = path.split('/').filter(Boolean).pop() || ''
                return {
                    path,
                    title: slug.replace(/-/g, ' '),
                    imdbId: null,
                    isSeries: true,
                    pageSeason: null,
                    links: [],
                }
            }

            const imdbHref = $('a[href*="imdb.com/title/tt"]').first().attr('href') ?? ''
            const imdbId = imdbHref.match(/\/title\/(tt\d+)/)?.[1] ?? null
            // Site uses <h1>انیمکس</h1> on every page — prefer og:title / entry-title / <title>
            const ogTitle = normalizeText($('meta[property="og:title"]').attr('content'))
                .replace(/\s*[–—|-]\s*انیمکس\s*$/i, '')
                .replace(/\s*[–—|-]\s*Animex\s*$/i, '')
                .trim()
            const entryTitle = normalizeText($('.entry-title, .post-title, h1.entry-title').first().text())
                .replace(/\s*[–—|-]\s*انیمکس\s*$/i, '')
                .trim()
            const docTitle = normalizeText($('title').first().text())
                .replace(/\s*[–—|-]\s*انیمکس\s*$/i, '')
                .replace(/\s*[–—|-]\s*Animex\s*$/i, '')
                .trim()
            const h1 = normalizeText($('h1').first().text())
            let title = ogTitle || entryTitle || docTitle || ''
            if (!title || title === 'انیمکس' || title === 'Animex' || /^دانلود\s/i.test(title)) {
                title = entryTitle || docTitle || ogTitle || (h1 !== 'انیمکس' && h1 !== 'Animex' ? h1 : '') ||
                    path.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') ||
                    title
            }
            const resolvedType = pathType(path) ?? type
            const pageSeason = extractSeasonNumber(title, path)

            const downloadTokens = []
            const seenTargets = new Set()
            $('a[href*="animex_go="]').each((_, anchor) => {
                const label = normalizeText($(anchor).text())
                const token = decodeAnimexGoToken($(anchor).attr('href'))
                if (!token?.target) return
                // Site now uses action "stream" for download/dir buttons (was "download").
                // Keep online-player-only buttons out when label is pure "پخش" without dir/file.
                const action = String(token.action || '').toLowerCase()
                if (action && action !== 'download' && action !== 'stream') return
                if (/^پخش(\s|$)/.test(label) && !isDirectoryUrl(token.target) && !isDirectVideoUrl(token.target)) {
                    return
                }
                const key = String(token.target)
                if (seenTargets.has(key)) return
                seenTargets.add(key)
                downloadTokens.push(token)
            })

            const links = []
            const directoryJobs = []
            const externalFallbacks = []

            for (const token of downloadTokens) {
                const groupLabel = [token.group_title, token.quality].filter(Boolean).join(' ')
                const seasonHint = extractSeasonNumber(token.group_title, token.quality, groupLabel, title)
                    ?? pageSeason

                if (isDirectVideoUrl(token.target)) {
                    links.push({
                        url: token.target,
                        quality: groupLabel || qualityFromText(token.target) || null,
                        title: groupLabel,
                        size: token.size || null,
                        season: seasonHint,
                        episode: extractEpisodeNumber(token.target) || extractEpisodeNumber(groupLabel),
                    })
                    continue
                }

                // Multi-episode directory (series / anime seasons)
                if (resolvedType === 'series' || isDirectoryUrl(token.target)) {
                    if (directoryJobs.length < 8) {
                        directoryJobs.push(
                            this.fetchDirectoryFiles(token.target, groupLabel, seasonHint)
                                .then((fetched) => ({files: fetched, token, groupLabel, seasonHint})),
                        )
                    }
                }
            }

            if (directoryJobs.length) {
                const settled = await Promise.allSettled(directoryJobs)
                for (const result of settled) {
                    if (result.status !== 'fulfilled') continue
                    const {files: fetched, token, groupLabel, seasonHint} = result.value
                    if (fetched.length) {
                        links.push(...fetched)
                    } else if (token?.target) {
                        // CDN blocked from non-IR IP — browser open for the user
                        externalFallbacks.push({
                            url: token.target,
                            externalUrl: token.target,
                            quality: groupLabel || null,
                            title: `${groupLabel || 'دانلود'} — لیست فایل‌ها (مرورگر)`,
                            season: seasonHint,
                            episode: null,
                            behaviorHints: {notWebReady: true},
                        })
                    }
                }
            }

            // If directory listing failed (common outside IR), still expose download targets
            if (!links.length && downloadTokens.length) {
                for (const token of downloadTokens) {
                    const groupLabel = [token.group_title, token.quality].filter(Boolean).join(' ')
                    if (!token.target) continue
                    const already = links.some((l) => l.url === token.target) ||
                        externalFallbacks.some((l) => l.url === token.target)
                    if (already) continue
                    const season = extractSeasonNumber(token.group_title, token.quality, title) ?? pageSeason ?? 1
                    let episode = extractEpisodeNumber(token.target) || extractEpisodeNumber(groupLabel)
                    // Season-pack directory without per-file list → keep selectable as E1
                    if (!episode && (isDirectoryUrl(token.target) || /فصل|season/i.test(groupLabel))) {
                        episode = 1
                    }
                    externalFallbacks.push({
                        url: token.target,
                        externalUrl: token.target,
                        quality: groupLabel || qualityFromText(token.target) || null,
                        title: groupLabel || 'Animex',
                        size: token.size || null,
                        season,
                        episode: episode || 1,
                        behaviorHints: {notWebReady: true},
                    })
                }
            }

            const merged = uniqueLinks([...links, ...externalFallbacks])

            return {
                path,
                title,
                imdbId,
                isSeries: resolvedType === 'series',
                pageSeason,
                links: merged,
            }
        } catch (error) {
            logAxiosError(error, this.logger, 'Animex detail request failed')
            return null
        }
    }

    getMovieLinks(movieData) {
        return Array.isArray(movieData?.links) ? movieData.links : []
    }

    getSeriesLinks(movieData, videoId) {
        const parts = String(videoId ?? '').split(':')
        // videoId forms: tt123:1:2 or providerId:1:2
        const season = Number(parts[parts.length - 2])
        const episode = Number(parts[parts.length - 1])
        if (!Number.isInteger(season) || !Number.isInteger(episode)) {
            return []
        }
        const links = this.getMovieLinks(movieData)

        const matched = links.filter((item) => {
            // Prefer real file URLs matched to this episode
            if (item.externalUrl && !isDirectVideoUrl(item.url)) {
                return false
            }
            const s = item.season != null ? Number(item.season) : movieData?.pageSeason
            const e = item.episode != null ? Number(item.episode) : null
            if (e == null) return false
            if (s == null) return e === episode
            return s === season && e === episode
        })

        if (matched.length) {
            return matched
        }

        // Episode number missing on files but single-episode page → allow all direct files
        const directs = links.filter((item) => item.url && isDirectVideoUrl(item.url) && !item.externalUrl)
        if (directs.length === 1) {
            return directs
        }

        // Last resort: external directory / season links (browser open)
        const external = links.filter((item) => item.externalUrl)
        if (external.length) {
            const bySeason = external.filter((item) => {
                const s = item.season != null ? Number(item.season) : movieData?.pageSeason
                return s == null || s === season
            })
            return bySeason.length ? bySeason : external
        }
        return []
    }

    getLinks(type, videoId, movieData) {
        if (movieData?.isSeries) {
            return this.getSeriesLinks(movieData, videoId)
        }
        return this.getMovieLinks(movieData)
    }

    async imdbID(movieData) {
        return movieData?.imdbId ?? null
    }
}
