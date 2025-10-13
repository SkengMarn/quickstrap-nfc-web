import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, User } from 'lucide-react';

export interface RecentActivityItem {
  id: string;
  timestamp: string;
  eventName: string;
  location: string;
  wristbandId: string;
  staffName: string;
  staffAvatar: string | null;
}

type RecentActivityProps = {
  items: RecentActivityItem[];
  loading?: boolean;
  maxItems?: number;
};

const getStatusIcon = () => {
  return <CheckCircle2 className="h-4 w-4 text-green-500" />;
};

export function RecentActivity({ items = [], loading = false, maxItems = 5 }: RecentActivityProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4, 5].map((_, i) => (
            <div key={`skeleton-${i}`} className="flex items-start space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <p className="text-sm text-muted-foreground">Latest check-ins and verifications</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.slice(0, maxItems).map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-1">
              {activity.staffAvatar ? (
                <img src={activity.staffAvatar} alt={activity.staffName} className="h-8 w-8 rounded-full" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium truncate">{activity.staffName}</p>
                  {getStatusIcon()}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                Checked in to {activity.eventName || 'an event'}
                {activity.location && ` at ${activity.location}`}
              </p>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            No recent activity
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RecentActivity;
