export interface Issue {
    type: 'adverb' | 'passive' | 'complex' | 'veryComplex' | 'hardWord' | 'scheduler' | 'qualifier';
    index: number;
    length: number;
    text: string;
    suggestion?: string;
}

export interface AnalysisResult {
    charCount: number;
    wordCount: number;
    sentenceCount: number;
    paragraphCount: number;
    readingTime: number; // minutes
    fleschScore: number;
    score: number; // 0-100
    gradeLevel: number;
    issues: Issue[];
}

export const COMPLEX_WORD_SYLLABLES = 4;
export const SENTENCE_REGEX = /[^.!?]+[.!?]+/g;
export const WORD_REGEX = /\b\w+\b/g;

const QUALIFIER_REGEX = new RegExp(
    `\\b(${[
        'I think', 'we think', 'I believe', 'we believe',
        'maybe', 'perhaps', 'possibly', 'probably',
        'I guess', 'we guess', 'kind of', 'sort of',
        'a bit', 'a little', 'really', 'extremely', 'incredibly'
    ].join('|')})\\b`,
    'gi'
);

export interface SentenceMatch {
    text: string;
    wordCount: number;
    type: 'complex' | 'veryComplex' | null;
}

export function analyzeSentence(sentenceText: string): SentenceMatch {
    const words = sentenceText.match(WORD_REGEX) || [];
    const wordCount = words.length;
    let type: 'complex' | 'veryComplex' | null = null;

    if (wordCount > 35) {
        type = 'veryComplex';
    } else if (wordCount > 25) {
        type = 'complex';
    }

    return { text: sentenceText, wordCount, type };
}

export function isComplexWord(word: string): boolean {
    return syllableCount(word) >= COMPLEX_WORD_SYLLABLES;
}

/**
 * LRU cache for syllable counts to avoid redundant computation.
 * Using Map maintains insertion order, which we leverage for LRU eviction.
 */
const syllableCache = new Map<string, number>();
const MAX_SYLLABLE_CACHE = 5000;

export function syllableCount(word: string): number {
    const cached = syllableCache.get(word);
    if (cached !== undefined) {
        // LRU: Move to end (most recently used)
        syllableCache.delete(word);
        syllableCache.set(word, cached);
        return cached;
    }

    let w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (w.length <= 3) {
        addToSyllableCache(word, 1);
        return 1;
    }

    w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    w = w.replace(/^y/, '');

    const syllables = w.match(/[aeiouy]{1,2}/g);
    const count = syllables ? syllables.length : 1;

    addToSyllableCache(word, count);
    return count;
}

/**
 * Add entry to syllable cache with LRU eviction.
 * When cache is full, removes the least recently used entry (first in Map).
 */
function addToSyllableCache(word: string, count: number): void {
    if (syllableCache.size >= MAX_SYLLABLE_CACHE) {
        // Evict least recently used (first entry in Map)
        const firstKey = syllableCache.keys().next().value;
        if (firstKey !== undefined) {
            syllableCache.delete(firstKey);
        }
    }
    syllableCache.set(word, count);
}

export function analyzeText(text: string): AnalysisResult {
    if (!text.trim()) {
        return {
            charCount: 0,
            wordCount: 0,
            sentenceCount: 0,
            paragraphCount: 0,
            readingTime: 0,
            fleschScore: 0,
            score: 0,
            gradeLevel: 0,
            issues: [],
        };
    }

    // Basic Stats
    const charCount = text.length;
    // Use a more robust split for words to handle edge cases
    const words = text.match(/\b\w+\b/g) || [];
    const wordCount = words.length;
    // Split strictly by sentence terminators
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const sentenceCount = Math.max(1, sentences.length);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;

    const readingTime = wordCount / 250;

    // Syllables (compute once, reuse for Flesch and score)
    const syllableCounts = words.map(w => syllableCount(w));
    const totalSyllables = syllableCounts.reduce((a, b) => a + b, 0);

    // Flesch Reading Ease
    // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
    const avgWordsPerSentence = wordCount / sentenceCount;
    const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;

    const fleschScore = Math.min(100, Math.max(0,
        206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord)
    ));

    // Kincaid Grade Level
    // 4.71 * (chars/words) + 0.5 * (words/sentences) - 21.43
    // Note: logic.md specifies letters, not straight chars.
    const letters = (text.match(/[a-zA-Z]/g) || []).length;

    // NOTE: Logic.md uses (letters / wordCount) for Grade Level formula
    // Formula: 0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59 (Flesch-Kincaid Grade Level)
    // BUT logic.md specified: 4.71 * (letters/word) + 0.5 * (words/sentence) - 21.43 (This is Coleman-Liau)
    // We will follow logic.md exactly (Coleman-Liau approx).
    const gradeLevel = Math.max(0, Math.round(
        (4.71 * (letters / Math.max(1, wordCount))) + (0.5 * avgWordsPerSentence) - 21.43
    ));

    // Issues Detection
    const issues: Issue[] = [];

    // 1. Adverbs (ending in -ly)
    const adverbRegex = /\b\w+ly\b/gi;
    let match;
    while ((match = adverbRegex.exec(text)) !== null) {
        // Exclude common non-adverbs handled by this regex (simple filter)
        const word = match[0].toLowerCase();
        const exceptions = ['family', 'only', 'july', 'reply', 'supply', 'apply', 'belly', 'jelly', 'rally', 'ally'];
        if (!exceptions.includes(word)) {
            issues.push({
                type: 'adverb',
                index: match.index,
                length: match[0].length,
                text: match[0],
                suggestion: 'Try a stronger verb'
            });
        }
    }

    // 2. Passive Voice
    const passiveRegex = /\b(is|are|was|were|be|been|being)\s+(\w+ed|\w+en)\b/gi;
    while ((match = passiveRegex.exec(text)) !== null) {
        issues.push({
            type: 'passive',
            index: match.index,
            length: match[0].length,
            text: match[0],
            suggestion: 'Use active voice'
        });
    }

    // 3. Complex Sentences (>25 words) and very hard sentences (>35 words)
    // Process each line/paragraph separately to ensure we don't cross paragraph boundaries
    const lines = text.split(/\n/);
    let currentIndex = 0;
    
    for (const line of lines) {
        if (line.trim().length > 0) {
            SENTENCE_REGEX.lastIndex = 0;
            let sentenceMatch;
            
            while ((sentenceMatch = SENTENCE_REGEX.exec(line)) !== null) {
                const sentenceText = sentenceMatch[0];
                const sentenceAnalysis = analyzeSentence(sentenceText);
                const sentenceIndex = currentIndex + sentenceMatch.index;
                
                if (sentenceAnalysis.type) {
                    issues.push({
                        type: sentenceAnalysis.type,
                        index: sentenceIndex,
                        length: sentenceText.length,
                        text: sentenceText.trim(),
                        suggestion: 'Split into smaller sentences'
                    });
                }
            }
        }
        // Move index past this line and its newline
        currentIndex += line.length + 1;
    }

    // 4. Complex Words / Hard Words
    // Logic.md: "Hard words (3+ syllables)", "Very hard words (4+ syllables)"
    let wordMatch;
    WORD_REGEX.lastIndex = 0;
    while ((wordMatch = WORD_REGEX.exec(text)) !== null) {
        const word = wordMatch[0];
        if (isComplexWord(word)) {
            issues.push({
                type: 'hardWord', // Mapped to purple in UI
                index: wordMatch.index,
                length: word.length,
                text: word,
                suggestion: 'Use a simpler word'
            });
        }
    }

    // 5. Weak Qualifiers (single pre-compiled regex pass)
    QUALIFIER_REGEX.lastIndex = 0;
    while ((match = QUALIFIER_REGEX.exec(text)) !== null) {
        issues.push({
            type: 'qualifier',
            index: match.index,
            length: match[0].length,
            text: match[0],
            suggestion: 'Remove weak qualifier'
        });
    }


    // Score Calculation (single-pass counting)
    const issueCounts: Record<string, number> = {};
    for (const issue of issues) {
        issueCounts[issue.type] = (issueCounts[issue.type] || 0) + 1;
    }
    const adverbCount = issueCounts['adverb'] || 0;
    const passiveCount = issueCounts['passive'] || 0;
    const complexCount = issueCounts['complex'] || 0;
    const veryComplexCount = issueCounts['veryComplex'] || 0;

    // Reuse pre-computed syllable counts from above
    let hardWordsCount = 0;  // 3+ syllables
    let veryHardWordsCount = 0;  // 4+ syllables
    for (const count of syllableCounts) {
        if (count >= 3) hardWordsCount++;
        if (count >= COMPLEX_WORD_SYLLABLES) veryHardWordsCount++;
    }

    const penalty_adverbs = Math.max(0, adverbCount - 2) * 2;
    const penalty_passive = Math.max(0, passiveCount - 4) * 2;
    // Logic.md says: hard words (-15 points per word PER 100 words ratio basically? No, formula says: (hardWords / wordCount) * 15 * 100? )
    // Logic.md exact text: "penalty_hard = (hardWords / Math.max(wordCount, 1)) * 15;" -> Wait, that's small. 
    // If text has 100 words and 10 are hard. 10/100 = 0.1 * 15 = 1.5 points. That seems low.
    // Let's assume the formula meant to be interpreted as a percentage-like weight or the formula is exact.
    // Re-reading logic.md: "const penalty_hard = (hardWords / Math.max(wordCount, 1)) * 15;"
    // This likely means if 100% of words are hard, penalty is 15.
    // Let's stick to the logic.md formula exactly.
    // Actually, standard tools often define "hard sentence" density.
    // Let's stick strictly to `logic.md`:
    // This results in max penalty of 15 if ALL words are hard.
    // Let's follow logic.md blindly as requested.
    const penalty_hard_calc = (hardWordsCount / Math.max(wordCount, 1)) * 15;
    const penalty_very_hard_calc = (veryHardWordsCount / Math.max(wordCount, 1)) * 25;
    const penalty_complex = (complexCount * 1) + (veryComplexCount * 1);

    const totalPenalty = penalty_adverbs + penalty_passive + penalty_hard_calc + penalty_very_hard_calc + penalty_complex;
    const score = Math.max(0, Math.round(100 - totalPenalty));

    return {
        charCount,
        wordCount,
        sentenceCount,
        paragraphCount,
        readingTime,
        fleschScore: parseFloat(fleschScore.toFixed(1)),
        score,
        gradeLevel,
        issues
    };
}
