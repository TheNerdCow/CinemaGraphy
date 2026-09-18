import axios from 'axios'

import HtmlSource, {decodePagePath, isHttpUrl, normalizeText} from './html-source.js'
import {logAxiosError, searchAndGetTMDB} from '../utils.js'

/** Preferred live domain — myf2m.info series pages often truncate/timeout from Vercel. */
export const DEFAULT_F2MEDIA_BASEURL = 'https://www.film2med.top'
/** Hosts that serve the same Film2Media content (www optional). */
const F2MEDIA_HOSTS = [
    'film2med.top',
    'myf2m.info',
    'film2media.top',
    'film2media.pw',
    'f2m.site',
]
function normHost(host) {
    return String(host || '').replace(/^www\./i, '').toLowerCase()
}
function isF2MediaHost(host) {
    const h = normHost(host)
    return F2MEDIA_HOSTS.some((d) => h === d || h.endsWith('.' + d))
}

const PERSIAN_SEASONS = new Map([
    ['اول', 1],
    ['دوم', 2],
    ['سوم', 3],
    ['چهارم', 4],
    ['پنجم', 5],
    ['ششم', 6],
    ['هفتم', 7],
    ['هشتم', 8],
    ['نهم', 9],
    ['دهم', 10],
])

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

function numberFromText(value) {
    const normalized = String(value ?? '')
        .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    const match = normalized.match(/\d+/)
    return match ? Number(match[0]) : null
}

function seasonFromText(value, fallback) {
    const text = normalizeText(value)
    const numeric = numberFromText(text.match(/فصل\s*[۰-۹٠-٩\d]+/)?.[0])
    if (numeric != null) {
        return numeric
    }
    for (const [word, season] of PERSIAN_SEASONS) {
        if (text.includes(`فصل ${word}`)) {
            return season
        }
    }
    return fallback
}

function urlFromOnclick(value) {
    const match = String(value ?? '').match(/handleDownloadClick\(\s*(['"])(https?:\/\/.*?)\1/)
    return match?.[2] ?? null
}

function extractQualityFromFilename(url) {
    const s = String(url ?? '')
    const match = s.match(/(?:^|[._\-\/])((?:2160|1080|720|480|360)p)(?:[._\-\/]|$)/i)
        || s.match(/((?:2160|1080|720|480|360)p)/i)
    return match?.[1]?.toLowerCase() ?? null
}

function filenameFromUrl(url) {
    try {
        const {pathname} = new URL(url)
        const raw = decodeURIComponent(pathname.split('/').pop() ?? '')
        // Filenames are dot/underscore-separated (e.g. "S01E01.1080p.WEB.DL.Farsi.Sub.mkv") —
        // turn separators into spaces so the shared quality/audio regexes (which expect
        // word-boundary-separated tokens) can actually match them.
        return raw.replace(/\.[a-z0-9]{2,4}$/i, '').replace(/[._]+/g, ' ')
    } catch {
        return ''
    }
}

function mediaUrl($element) {
    const href = $element.attr('href')
    if (isHttpUrl(href)) {
        return href
    }
    const onclickUrl = urlFromOnclick($element.attr('onclick'))
    return isHttpUrl(onclickUrl) ? onclickUrl : null
}

function blockAudioType(blockElement, $) {
    const classAttr = $(blockElement).attr('class') ?? ''
    if (/dub/i.test(classAttr)) return 'dubbed'
    if (/sub/i.test(classAttr)) return 'subtitled'
    // Headers like "دوبله فارسی" / "زیرنویس فارسی" are previous siblings of each quality box
    let text = normalizeText($(blockElement).text())
    $(blockElement)
        .prevAll()
        .slice(0, 8)
        .each((_, el) => {
            text = `${normalizeText($(el).text())} ${text}`
        })
    if (/دوبله|دو\s*زبانه|farsi\.?dub|\bdubbed\b/i.test(text)) return 'dubbed'
    if (/زیرنویس|hard\.?sub|farsi\.?sub|\bsubtitled\b/i.test(text)) return 'subtitled'
    return null
}

function audioFromUrl(url) {
    const u = String(url || '')
    if (/farsi\.?dub|\bdubbed\b/i.test(u)) return 'dubbed'
    if (/farsi\.?sub|hard\.?sub|hardsub|\bsubtitled\b/i.test(u)) return 'subtitled'
    return null
}

function labeledFieldValue($, blockElement, labelPattern) {
    let value = ''
    $(blockElement).find('.text-muted').each((_, el) => {
        if (labelPattern.test($(el).text())) {
            const full = normalizeText($(el).parent().text())
            value = normalizeText(full.replace(normalizeText($(el).text()), ''))
        }
    })
    return value && value !== '—' ? value : ''
}

function parseMovieLinks($) {
    const links = []
    // #downloads is only a section title on F2M, not a parent wrapper
    $('.download-list').each((_, block) => {
        const audioType = blockAudioType(block, $)
        const encoder = labeledFieldValue($, block, /انکودر/)

        $(block).find('li').each((__, item) => {
            const rawQ = normalizeText($(item).find('.text[dir="ltr"]').first().text())
            const url = mediaUrl($(item).find('a[download][href], a[onclick*="handleDownloadClick"]').first())
            if (!url) {
                return
            }
            const quality = extractQualityFromFilename(url) || rawQ || ''
            const resolvedAudio = audioFromUrl(url) || audioType
            const audioLabel =
                resolvedAudio === 'dubbed' ? 'دوبله' : resolvedAudio === 'subtitled' ? 'زیرنویس' : null
            const titleParts = [quality, audioLabel, encoder].filter(Boolean)
            links.push({
                url,
                quality: quality || null,
                audioType: resolvedAudio,
                title: titleParts.join(' · '),
            })
        })
    })
    return uniqueLinks(links)
}

function parseSeriesLinks($) {
    const links = []
    // #downloads is a title node; seasons sit as siblings further down the page
    $('.download-season').each((seasonIndex, seasonElement) => {
        const season = seasonFromText(
            normalizeText($(seasonElement).children('button').first().text()),
            seasonIndex + 1,
        )

        $(seasonElement).find('.download-list').each((_, block) => {
            const audioType = blockAudioType(block, $)
            const qualityLabel =
                labeledFieldValue($, block, /کیفیت/) ||
                normalizeText($(block).find('.text[dir="ltr"]').first().text())
            const size = labeledFieldValue($, block, /حجم/)
            const encoder = labeledFieldValue($, block, /انکودر/)

            $(block).find('.series-downloaditems .d-flex').each((episodeIndex, episodeElement) => {
                const directLink = $(episodeElement)
                    .find('a.btn-default[href*="http"], a.btn-default[href*=".mkv"], a.btn-default[href*=".mp4"]')
                    .last()
                const anyHttp = $(episodeElement)
                    .find('a[href*="http"]')
                    .filter((_, a) => /\.(mkv|mp4|m3u8)(\?|$)/i.test($(a).attr('href') || ''))
                    .last()
                const fallbackLink = $(episodeElement).find('a[onclick*="handleDownloadClick"]').first()
                const url = mediaUrl(directLink.length ? directLink : anyHttp.length ? anyHttp : fallbackLink)
                const episode =
                    numberFromText(directLink.text()) ??
                    numberFromText($(episodeElement).find('a.btn-default').last().text()) ??
                    episodeIndex + 1
                if (!url) return

                const seFromUrl = String(url).match(/[._\-]S(\d{1,2})E(\d{1,3})[._\-]/i)
                const seasonFinal = seFromUrl ? Number(seFromUrl[1]) : season
                const episodeFinal = seFromUrl ? Number(seFromUrl[2]) : episode
                // File name wins so 480p / 720p / 1080p stay separate streams
                const resolvedQuality = extractQualityFromFilename(url) || qualityLabel || ''
                const resolvedAudio = audioFromUrl(url) || audioType
                const audioLabel =
                    resolvedAudio === 'dubbed' ? 'دوبله' : resolvedAudio === 'subtitled' ? 'زیرنویس' : null
                const titleParts = [
                    `S${seasonFinal}E${String(episodeFinal).padStart(2, '0')}`,
                    resolvedQuality,
                    audioLabel,
                    encoder,
                ].filter(Boolean)
                links.push({
                    season: seasonFinal,
                    episode: episodeFinal,
                    quality: resolvedQuality || null,
                    size: size || null,
                    audioType: resolvedAudio,
                    url,
                    title: titleParts.join(' · '),
                })
            })
        })
    })
    if (links.length) {
        return uniqueLinks(links, (item) => `${item.season}:${item.episode}:${item.url}`)
    }
    // HTTP/2 often truncates large series pages — recover from raw hrefs
    return uniqueLinks(parseSeriesLinksFromHtml($.root().html() || ''), (item) => `${item.season}:${item.episode}:${item.url}`)
}

function parseSeriesLinksFromHtml(html) {
    const links = []
    const seen = new Set()
    const blob = String(html || '')
    const patterns = [
        /href=["'](https?:\/\/[^"']+?\.(?:mkv|mp4)[^"']*)["']/gi,
        /handleDownloadClick\(\s*['"](https?:\/\/[^'"]+?\.(?:mkv|mp4)[^'"]*)['"]/gi,
    ]
    for (const re of patterns) {
        let m
        while ((m = re.exec(blob))) {
            const url = m[1]
            if (!url || seen.has(url)) continue
            seen.add(url)
            const se = url.match(/[._\-]S(\d{1,2})E(\d{1,3})[._\-]/i)
            const season = se ? Number(se[1]) : 1
            const episode = se ? Number(se[2]) : null
            if (!episode) continue
            const quality = extractQualityFromFilename(url) || ''
            const audioType = audioFromUrl(url)
            const audioLabel =
                audioType === 'dubbed' ? 'دوبله' : audioType === 'subtitled' ? 'زیرنویس' : null
            links.push({
                season,
                episode,
                quality: quality || null,
                size: null,
                audioType,
                url,
                title: [`S${season}E${String(episode).padStart(2, '0')}`, quality, audioLabel]
                    .filter(Boolean)
                    .join(' · '),
            })
        }
    }
    return links
}

function parseF2MediaMovieDetail($, path) {
    const imdbHref = $('a[href*="imdb.com/title/tt"]').first().attr('href') ?? ''
    const imdbId = imdbHref.match(/\/title\/(tt\d+)/)?.[1] ?? null
    const title = normalizeText($('h1.entry-title').first().text())
    const links = parseMovieLinks($)
    return {path, title, imdbId, isSeries: false, links}
}

function parseF2MediaSeriesDetail($, path) {
    const imdbHref = $('a[href*="imdb.com/title/tt"]').first().attr('href') ?? ''
    const imdbId = imdbHref.match(/\/title\/(tt\d+)/)?.[1] ?? null
    const title = normalizeText($('h1.entry-title').first().text())
    const structured = parseSeriesLinks($)
    const fromHtml = parseSeriesLinksFromHtml($.root().html() || '')
    const links = uniqueLinks([...structured, ...fromHtml], (item) => `${item.season}:${item.episode}:${item.url}`)
    return {path, title, imdbId, isSeries: true, links}
}

function isDetailPath(type, path) {
    if (type === 'series') {
        return /^\/series\/[^/]+\/$/.test(path)
    }
    return type === 'movie' && /^\/\d+\/[^/]+\/$/.test(path)
}

export default class F2Media extends HtmlSource {
    key = 'f2media'

    constructor(baseUrl, logger = console, httpClient = axios, env = process.env) {
        const raw = String(baseUrl || env.F2MEDIA_BASEURL || DEFAULT_F2MEDIA_BASEURL || '').trim()
        const normalized = raw.replace(/\/+$/, '') || DEFAULT_F2MEDIA_BASEURL
        super(normalized, logger, httpClient)
        this.providerID = `${this.key}${this.idSeparator}`
        this.tmdbApiKey = env.TMDB_API_KEY
    }

    /** Accept any known Film2Media host so domain switches do not drop results. */
    pagePath(value) {
        if (!this.baseUrl) return null
        try {
            const url = new URL(value, `${this.baseUrl}/`)
            if (!isF2MediaHost(url.hostname) && normHost(url.hostname) !== normHost(new URL(this.baseUrl).hostname)) {
                return null
            }
            return url.pathname
        } catch {
            return null
        }
    }

    async isLogin() {
        return true
    }

    async login() {
        return true
    }

    async search(text) {
        const query = normalizeText(text)
        if (!this.baseUrl) {
            this.logger.warn('F2Media search skipped', {reason: 'F2MEDIA_BASEURL is missing'})
            return []
        }
        if (!query) {
            this.logger.debug('F2Media search skipped', {reason: 'empty query'})
            return []
        }

        const tokens = query
            .toLowerCase()
            .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
            .split(/\s+/)
            .filter((t) => t.length >= 2)

        const nameMatches = (name) => {
            const n = normalizeText(name).toLowerCase()
            if (!n) return false
            if (n.includes(query.toLowerCase())) return true
            // All tokens present (order-independent) — handles "Ted Lasso" vs long FA titles
            if (tokens.length && tokens.every((t) => n.includes(t))) return true
            // At least one strong token (len>=4) for short queries
            const strong = tokens.filter((t) => t.length >= 4)
            return strong.length > 0 && strong.some((t) => n.includes(t))
        }

        try {
            this.logger.debug('F2Media search started', {query, baseUrl: this.baseUrl})

            // REST first — HTML search markup on myf2m.info no longer uses article.entry cards
            const restUrl = `${this.baseUrl.replace(/\/+$/, '')}/wp-json/wp/v2`
            const fallbackResults = []
            const seen = new Set()

            const [postsRes, seriesRes] = await Promise.allSettled([
                this.httpClient.get(`${restUrl}/posts`, {
                    params: {search: query, per_page: 15},
                    timeout: 12_000,
                    headers: this.requestConfig().headers,
                }),
                this.httpClient.get(`${restUrl}/series`, {
                    params: {search: query, per_page: 15},
                    timeout: 12_000,
                    headers: this.requestConfig().headers,
                }),
            ])

            for (const res of [postsRes, seriesRes]) {
                if (res.status !== 'fulfilled' || !Array.isArray(res.value?.data)) {
                    continue
                }
                for (const item of res.value.data) {
                    const link = item.link ?? ''
                    const path = this.pagePath(link)
                    const id = this.pageId(path)
                    const name = item.title?.rendered
                        ? normalizeText(item.title.rendered)
                              .replace(/^(دانلود\s+(فیلم|سریال|فصل)\s*)+/i, '')
                              .trim()
                        : ''
                    if (!id || !name || !path || !nameMatches(name)) {
                        continue
                    }
                    const type = path.startsWith('/series/') ? 'series' : 'movie'
                    if (!isDetailPath(type, path)) {
                        continue
                    }
                    if (seen.has(id)) continue
                    seen.add(id)
                    const imgUrl = item.featured_media_url ?? item.jetpack_featured_media_url ?? null
                    fallbackResults.push({id, name, poster: imgUrl, type, genres: []})
                }
            }

            if (fallbackResults.length > 0) {
                this.logger.debug('F2Media search completed', {
                    query,
                    resultCount: fallbackResults.length,
                    method: 'rest-api',
                })
                return fallbackResults
            }

            // HTML fallback (older themes)
            const $ = await this.fetchDocument('/', {params: {s: query}})
            if (!$) {
                return []
            }
            const results = []
            $('article.entry a.stretched-link[rel="bookmark"], a.stretched-link[rel="bookmark"], .entry a[rel="bookmark"]').each((_, anchor) => {
                const item = $(anchor).closest('article.entry, .entry, article')
                const href = $(anchor).attr('href')
                const path = this.pagePath(href)
                const id = this.pageId(path)
                const name = normalizeText(
                    $(anchor).find('.entry-title').text()
                        || $(anchor).attr('title')
                        || $(anchor).text(),
                )
                if (!id || !name || !path || !nameMatches(name)) return
                const type = path.startsWith('/series/') ? 'series' : 'movie'
                if (!isDetailPath(type, path)) return
                if (seen.has(id)) return
                seen.add(id)
                const poster = item.find('figure.entry-cover img, img').first().attr('src') ?? null
                results.push({id, name, poster, type, genres: []})
            })
            this.logger.debug('F2Media search completed', {query, resultCount: results.length, method: 'html'})
            return results
        } catch (error) {
            logAxiosError(error, this.logger, 'F2Media search failed')
            return []
        }
    }

    async getMovieData(type, id) {
        const path = decodePagePath(id)
        if (!this.baseUrl || !path || !isDetailPath(type, path)) {
            return null
        }

        try {
            this.logger.debug('F2Media detail started', {type, path})
            const $ = await this.fetchDocument(path)
            const result = $
                ? (type === 'series' ? parseF2MediaSeriesDetail($, path) : parseF2MediaMovieDetail($, path))
                : null
            this.logger.debug('F2Media detail completed', {
                type,
                path,
                linkCount: result?.links.length ?? 0,
                imdbId: result?.imdbId ?? null,
            })
            return result
        } catch (error) {
            logAxiosError(error, this.logger, 'F2Media detail request failed')
            return null
        }
    }

    getMovieLinks(movieData) {
        return Array.isArray(movieData?.links) ? movieData.links : []
    }

    getSeriesLinks(movieData, videoId) {
        // videoId forms: `pageId:season:episode` | `tmdb:123:1:2` | `1:2` | trailing from stream id
        const parts = String(videoId ?? '').split(':').filter((x) => x !== '')
        let season = NaN
        let episode = NaN
        if (parts.length >= 2) {
            episode = Number(parts[parts.length - 1])
            season = Number(parts[parts.length - 2])
        }
        // if second-last is not a season number (e.g. tmdb id), scan from end for two ints
        if (!Number.isInteger(season) || !Number.isInteger(episode)) {
            const nums = parts.map((x) => Number(x)).filter((n) => Number.isInteger(n))
            if (nums.length >= 2) {
                episode = nums[nums.length - 1]
                season = nums[nums.length - 2]
            }
        }
        if (!Number.isInteger(season) || !Number.isInteger(episode) || season < 0 || episode < 1) {
            return []
        }
        const links = this.getMovieLinks(movieData)
        let matched = links.filter((item) => item.season === season && item.episode === episode)
        // Some F2M series pages only expose S01-style files on a later-season page.
        if (!matched.length) {
            matched = links.filter((item) => item.episode === episode)
        }
        return matched
    }

    getLinks(type, videoId, movieData) {
        if (type === 'movie') {
            return this.getMovieLinks(movieData)
        }
        if (type === 'series') {
            return this.getSeriesLinks(movieData, videoId)
        }
        return []
    }

    async imdbID(movieData, type) {
        if (movieData?.imdbId) {
            return movieData.imdbId
        }
        const title = normalizeText(movieData?.title ?? '').replace(/\s+(?:19|20)\d{2}$/, '')
        if (!title) {
            return null
        }
        const tmdbData = await searchAndGetTMDB(title, type, this.httpClient, this.logger, this.tmdbApiKey)
        return tmdbData?.external_ids?.imdb_id ?? null
    }
}
