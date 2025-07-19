export interface TokenPackage {
  id: string;
  tokens: number;
  price: number;
  value: string;
  popular?: boolean;
  description?: string;
}

export const TOKEN_PACKAGES: TokenPackage[] = [
  {
    id: 'small',
    tokens: 5,
    price: 2,
    value: '$2',
    description: 'Perfect for trying out our AI-powered game analysis'
  },
  {
    id: 'medium',
    tokens: 20,
    price: 5,
    value: '$5',
    popular: true,
    description: 'Great value for regular players who want consistent feedback'
  },
  {
    id: 'large',
    tokens: 45,
    price: 10,
    value: '$10',
    description: 'Best for serious players who want to analyze multiple games'
  }
];