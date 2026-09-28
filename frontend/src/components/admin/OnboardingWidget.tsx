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
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10 dark:border-blue-900 mb-6 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-blue-800 dark:text-blue-300">
          <AlertCircle className="h-5 w-5" />
          System Setup Incomplete
        </CardTitle>
        <p className="text-sm text-blue-600 dark:text-blue-400">
          Complete these tasks to make the system fully operational in production.
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="flex justify-between text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">
            <span>Setup Progress</span>
            <span>{status.completion_percentage}%</span>
          </div>
          <Progress value={status.completion_percentage} className="h-2 bg-blue-100 dark:bg-blue-950" />
        </div>

        <div className="space-y-3 mt-5">
          {status.tasks.map((task: OnboardingTask) => (
            <div 
              key={task.id} 
              className={`flex items-start justify-between p-3 rounded-lg border ${
                task.is_completed 
                  ? 'bg-green-50/50 border-green-100 dark:bg-green-950/20 dark:border-green-900/50 opacity-60' 
                  : 'bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800'
              }`}
            >
              <div className="flex gap-3">
                {task.is_completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <div className="h-5 w-5 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className={`text-sm font-medium ${task.is_completed ? 'text-green-700 dark:text-green-400 line-through' : 'text-slate-900 dark:text-slate-100'}`}>
                    {task.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[400px]">
                    {task.description}
                  </p>
                </div>
              </div>
              
              {!task.is_completed && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(task.action_url)}
                  className="shrink-0"
                >
                  Fix Now <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
