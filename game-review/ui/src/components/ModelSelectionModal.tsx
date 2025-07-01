import React, { useState } from 'react';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'regular' | 'elite') => void;
  userTokens: number;
}

type ReviewType = 'regular' | 'elite';

interface ReviewOption {
  id: ReviewType;
  name: string;
  description: string;
  tokenCost: number;
  features: string[];
  badge?: string;
}

const ModelSelectionModal: React.FC<ModelSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userTokens
}) => {
  const [selectedType, setSelectedType] = useState<ReviewType>('regular');

  const reviewOptions: ReviewOption[] = [
    {
      id: 'regular',
      name: 'Standard Review',
      description: 'Comprehensive analysis with strategic insights',
      tokenCost: 1,
      features: [
        'Detailed match breakdown',
        'Strategic recommendations',
        'Performance analysis',
        'Fast generation (~2-3 min)'
      ]
    },
    {
      id: 'elite',
      name: 'Elite Review',
      description: 'Advanced analysis with deeper strategic insights',
      tokenCost: 2,
      badge: 'ELITE',
      features: [
        'Everything in Standard',
        'Advanced tactical analysis',
        'Economic optimization tips',
        'Unit composition insights',
        'Counter-strategy recommendations',
        'Mindset coaching advice'
      ]
    }
  ];

  const handleConfirm = () => {
    onConfirm(selectedType);
    onClose();
  };

  const canAfford = (cost: number) => userTokens >= cost;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gradient-to-br from-gray-900 to-slate-900 rounded-xl sm:rounded-2xl border border-gray-700/50 shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">Choose Review Type</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">
            You have <span className="text-yellow-400 font-medium">{userTokens}</span> tokens available
          </p>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6 space-y-3 sm:space-y-4 max-h-[60vh] overflow-y-auto">
          {reviewOptions.map((option) => {
            const affordable = canAfford(option.tokenCost);
            const isSelected = selectedType === option.id;

            return (
              <div
                key={option.id}
                className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : affordable
                    ? 'border-gray-600/50 hover:border-gray-500/50 bg-gray-800/30'
                    : 'border-gray-700/30 bg-gray-800/10 opacity-60'
                }`}
                onClick={() => affordable && setSelectedType(option.id)}
              >
                {/* Badge */}
                {option.badge && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                    {option.badge}
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-yellow-500 bg-yellow-500' : 'border-gray-500'
                    }`}>
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{option.name}</h3>
                      <p className="text-gray-400 text-sm">{option.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">🟡</span>
                    <span className={`font-bold ${affordable ? 'text-yellow-400' : 'text-red-400'}`}>
                      {option.tokenCost}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-2">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 text-sm">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {!affordable && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-xl">
                    <div className="text-center">
                      <span className="text-red-400 font-medium text-sm">Insufficient Tokens</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-700/50 bg-gray-800/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              Selected: <span className="text-white font-medium">
                {reviewOptions.find(r => r.id === selectedType)?.name}
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canAfford(reviewOptions.find(r => r.id === selectedType)?.tokenCost || 0)}
                className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-medium rounded-lg hover:from-yellow-400 hover:to-amber-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Review
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelectionModal;