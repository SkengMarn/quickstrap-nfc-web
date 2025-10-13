import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, Clock, CheckCircle } from "lucide-react"

interface StatsPanelProps {
  metrics: {
    totalCheckins: number
    totalVerifications: number
    avgVerificationTime: number
    systemStatus: string
    lastUpdated: string
  }
}

export function StatsPanel({ metrics }: StatsPanelProps) {
  // Format verification time to show seconds with 2 decimal places
  const formatVerificationTime = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
  }

  // Calculate time ago from last updated timestamp
  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    let interval = Math.floor(seconds / 31536000)
    if (interval >= 1) return `${interval} year${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 2592000)
    if (interval >= 1) return `${interval} month${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 86400)
    if (interval >= 1) return `${interval} day${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 3600)
    if (interval >= 1) return `${interval} hour${interval === 1 ? '' : 's'} ago`
    
    interval = Math.floor(seconds / 60)
    if (interval >= 1) return `${interval} minute${interval === 1 ? '' : 's'} ago`
    
    return 'just now'
  }

  const stats = [
    {
      title: 'Total Check-ins',
      value: metrics.totalCheckins.toLocaleString(),
      icon: Activity,
      trend: '+12% from yesterday',
    },
    {
      title: 'Total Verifications',
      value: metrics.totalVerifications.toLocaleString(),
      icon: CheckCircle,
      trend: '+8% from yesterday',
    },
    {
      title: 'Avg. Verification Time',
      value: formatVerificationTime(metrics.avgVerificationTime),
      icon: Clock,
      trend: 'Faster than yesterday',
    },
  ]

  return (
    <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">System Stats</CardTitle>
          <div className="flex items-center">
            <div className={`h-2 w-2 rounded-full ${
              metrics.systemStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
            } mr-2`}></div>
            <span className="text-xs text-gray-400">
              {metrics.systemStatus === 'online' ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          Updated {getTimeAgo(metrics.lastUpdated)}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-400">
                <stat.icon className="mr-2 h-4 w-4" />
                {stat.title}
              </div>
              <span className="text-sm font-medium text-white">{stat.value}</span>
            </div>
            <p className="text-xs text-green-400">{stat.trend}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
