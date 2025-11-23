import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Calendar,
  MapPin,
  Thermometer,
  Droplets,
  Activity,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  Clock,
  Target,
  Award
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axiosConfig from '../utils/axiosConfig';

const AnalyticsDashboard = ({ onClose }) => {
  const { user } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await axiosConfig.get('/crop-health/statistics', {
        params: { timeRange }
      });
      
      // Use the comprehensive statistics data from backend
      const transformedData = response.data.statistics || {
        overview: {
          total_analyses: 0,
          healthy_count: 0,
          diseased_count: 0,
          healthy_percentage: 0,
          diseased_percentage: 0,
          avg_confidence: 0,
          active_users: 0,
          avg_treatment_cost: 0
        },
        disease_distribution: [],
        crop_distribution: [],
        severity_distribution: [],
        environmental_insights: {
          avg_temperature: null,
          avg_humidity: null,
          unique_locations: 0
        },
        treatment_effectiveness: [],
        weekly_trends: [],
        insights: []
      };
      
      setStatistics(transformedData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ icon: Icon, title, value, subtitle, color = 'blue' }) => {
    const colorClasses = {
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      green: 'text-green-600 bg-green-50 border-green-200',
      red: 'text-red-600 bg-red-50 border-red-200',
      yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      purple: 'text-purple-600 bg-purple-50 border-purple-200'
    };

    return (
      <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
        <div className="flex items-center justify-between mb-2">
          <Icon size={24} className={colorClasses[color].split(' ')[0]} />
          <span className="text-2xl font-bold">{value}</span>
        </div>
        <h3 className="text-sm font-medium text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
      </div>
    );
  };

  const SimpleBarChart = ({ data, title }) => {
    if (!data || data.length === 0) return null;

    const maxValue = Math.max(...data.map(d => d.value));

    return (
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-24 text-sm text-gray-600 truncate">{item.name}</div>
              <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                <div
                  className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                >
                  <span className="text-white text-xs font-medium">{item.value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SimplePieChart = ({ data, title }) => {
    if (!data || data.length === 0) return null;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-yellow-500', 'bg-purple-500'];

    return (
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded ${colors[index % colors.length]}`}></div>
                <div className="flex-1 flex justify-between">
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <span className="text-sm font-medium">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>Loading analytics...</span>
          </div>
        </div>
      </div>
    );
  }

  // Check if user has any data
  const hasData = statistics?.overview?.total_analyses > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <BarChart3 size={28} className="text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h2>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!hasData}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 3 months</option>
              <option value="1y">Last year</option>
            </select>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6">
          {!hasData ? (
            /* No Data State */
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="mb-6">
                <Activity size={64} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-gray-800 mb-2">No Analytics Data Yet</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Start analyzing your crops to see comprehensive analytics and insights about your plant health data.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-lg mx-auto">
                <h4 className="text-lg font-medium text-blue-800 mb-3">Get Started:</h4>
                <ul className="text-sm text-blue-700 space-y-2 text-left">
                  <li>• Upload photos of your plants using the Crop Health analyzer</li>
                  <li>• Analyze different crop types and conditions</li>
                  <li>• Build up your analysis history over time</li>
                  <li>• Return here to view detailed analytics and trends</li>
                </ul>
              </div>
            </div>
          ) : (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            <MetricCard
              icon={Activity}
              title="Total Analyses"
              value={statistics?.overview?.total_analyses || 0}
              subtitle="Plant health checks"
              color="blue"
            />
            <MetricCard
              icon={CheckCircle}
              title="Healthy Plants"
              value={statistics?.overview?.healthy_count || 0}
              subtitle={`${statistics?.overview?.healthy_percentage?.toFixed(1) || 0}% of total`}
              color="green"
            />
            <MetricCard
              icon={AlertTriangle}
              title="Diseased Plants"
              value={statistics?.overview?.diseased_count || 0}
              subtitle={`${statistics?.overview?.diseased_percentage?.toFixed(1) || 0}% of total`}
              color="red"
            />
            <MetricCard
              icon={Target}
              title="Avg Confidence"
              value={`${statistics?.overview?.avg_confidence?.toFixed(1) || 0}%`}
              subtitle="Model accuracy"
              color="purple"
            />
            <MetricCard
              icon={Users}
              title="Active Users"
              value={statistics?.overview?.active_users || 0}
              subtitle="This period"
              color="blue"
            />
            <MetricCard
              icon={DollarSign}
              title="Avg Treatment Cost"
              value={`${statistics?.overview?.avg_treatment_cost || 0}k`}
              subtitle="TZS per hectare"
              color="yellow"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Disease Distribution */}
            {statistics?.disease_distribution && (
              <SimplePieChart
                data={statistics.disease_distribution}
                title="Most Common Diseases"
              />
            )}

            {/* Crop Types */}
            {statistics?.crop_distribution && (
              <SimpleBarChart
                data={statistics.crop_distribution}
                title="Crop Types Analyzed"
              />
            )}

            {/* Severity Levels */}
            {statistics?.severity_distribution && (
              <SimplePieChart
                data={statistics.severity_distribution}
                title="Disease Severity Distribution"
              />
            )}

            {/* Environmental Factors */}
            {statistics?.environmental_insights && (
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Environmental Insights</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Thermometer size={16} className="text-red-500" />
                      <span className="text-sm">Avg Temperature</span>
                    </div>
                    <span className="font-medium">{statistics.environmental_insights.avg_temperature?.toFixed(1) || 'N/A'}°C</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Droplets size={16} className="text-blue-500" />
                      <span className="text-sm">Avg Humidity</span>
                    </div>
                    <span className="font-medium">{statistics.environmental_insights.avg_humidity?.toFixed(1) || 'N/A'}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin size={16} className="text-green-500" />
                      <span className="text-sm">Locations Covered</span>
                    </div>
                    <span className="font-medium">{statistics.environmental_insights.unique_locations || 0}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Treatment Effectiveness */}
            {statistics?.treatment_effectiveness && (
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Treatment Effectiveness</h3>
                <div className="space-y-3">
                  {statistics.treatment_effectiveness.map((treatment, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 truncate flex-1">{treatment.name}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${treatment.effectiveness}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-8">{treatment.effectiveness}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Trends */}
            {statistics?.weekly_trends && (
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Analysis Trends</h3>
                <div className="space-y-2">
                  {statistics.weekly_trends.map((week, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Week {week.week}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-blue-500 h-4 rounded-full flex items-center justify-center"
                            style={{ width: `${(week.count / Math.max(...statistics.weekly_trends.map(w => w.count))) * 100}%` }}
                          >
                            <span className="text-white text-xs">{week.count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Performance Insights */}
          {statistics?.insights && (
            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Award size={20} className="text-blue-600 mr-2" />
                Key Insights & Recommendations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {statistics.insights.map((insight, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-blue-100">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                      <div>
                        <h4 className="font-medium text-gray-800 mb-1">{insight.title}</h4>
                        <p className="text-sm text-gray-600">{insight.description}</p>
                        {insight.recommendation && (
                          <p className="text-sm text-blue-700 mt-2 font-medium">
                            💡 {insight.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
