export interface ReviewTypeConfig {
  model: string;
  tokenCost: number;
}

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