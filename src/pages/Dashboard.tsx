import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { AddTaskDialog } from '@/components/AddTaskDialog';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  priority: string;
  category?: {
    name: string;
    color: string;
  };
}

interface Stats {
  totalTasks: number;
  completedTasks: number;
  todayTasks: number;
  overdueTasks: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTasks: 0,
    completedTasks: 0,
    todayTasks: 0,
    overdueTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select(`
          *,
          category:categories(name, color)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setTasks(tasksData || []);
      
      // Calculate stats
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const totalTasks = tasksData?.length || 0;
      const completedTasks = tasksData?.filter(task => task.completed).length || 0;
      const todayTasks = tasksData?.filter(task => {
        if (!task.due_date) return false;
        const dueDate = new Date(task.due_date);
        return dueDate >= today && dueDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
      }).length || 0;
      const overdueTasks = tasksData?.filter(task => {
        if (!task.due_date || task.completed) return false;
        return new Date(task.due_date) < today;
      }).length || 0;

      setStats({
        totalTasks,
        completedTasks,
        todayTasks,
        overdueTasks,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch tasks. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: !completed,
          completed_at: !completed ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;

      fetchTasks();
      toast({
        title: !completed ? "Task completed!" : "Task reopened",
        description: !completed ? "Great job on completing the task!" : "Task marked as incomplete",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your productivity overview.</p>
        </div>
        <Button onClick={() => setShowAddTask(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Today</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.todayTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdueTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
          <CardDescription>Your latest tasks and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No tasks yet</h3>
              <p className="text-muted-foreground mb-4">Start by creating your first task!</p>
              <Button onClick={() => setShowAddTask(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                  <button
                    onClick={() => toggleTaskComplete(task.id, task.completed)}
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground hover:border-primary'
                    }`}
                  >
                    {task.completed && <CheckCircle className="h-3 w-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground truncate">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {task.category && (
                      <span
                        className="px-2 py-1 text-xs rounded-full"
                        style={{ backgroundColor: task.category.color + '20', color: task.category.color }}
                      >
                        {task.category.name}
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddTaskDialog 
        open={showAddTask} 
        onOpenChange={setShowAddTask}
        onTaskAdded={fetchTasks}
      />
    </div>
  );
}