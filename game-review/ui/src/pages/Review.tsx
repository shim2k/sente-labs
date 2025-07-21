import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../context/AuthContext';
import ModelSelectionModal from '../components/ModelSelectionModal';
import DonationModal from '../components/DonationModal';
import GameDataModal from '../components/GameDataModal';
import mermaid from 'mermaid';

interface Game {
  id: number;
  map_name: string;
  game_mode: string;
  duration_seconds: number;
  season: number;
  team_size: string;
  average_rating: number | null;
  average_mmr: number | null;
  played_at: string;
}

interface Review {
  id: string;
  game_id: number;
  review_type: 'regular' | 'elite';
  summary_md: string;
  generated_at: string;
  is_review_in_progress?: boolean;
  game?: Game;
}

// Mermaid Chart Component
const MermaidChart: React.FC<{ code: string }> = ({ code }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const chartId = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (mermaidRef.current && code) {
      mermaid.render(chartId.current, code).then(({ svg }) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      }).catch((error) => {
        console.error('Mermaid rendering error:', error);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = `<pre class="text-red-400 text-sm">${code}</pre>`;
        }
      });
    }
  }, [code]);

  return (
    <div className="my-4 flex justify-center">
      <div className="bg-gray-800 rounded-lg p-4 max-w-full overflow-x-auto border border-gray-700">
        <div ref={mermaidRef} />
      </div>
    </div>
  );
};

const Review: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const { apiClient, tokens, refreshTokens } = useAuth();
  const navigate = useNavigate();
  const [review, setReview] = useState<Review | null>(null);
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [activeReviewId, setActiveReviewId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRerunning, setIsRerunning] = useState(false);
  const [rerunError, setRerunError] = useState<string | null>(null);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [donationModalOpen, setDonationModalOpen] = useState(false);
  const [gameDataModalOpen, setGameDataModalOpen] = useState(false);

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme: 'dark',
      themeVariables: {
        primaryColor: '#1f2937',
        primaryTextColor: '#e5e7eb',
        primaryBorderColor: '#374151',
        lineColor: '#6b7280',
        secondaryColor: '#374151',
        tertiaryColor: '#4b5563',
        background: '#111827',
        mainBkg: '#1f2937',
        secondBkg: '#374151',
        tertiaryBkg: '#4b5563',
        textColor: '#e5e7eb',
        fontSize: '14px'
      }
    });
  }, []);


  useEffect(() => {
    const fetchReview = async () => {
      if (!reviewId || !apiClient) {
        if (!reviewId) setError('No review ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // First get the specific review to get game info
        const response = await apiClient.get<Review>(`/api/v1/reviews/${reviewId}`);

        if (response.data) {
          setReview(response.data);
          setActiveReviewId(reviewId);

          // Then fetch all reviews for this game
          const gameId = response.data.game_id;
          const allReviewsResponse = await apiClient.get<{reviews: Review[]}>(`/api/v1/games/${gameId}/reviews`);
          
          if (allReviewsResponse.data) {
            setAllReviews(allReviewsResponse.data.reviews);
          }
        } else if (response.status === 404) {
          setError('Review not found');
        } else {
          setError(response.error || 'Failed to load review');
        }
      } catch (error) {
        console.error('Error fetching review:', error);
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReview();
  }, [reviewId, apiClient]);

  const handleTabSwitch = (reviewId: string) => {
    const selectedReview = allReviews.find(r => r.id === reviewId);
    if (selectedReview) {
      setReview(selectedReview);
      setActiveReviewId(reviewId);
      // Update URL without full navigation
      window.history.replaceState(null, '', `/review/${reviewId}`);
    }
  };

  const handleRequestRerun = async () => {
    // Check if user has tokens
    if (tokens === 0) {
      setDonationModalOpen(true);
      return;
    }

    // Check if game has detailed data
    if (!apiClient || !review?.game_id) return;
    
    try {
      const response = await apiClient.get<{ hasDetailedData: boolean, message: string }>(`/api/v1/games/${review.game_id}/check-data`);
      
      if (response.data && !response.data.hasDetailedData) {
        setGameDataModalOpen(true);
        return;
      }
      
      setModelModalOpen(true);
    } catch (error) {
      console.error('Error checking game data:', error);
      setRerunError('Failed to check game data. Please try again.');
    }
  };

  const handleModelSelection = (type: 'regular' | 'elite', notes?: string) => {
    handleRerunReview(type, notes);
    setModelModalOpen(false);
  };

  const handleRerunReview = async (type: 'regular' | 'elite', notes?: string) => {
    if (!apiClient || !reviewId) return;

    try {
      setIsRerunning(true);
      setRerunError(null);
      
      const response = await apiClient.post(`/api/v1/reviews/${reviewId}/rerun`, {
        type: type,
        notes: notes
      });

      if (response.data) {
        // Refresh tokens after successful request
        refreshTokens();
        // Refresh the review data to show the progress indicator
        const refreshResponse = await apiClient.get<Review>(`/api/v1/reviews/${reviewId}`);
        if (refreshResponse.data) {
          setReview(refreshResponse.data);
          
          // Also refresh all reviews for the game
          const gameId = refreshResponse.data.game_id;
          const allReviewsResponse = await apiClient.get<{reviews: Review[]}>(`/api/v1/games/${gameId}/reviews`);
          if (allReviewsResponse.data) {
            setAllReviews(allReviewsResponse.data.reviews);
          }
        }
      } else {
        setRerunError(response.error || 'Failed to rerun review');
      }
    } catch (error) {
      console.error('Error rerunning review:', error);
      setRerunError('Network error. Please try again.');
    } finally {
      setIsRerunning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds === 0) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading review...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-300 mb-2">Error Loading Review</h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => navigate('/games')}
            className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            Back to Games
          </button>
        </div>
      </div>
    );
  }

  if (!review) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-4 sm:space-y-0">
        <button
          onClick={() => navigate('/games')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span>Back to Games</span>
        </button>

        <div className="text-left sm:text-right">
          <div className="flex flex-col sm:flex-row sm:items-center justify-start sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3 mb-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-100">Game Analysis</h1>
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                review.review_type === 'elite' 
                  ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-300'
                  : 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-300'
              }`}>
                {review.review_type === 'elite' ? 'ELITE REVIEW' : 'STANDARD REVIEW'}
              </div>
              {review.is_review_in_progress ? (
                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300">
                  <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-bold">REVIEW IN PROGRESS</span>
                </div>
              ) : (
                <button
                  onClick={handleRequestRerun}
                  disabled={isRerunning}
                  className="group relative px-3 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-full text-xs font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25 flex items-center space-x-1.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  {isRerunning ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="relative">Rerunning...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3 relative" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                      </svg>
                      <span className="relative">Rerun</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm">
            Generated on {formatDate(review.generated_at)} • {review.review_type === 'elite' ? '2 tokens used' : '1 token used'}
          </p>
        </div>
      </div>

      {/* Game Info Card */}
      {review.game && (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-100 mb-3 sm:mb-4">Game Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <div>
              <span className="text-gray-400">Map:</span>
              <p className="text-gray-200 font-medium">{review.game.map_name}</p>
            </div>
            <div>
              <span className="text-gray-400">Game Mode:</span>
              <p className="text-gray-200 font-medium">{review.game.game_mode}</p>
            </div>
            <div>
              <span className="text-gray-400">Team Size:</span>
              <p className="text-gray-200 font-medium">{review.game.team_size}</p>
            </div>
            <div>
              <span className="text-gray-400">Duration:</span>
              <p className="text-gray-200 font-medium">{formatDuration(review.game.duration_seconds)}</p>
            </div>
            <div>
              <span className="text-gray-400">Average MMR:</span>
              <p className="text-gray-200 font-medium">{review.game.average_mmr || 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-400">Played:</span>
              <p className="text-gray-200 font-medium">{formatDate(review.game.played_at)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Review Tabs */}
      {allReviews.length > 1 && (
        <div className="mb-4 sm:mb-6">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-1 overflow-x-auto overflow-y-hidden">
              {allReviews.map((reviewItem, index) => (
                <button
                  key={reviewItem.id}
                  onClick={() => handleTabSwitch(reviewItem.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors duration-200 whitespace-nowrap ${
                    activeReviewId === reviewItem.id
                      ? 'bg-blue-600/20 text-blue-300 border-b-2 border-blue-400'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      reviewItem.review_type === 'elite' 
                        ? 'bg-yellow-400' 
                        : 'bg-blue-400'
                    }`}></div>
                    <span>
                      {reviewItem.review_type === 'elite' ? 'Elite' : 'Standard'} #{allReviews.length - index}
                    </span>
                    {reviewItem.is_review_in_progress && (
                      <div className="w-3 h-3 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"></div>
                    )}
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Review Content */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">AI Analysis</h2>
          <span className="text-xs sm:text-sm text-gray-400">
            Generated on {formatDate(review.generated_at)}
          </span>
        </div>

        {rerunError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <pre className="text-red-400 text-sm whitespace-pre-wrap font-sans">{rerunError}</pre>
          </div>
        )}

        <div className="prose prose-invert prose-orange max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => <h1 className="text-xl sm:text-2xl font-bold text-gray-100 mb-3 sm:mb-4 border-b border-gray-600 pb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg sm:text-xl font-semibold text-gray-200 mb-2 sm:mb-3 mt-4 sm:mt-6">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base sm:text-lg font-medium text-gray-300 mb-2 mt-3 sm:mt-4">{children}</h3>,
              p: ({ children }) => <p className="text-sm sm:text-base text-gray-300 mb-3 sm:mb-4 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-4 sm:pl-6 mb-3 sm:mb-4 text-sm sm:text-base text-gray-300 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 sm:pl-6 mb-3 sm:mb-4 text-sm sm:text-base text-gray-300 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="text-sm sm:text-base text-gray-300">{children}</li>,
              strong: ({ children }) => <strong className="text-orange-300 font-semibold">{children}</strong>,
              em: ({ children }) => <em className="text-gray-200 italic">{children}</em>,
              table: ({ children }) => (
                // add overflow y hidden:
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border border-gray-600 rounded-lg text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-gray-700">{children}</thead>,
              tbody: ({ children }) => <tbody className="bg-gray-800/50">{children}</tbody>,
              tr: ({ children }) => <tr className="border-b border-gray-600">{children}</tr>,
              th: ({ children }) => (
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-200 uppercase tracking-wider border-r border-gray-600 last:border-r-0">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-3 py-2 text-sm text-gray-300 border-r border-gray-600 last:border-r-0">
                  {children}
                </td>
              ),
              code: ({ node, inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const language = match ? match[1] : '';
                
                // Check if it's a mermaid code block
                if (!inline && language === 'mermaid') {
                  return <MermaidChart code={String(children).trim()} />;
                }
                
                // Regular inline code
                if (inline) {
                  return <code className="bg-gray-700 text-orange-300 px-1 py-0.5 rounded text-xs sm:text-sm" {...props}>{children}</code>;
                }
                
                // Regular code blocks (non-mermaid)
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => {
                // Check if children contains a mermaid code block
                const codeElement = React.Children.toArray(children)[0];
                if (React.isValidElement(codeElement) && codeElement.props?.className === 'language-mermaid') {
                  return <>{children}</>;
                }
                return <pre className="bg-gray-900 border border-gray-600 rounded p-3 sm:p-4 overflow-x-auto mb-3 sm:mb-4 text-xs sm:text-sm">{children}</pre>;
              },
              blockquote: ({ children }) => <blockquote className="border-l-4 border-orange-500 pl-3 sm:pl-4 italic text-sm sm:text-base text-gray-400 mb-3 sm:mb-4">{children}</blockquote>,
            }}
          >
            {review.summary_md}
          </ReactMarkdown>
        </div>
      </div>

      {/* Model Selection Modal */}
      <ModelSelectionModal
        isOpen={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        onConfirm={handleModelSelection}
        userTokens={tokens}
      />

      {/* Donation Modal */}
      <DonationModal
        isOpen={donationModalOpen}
        onClose={() => setDonationModalOpen(false)}
        userTokens={tokens}
      />

      {/* Game Data Modal */}
      <GameDataModal
        isOpen={gameDataModalOpen}
        onClose={() => setGameDataModalOpen(false)}
      />
    </div>
  );
};

export default Review;