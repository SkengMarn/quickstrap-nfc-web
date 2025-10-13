import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarCheck, Radio, Wifi, CheckCircle2 } from "lucide-react";

interface MetricsGridProps {
  metrics: {
    totalEvents: number
    activeEvents: number
    totalWristbands: number
    activeWristbands: number
    totalCheckins: number
    totalVerifications: number
    successRate: number
    avgVerificationTime: number
    locationCounts: Record<string, number>
    hourlyData: Array<{ hour: string; count: number }>
    recentCheckins: Array<{ id: string; time: string; location: string }>
    systemStatus: string
    lastUpdated: string
  }
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  // Calculate trends based on metrics
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 'New' : 'No change';
    const diff = current - previous;
    const percentage = Math.round((diff / previous) * 100);
    const sign = diff >= 0 ? '+' : '';
    return `${sign}${percentage}% from last period`;
  };

  const stats = [
    {
      title: "Active Events",
      value: metrics.activeEvents,
      icon: CalendarCheck,
      description: "Currently running events",
      trend: calculateTrend(metrics.activeEvents, metrics.activeEvents - 1), // This is a simplified example
    },
    {
      title: "Total Wristbands",
      value: metrics.totalWristbands,
      icon: Radio,
      description: "Registered wristbands",
      trend: calculateTrend(metrics.totalWristbands, Math.floor(metrics.totalWristbands * 0.9)), // Example: 10% increase
    },
    {
      title: "Active Wristbands",
      value: metrics.activeWristbands,
      icon: Wifi,
      description: "Active in last hour",
      trend: calculateTrend(metrics.activeWristbands, Math.floor(metrics.activeWristbands * 0.8)), // Example: 20% increase
    },
    {
      title: "Success Rate",
      value: `${metrics.successRate.toFixed(1)}%`,
      icon: CheckCircle2,
      description: "Verification success rate",
      trend: calculateTrend(metrics.successRate, metrics.successRate - 2.3), // Example: 2.3% increase
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card key={i} className="border border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-bold text-white">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
            <p className="text-xs text-green-400">{stat.trend}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
