/**
 * Size label helpers for stream titles.
 * Kept separate so the size-fix can be reviewed/tested in isolation.
 */
export function cleanSize(size) {
    if (size == null || size === '') {
        return null
    }
    const cleaned = String(size)
        .replace(/^(حجم|size|حجم\s*فایل)\s*[:：\-]?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim()
    return cleaned || null
}

export function detectSize(text) {
    if (!text) {
        return null
    }
    // Match size tokens only — avoid treating resolutions like 1080p as sizes.
    const match = String(text).match(/(\d+(?:[.,]\d+)?\s*(?:GB|MB|گیگ(?:ابایت)?|مگ(?:ابایت)?))\b/i)
    return match ? match[1].replace(/\s+/g, ' ').trim() : null
}
