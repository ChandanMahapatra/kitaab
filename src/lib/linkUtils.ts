/**
 * Normalizes a URL by ensuring it has a protocol
 * @param url - The URL string to normalize
 * @returns The normalized URL with protocol, or empty string if invalid
 */
export function normalizeUrl(url: string): string {
    const trimmed = url.trim();
    if (!trimmed) return '';

    // If already has protocol, return as-is
    if (/^https?:\/\/.+/i.test(trimmed)) {
        return trimmed;
    }

    // Use http:// for localhost and loopback addresses
    if (/^(localhost|127\.0\.0\.1)(:|\/|$)/.test(trimmed)) {
        return `http://${trimmed}`;
    }

    // Add https:// by default
    return `https://${trimmed}`;
}

/**
 * Validates whether a string is a valid URL
 * @param url - The URL string to validate
 * @returns true if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
    if (!url || !url.trim()) return false;

    try {
        const normalized = normalizeUrl(url);
        if (!normalized) return false;
        new URL(normalized);
        return true;
    } catch {
        return false;
    }
}
