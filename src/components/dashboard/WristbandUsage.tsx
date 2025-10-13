import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type WristbandUsageData = {
  category: string;
  status: string;
  count: number;
};

type WristbandUsageProps = {
  data: WristbandUsageData[];
  loading?: boolean;
};

export function WristbandUsage({ data, loading = false }: WristbandUsageProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Wristband Usage</CardTitle>
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="h-64">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  // Transform data for the stacked bar chart
  const categories = Array.from(new Set(data.map(item => item.category)));
  const statuses = Array.from(new Set(data.map(item => item.status)));
  
  const chartData = categories.map(category => {
    const categoryData: { [key: string]: string | number } = { category };
    
    // Initialize all status counts to 0 for this category
    statuses.forEach(status => {
      categoryData[status] = 0;
    });
    
    // Fill in actual counts
    data
      .filter(item => item.category === category)
      .forEach(item => {
        categoryData[item.status] = item.count;
      });
    
    return categoryData;
  });

  // Define colors for different statuses
  const statusColors: { [key: string]: string } = {
    active: '#22C55E',
    inactive: '#EF4444',
    lost: '#F59E0B',
    damaged: '#8B5CF6',
    default: '#3B82F6'
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Wristband Usage</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of wristband status by category
        </p>
      </CardHeader>
      <CardContent className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 5,
              }}
              barGap={0}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              {statuses.map((status) => (
                <Bar 
                  key={status} 
                  dataKey={status} 
                  stackId="a" 
                  fill={statusColors[status.toLowerCase()] || statusColors.default}
                  name={status.charAt(0).toUpperCase() + status.slice(1)}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No wristband data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default WristbandUsage;
