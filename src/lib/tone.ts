import { providers, isLocalProvider } from './ai';
import { calculateCostWithPricing } from './pricing';
import { loadPricingCache, loadSettings, saveSettings } from './storage';

export const TONE_OPTIONS = [
    { id: 'professional', label: 'Professional' },
    { id: 'casual', label: 'Casual' },
    { id: 'formal', label: 'Formal' },
    { id: 'friendly', label: 'Friendly' },
    { id: 'concise', label: 'Concise' },
    { id: 'academic', label: 'Academic' },
    { id: 'creative', label: 'Creative' },
    { id: 'persuasive', label: 'Persuasive' },
] as const;

export type ToneId = typeof TONE_OPTIONS[number]['id'];

export interface ToneResult {
    text: string;
    tokensUsed: number;
    cost: number;
}

export async function changeTone(
    text: string,
    tone: ToneId,
    providerId: string,
    model: string,
    apiKey: string,
    baseURL?: string
): Promise<ToneResult> {
    const provider = providers.find(p => p.id === providerId);
    if (!provider) throw new Error("Provider not found");

    let effectiveBaseURL = baseURL || provider.baseURL;

    if (providerId === 'lmstudio' && !(effectiveBaseURL.endsWith('/v1') || effectiveBaseURL.endsWith('/v1/'))) {
        effectiveBaseURL = `${effectiveBaseURL}/v1`;
    }

    const prompt = `Rewrite the following text in a ${tone} tone.
Rules:
- Only return the rewritten text, nothing else.
- Preserve all markdown formatting (headings, bold, italic, lists, links, code blocks, etc.).
- Keep the same meaning and structure.
- Do not add any preamble, explanation, or commentary.

Text:
${text}`;

    let content = "";
    let inputTokens = 0;
    let outputTokens = 0;

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
                max_tokens: 4096,
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
                max_tokens: 4096,
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

    const tokensUsed = inputTokens + outputTokens;
    const pricingCache = await loadPricingCache();
    const cost = calculateCostWithPricing(model, inputTokens, outputTokens, pricingCache?.data || {});

    return {
        text: content.trim(),
        tokensUsed,
        cost: parseFloat(cost.toFixed(6)),
    };
}

export async function changeToneWithSettings(text: string, tone: ToneId): Promise<ToneResult> {
    const settings = await loadSettings();
    if (!settings?.provider) {
        throw new Error("Please configure an AI provider in Settings.");
    }

    const provider = providers.find(p => p.id === settings.provider);
    const model = settings.model || provider?.models[0] || "gpt-3.5-turbo";

    if (!settings.apiKey && provider?.apiKeyRequired) {
        throw new Error("API Key is missing in Settings.");
    }

    const result = await changeTone(
        text,
        tone,
        settings.provider,
        model,
        settings.apiKey || "",
        settings.baseURL
    );

    // Track token usage
    const newTotalTokens = (settings.tokensUsed ?? 0) + result.tokensUsed;
    const newTotalCost = (settings.totalCost ?? 0) + result.cost;
    await saveSettings({
        ...settings,
        tokensUsed: newTotalTokens,
        totalCost: newTotalCost,
    });
    window.dispatchEvent(new Event('kitaab-settings-changed'));

    return result;
}
