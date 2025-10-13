import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin } from "lucide-react"

interface LocationHeatmapProps {
  metrics: {
    locationCounts: Record<string, number>
  }
}

export function LocationHeatmap({ metrics }: LocationHeatmapProps) {
  // Convert location counts to array and sort by count
  const locations = Object.entries(metrics.locationCounts)
    .map(([location, count]) => ({
      location,
      count,
      percentage: (count / Math.max(...Object.values(metrics.locationCounts) as number[]) * 100) || 0
    }))
    .sort((a, b) => b.count - a.count)

  return (
    <Card className="border border-white/10 bg-white/5 backdrop-blur-sm h-full">
      <CardHeader>
        <CardTitle className="text-white">Locations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {locations.map((loc, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                  <span className="text-gray-200">{loc.location}</span>
                </div>
                <span className="font-medium text-white">{loc.count}</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${loc.percentage}%` }}
                />
              </div>
            </div>
          ))}
          {locations.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-4">
              No location data available
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
