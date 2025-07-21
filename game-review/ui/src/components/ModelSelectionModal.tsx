import React, { useState } from 'react';

interface ModelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (type: 'regular' | 'elite', notes?: string) => void;
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
  const [notes, setNotes] = useState<string>('');
  const [showNotes, setShowNotes] = useState<boolean>(false);
  const [selectedFocusAreas, setSelectedFocusAreas] = useState<string[]>([]);

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
    if (!showNotes) {
      setShowNotes(true);
      return;
    }
    
    // Combine selected focus areas and custom notes
    const focusAreasText = selectedFocusAreas.length > 0 
      ? selectedFocusAreas.map(area => `• ${area}`).join('\n')
      : '';
    
    const customNotesText = notes.trim();
    
    const combinedNotes = [focusAreasText, customNotesText]
      .filter(Boolean)
      .join('\n\n');
    
    onConfirm(selectedType, combinedNotes || undefined);
    handleClose();
  };

  const handleClose = () => {
    setShowNotes(false);
    setNotes('');
    setSelectedFocusAreas([]);
    onClose();
  };

  const toggleFocusArea = (area: string) => {
    setSelectedFocusAreas(prev => 
      prev.includes(area) 
        ? prev.filter(item => item !== area)
        : [...prev, area]
    );
  };

  const canAfford = (cost: number, optionId: ReviewType) => {
    // Elite review is always disabled
    if (optionId === 'elite') return false;
    return userTokens >= cost;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4" onClick={handleClose}>
      <div className="bg-gradient-to-br from-gray-900 to-slate-900 rounded-xl sm:rounded-2xl border border-gray-700/50 shadow-2xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {showNotes ? 'Add Notes & Generate Review' : 'Choose Review Type'}
            </h2>
            <button
              onClick={handleClose}
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
          {!showNotes && reviewOptions.map((option) => {
            const affordable = canAfford(option.tokenCost, option.id);
            const isSelected = selectedType === option.id;

            return (
              <div
                key={option.id}
                className={`relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 ${isSelected
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : affordable
                      ? 'border-gray-600/50 hover:border-gray-500/50 bg-gray-800/30'
                      : 'border-gray-700/30 bg-gray-800/10 opacity-60'
                  }`}
                onClick={() => affordable && option.id !== 'elite' && setSelectedType(option.id)}
              >
                {/* Badge */}
                {option.badge && (
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                    {option.badge}
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-yellow-500 bg-yellow-500' : 'border-gray-500'
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
                      <span className="text-gray-400 font-medium text-sm">
                        {option.id === 'elite' ? 'Coming Soon' : 'Insufficient Tokens'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Notes Section - Only show after first click */}
          {showNotes && (
            <div className="space-y-6">
              {/* Quick Options */}
              <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-xl p-5 border border-blue-500/20">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                  <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  Quick Focus Areas <span className="text-gray-400 font-normal ml-2 text-sm"> (Optional)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Timing & Benchmarks",
                    "Resource Management (Macro)",
                    "Army Composition & Upgrades",
                    "Map Control & Vision",
                    "Fight Execution (Micro)",
                    "Strategic Inflection Points"
                  ].map((option, index) => {
                    const isSelected = selectedFocusAreas.includes(option);
                    return (
                      <button
                        key={index}
                        onClick={() => toggleFocusArea(option)}
                        className={`text-left p-3 border rounded-lg text-sm transition-all duration-200 group ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 border-gray-600/30 hover:border-blue-500/30 text-gray-300 hover:text-blue-300'
                        }`}
                      >
                        <div className="flex items-center">
                          {isSelected ? (
                            <svg className="w-4 h-4 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5 9.293 10.793a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-gray-500 group-hover:text-blue-400 mr-2 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                            </svg>
                          )}
                          {option}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Notes */}
              <div className="space-y-3">
                <label className="block text-base font-semibold text-white mb-3">
                  Custom Notes & Specific Instructions
                  <span className="text-gray-400 font-normal text-sm ml-2">(Optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your own specific instructions here...&#10;&#10;Examples:&#10;• Focus on my villager production consistency&#10;• I want help with unit compositions vs [civilization]&#10;• Analyze my map control and sacred site timings"
                  className="w-full h-32 px-4 py-3 bg-gray-800/70 border-2 border-gray-600/50 rounded-xl text-gray-300 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 resize-none leading-relaxed"
                  maxLength={225}
                />
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <p className="text-xs text-gray-500">
                      💡 Be specific about what you want the AI to focus on
                    </p>
                    {notes && (
                      <button
                        onClick={() => setNotes('')}
                        className="text-xs text-red-400 hover:text-red-300 underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {notes.length}/225
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-700/50 bg-gray-800/30">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-400">
              {showNotes ? (
                <>
                  <span className="text-white font-medium">
                    {reviewOptions.find(r => r.id === selectedType)?.name}
                  </span>

                </>
              ) : (
                <>
                  Selected: <span className="text-white font-medium">
                    {reviewOptions.find(r => r.id === selectedType)?.name}
                  </span>
                </>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canAfford(reviewOptions.find(r => r.id === selectedType)?.tokenCost || 0, selectedType)}
                className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-medium rounded-lg hover:from-yellow-400 hover:to-amber-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showNotes ? 'Generate Review' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelectionModal;