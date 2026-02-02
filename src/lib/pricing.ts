export interface ModelPricing {
  id: string;
  name: string;
  description?: string;
  pricing: {
    prompt: number;
    completion: number;
    image?: number;
    request?: number;
  };
  context_length: number;
  architecture?: {
    modality?: string;
    tokenizer?: string;
    instruct_type?: string | null;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  } | null;
}

// Fetch pricing from OpenRouter API
export async function fetchModelPricing(): Promise<ModelPricing[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) {
      throw new Error(`Failed to fetch pricing: ${response.statusText}`);
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching model pricing:', error);
    return [];
  }
}

// Calculate cost using OpenRouter pricing or fallback
export function calculateCostWithPricing(
  model: string,
  inputTokens: number,
  outputTokens: number,
  pricing: Record<string, ModelPricing>
): number {
  // Try to find exact match in pricing data
  const modelPricing = pricing[model];
  if (modelPricing?.pricing) {
    const inputCost = inputTokens * modelPricing.pricing.prompt;
    const outputCost = outputTokens * modelPricing.pricing.completion;
    return inputCost + outputCost;
  }

  // Try partial match (e.g., "gpt-4o-2024-08-06" -> "gpt-4o")
  const baseModel = model.split(':')[0]; // Handle "anthropic/claude-3.5-sonnet" format
  const baseModelId = baseModel.split('-').slice(0, 2).join('-');
  
  for (const [id, modelData] of Object.entries(pricing)) {
    if (id.includes(baseModelId) || baseModelId.includes(id.split(':')[0] || id)) {
      const inputCost = inputTokens * modelData.pricing.prompt;
      const outputCost = outputTokens * modelData.pricing.completion;
      return inputCost + outputCost;
    }
  }

  // Fallback to hardcoded pricing
  return calculateCostFallback(model, inputTokens, outputTokens);
}

// Fallback pricing when API data unavailable
function calculateCostFallback(model: string, inputTokens: number, outputTokens: number): number {
  const MODEL_PRICING: Record<string, { inputPer1K: number; outputPer1K: number }> = {
    'gpt-4': { inputPer1K: 0.03, outputPer1K: 0.06 },
    'gpt-3.5-turbo': { inputPer1K: 0.0005, outputPer1K: 0.0015 },
    'gpt-4o': { inputPer1K: 0.0025, outputPer1K: 0.01 },
    'gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
    'anthropic/claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
    'anthropic/claude-3-sonnet-20240229': { inputPer1K: 0.003, outputPer1K: 0.015 },
    'anthropic/claude-3-haiku-20240307': { inputPer1K: 0.00025, outputPer1K: 0.00125 },
    'claude-3-5-sonnet-20241022': { inputPer1K: 0.003, outputPer1K: 0.015 },
    'claude-3-opus-20240229': { inputPer1K: 0.015, outputPer1K: 0.075 },
    'google/gemini-pro-1.5': { inputPer1K: 0.000125, outputPer1K: 0.0005 },
    'gemini-1.5-pro': { inputPer1K: 0.000125, outputPer1K: 0.0005 },
  };

  const pricing = MODEL_PRICING[model];
  if (!pricing) {
    // Try to find partial match
    for (const [key, value] of Object.entries(MODEL_PRICING)) {
      if (model.includes(key) || key.includes(model.split(':')[0] || model)) {
        return (inputTokens / 1000) * value.inputPer1K + (outputTokens / 1000) * value.outputPer1K;
      }
    }
    return 0;
  }

  return (inputTokens / 1000) * pricing.inputPer1K + (outputTokens / 1000) * pricing.outputPer1K;
}
