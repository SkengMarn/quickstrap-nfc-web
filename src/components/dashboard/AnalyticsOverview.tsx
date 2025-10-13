import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface AnalyticsOverviewProps {
  metrics: {
    hourlyData: Array<{ hour: string; count: number }>
    successRate: number
    avgVerificationTime: number
  }
}

export function AnalyticsOverview({ metrics }: AnalyticsOverviewProps) {
  // Calculate success rate trend (mock data for now)
  const successRateData = [
    { name: 'Mon', value: 85 },
    { name: 'Tue', value: 87 },
    { name: 'Wed', value: 88 },
    { name: 'Thu', value: 92 },
    { name: 'Fri', value: 90 },
    { name: 'Sat', value: 93 },
    { name: 'Sun', value: 95 },
  ]

  // Calculate verification time trend (mock data for now)
  const verificationTimeData = [
    { name: 'Mon', value: 1200 },
    { name: 'Tue', value: 1100 },
    { name: 'Wed', value: 1050 },
    { name: 'Thu', value: 980 },
    { name: 'Fri', value: 950 },
    { name: 'Sat', value: 920 },
    { name: 'Sun', value: 890 },
  ]

  // Format time for tooltip
  const formatTime = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <Card className="border border-white/10 bg-white/5 backdrop-blur-sm mt-6">
      <CardHeader>
        <CardTitle className="text-white">Analytics Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Success Rate Trend */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Success Rate Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={successRateData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#9CA3AF' }} 
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis 
                    tick={{ fill: '#9CA3AF' }} 
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    width={30}
                    domain={[80, 100]}
                    tickFormatter={(value: number) => `${value}%`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`${value}%`, 'Success Rate'] as [string, string]}
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.9)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem',
                      color: 'white'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Verification Time Trend */}
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-2">Verification Time Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={verificationTimeData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: '#9CA3AF' }} 
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  />
                  <YAxis 
                    tick={{ fill: '#9CA3AF' }} 
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    width={60}
                    tickFormatter={(value: any) => formatTime(Number(value))}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatTime(Number(value)), 'Avg. Time'] as [string, string]}
                    contentStyle={{
                      backgroundColor: 'rgba(17, 24, 39, 0.9)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem',
                      color: 'white'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5, stroke: '#3B82F6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="text-sm text-gray-400 mb-1">Current Success Rate</h4>
            <p className="text-2xl font-bold text-green-400">{metrics.successRate.toFixed(1)}%</p>
            <p className="text-xs text-green-400">+2.3% from last week</p>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="text-sm text-gray-400 mb-1">Avg. Verification Time</h4>
            <p className="text-2xl font-bold text-blue-400">
              {metrics.avgVerificationTime < 1000 
                ? `${metrics.avgVerificationTime}ms` 
                : `${(metrics.avgVerificationTime / 1000).toFixed(2)}s`}
            </p>
            <p className="text-xs text-green-400">-12% from last week</p>
          </div>
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="text-sm text-gray-400 mb-1">Peak Hour</h4>
            <p className="text-2xl font-bold text-purple-400">
              {metrics.hourlyData.reduce((prev, current) => 
                (prev.count > current.count) ? prev : current
              , {hour: '12 PM', count: 0}).hour}
            </p>
            <p className="text-xs text-gray-400">Highest activity time</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
