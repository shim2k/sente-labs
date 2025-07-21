import React from 'react';

interface GameDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GameDataModal: React.FC<GameDataModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 transform transition-all duration-300 scale-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Game Data Not Available</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <p className="text-gray-300 mb-4">
              We couldn't find detailed match data for this game. This happens when match history sharing is disabled in your Age of Empires IV settings.
            </p>
            
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-blue-300 font-semibold mb-3 flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" clipRule="evenodd" />
                </svg>
                How to Enable Match History
              </h3>
              <ol className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-2">1.</span>
                  <span>Open Age of Empires IV</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-2">2.</span>
                  <span>Go to <span className="font-semibold text-white">Profile</span> → <span className="font-semibold text-white">Match History</span></span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-2">3.</span>
                  <span>Enable <span className="font-semibold text-white">"Share History"</span></span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-2">4.</span>
                  <span>Wait 10 minutes for changes to take effect</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 font-bold mr-2">5.</span>
                  <span>Review your games again</span>
                </li>
              </ol>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-yellow-300 text-sm font-medium mb-1">Why is this required?</p>
                <p className="text-gray-400 text-sm">
                  Detailed match data (build orders, unit compositions, economy data) is only available when match history sharing is enabled. This data is essential for generating meaningful AI reviews.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-medium rounded-lg transition-all duration-200"
          >
            Got it, I'll enable it
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameDataModal;