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
