/**
 * Markdown cache to avoid redundant conversions from Lexical EditorState to markdown.
 *
 * IMPORTANT: This cache is updated immediately on every editor change.
 * Consumers should read from this cache when they need the current markdown representation.
 * The cache is always kept in sync with the latest editor state.
 */
let cachedMarkdown = '';
let cacheVersion = 0;

export function getCachedMarkdown(): { markdown: string; version: number } {
    return { markdown: cachedMarkdown, version: cacheVersion };
}

export function updateCachedMarkdown(markdown: string): void {
    cachedMarkdown = markdown;
    cacheVersion++;
}
