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
            // Anthropic requires a dummy message or model list. Model list is safest.
            // Note: Anthropic client-side calls might be CORS blocked depending on browser/proxy.
            // We will try a very small message generation.
            const response = await fetch(`${effectiveBaseURL}/v1/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'dangerously-allow-browser': 'true' // Client-side specific header if using some proxies, but standard API might ignore
                },
                body: JSON.stringify({
                    model: 'claude-3-haiku-20240307',
                    max_tokens: 1,
                    messages: [{ role: 'user', content: 'test' }],
                }),
            });
            return response.ok;
        } else if (providerId === 'openrouter') {
            const response = await fetch(`${effectiveBaseURL}/models`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
            });
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

    let content = "";

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
        }
    } catch (error) {
        console.error("Evaluation failed", error);
        throw error;
    }

    return parseEvaluationResponse(content);
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
        } else if (inSuggestions && line.startsWith('-')) {
            suggestions.push(line.substring(1).trim());
        }
    }

    return {
        scores: {
            grammar: Math.min(100, Math.max(0, grammar)),
            clarity: Math.min(100, Math.max(0, clarity)),
            overall: Math.min(100, Math.max(0, overall))
        },
        suggestions: suggestions.slice(0, 3), // Limit to 3
    };
}
