# Fix: Hard Sentence Highlighting Inconsistency

## Problem
The highlighting for hard sentences doesn't match between the editor and sidebar. Two different regex patterns are being used:

1. **analysis.ts** uses: `/[^.!?]*?[^.!?
\s][^.!?]*?[.!?]+/g`
2. **IssueHighlighterPlugin.tsx** uses: `/[^.!?]+[.!?]+(\s+|$)/g`

This causes mismatched detection between real-time highlighting and sidebar analysis counts.

## Solution

### Step 1: Create Shared Sentence Detection Utility
**File:** `src/lib/analysis.ts`

Add exported constants and utility function:
- Export `SENTENCE_REGEX` constant
- Export `WORD_REGEX` constant  
- Export `analyzeSentence()` function that returns sentence classification

### Step 2: Update IssueHighlighterPlugin
**File:** `src/components/editor/plugins/IssueHighlighterPlugin.tsx`

Replace inline sentence detection with shared utility:
- Import `SENTENCE_REGEX`, `WORD_REGEX`, and `analyzeSentence` from analysis.ts
- Replace `SENTENCE_REGEX` constant with imported version
- Replace `WORD_REGEX` constant with imported version
- Update `findComplexSentenceMatch()` to use `analyzeSentence()`

### Step 3: Verification
- Both systems now use identical regex patterns
- Sentence classification (>25 words = complex/amber, >35 words = veryComplex/red) is consistent
- Sidebar counts match editor highlights

## Expected Result
- Hard sentences (>25 words) show amber highlights
- Very hard sentences (>35 words) show red highlights  
- Sidebar issue counts accurately reflect editor highlights
