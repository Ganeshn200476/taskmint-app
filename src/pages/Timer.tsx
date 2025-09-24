import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Task {
  id: string;
  title: string;
  estimated_time?: number;
}

interface TimeEntry {
  id: string;
  task_id: string;
  start_time: string;
  end_time?: string;
  duration?: number;
  task: {
    title: string;
  };
}

export default function Timer() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchTimeEntries();
    }
  }, [user]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setCurrentTime(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, estimated_time')
        .eq('user_id', user?.id)
        .eq('completed', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch tasks.",
        variant: "destructive",
      });
    }
  };

  const fetchTimeEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('time_entries')
        .select(`
          *,
          task:tasks(title)
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTimeEntries(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch time entries.",
        variant: "destructive",
      });
    }
  };

  const startTimer = async () => {
    if (!selectedTaskId) {
      toast({
        title: "Select a task",
        description: "Please select a task to track time for.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          user_id: user?.id,
          task_id: selectedTaskId,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setActiveEntryId(data.id);
      setIsRunning(true);
      setCurrentTime(0);
      
      toast({
        title: "Timer started",
        description: "Time tracking has begun for the selected task.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start timer.",
        variant: "destructive",
      });
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const stopTimer = async () => {
    if (!activeEntryId) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          end_time: new Date().toISOString(),
          duration: currentTime,
        })
        .eq('id', activeEntryId);

      if (error) throw error;

      setIsRunning(false);
      setCurrentTime(0);
      setActiveEntryId(null);
      fetchTimeEntries();
      
      toast({
        title: "Timer stopped",
        description: `Time logged: ${formatTime(currentTime)}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to stop timer.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const selectedTask = tasks.find(task => task.id === selectedTaskId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Time Tracker</h1>
        <p className="text-muted-foreground">Track time spent on your tasks for better productivity insights.</p>
      </div>

      {/* Timer Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Time Tracker
          </CardTitle>
          <CardDescription>Select a task and start tracking your time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Task</label>
            <Select 
              value={selectedTaskId} 
              onValueChange={setSelectedTaskId}
              disabled={isRunning}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a task to track..." />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{task.title}</span>
                      {task.estimated_time && (
                        <span className="text-xs text-muted-foreground ml-2">
                          Est: {task.estimated_time}m
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTask && (
            <div className="text-center space-y-4">
              <div className="text-6xl font-mono font-bold text-primary">
                {formatTime(currentTime)}
              </div>
              
              {selectedTask.estimated_time && (
                <div className="text-sm text-muted-foreground">
                  Estimated: {selectedTask.estimated_time} minutes
                  {currentTime > 0 && (
                    <span className="ml-2">
                      ({Math.round((currentTime / 60 / selectedTask.estimated_time) * 100)}% of estimate)
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                {!isRunning && !activeEntryId && (
                  <Button onClick={startTimer} size="lg" className="gap-2">
                    <Play className="h-4 w-4" />
                    Start
                  </Button>
                )}
                
                {isRunning && (
                  <Button onClick={pauseTimer} variant="outline" size="lg" className="gap-2">
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                )}
                
                {activeEntryId && (
                  <Button onClick={stopTimer} variant="destructive" size="lg" className="gap-2">
                    <Square className="h-4 w-4" />
                    Stop
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Time Entries */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Time Entries</CardTitle>
          <CardDescription>Your latest tracked time sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {timeEntries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No time entries yet</h3>
              <p className="text-muted-foreground">Start tracking time on your tasks to see entries here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{entry.task.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(entry.start_time).toLocaleDateString()} at{' '}
                      {new Date(entry.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-medium">
                      {entry.duration ? formatTime(entry.duration) : 'In progress...'}
                    </div>
                    {entry.end_time && (
                      <p className="text-sm text-muted-foreground">
                        Ended: {new Date(entry.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}