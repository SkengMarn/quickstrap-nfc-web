// Type declarations for module imports
declare module '@/lib/supabase/client' {
  import { SupabaseClient } from '@supabase/supabase-js';
  export function createClient(): SupabaseClient;
}

declare module '@/components/ui/skeleton' {
  import { FC, HTMLAttributes } from 'react';
  export const Skeleton: FC<HTMLAttributes<HTMLDivElement>>;
}

declare module '@/components/ui/button' {
  import { FC, ButtonHTMLAttributes } from 'react';
  interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
  }
  export const Button: FC<ButtonProps>;
}

declare module '@/components/ui/use-toast' {
  export function useToast(): {
    toast: (props: {
      title: string;
      description?: string;
      variant?: 'default' | 'destructive';
    }) => void;
  };
}

// Dashboard components
declare module '@/components/dashboard/MetricsGrid' {
  import { FC } from 'react';
  import { DashboardMetrics } from '@/types/dashboard';
  interface MetricsGridProps {
    metrics: DashboardMetrics;
  }
  export const MetricsGrid: FC<MetricsGridProps>;
}

declare module '@/components/dashboard/ActivityChart' {
  import { FC } from 'react';
  import { DashboardMetrics } from '@/types/dashboard';
  interface ActivityChartProps {
    metrics: DashboardMetrics;
  }
  export const ActivityChart: FC<ActivityChartProps>;
}

declare module '@/components/dashboard/LiveFeed' {
  import { FC } from 'react';
  import { DashboardMetrics } from '@/types/dashboard';
  interface LiveFeedProps {
    metrics: DashboardMetrics;
  }
  export const LiveFeed: FC<LiveFeedProps>;
}

declare module '@/components/dashboard/LocationHeatmap' {
  import { FC } from 'react';
  import { DashboardMetrics } from '@/types/dashboard';
  interface LocationHeatmapProps {
    metrics: DashboardMetrics;
  }
  export const LocationHeatmap: FC<LocationHeatmapProps>;
}

declare module '@/components/dashboard/StatsPanel' {
  import { FC } from 'react';
  import { DashboardMetrics } from '@/types/dashboard';
  interface StatsPanelProps {
    metrics: DashboardMetrics;
  }
  export const StatsPanel: FC<StatsPanelProps>;
}

declare module '@/components/dashboard/AnalyticsOverview' {
  import { FC } from 'react';
  import { DashboardMetrics } from '@/types/dashboard';
  interface AnalyticsOverviewProps {
    metrics: DashboardMetrics;
  }
  export const AnalyticsOverview: FC<AnalyticsOverviewProps>;
}
