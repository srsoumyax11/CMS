import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '@/api/adminApi';
import { OnboardingStatusResponse, OnboardingTask } from '@/types/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export function OnboardingWidget() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OnboardingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await adminApi.getOnboardingStatus();
        if (res.data.success && res.data.data) {
          setStatus(res.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch onboarding status", err);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (loading) return null;
  if (!status) return null;

  // Hide the widget once onboarding is 100% complete
  if (status.completion_percentage === 100) return null;

  return (
    <Card className="border-primary/20 bg-card mb-6 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <AlertCircle className="h-5 w-5 text-primary" />
          System Setup Incomplete
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete these tasks to make the system fully operational in production.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm font-medium mb-1 text-foreground">
            <span>Setup Progress</span>
            <span className="font-mono">{status.completion_percentage}%</span>
          </div>
          <Progress value={status.completion_percentage} className="h-2" />
        </div>

        <div className="space-y-3 mt-5">
          {status.tasks.map((task: OnboardingTask) => (
            <div 
              key={task.id} 
              className={`flex items-start justify-between p-3 rounded-xl border ${
                task.is_completed 
                  ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/50 opacity-60' 
                  : 'bg-card border-border'
              }`}
            >
              <div className="flex gap-3">
                {task.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/40 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className={`text-sm font-medium ${task.is_completed ? 'text-emerald-700 dark:text-emerald-400 line-through' : 'text-foreground'}`}>
                    {task.title}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[400px]">
                    {task.description}
                  </p>
                </div>
              </div>
              
              {!task.is_completed && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(task.action_url)}
                  className="shrink-0 gap-1"
                >
                  Fix Now <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

}
