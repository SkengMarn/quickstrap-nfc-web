import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#7B61FF', '#FF3C7E', '#22C55E', '#F97316', '#3B82F6'];

type UserRoleData = {
  role: string;
  count: number;
};

type UserRolesProps = {
  data: UserRoleData[];
  loading?: boolean;
};

export function UserRoles({ data, loading = false }: UserRolesProps) {
  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>User Roles</CardTitle>
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Skeleton className="h-48 w-48 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  // Transform data for the pie chart
  const chartData = data.map(item => ({
    name: item.role.charAt(0).toUpperCase() + item.role.slice(1),
    value: item.count,
  }));

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>User Roles</CardTitle>
        <p className="text-sm text-muted-foreground">
          Distribution of user access levels
        </p>
      </CardHeader>
      <CardContent className="h-64">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={(props: any) => {
                  const { name, percent } = props;
                  return `${name || ''}: ${percent ? (percent * 100).toFixed(0) : 0}%`;
                }}
              >
                {chartData.map((_, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`${value} users`, 'Count']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No user role data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default UserRoles;
