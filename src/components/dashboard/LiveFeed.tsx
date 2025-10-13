import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"

interface LiveFeedProps {
  metrics: {
    recentCheckins: Array<{ id: string; time: string; location: string }>
  }
}

export function LiveFeed({ metrics }: LiveFeedProps) {
  // Format time to be more readable
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  return (
    <Card className="border border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Live Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.recentCheckins.map((checkin) => (
            <div key={checkin.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Check-in at {checkin.location}
                  </p>
                  <p className="text-xs text-gray-400">Wristband ID: {checkin.id}</p>
                </div>
              </div>
              <div className="flex items-center text-xs text-gray-400">
                <Clock className="mr-1 h-3 w-3" />
                {formatTime(checkin.time)}
              </div>
            </div>
          ))}
          {metrics.recentCheckins.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">
              No recent activity to display
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
