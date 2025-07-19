import React from 'react';
import { TOKEN_PACKAGES, TokenPackage } from '../constants/tokenPackages';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTokens: number;
}

const DonationModal: React.FC<DonationModalProps> = ({ isOpen, onClose, userTokens }) => {

  const handleDonate = (packageData: TokenPackage) => {
    // Open PayPal donation page in new tab
    const paypalUrl = `https://www.paypal.com/donate/?hosted_button_id=78ZLBS7LHKRHS&amount=${packageData.price}`;
    window.open(paypalUrl, '_blank');
  };

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
          <div>
            <h2 className="text-xl font-bold text-white">Get More Tokens</h2>
            <p className="text-sm text-gray-400 mt-1">
              Current balance: <span className="text-blue-400 font-semibold">{userTokens} tokens</span>
            </p>
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
          <div className="space-y-4">
            {TOKEN_PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${pkg.popular
                    ? 'border-blue-500/50 bg-gradient-to-r from-blue-500/10 to-blue-600/10'
                    : 'border-gray-600/50 bg-gray-800/50 hover:border-gray-500/50'
                  }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${pkg.popular
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500'
                      }`}>
                      <span className="text-white font-bold text-lg">{pkg.tokens}</span>
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{pkg.tokens} Tokens</h3>
                      <p className="text-gray-400 text-sm">{pkg.value}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDonate(pkg)}
                    className={`group relative px-4 py-2 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 ${pkg.popular
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg hover:shadow-blue-500/30'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-blue-500/30'
                      }`}
                  >
                    <span className="relative">Donate {pkg.value}</span>
                    <div className="absolute inset-0 bg-white/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Info Section */}
          <div className="mt-6 p-4 bg-blue-900/20 rounded-xl border border-blue-500/30">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-blue-300 text-sm font-medium">How it works</p>
                <p className="text-blue-200 text-sm mt-1">
                  <strong>Important:</strong> Please add your AOE4 username in the PayPal donation notes/message field.
                  After donating, tokens will be added to your account within 24 hours (probably way faster) automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DonationModal;