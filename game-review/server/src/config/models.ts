export interface ReviewTypeConfig {
  model: string;
  tokenCost: number;
}

export interface ModelConfig {
  name: string;
  maxTokens: number;
  safeTokenLimit: number; // 90% of max for safety margin
}

// Model-specific token limits
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'o3': {
    name: 'o3',
    maxTokens: 200000,
    safeTokenLimit: 190000
  },
  'gpt-4': {
    name: 'gpt-4',
    maxTokens: 128000,
    safeTokenLimit: 115200 // 90% of 128k
  },
  'gpt-4-turbo': {
    name: 'gpt-4-turbo',
    maxTokens: 128000,
    safeTokenLimit: 115200 // 90% of 128k
  },
  'gpt-3.5-turbo': {
    name: 'gpt-3.5-turbo',
    maxTokens: 16385,
    safeTokenLimit: 14747 // 90% of ~16k
  }
};

export const REVIEW_CONFIGS: Record<'regular' | 'elite', ReviewTypeConfig> = {
  regular: {
    model: 'o3',
    tokenCost: 1
  },
  elite: {
    model: 'o3',
    tokenCost: 2
  }
};

export function getModelForType(type: 'regular' | 'elite'): string {
  return REVIEW_CONFIGS[type].model;
}

export function getTokenCostForType(type: 'regular' | 'elite'): number {
  return REVIEW_CONFIGS[type].tokenCost;
}

export function getTypeForModel(model: string): 'regular' | 'elite' {
  if (model === REVIEW_CONFIGS.elite.model) {
    return 'elite';
  }
  return 'regular';
}

export function getModelConfig(modelName: string): ModelConfig {
  const config = MODEL_CONFIGS[modelName];
  if (!config) {
    console.warn(`Model config not found for ${modelName}, defaulting to gpt-4`);
    return MODEL_CONFIGS['o3'];
  }
  return config;
}

export function getSafeTokenLimit(modelName: string): number {
  return getModelConfig(modelName).safeTokenLimit;
}