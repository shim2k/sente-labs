import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';

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
  llm_model: string;
  summary_md: string;
  generated_at: string;
  game?: Game;
}

const Review: React.FC = () => {
  const { reviewId } = useParams<{ reviewId: string }>();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [review, setReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:4000';

  useEffect(() => {
    const fetchReview = async () => {
      if (!reviewId) {
        setError('No review ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const token = await getToken();
        const response = await fetch(`${apiBase}/api/v1/reviews/${reviewId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setReview(data);
        } else if (response.status === 404) {
          setError('Review not found');
        } else {
          setError('Failed to load review');
        }
      } catch (error) {
        console.error('Error fetching review:', error);
        setError('Network error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReview();
  }, [reviewId, apiBase, getToken]);

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
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
              review.llm_model === 'o3' 
                ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-yellow-500/30 text-yellow-300'
                : 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-300'
            }`}>
              {review.llm_model === 'o3' ? 'ELITE REVIEW' : 'STANDARD REVIEW'}
            </div>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm">
            Generated on {formatDate(review.generated_at)} • {review.llm_model === 'o3' ? '2 tokens used' : '1 token used'}
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

      {/* Review Content */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100">AI Analysis</h2>
          <span className="text-xs sm:text-sm text-gray-400">
            Generated on {formatDate(review.generated_at)}
          </span>
        </div>

        <div className="prose prose-invert prose-orange max-w-none">
          <ReactMarkdown
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
              code: ({ children }) => <code className="bg-gray-700 text-orange-300 px-1 py-0.5 rounded text-xs sm:text-sm">{children}</code>,
              pre: ({ children }) => <pre className="bg-gray-900 border border-gray-600 rounded p-3 sm:p-4 overflow-x-auto mb-3 sm:mb-4 text-xs sm:text-sm">{children}</pre>,
              blockquote: ({ children }) => <blockquote className="border-l-4 border-orange-500 pl-3 sm:pl-4 italic text-sm sm:text-base text-gray-400 mb-3 sm:mb-4">{children}</blockquote>,
            }}
          >
            {review.summary_md}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default Review;