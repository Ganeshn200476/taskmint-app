import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter, 
  CheckCircle, 
  Clock, 
  Calendar,
  Edit,
  Trash2,
  Timer
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { AddTaskDialog } from '@/components/AddTaskDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  due_date?: string;
  priority: string;
  estimated_time?: number;
  created_at: string;
  category?: {
    id: string;
    name: string;
    color: string;
  };
}

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  useEffect(() => {
    filterTasks();
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          category:categories(id, name, color)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
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

  const filterTasks = () => {
    let filtered = tasks;

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(task => 
        statusFilter === 'completed' ? task.completed : !task.completed
      );
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    setFilteredTasks(filtered);
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

  const deleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      fetchTasks();
      toast({
        title: "Task deleted",
        description: "The task has been permanently deleted.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && !tasks.find(t => t.due_date === dueDate)?.completed;
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
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks and stay organized.</p>
        </div>
        <Button onClick={() => setShowAddTask(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={(value: any) => setPriorityFilter(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No tasks found</h3>
              <p className="text-muted-foreground mb-4">
                {tasks.length === 0 
                  ? "Start by creating your first task!"
                  : "Try adjusting your filters to see more tasks."
                }
              </p>
              {tasks.length === 0 && (
                <Button onClick={() => setShowAddTask(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Your First Task
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <button
                    onClick={() => toggleTaskComplete(task.id, task.completed)}
                    className={`mt-1 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      task.completed
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-muted-foreground hover:border-primary'
                    }`}
                  >
                    {task.completed && <CheckCircle className="h-3 w-3" />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`font-semibold ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 mt-3">
                          <Badge variant="outline" className={getPriorityColor(task.priority)}>
                            {task.priority} priority
                          </Badge>
                          
                          {task.category && (
                            <Badge variant="outline" className="gap-1">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: task.category.color }}
                              />
                              {task.category.name}
                            </Badge>
                          )}
                          
                          {task.due_date && (
                            <div className={`flex items-center gap-1 text-sm ${
                              isOverdue(task.due_date) ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              <Calendar className="h-3 w-3" />
                              {formatDate(task.due_date)}
                            </div>
                          )}
                          
                          {task.estimated_time && (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Timer className="h-3 w-3" />
                              {task.estimated_time}m
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AddTaskDialog 
        open={showAddTask} 
        onOpenChange={setShowAddTask}
        onTaskAdded={fetchTasks}
      />
    </div>
  );
}