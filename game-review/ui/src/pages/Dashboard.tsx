import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, AreaChart, Area
} from 'recharts';

interface AnalyticsData {
  userTokenUsage: any[];
  platformStats: any;
  tokenDistribution: any[];
  usersAtRisk: any[];
  gameActivity: any[];
  modelPreferences: any[];
  dailyTrends: any[];
  popularGameModes: any[];
  popularMaps: any[];
  engagementSegments: any[];
  tokenEconomy: any;
  profileLinkingAnalysis: any[];
  profileLinkingSummary: any[];
}

const Dashboard: React.FC = () => {
  const { apiClient } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is admin by calling the backend
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!apiClient) return;
      
      try {
        await apiClient.get('/api/v1/admin/check');
        setIsAdmin(true);
      } catch (error) {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminStatus();
  }, [apiClient]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!apiClient || !isAdmin) return;

      try {
        setLoading(true);
        const response = await apiClient.get<AnalyticsData>('/api/v1/admin/analytics');
        if (response.data) {
          setAnalytics(response.data);
        }
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load analytics');
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [apiClient, isAdmin]);

  const formatNumber = (num: number | string) => {
    const n = Number(num);
    return isNaN(n) ? '0' : n.toLocaleString();
  };

  const formatPercentage = (num: number | string) => {
    const n = Number(num);
    return isNaN(n) ? '0%' : `${n.toFixed(1)}%`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-red-900/20 border border-red-600/50 text-red-300 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      </div>
    );
  }

  // Redirect non-admin users
  if (!loading && !isAdmin) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-red-900/20 border border-red-600/50 text-red-300 p-8 rounded-lg text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p>You don't have permission to access the analytics dashboard.</p>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  // Colors for charts
  const COLORS = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

  // Prepare data for daily trends chart
  const dailyTrendsData = analytics.dailyTrends.map(day => ({
    date: formatDate(day.activity_date),
    users: day.new_users || 0,
    // games: day.games_uploaded || 0,
    reviews: day.reviews_generated || 0
  })).slice(0, 15).reverse();

  // Prepare data for token distribution pie chart
  const tokenDistData = analytics.tokenDistribution.map(dist => ({
    name: `${dist.tokens_remaining} tokens`,
    value: Number(dist.user_count),
    percentage: Number(dist.percentage)
  }));

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">Analytics Dashboard</h1>
        <p className="text-gray-400">Platform insights and user analytics</p>
      </div>

      {/* Platform Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Users</h3>
          <p className="text-2xl font-bold text-gray-100">{formatNumber(analytics.platformStats.total_users)}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Total Reviews</h3>
          <p className="text-2xl font-bold text-orange-400">{formatNumber(analytics.platformStats.total_reviews_created)}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Games Uploaded</h3>
          <p className="text-2xl font-bold text-blue-400">{formatNumber(analytics.platformStats.total_games_uploaded)}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Users at 0 Tokens</h3>
          <p className="text-2xl font-bold text-red-400">{formatNumber(analytics.platformStats.users_with_zero_tokens)}</p>
        </div>
      </div>

      {/* Token Economy Health */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Token Economy Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Tokens in Circulation</h3>
            <p className="text-lg font-bold text-green-400">{formatNumber(analytics.tokenEconomy.total_tokens_in_circulation)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Tokens Consumed</h3>
            <p className="text-lg font-bold text-orange-400">{formatNumber(analytics.tokenEconomy.total_tokens_consumed)}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">User Depletion Rate</h3>
            <p className="text-lg font-bold text-red-400">{formatPercentage(analytics.tokenEconomy.user_depletion_rate_percentage)}</p>
          </div>
        </div>
      </div>

      {/* Daily Activity Trends Chart */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Daily Activity Trends (Last 15 Days)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailyTrendsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                itemStyle={{ color: '#e5e7eb' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              <Line type="monotone" dataKey="users" stroke="#22c55e" name="New Users" strokeWidth={2} />
              {/* <Line type="monotone" dataKey="games" stroke="#3b82f6" name="Games Uploaded" strokeWidth={2} /> */}
              <Line type="monotone" dataKey="reviews" stroke="#f97316" name="Reviews Generated" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Engagement Segments */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">User Engagement Segments</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.engagementSegments}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="engagement_segment" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                  angle={-20}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Bar dataKey="user_count" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-300">Segment</th>
                  <th className="text-right py-2 text-gray-300">Users</th>
                  <th className="text-right py-2 text-gray-300">Percentage</th>
                  <th className="text-right py-2 text-gray-300">Avg Reviews</th>
                  <th className="text-right py-2 text-gray-300">Avg Tokens</th>
                </tr>
              </thead>
              <tbody>
                {analytics.engagementSegments.map((segment, index) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-2 text-gray-100">{segment.engagement_segment}</td>
                    <td className="py-2 text-right text-gray-300">{formatNumber(segment.user_count)}</td>
                    <td className="py-2 text-right text-gray-300">{formatPercentage(segment.percentage)}</td>
                    <td className="py-2 text-right text-gray-300">{Number(segment.avg_reviews_created).toFixed(1)}</td>
                    <td className="py-2 text-right text-gray-300">{Number(segment.avg_tokens_remaining).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Token Distribution */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Token Distribution</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tokenDistData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tokenDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-300">Tokens</th>
                  <th className="text-right py-2 text-gray-300">Users</th>
                  <th className="text-right py-2 text-gray-300">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {analytics.tokenDistribution.map((dist, index) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-2 text-gray-100">{dist.tokens_remaining}</td>
                    <td className="py-2 text-right text-gray-300">{formatNumber(dist.user_count)}</td>
                    <td className="py-2 text-right text-gray-300">{formatPercentage(dist.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Profile Linking & Review Creation Analysis */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Profile Linking & Review Creation Analysis</h2>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {analytics.profileLinkingSummary && analytics.profileLinkingSummary.map((item, index) => (
            <div key={index} className="bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-xs font-medium text-gray-400 mb-1">{item.metric}</h3>
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-100">{formatNumber(item.count)}</p>
                <p className="text-sm text-orange-400">{formatPercentage(item.percentage)}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Profile Linking Analysis Chart & Table */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.profileLinkingAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="profile_linked_status" 
                  stroke="#9ca3af"
                  tick={{ fill: '#9ca3af', fontSize: 12 }}
                />
                <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  itemStyle={{ color: '#e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="user_count" fill="#f97316" name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Analysis Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 text-gray-300">Profile Status</th>
                  <th className="text-left py-2 text-gray-300">Review Status</th>
                  <th className="text-right py-2 text-gray-300">Users</th>
                  <th className="text-right py-2 text-gray-300">%</th>
                </tr>
              </thead>
              <tbody>
                {analytics.profileLinkingAnalysis && analytics.profileLinkingAnalysis.map((item, index) => (
                  <tr key={index} className="border-b border-gray-700/50">
                    <td className="py-2 text-gray-100">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.profile_linked_status === 'Linked' 
                          ? 'bg-green-900/50 text-green-400' 
                          : 'bg-gray-700/50 text-gray-400'
                      }`}>
                        {item.profile_linked_status}
                      </span>
                    </td>
                    <td className="py-2 text-gray-100">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        item.review_creation_status === 'Has Reviews' 
                          ? 'bg-blue-900/50 text-blue-400' 
                          : 'bg-gray-700/50 text-gray-400'
                      }`}>
                        {item.review_creation_status}
                      </span>
                    </td>
                    <td className="py-2 text-right text-gray-300">{formatNumber(item.user_count)}</td>
                    <td className="py-2 text-right text-gray-300">{formatPercentage(item.percentage_of_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">User Conversion Funnel</h3>
          <div className="space-y-3">
            {analytics.profileLinkingSummary && analytics.profileLinkingSummary.slice(0, 4).map((item, index) => {
              const percentage = Number(item.percentage || 0);
              return (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      index === 0 ? 'bg-gray-400' : 
                      index === 1 ? 'bg-green-400' : 
                      index === 2 ? 'bg-blue-400' : 'bg-orange-400'
                    }`}></div>
                    <span className="text-sm text-gray-300">{item.metric}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-100">{formatNumber(item.count)}</span>
                    <div className="w-32 bg-gray-600 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          index === 0 ? 'bg-gray-400' : 
                          index === 1 ? 'bg-green-400' : 
                          index === 2 ? 'bg-blue-400' : 'bg-orange-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-400 w-12">{formatPercentage(percentage)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Users by Activity */}
      <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Top Users by Activity</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 text-gray-300">User</th>
                <th className="text-right py-2 text-gray-300">Tokens</th>
                <th className="text-right py-2 text-gray-300">Reviews</th>
                <th className="text-right py-2 text-gray-300">Standard</th>
                <th className="text-right py-2 text-gray-300">Elite</th>
                <th className="text-right py-2 text-gray-300">Tokens Spent</th>
              </tr>
            </thead>
            <tbody>
              {analytics.userTokenUsage.slice(0, 15).map((user, index) => (
                <tr key={index} className="border-b border-gray-700/50">
                  <td className="py-2 text-gray-100">{user.user_display}</td>
                  <td className="py-2 text-right text-orange-400">{formatNumber(user.current_tokens)}</td>
                  <td className="py-2 text-right text-gray-300">{formatNumber(user.total_reviews)}</td>
                  <td className="py-2 text-right text-gray-300">{formatNumber(user.standard_reviews)}</td>
                  <td className="py-2 text-right text-gray-300">{formatNumber(user.elite_reviews)}</td>
                  <td className="py-2 text-right text-gray-300">{formatNumber(user.calculated_tokens_spent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;