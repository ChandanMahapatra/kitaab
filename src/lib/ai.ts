export interface Provider {
    id: string;
    name: string;
    apiKeyRequired: boolean;
    baseURL: string;
    models: string[];
}

export const providers: Provider[] = [
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
        models: ['claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
    },
    {
        id: 'openrouter',
        name: 'OpenRouter',
        apiKeyRequired: true,
        baseURL: 'https://openrouter.ai/api/v1',
        models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o', 'google/gemini-pro-1.5']
    },
    {
        id: 'ollama',
        name: 'Ollama (Local)',
        apiKeyRequired: false,
        baseURL: 'http://localhost:11434/v1',
        models: ['llama3.2', 'mistral', 'gemma2', 'phi3']
    },
    {
        id: 'lmstudio',
        name: 'LM Studio (Local)',
        apiKeyRequired: false,
        baseURL: 'http://localhost:1234/v1',
        models: []
    }
];

export interface FeedbackPoint {
    category: 'style' | 'clarity' | 'argument' | 'structure' | 'word-choice';
    issue: string;
    suggestion: string;
    severity: 'high' | 'medium' | 'low';
}

export interface WeakArgumentPoint {
    issue: string;
    suggestion: string;
}

export interface AnalysisContext {
    score: number;
    gradeLevel: number;
    fleschScore: number;
    issues: { type: string; count: number }[];
}

export interface EvaluationResult {
    scores: {
        grammar: number;
        clarity: number;
        overall: number;
    };
    suggestions: string[];
    detailedFeedback?: FeedbackPoint[];
    weakArguments?: WeakArgumentPoint[];
    tokensUsed?: number;
    cost?: number;
}

export interface TokenUsage {
    tokensUsed: number;
    cost: number;
}

import { calculateCostWithPricing } from './pricing';
import { loadPricingCache } from './storage';

export function isLocalProvider(providerId: string): boolean {
    return providerId === 'ollama' || providerId === 'lmstudio';
}

function getCorsErrorMessage(providerId: string, baseURL: string): string {
    if (providerId === 'ollama') {
        return `CORS error connecting to Ollama at ${baseURL}. Start Ollama with: OLLAMA_ORIGINS=* ollama serve`;
    }
    if (providerId === 'lmstudio') {
        return `CORS error connecting to LM Studio at ${baseURL}. Enable CORS in LM Studio: Settings > Server > Enable CORS.`;
    }
    return `Connection failed. Check that the service is running at ${baseURL}.`;
}

export async function fetchLocalModels(providerId: string, baseURL: string): Promise<string[]> {
    try {
        if (providerId === 'ollama') {
            const nativeBaseURL = baseURL.replace(/\/v1\/?$/, '');
            const response = await fetch(`${nativeBaseURL}/api/tags`);
            if (!response.ok) return [];
            const data = await response.json();
            return (data.models || []).map((m: { name: string }) => m.name);
        }
        if (providerId === 'lmstudio') {
            // Ensure /v1 is in the path for LM Studio
            const effectiveURL = baseURL.endsWith('/v1') || baseURL.endsWith('/v1/') ? baseURL : `${baseURL}/v1`;
            const response = await fetch(`${effectiveURL}/models`);
            if (!response.ok) return [];
            const data = await response.json();
            return (data.data || []).map((m: { id: string }) => m.id);
        }
    } catch (e) {
        if (e instanceof TypeError && e.message.includes('fetch')) {
            throw new Error(getCorsErrorMessage(providerId, baseURL));
        }
        console.warn('Failed to fetch local models:', e);
    }
    return [];
}

const MODEL_PRICING: Record<string, { inputPer1K: number; outputPer1K: number }> = {
    'gpt-4': { inputPer1K: 0.03, outputPer1K: 0.06 },
    'gpt-3.5-turbo': { inputPer1K: 0.0005, outputPer1K: 0.0015 },
    'gpt-4o': { inputPer1K: 0.0025, outputPer1K: 0.01 },
    'anthropic/claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
    'anthropic/claude-3-sonnet-20240229': { inputPer1K: 0.003, outputPer1K: 0.015 },
    'anthropic/claude-3-haiku-20240307': { inputPer1K: 0.00025, outputPer1K: 0.00125 },
    'google/gemini-pro-1.5': { inputPer1K: 0.000125, outputPer1K: 0.0005 },
};

export async function testConnection(providerId: string, apiKey: string, baseURL?: string): Promise<boolean> {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) return false;

    const effectiveBaseURL = baseURL || provider.baseURL;

    try {
        if (providerId === 'openai') {
            const response = await fetch(`${effectiveBaseURL}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
            return response.ok;
        } else if (providerId === 'anthropic') {
            const response = await fetch(`${effectiveBaseURL}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'dangerously-allow-browser': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }],
                }),
            });
            return response.ok;
        } else if (providerId === 'openrouter') {
            const response = await fetch(`${effectiveBaseURL}/auth/key`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
            if (response.status === 401) {
                return false;
            }
            return response.ok;
        } else if (providerId === 'ollama') {
            const nativeBaseURL = effectiveBaseURL.replace(/\/v1\/?$/, '');
            const response = await fetch(`${nativeBaseURL}/api/tags`);
            return response.ok;
        } else if (providerId === 'lmstudio') {
            // Ensure /v1 is in the path for LM Studio
            const normalizedURL = effectiveBaseURL.endsWith('/v1') || effectiveBaseURL.endsWith('/v1/') ? effectiveBaseURL : `${effectiveBaseURL}/v1`;
            const response = await fetch(`${normalizedURL}/models`);
            return response.ok;
        }
    } catch (e) {
        console.error("Connection test failed", e);
        return false;
    }
    return false;
}

export async function evaluateText(
    text: string,
    providerId: string,
    model: string,
    apiKey: string,
    baseURL?: string,
    analysisContext?: AnalysisContext
): Promise<EvaluationResult> {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) throw new Error("Provider not found");

    let effectiveBaseURL = baseURL || provider.baseURL;

    // Ensure /v1 is in the path for LM Studio
    if (providerId === 'lmstudio' && !(effectiveBaseURL.endsWith('/v1') || effectiveBaseURL.endsWith('/v1/'))) {
        effectiveBaseURL = `${effectiveBaseURL}/v1`;
    }

    let analysisSection = '';
    if (analysisContext) {
        const issuesSummary = analysisContext.issues
            .map(i => `${i.type}: ${i.count}`)
            .join(', ');
        analysisSection = `
The text has been analyzed with these current metrics:
- Readability Score: ${analysisContext.score}/100
- Grade Level: ${analysisContext.gradeLevel} (Coleman-Liau Index)
- Flesch Reading Ease: ${analysisContext.fleschScore}/100
- Detected issues: ${issuesSummary || 'none'}

Your feedback should specifically target improving these metrics. For example, if the grade level is high, suggest simplifying vocabulary or shortening sentences. If passive voice count is high, highlight specific instances to rewrite.
`;
    }

    const prompt = `You are an expert writing coach. Evaluate the following text for prose quality—ignore markdown syntax, formatting symbols, and technical markup.
${analysisSection}
Provide:
1. Scores (0-100) for Grammar, Clarity, and Overall quality
2. Up to 3 brief suggestions (one line each) ordered by severity (most critical first)
3. Detailed feedback points with specific issues and fixes, categorized by type
4. Any weak arguments or unsupported claims with suggestions to strengthen them

Format your response EXACTLY like this:
Grammar: [score]
Clarity: [score]
Overall: [score]
Suggestions:
- [brief suggestion 1]
- [brief suggestion 2]
- [brief suggestion 3]
DetailedFeedback: (JSON array)
[
  {
    "category": "style|clarity|argument|structure|word-choice",
    "severity": "high|medium|low",
    "issue": "specific problem found",
    "suggestion": "how to fix it"
  }
]
WeakArguments: (JSON array)
[
  {
    "issue": "specific weak argument or unsupported claim",
    "suggestion": "how to strengthen this argument with evidence or reasoning"
  }
]

Text:
${text}`;

    let content = "";
    let inputTokens = 0;
    let outputTokens = 0;

    try {
        if (providerId === 'openai' || providerId === 'openrouter' || isLocalProvider(providerId)) {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (!isLocalProvider(providerId) && apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
            if (providerId === 'openrouter') {
                headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                headers['X-Title'] = 'Kitaab Editor';
            }

            const response = await fetch(`${effectiveBaseURL}/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    // Increased from 500 to 1500 to accommodate detailed feedback
                    // This triples API costs but provides comprehensive analysis
                    max_tokens: 1500,
                }),
            });

            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            content = data.choices?.[0]?.message?.content || '';
            inputTokens = data.usage?.prompt_tokens || 0;
            outputTokens = data.usage?.completion_tokens || 0;

        } else if (providerId === 'anthropic') {
            const response = await fetch(`${effectiveBaseURL}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'dangerously-allow-browser': 'true'
                },
                body: JSON.stringify({
                    model,
                    // Increased from 500 to 1500 to accommodate detailed feedback
                    // This triples API costs but provides comprehensive analysis
                    max_tokens: 1500,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                }),
            });

            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            content = data.content?.[0]?.text || '';
            inputTokens = data.usage?.input_tokens || 0;
            outputTokens = data.usage?.output_tokens || 0;
        }
    } catch (error) {
        if (isLocalProvider(providerId) && error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error(getCorsErrorMessage(providerId, effectiveBaseURL));
        }
        console.error("Evaluation failed", error);
        throw error;
    }

    const result = parseEvaluationResponse(content);
    const tokensUsed = inputTokens + outputTokens;
    const pricingCache = await loadPricingCache();
    const cost = calculateCostWithPricing(model, inputTokens, outputTokens, pricingCache?.data || {});

    return {
        ...result,
        tokensUsed,
        cost: parseFloat(cost.toFixed(6)),
    };
}

function parseEvaluationResponse(response: string): EvaluationResult {
    const lines = response.split('\n').map(line => line.trim());

    let grammar = 0, clarity = 0, overall = 0;
    const suggestions: string[] = [];
    const detailedFeedback: FeedbackPoint[] = [];
    const weakArguments: WeakArgumentPoint[] = [];
    let currentSection: 'none' | 'suggestions' | 'detailed' | 'weak' = 'none';
    let jsonBuffer = '';

    for (const line of lines) {
        const lower = line.toLowerCase();

        // Parse scores
        if (lower.startsWith('grammar:')) {
            grammar = parseInt(line.split(':')[1]?.trim() || '0') || 0;
            currentSection = 'none';
        } else if (lower.startsWith('clarity:')) {
            clarity = parseInt(line.split(':')[1]?.trim() || '0') || 0;
            currentSection = 'none';
        } else if (lower.startsWith('overall:')) {
            overall = parseInt(line.split(':')[1]?.trim() || '0') || 0;
            currentSection = 'none';
        } else if (lower.startsWith('suggestions:')) {
            currentSection = 'suggestions';
        } else if (lower.startsWith('detailedfeedback:')) {
            currentSection = 'detailed';
            jsonBuffer = '';
        } else if (lower.startsWith('weakarguments:')) {
            // First try to parse any accumulated JSON from detailedFeedback
            if (currentSection === 'detailed' && jsonBuffer) {
                try {
                    const parsed = JSON.parse(jsonBuffer);
                    if (Array.isArray(parsed)) {
                        parsed.forEach((item) => {
                            if (item.issue && item.suggestion) {
                                const validCategory = ['style', 'clarity', 'argument', 'structure', 'word-choice']
                                    .includes(item.category?.toLowerCase()) ? item.category.toLowerCase() : 'style';
                                const validSeverity = ['high', 'medium', 'low']
                                    .includes(item.severity?.toLowerCase()) ? item.severity.toLowerCase() : 'medium';

                                if (!['style', 'clarity', 'argument', 'structure', 'word-choice'].includes(item.category?.toLowerCase())) {
                                    console.warn(`[AI Parse] Unrecognized category: ${item.category}, defaulting to 'style'`);
                                }

                                detailedFeedback.push({
                                    category: validCategory as FeedbackPoint['category'],
                                    severity: validSeverity as FeedbackPoint['severity'],
                                    issue: item.issue,
                                    suggestion: item.suggestion,
                                });
                            }
                        });
                    }
                } catch (e) {
                    console.error('[AI Parse] Failed to parse DetailedFeedback JSON:', e);
                    console.error('[AI Parse] JSON buffer was:', jsonBuffer);
                }
            }
            currentSection = 'weak';
            jsonBuffer = '';
        } else if (currentSection === 'detailed' && (line.startsWith('[') || line.startsWith('{') || jsonBuffer)) {
            // Accumulate JSON for detailed feedback
            jsonBuffer += line;
        } else if (currentSection === 'weak' && (line.startsWith('[') || jsonBuffer)) {
            // Accumulate JSON for weak arguments
            jsonBuffer += line;
        } else if (currentSection === 'suggestions' && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))) {
            const content = line.replace(/^[-•\d]+\.\s*|^-\s+/, '').trim();
            if (content) suggestions.push(content);
        }
    }

    // Parse any remaining JSON buffer for detailed feedback
    if (currentSection === 'detailed' && jsonBuffer) {
        try {
            const parsed = JSON.parse(jsonBuffer);
            if (Array.isArray(parsed)) {
                parsed.forEach((item) => {
                    if (item.issue && item.suggestion) {
                        const validCategory = ['style', 'clarity', 'argument', 'structure', 'word-choice']
                            .includes(item.category?.toLowerCase()) ? item.category.toLowerCase() : 'style';
                        const validSeverity = ['high', 'medium', 'low']
                            .includes(item.severity?.toLowerCase()) ? item.severity.toLowerCase() : 'medium';

                        if (!['style', 'clarity', 'argument', 'structure', 'word-choice'].includes(item.category?.toLowerCase())) {
                            console.warn(`[AI Parse] Unrecognized category: ${item.category}, defaulting to 'style'`);
                        }

                        detailedFeedback.push({
                            category: validCategory as FeedbackPoint['category'],
                            severity: validSeverity as FeedbackPoint['severity'],
                            issue: item.issue,
                            suggestion: item.suggestion,
                        });
                    }
                });
            }
        } catch (e) {
            console.error('[AI Parse] Failed to parse DetailedFeedback JSON:', e);
            console.error('[AI Parse] JSON buffer was:', jsonBuffer);
        }
    }

    // Parse any remaining JSON buffer for weak arguments
    if (currentSection === 'weak' && jsonBuffer) {
        try {
            const parsed = JSON.parse(jsonBuffer);
            if (Array.isArray(parsed)) {
                parsed.forEach(item => {
                    // New format: object with issue and suggestion
                    if (typeof item === 'object' && item !== null && item.issue && item.suggestion) {
                        weakArguments.push({
                            issue: String(item.issue),
                            suggestion: String(item.suggestion)
                        });
                    }
                    // Backward compatibility: old format (plain strings)
                    else if (typeof item === 'string') {
                        weakArguments.push({
                            issue: item,
                            suggestion: 'Consider providing evidence or reasoning to support this claim.'
                        });
                    }
                });
            }
        } catch (e) {
            console.error('[AI Parse] Failed to parse WeakArguments JSON:', e);
            console.error('[AI Parse] JSON buffer was:', jsonBuffer);
        }
    }

    // Log parsing summary
    if (detailedFeedback.length === 0 && weakArguments.length === 0) {
        console.warn('[AI Parse] No detailed feedback or weak arguments parsed from AI response');
    }

    return {
        scores: {
            grammar: Math.min(100, Math.max(0, grammar)),
            clarity: Math.min(100, Math.max(0, clarity)),
            overall: Math.min(100, Math.max(0, overall))
        },
        suggestions: suggestions.slice(0, 3),
        detailedFeedback: detailedFeedback.length > 0 ? detailedFeedback : undefined,
        weakArguments: weakArguments.length > 0 ? weakArguments : undefined,
    };
}
