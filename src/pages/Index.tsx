import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CheckSquare, BarChart3, Timer, Target } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-accent/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <CheckSquare className="h-12 w-12 text-primary mr-3" />
            <h1 className="text-5xl font-bold text-primary">TaskMint</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Your smart productivity companion. Track tasks, measure time, and boost your efficiency with powerful analytics.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6 rounded-lg border bg-card/50">
            <CheckSquare className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Smart Task Management</h3>
            <p className="text-muted-foreground">
              Organize tasks with categories, priorities, and due dates. Never miss a deadline again.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg border bg-card/50">
            <Timer className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Time Tracking</h3>
            <p className="text-muted-foreground">
              Track time spent on tasks with precision. Understand where your time actually goes.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg border bg-card/50">
            <BarChart3 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Productivity Analytics</h3>
            <p className="text-muted-foreground">
              Visualize your productivity patterns with charts and insights to improve your workflow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
