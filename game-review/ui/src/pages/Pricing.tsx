import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { TOKEN_PACKAGES, TokenPackage } from '../constants/tokenPackages';
import { initializePaddle, Paddle } from '@paddle/paddle-js';
import { PADDLE_CONFIG, validatePaddleConfig } from '../config/paddle';

const Pricing: React.FC = () => {
  const { isAuthenticated, user, tokens, login } = useAuth();
  const navigate = useNavigate();
  const [paddle, setPaddle] = useState<Paddle | null>(null);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initPaddle = async () => {
      if (!validatePaddleConfig()) {
        setError('Payment system is not properly configured');
        return;
      }

      try {
        const paddleInstance = await initializePaddle({
          environment: PADDLE_CONFIG.environment,
          token: PADDLE_CONFIG.token,
        });
        if (paddleInstance) {
          setPaddle(paddleInstance);
        }
      } catch (err) {
        console.error('Failed to initialize Paddle:', err);
        setError('Failed to initialize payment system');
      }
    };

    initPaddle();
  }, []);

  const handlePurchase = async (packageData: TokenPackage) => {
    if (!paddle || !packageData.paddleProductId) {
      setError('Payment system not ready');
      return;
    }

    if (!user?.email) {
      setError('User email required for purchase');
      return;
    }

    setIsLoading(packageData.id);
    setError(null);

    try {
      await paddle.Checkout.open({
        items: [
          {
            priceId: packageData.paddleProductId,
            quantity: 1
          }
        ],
        customer: {
          email: user.email,
        },
        customData: {
          userId: user.sub,
          tokenAmount: packageData.tokens.toString(),
          packageId: packageData.id
        },
        settings: PADDLE_CONFIG.checkoutSettings,
      });
    } catch (err) {
      console.error('Payment failed:', err);
      setError('Payment failed. Please try again.');
    } finally {
      setIsLoading(null);
    }
  };

  const handleSignInToPurchase = () => {
    if (isAuthenticated) {
      // If already authenticated, navigate to authenticated pricing page
      navigate('/pricing');
    } else {
      // If not authenticated, trigger login
      login();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            {isAuthenticated ? 'Pricing & Tokens' : 'Choose Your Plan'}
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            {isAuthenticated 
              ? 'Get AI-powered match analysis for Age of Empires IV. Choose the token package that fits your gaming style.'
              : 'Get AI-powered match analysis for Age of Empires IV. Sign in to purchase tokens and start improving your gameplay.'
            }
          </p>
          {isAuthenticated && (
            <div className="mt-6 inline-flex items-center px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-lg">
              <span className="text-blue-300">Current balance: </span>
              <span className="ml-2 text-blue-400 font-semibold">{tokens} tokens</span>
            </div>
          )}
          {!isAuthenticated && (
            <div className="mt-6 p-4 bg-blue-600/10 border border-blue-500/30 rounded-lg max-w-md mx-auto">
              <p className="text-blue-300 text-sm">
                💡 <strong>New users get free tokens</strong> to try our AI-powered game reviews!
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 mx-auto max-w-2xl">
            <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-4 flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-red-200 text-sm font-medium">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="flex-shrink-0 text-red-400 hover:text-red-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Token Packages */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {TOKEN_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className={`relative p-8 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                pkg.popular
                  ? 'border-blue-500/50 bg-gradient-to-br from-blue-500/10 to-blue-600/10 shadow-blue-500/20'
                  : 'border-gray-600/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50 hover:border-gray-500/50'
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                {/* Token Icon */}
                <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center ${
                  pkg.popular
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500'
                } shadow-lg`}>
                  <span className="text-white font-bold text-2xl">{pkg.tokens}</span>
                </div>

                {/* Package Details */}
                <h3 className="text-2xl font-bold text-white mb-2">{pkg.tokens} Tokens</h3>
                <div className="text-3xl font-bold text-white mb-2">{pkg.value}</div>
                <p className="text-gray-400 text-sm mb-6">{pkg.description}</p>

                {/* Purchase Button */}
                {isAuthenticated ? (
                  <button
                    onClick={() => handlePurchase(pkg)}
                    disabled={isLoading === pkg.id || !paddle}
                    className={`group relative w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg hover:shadow-blue-500/30'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {isLoading === pkg.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span className="relative">Processing...</span>
                        </>
                      ) : (
                        <span className="relative">Purchase {pkg.value}</span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </button>
                ) : (
                  <button
                    onClick={handleSignInToPurchase}
                    className={`group relative w-full py-3 px-6 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 ${
                      pkg.popular
                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg hover:shadow-blue-500/30'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-blue-500/30'
                    }`}
                  >
                    <span className="relative">Sign In to Purchase</span>
                    <div className="absolute inset-0 bg-white/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Review Types */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold">1</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Standard Reviews</h3>
                <p className="text-gray-400">1 token per review</p>
              </div>
            </div>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                AI-powered match analysis
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Strategic insights and recommendations
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Key moment analysis
              </li>
            </ul>
          </div>

          <div className="relative p-6 bg-gradient-to-br from-purple-900/20 to-pink-900/20 rounded-xl border border-purple-500/30">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                <span className="text-white font-bold">2</span>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Elite Reviews</h3>
                <p className="text-purple-300">2 tokens per review</p>
              </div>
            </div>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center">
                <svg className="w-4 h-4 text-purple-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Everything in Standard
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-purple-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Deep replay analysis
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-purple-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Advanced AI model (GPT-4)
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 text-purple-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Detailed build order analysis
              </li>
            </ul>
            
            {/* Coming Soon Overlay */}
            <div className="absolute inset-0 bg-gray-900/80 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <h4 className="text-xl font-bold text-white mb-2">Coming Soon</h4>
                <p className="text-purple-300 text-sm">Elite reviews are being perfected and will be available soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="bg-blue-900/20 rounded-2xl border border-blue-500/30 p-8 mb-16">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-6">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-blue-300 mb-4">How It Works</h3>
              <div className="space-y-3 text-blue-200">
                <p><strong>Step 1:</strong> Choose a token package above</p>
                <p><strong>Step 2:</strong> Complete secure payment via credit card, PayPal, or other supported methods</p>
                <p><strong>Step 3:</strong> Tokens are added to your account immediately after successful payment</p>
                <p><strong>Step 4:</strong> Use tokens to generate AI-powered reviews of your matches</p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-8 text-white">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-8 text-left">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">What happens if I don't have enough tokens?</h3>
              <p className="text-gray-400">You can purchase more tokens anytime. All users start with some free tokens to try the service.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">How long does it take to get tokens?</h3>
              <p className="text-gray-400">Tokens are added to your account immediately after successful payment.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Do tokens expire?</h3>
              <p className="text-gray-400">No, tokens never expire. Use them whenever you want to analyze your matches.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Can I get a refund?</h3>
              <p className="text-gray-400">Please see our refund policy for details on eligibility and the refund process.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;