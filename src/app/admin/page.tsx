'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  Shield, 
  TrendingUp, 
  MessageSquare, 
  Clock,
  UserPlus,
  UserMinus,
  LogOut,
  BarChart3
} from 'lucide-react';
import { AdminStats } from '@/types';
import { useAuth } from '@/hooks/useAuth';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading: isCheckingAuth, isAuthenticated, logout } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [moderators, setModerators] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newModeratorId, setNewModeratorId] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Check if user is an admin
  useEffect(() => {
    if (!isCheckingAuth) {
      if (!isAuthenticated) {
        router.push('/');
        return;
      }
      
      if (user && !user.isAdmin) {
        router.push('/dashboard');
        return;
      }
    }
  }, [isAuthenticated, isCheckingAuth, user, router]);

  useEffect(() => {
    if (!isAuthenticated || isCheckingAuth || !user?.isAdmin) {
      return;
    }

    fetchData();
  }, [isAuthenticated, isCheckingAuth, user]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch admin stats
      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const adminStats = await statsResponse.json();
        setStats(adminStats);
      }

      // Fetch moderators list
      const moderatorsResponse = await fetch('/api/admin/moderators');
      if (moderatorsResponse.ok) {
        const { moderators } = await moderatorsResponse.json();
        setModerators(moderators);
      }
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddModerator = async () => {
    if (!newModeratorId.trim()) return;

    try {
      const response = await fetch('/api/admin/moderators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add',
          discordId: newModeratorId.trim(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setActionMessage(result.message);
        setModerators(result.moderators);
        setNewModeratorId('');
      }
    } catch (error) {
      console.error('Failed to add moderator:', error);
      setActionMessage('Failed to add moderator');
    }
  };

  const handleRemoveModerator = async (discordId: string) => {
    try {
      const response = await fetch('/api/admin/moderators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          discordId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setActionMessage(result.message);
        setModerators(result.moderators);
      }
    } catch (error) {
      console.error('Failed to remove moderator:', error);
      setActionMessage('Failed to remove moderator');
    }
  };

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated or not an admin
  if (!isAuthenticated || (user && !user.isAdmin)) {
    return null;
  }

  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="h-8 w-8 text-blue-600 mr-3" />
            Admin Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              Welcome, {user?.username}
            </span>
            <button
              onClick={() => router.push('/moderator')}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
            >
              <Shield className="h-4 w-4" />
              <span>Moderator Dashboard</span>
            </button>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Action Message */}
        {actionMessage && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">{actionMessage}</p>
            <button
              onClick={() => setActionMessage('')}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Loading admin dashboard...</p>
          </div>
        ) : (
          <>
            {/* Overview Stats */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Moderators</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalModerators}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <MessageSquare className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-yellow-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.activeSessions}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Satisfaction</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatPercentage(stats.averageSatisfactionRate)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional metrics from enhanced stats */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-indigo-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.averageResponseTime ? `${Math.round(stats.averageResponseTime / 60)}m` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Avg Resolution Time</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.averageResolutionTime ? `${Math.round(stats.averageResolutionTime / 3600)}h` : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-emerald-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Sessions This Week</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.dailySessionCounts?.reduce((sum, day) => sum + day.count, 0) || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center">
                    <BarChart3 className="h-8 w-8 text-pink-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Peak Hour</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stats.hourlyDistribution?.reduce((max, hour) => 
                          hour.count > max.count ? hour : max, { hour: 0, count: 0 }
                        )?.hour || 0}:00
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Charts and Analytics Row */}
            {stats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Daily Sessions Chart */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Daily Sessions (Last 7 Days)</h2>
                  </div>
                  <div className="p-6">
                    {stats.dailySessionCounts && stats.dailySessionCounts.length > 0 ? (
                      <div className="space-y-4">
                        {stats.dailySessionCounts.map((day, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              {new Date(day.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="bg-blue-200 h-4 rounded"
                                style={{ 
                                  width: `${Math.max(20, (day.count / Math.max(...stats.dailySessionCounts.map(d => d.count))) * 200)}px` 
                                }}
                              />
                              <span className="text-sm font-medium text-gray-900 w-8 text-right">{day.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No daily session data available</p>
                    )}
                  </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Top Performers This Week</h2>
                  </div>
                  <div className="p-6">
                    {stats.topPerformers && stats.topPerformers.length > 0 ? (
                      <div className="space-y-4">
                        {stats.topPerformers.map((performer, index) => (
                          <div key={performer.moderatorId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                                index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-500'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{performer.username}</p>
                                <p className="text-xs text-gray-500">{performer.sessionsThisWeek} sessions resolved</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">
                                {performer.satisfactionRate ? `${Math.round(performer.satisfactionRate)}% satisfaction` : 'No ratings'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No top performer data available</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Moderator Stats */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Moderator Performance</h2>
                </div>
                <div className="p-6">
                  {stats?.moderatorStats.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No moderator data available</p>
                  ) : (
                    <div className="space-y-4">
                      {stats?.moderatorStats.map((moderator) => (
                        <div
                          key={moderator.moderatorId}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                              {moderator.avatar ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={moderator.avatar}
                                  alt={moderator.username}
                                  className="w-10 h-10 rounded-full"
                                />
                              ) : (
                                <span className="text-sm font-medium text-gray-600">
                                  {moderator.username[0]?.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{moderator.username}</p>
                              <p className="text-xs text-gray-500">ID: {moderator.discordId}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="space-y-1">
                                <div className="text-gray-600">
                                  Total: <span className="font-medium">{moderator.totalSessions}</span>
                                </div>
                                <div className="text-gray-600">
                                  Active: <span className="font-medium">{moderator.activeSessions}</span>
                                </div>
                                <div className="text-gray-600">
                                  Rating: <span className="font-medium">{formatPercentage(moderator.satisfactionRate)}</span>
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-gray-600">
                                  This Week: <span className="font-medium">{moderator.sessionsThisWeek || 0}</span>
                                </div>
                                <div className="text-gray-600">
                                  This Month: <span className="font-medium">{moderator.sessionsThisMonth || 0}</span>
                                </div>
                                <div className="text-gray-600">
                                  Avg Response: <span className="font-medium">
                                    {moderator.averageResponseTime ? `${Math.round(moderator.averageResponseTime / 60)}m` : 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Moderator Management */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Manage Moderators</h2>
                </div>
                <div className="p-6">
                  {/* Add Moderator */}
                  <div className="mb-6">
                    <div className="mb-3">
                      <h3 className="text-sm font-medium text-gray-700">Add New Moderator</h3>
                    </div>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newModeratorId}
                        onChange={(e) => setNewModeratorId(e.target.value)}
                        placeholder="Discord User ID"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={handleAddModerator}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* Current Moderators */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Current Moderators</h3>
                    <div className="space-y-2">
                      {moderators.map((moderatorId) => (
                        <div
                          key={moderatorId}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <span className="text-sm font-mono text-gray-900">{moderatorId}</span>
                          <button
                            onClick={() => handleRemoveModerator(moderatorId)}
                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center space-x-1"
                          >
                            <UserMinus className="h-3 w-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
