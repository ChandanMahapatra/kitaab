const SUPPORTED_URL_PROTOCOLS = new Set([
    "http:",
    "https:",
    "mailto:",
    "sms:",
    "tel:",
]);

export function sanitizeUrl(url: string): string {
    try {
        const parsedUrl = new URL(url);
        if (!SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol)) {
            return "about:blank";
        }
        return url;
    } catch {
        // Malformed URL - use allowlist approach for relative URLs
        const trimmedUrl = url.trim();
        const lowercaseUrl = trimmedUrl.toLowerCase();

        // Block any URL with a scheme-like pattern that isn't supported
        if (lowercaseUrl.includes(":")) {
            // Allow only specific relative schemes
            if (lowercaseUrl.startsWith("#") || lowercaseUrl.startsWith("?")) {
                return trimmedUrl;
            }
            return "about:blank";
        }

        // Allow relative paths (/, ./, ../)
        if (lowercaseUrl.startsWith("/") || lowercaseUrl.startsWith("./") || lowercaseUrl.startsWith("../")) {
            return trimmedUrl;
        }

        // For anything else that doesn't parse as a URL, reject it
        return "about:blank";
    }
}

export function validateUrl(url: string): boolean {
    try {
        const parsedUrl = new URL(url);
        return SUPPORTED_URL_PROTOCOLS.has(parsedUrl.protocol);
    } catch {
        return false;
    }
}

// Regex for matching URLs in text for AutoLinkPlugin
const URL_REGEX =
    /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/;

const EMAIL_REGEX =
    /(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;

export const MATCHERS = [
    (text: string) => {
        const match = URL_REGEX.exec(text);
        if (match === null) return null;
        const fullMatch = match[0];
        return {
            index: match.index,
            length: fullMatch.length,
            text: fullMatch,
            url: fullMatch.startsWith("http") ? fullMatch : `https://${fullMatch}`,
        };
    },
    (text: string) => {
        const match = EMAIL_REGEX.exec(text);
        if (match === null) return null;
        const fullMatch = match[0];
        return {
            index: match.index,
            length: fullMatch.length,
            text: fullMatch,
            url: `mailto:${fullMatch}`,
        };
    },
];
