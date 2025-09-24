import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, CheckCircle, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface AnalyticsData {
  dailyCompletion: Array<{ date: string; completed: number; total: number }>;
  categoryBreakdown: Array<{ name: string; value: number; color: string }>;
  timeSpent: Array<{ date: string; minutes: number }>;
  weeklyStats: {
    tasksCompleted: number;
    timeTracked: number;
    averageTimePerTask: number;
    completionRate: number;
  };
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe'];

export default function Analytics() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    dailyCompletion: [],
    categoryBreakdown: [],
    timeSpent: [],
    weeklyStats: {
      tasksCompleted: 0,
      timeTracked: 0,
      averageTimePerTask: 0,
      completionRate: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Last 30 days

      // Fetch tasks data
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          category:categories(name, color)
        `)
        .eq('user_id', user?.id)
        .gte('created_at', startDate.toISOString());

      if (tasksError) throw tasksError;

      // Fetch time entries
      const { data: timeEntries, error: timeError } = await supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user?.id)
        .gte('start_time', startDate.toISOString())
        .not('duration', 'is', null);

      if (timeError) throw timeError;

      // Process daily completion data
      const dailyData = new Map();
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        dailyData.set(dateStr, { date: dateStr, completed: 0, total: 0 });
      }

      tasks?.forEach(task => {
        const createdDate = task.created_at.split('T')[0];
        if (dailyData.has(createdDate)) {
          const day = dailyData.get(createdDate);
          day.total += 1;
          if (task.completed) {
            day.completed += 1;
          }
        }
      });

      const dailyCompletion = Array.from(dailyData.values())
        .slice(-7) // Last 7 days
        .map(day => ({
          ...day,
          date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' }),
        }));

      // Process category breakdown
      const categoryData = new Map();
      tasks?.forEach(task => {
        if (task.category) {
          const categoryName = task.category.name;
          if (categoryData.has(categoryName)) {
            categoryData.set(categoryName, {
              ...categoryData.get(categoryName),
              value: categoryData.get(categoryName).value + 1,
            });
          } else {
            categoryData.set(categoryName, {
              name: categoryName,
              value: 1,
              color: task.category.color,
            });
          }
        }
      });

      const categoryBreakdown = Array.from(categoryData.values());

      // Process time spent data
      const timeData = new Map();
      timeEntries?.forEach(entry => {
        const date = entry.start_time.split('T')[0];
        const minutes = Math.round((entry.duration || 0) / 60);
        if (timeData.has(date)) {
          timeData.set(date, timeData.get(date) + minutes);
        } else {
          timeData.set(date, minutes);
        }
      });

      const timeSpent = Array.from(timeData.entries())
        .slice(-7) // Last 7 days
        .map(([date, minutes]) => ({
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          minutes,
        }));

      // Calculate weekly stats
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      
      const weekTasks = tasks?.filter(task => new Date(task.created_at) >= weekStart) || [];
      const weekTimeEntries = timeEntries?.filter(entry => new Date(entry.start_time) >= weekStart) || [];
      
      const tasksCompleted = weekTasks.filter(task => task.completed).length;
      const timeTracked = weekTimeEntries.reduce((total, entry) => total + (entry.duration || 0), 0);
      const averageTimePerTask = tasksCompleted > 0 ? timeTracked / tasksCompleted / 60 : 0; // in minutes
      const completionRate = weekTasks.length > 0 ? (tasksCompleted / weekTasks.length) * 100 : 0;

      setAnalytics({
        dailyCompletion,
        categoryBreakdown,
        timeSpent,
        weeklyStats: {
          tasksCompleted,
          timeTracked: Math.round(timeTracked / 60), // in minutes
          averageTimePerTask: Math.round(averageTimePerTask),
          completionRate: Math.round(completionRate),
        },
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch analytics data.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Track your productivity and analyze your performance.</p>
      </div>

      {/* Weekly Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{analytics.weeklyStats.tasksCompleted}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Tracked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{analytics.weeklyStats.timeTracked}m</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time/Task</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{analytics.weeklyStats.averageTimePerTask}m</div>
            <p className="text-xs text-muted-foreground">Per completed task</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analytics.weeklyStats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Daily Completion Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Task Completion</CardTitle>
            <CardDescription>Tasks completed vs created over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.dailyCompletion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
                <Bar dataKey="total" fill="#e5e7eb" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks by Category</CardTitle>
            <CardDescription>Distribution of tasks across categories</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={(entry) => `${entry.name}: ${entry.value}`}
                  >
                    {analytics.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Time Spent Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Time Spent Tracking</CardTitle>
          <CardDescription>Minutes tracked per day over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={analytics.timeSpent}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} minutes`, 'Time Tracked']} />
              <Line type="monotone" dataKey="minutes" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}