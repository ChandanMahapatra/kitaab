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
    }
];

export interface EvaluationResult {
    scores: {
        grammar: number;
        clarity: number;
        overall: number;
    };
    suggestions: string[];
    tokensUsed?: number;
    cost?: number;
}

export interface TokenUsage {
    tokensUsed: number;
    cost: number;
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

function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
        return 0;
    }
    const inputCost = (inputTokens / 1000) * pricing.inputPer1K;
    const outputCost = (outputTokens / 1000) * pricing.outputPer1K;
    return inputCost + outputCost;
}

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
    baseURL?: string
): Promise<EvaluationResult> {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) throw new Error("Provider not found");

    const effectiveBaseURL = baseURL || provider.baseURL;

    const prompt = `Evaluate the following text for grammar, clarity, and overall writing quality. 
Focus only on the prose content - ignore markdown syntax, formatting symbols (like #, *, -, [], (), etc.), and technical markup issues.
Provide scores out of 100 and up to 3 suggestions for improving the actual writing.
Do not comment on markdown syntax, formatting, or technical markup - only the writing quality.

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

    let content = "";
    let inputTokens = 0;
    let outputTokens = 0;

    try {
        if (providerId === 'openai' || providerId === 'openrouter') {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            };
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
                    max_tokens: 500,
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
                    max_tokens: 500,
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
        console.error("Evaluation failed", error);
        throw error;
    }

    const result = parseEvaluationResponse(content);
    const tokensUsed = inputTokens + outputTokens;
    const cost = calculateCost(model, inputTokens, outputTokens);

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
    let inSuggestions = false;

    for (const line of lines) {
        const lower = line.toLowerCase();
        if (lower.startsWith('grammar:')) {
            grammar = parseInt(line.split(':')[1]?.trim() || '0') || 0;
        } else if (lower.startsWith('clarity:')) {
            clarity = parseInt(line.split(':')[1]?.trim() || '0') || 0;
        } else if (lower.startsWith('overall:')) {
            overall = parseInt(line.split(':')[1]?.trim() || '0') || 0;
        } else if (lower.startsWith('suggestions:')) {
            inSuggestions = true;
        } else if (inSuggestions && (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./))) {
            const suggestion = line.replace(/^[-•\d]+\.\s*|^-\s+/, '').trim();
            if (suggestion) suggestions.push(suggestion);
        }
    }

    return {
        scores: {
            grammar: Math.min(100, Math.max(0, grammar)),
            clarity: Math.min(100, Math.max(0, clarity)),
            overall: Math.min(100, Math.max(0, overall))
        },
        suggestions: suggestions.slice(0, 3),
    };
}
