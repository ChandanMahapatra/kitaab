# Core Logic Breakdown: Analysis & AI Features

Based on the codebase analysis, here's the core logic for implementing these features:

---

## 1. LOCAL ANALYSIS FEATURE

### Core Algorithms(src / lib / analysis.ts)

#### Syllable Counter
    ```typescript
function syllableCount(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}
```

    ** Logic:**
        - Removes non - alphabetic characters
            - Short words(≤3 chars) = 1 syllable
                - Removes common endings(es, ed, e)
                    - Counts vowel groups as syllables

#### Flesch Reading Ease Score
    ```typescript
const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;
const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;
const fleschScore = wordCount > 0 && sentenceCount > 0
  ? Math.max(0, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord)
  : 0;
```

    ** Formula:** `206.835 - 1.015 × (words/sentences) - 84.6 × (syllables/words)`

        ** Score Interpretation:**
            - 90 - 100: Very easy(11 - year - old level)
                - 80 - 90: Easy(Conversational)
                    - 70 - 80: Fairly easy
                        - 60 - 70: Plain English(13 - 15 year - olds)
                            - 50 - 60: Fairly difficult
                                - 30 - 50: Difficult
                                    - 0 - 30: Very difficult

#### Grade Level Calculation
    ```typescript
const letters = (text.match(/[a-zA-Z]/g) || []).length;
const gradeLevel = wordCount > 0 && sentenceCount > 0
  ? Math.round(4.71 * (letters / wordCount) + 0.5 * (wordCount / sentenceCount) - 21.43)
  : 0;
```

    ** Formula:** `4.71 × (letters/words) + 0.5 × (words/sentences) - 21.43`

#### Issue Detection Patterns

    ** 1. Adverbs:**
        ```typescript
const adverbRegex = /\b\w+ly\b/gi;
```
Finds words ending in "-ly"

    ** 2. Passive Voice:**
        ```typescript
const passiveRegex = /\b(is|are|was|were|be|been|being)\s+(\w+ed|\w+en)\b/gi;
```
Detects "to be" verb + past participle

    ** 3. Complex Sentences:**
        ```typescript
const wordsInSentence = sentence.split(/\s+/).length;
if (wordsInSentence > 25) {
  // Flag as complex
}
```
Sentences with > 25 words

    ** 4. Weak Qualifiers:**
        ```typescript
const qualifierPhrases = [
  'I think', 'we think', 'I believe', 'we believe', 
  'maybe', 'perhaps', 'possibly', 'probably', 
  'I guess', 'we guess', 'kind of', 'sort of', 
  'a bit', 'a little', 'really', 'extremely', 'incredibly'
];
```

#### Writing Score Calculation
    ```typescript
const adverbCount = issues.filter(i => i.type === 'adverb').length;
const passiveCount = issues.filter(i => i.type === 'passive').length;
const complexCount = issues.filter(i => i.type === 'complex').length;
const hardWords = words.filter(w => syllableCount(w) >= 3).length;
const veryHardWords = words.filter(w => syllableCount(w) >= 4).length;

const penalty_adverbs = Math.max(0, adverbCount - 2) * 2;
const penalty_passive = Math.max(0, passiveCount - 4) * 2;
const penalty_hard = (hardWords / Math.max(wordCount, 1)) * 15;
const penalty_very_hard = (veryHardWords / Math.max(wordCount, 1)) * 25;
const penalty_complex = complexCount * 1;

const score = Math.max(0, 100 - penalty_adverbs - penalty_passive - penalty_hard - penalty_very_hard - penalty_complex);
```

    ** Penalty System:**
        - First 2 adverbs: no penalty, each additional: -2 points
            - First 4 passive constructions: no penalty, each additional: -2 points
                - Hard words(3 + syllables): -15 points per word
                    - Very hard words(4 + syllables): -25 points per word
                        - Each complex sentence: -1 point

---

## 2. BASIC STATS IMPLEMENTATION

### Metrics Collected
    ```typescript
interface AnalysisResult {
  charCount: number;        // Total characters
  wordCount: number;        // Total words
  sentenceCount: number;    // Total sentences
  paragraphCount: number;   // Total paragraphs
  readingTime: number;      // Estimated reading time (minutes)
  fleschScore: number;      // Readability score (0-100)
  score: number;            // Writing quality score (0-100)
  gradeLevel: number;       // Grade level
  issues: Issue[];          // Detected issues
}
```

### Reading Time Calculation
    ```typescript
const readingTime = wordCount / 250; // 250 words per minute
```

### Formatting Reading Time
    ```typescript
function formatReadingTime(minutes: number): string {
  const totalSeconds = Math.round(minutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutesPart = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${ hours }h ${ minutesPart }m ${ seconds } s`;
}
```

### Data Extraction
    ```typescript
const words = text.match(/\b\w+\b/g) || [];
const sentences = text.split(/[.!?]+/).filter(s => s.trim());
const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
const wordCount = words.length;
const charCount = text.length;
const sentenceCount = sentences.length;
const paragraphCount = paragraphs.length;
```

---

## 3. AI CONNECTION & INTEGRATION

### Provider Configuration(src / lib / ai.ts)

#### Provider Interface
    ```typescript
interface Provider {
  id: string;
  name: string;
  apiKeyRequired: boolean;
  baseURL?: string;
  models: string[];
}
```

#### Available Providers
    ```typescript
const providers = [
  {
    id: 'openai',
    name: 'OpenAI',
    apiKeyRequired: true,
    baseURL: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-3.5-turbo']
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    apiKeyRequired: true,
    baseURL: 'https://api.anthropic.com',
    models: ['claude-3-sonnet', 'claude-3-haiku']
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    apiKeyRequired: true,
    baseURL: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'openai/gpt-4-turbo', 'google/gemini-pro-1.5', 'meta-llama/llama-3.1-405b-instruct']
  }
];
```

### Connection Testing

#### OpenAI Test
    ```typescript
const response = await fetch(`${ effectiveBaseURL }/models`, {
method: 'GET',
    headers: {
    'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
  },
});
return response.ok;
```

#### Anthropic Test
```typescript
const response = await fetch(`${effectiveBaseURL}/v1/messages`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
    }),
});
return response.ok;
```

#### OpenRouter Test
```typescript
const response = await fetch(`${effectiveBaseURL}/models`, {
    method: 'GET',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    },
});
return response.ok;
```

### AI Evaluation

#### Request Structure
```typescript
const prompt = `Evaluate the following markdown text for grammar, clarity, and overall quality. 
Provide scores out of 100 and up to 3 suggestions for improvement.

Format your response exactly like this:
Grammar: [score]
Clarity: [score]
Overall: [score]
Suggestions:
- [suggestion1]
- [suggestion2]
- [suggestion3]

Text:
${text}`;
```

#### OpenAI/Standard API Call
```typescript
const response = await fetch(`${effectiveBaseURL}/chat/completions`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
    }),
});

const data = await response.json();
const content = data.choices?.[0]?.message?.content || '';
const tokensUsed = data.usage?.total_tokens || 0;
```

#### Anthropic API Call
```typescript
const response = await fetch(`${effectiveBaseURL}/v1/messages`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
        model,
        max_tokens: 500,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
    }),
});

const data = await response.json();
const content = data.content?.[0]?.text || '';
const tokensUsed = data.usage?.output_tokens || 0;
```

#### OpenRouter API Call
```typescript
const response = await fetch(`${effectiveBaseURL}/chat/completions`, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Markdown Editor',
    },
    body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
    }),
});

const data = await response.json();
const content = data.choices?.[0]?.message?.content || '';
const tokensUsed = data.usage?.total_tokens || 0;
```

### Response Parsing
```typescript
function parseEvaluationResponse(response: string): EvaluationResult {
    const lines = response.split('\n').map(line => line.trim());

    let grammar = 0, clarity = 0, overall = 0;
    const suggestions: string[] = [];
    let inSuggestions = false;

    for (const line of lines) {
        if (line.toLowerCase().startsWith('grammar:')) {
            grammar = parseInt(line.split(':')[1]?.trim() || '0') || 0;
        } else if (line.toLowerCase().startsWith('clarity:')) {
            clarity = parseInt(line.split(':')[1]?.trim() || '0') || 0;
        } else if (line.toLowerCase().startsWith('overall:')) {
            overall = parseInt(line.split(':')[1]?.trim() || '0') || 0;
        } else if (line.toLowerCase().startsWith('suggestions:')) {
            inSuggestions = true;
        } else if (inSuggestions && line.startsWith('-')) {
            suggestions.push(line.substring(1).trim());
        }
    }

    return {
        scores: {
            grammar: Math.max(0, Math.min(100, grammar)),
            clarity: Math.max(0, Math.min(100, clarity)),
            overall: Math.max(0, Math.min(100, overall)),
        },
        suggestions,
    };
}
```

---

## 4. UI FUNCTIONALITY

### Analysis Panel UI (src/components/AnalysisPanel.tsx)

#### State Management
```typescript
const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
const [isEvaluating, setIsEvaluating] = useState(false);
```

#### AI Evaluation Handler
```typescript
const handleEvaluate = async () => {
    if (!text.trim()) return;

    setIsEvaluating(true);
    try {
        const settings = await loadSettings();
        if (!settings?.provider) {
            alert('Please select an AI provider in settings.');
            return;
        }

        const providers = await getProviders();
        const provider = providers.find(p => p.id === settings.provider);
        if (!provider) {
            alert('Provider not found.');
            return;
        }

        const modelToUse = settings.model || provider.models[0];
        const result = await evaluateText(text, provider, modelToUse, settings.apiKey, settings.baseURL);

        setEvaluation(result);
    } catch (error) {
        console.error('Evaluation failed:', error);
        alert(`Evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
        setIsEvaluating(false);
    }
};
```

#### Issue Display with Hover Effect
```typescript
{
    Object.entries(
        analysis.issues.reduce((acc, issue) => {
            if (!acc[issue.type]) acc[issue.type] = [];
            acc[issue.type].push(issue);
            return acc;
        }, {} as Record<string, typeof analysis.issues>)
    ).map(([type, issues]) => (
        <div
    key= { type }
    className = "border rounded-lg p-3 hover:bg-gray-100 cursor-pointer"
    onMouseEnter = {() => onHoverIssue?.(type)}
onMouseLeave = {() => onHoverIssue?.(null)}
  >
    <div className="flex items-center justify-between mb-2" >
        <span className="font-medium capitalize" > { type } </span>
            < span className = "text-lg font-bold" > { issues.length } </span>
                </div>
{
    issues[0]?.suggestion && (
        <div className="text-xs mt-1" > { issues[0].suggestion } </div>
    )
}
</div>
))}
```

#### AI Status Indicator
```typescript
    < div className = {`w-3 h-3 rounded-full ${aiStatus === 'connected' ? 'bg-green-500' : aiStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`}> </div>
        < span > AI Connection Status: { aiStatus } </span>
            ```

### Settings Modal UI (src/components/SettingsModal.tsx)

#### Provider Selection
```typescript
    < select
value = { settings.provider }
onChange = {(e) => setSettings({ ...settings, provider: e.target.value })}
>
    <option value="" > None(No AI) </option>
        < option value = "openai" > OpenAI </option>
            < option value = "anthropic" > Anthropic </option>
                < option value = "openrouter" > OpenRouter </option>
                    </select>
                        ```

#### Dynamic Model Suggestions
```typescript
    < input
type = "text"
value = { settings.model }
onChange = {(e) => setSettings({ ...settings, model: e.target.value })}
placeholder = {
    settings.provider === 'openrouter'
        ? 'e.g., anthropic/claude-3.5-sonnet, openai/gpt-4o'
        : settings.provider === 'openai'
            ? 'e.g., gpt-4, gpt-3.5-turbo'
            : settings.provider === 'anthropic'
                ? 'e.g., claude-3-sonnet, claude-3-haiku'
                : 'Enter model name'
}
    />
    ```

#### API Key Input (Secure)
```typescript
    < input
type = "password"
value = { settings.apiKey }
onChange = {(e) => setSettings({ ...settings, apiKey: e.target.value })}
placeholder = "Enter API key"
    />
    ```

---

## 5. TASK LISTS FOR IMPLEMENTATION

### Task 1: Local Analysis Module
**Prompt:** "Create a TypeScript module `src / lib / analysis.ts` that implements text analysis with these algorithms:
1. Syllable counter using regex pattern matching
2. Flesch Reading Ease Score (206.835 - 1.015×WPS - 84.6×SPW)
3. Grade level calculation (4.71×CPW + 0.5×WPS - 21.43)
4. Issue detection: adverbs (/\b\w+ly\b/gi), passive voice, complex sentences (>25 words), weak qualifiers
5. Writing score calculation with penalties: adverbs (-2 after 2), passive (-2 after 4), hard words (-15/25 points)
6. Return AnalysisResult interface with charCount, wordCount, sentenceCount, paragraphCount, readingTime, fleschScore, score, gradeLevel, issues"

### Task 2: AI Integration Module
**Prompt:** "Create a TypeScript module `src / lib / ai.ts` that implements AI provider integration:
1. Define Provider interface with id, name, apiKeyRequired, baseURL, models
2. Configure 3 providers: OpenAI (gpt-4, gpt-3.5-turbo), Anthropic (claude-3-sonnet, claude-3-haiku), OpenRouter (claude-3.5-sonnet, gpt-4o, gemini-pro-1.5)
3. Implement testConnection() function for each provider with proper API endpoints and headers
4. Implement evaluateText() function with prompt engineering for grammar/clarity/overall scores
5. Parse structured response format with regex
6. Return EvaluationResult with scores, suggestions, timeTaken, tokensUsed"

### Task 3: IndexedDB Storage
**Prompt:** "Create a TypeScript module `src / lib / storage.ts` using idb library:
1. Define Document interface: id, title, content, createdAt, updatedAt
2. Define Settings interface: provider, model, apiKey, baseURL
3. Create DB schema with 'documents' and 'settings' object stores
4. Implement functions: saveDocument, loadDocument, listDocuments, saveSettings, loadSettings
5. Handle DB initialization with versioning"

### Task 4: Analysis Panel Component
**Prompt:** "Create a React component `src / components / AnalysisPanel.tsx` that displays analysis results:
1. Show grade level, writing score, Flesch score with interpretation
2. Display metrics: characters, words, sentences, paragraphs, reading time
3. Group issues by type (adverb, passive, complex, qualifier) with counts and suggestions
4. Implement hover effect to highlight issues in editor (onHoverIssue callback)
5. Show AI connection status (disconnected/connecting/connected) with colored indicator
6. AI Evaluation button that calls evaluateText() and displays results with time/tokens
7. Handle loading states and error messages"

### Task 5: Settings Modal Component
**Prompt:** "Create a React component `src / components / SettingsModal.tsx` for AI configuration:
1. Modal with provider dropdown (None, OpenAI, Anthropic, OpenRouter)
2. Dynamic model input with placeholder based on selected provider
3. API key password input (shown only for providers that require it)
4. Base URL input for custom providers
5. Save button that calls saveSettings() and triggers AI status check
6. Reset button that clears all settings from IndexedDB
7. Cancel button to close without saving
8. Load existing settings on mount"

### Task 6: Integration with Editor
**Prompt:** "Integrate analysis and AI features into the main editor component:
1. Debounce text changes (300ms) before running analysis
2. Call analyzeText() on editor update and pass results to AnalysisPanel
3. Implement issue highlighting in preview mode with color-coded marks
4. Auto-save to IndexedDB on content changes (debounce 500ms)
5. Check AI connection status on mount and settings change
6. Handle preview/edit toggle with proper state management"

---

## 6. KEY IMPLEMENTATION NOTES

### Performance Optimization
- Debounce analysis: `useEffect` with 300ms delay
- Debounce auto-save: `useEffect` with 500ms delay
- Memoize expensive calculations
- Use React.memo for AnalysisPanel

### Error Handling
- Try-catch around all AI API calls
- Graceful degradation when AI fails
- User-friendly error messages
- Console logging for debugging

### Security
- API keys stored in IndexedDB (consider encryption)
- No API keys in client-side code
- Validate all inputs
- Sanitize markdown rendering

### UX Considerations
- Loading states for AI evaluation
- Visual feedback for hover effects
- Clear status indicators
- Accessible colors and contrast
- Keyboard navigation support

This breakdown provides all the core logic, algorithms, and UI patterns needed to implement the analysis and AI features in your new application with the specified tech stack.