import { useState } from 'react';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messApi } from '@/api/messApi';
import { QUERY_KEYS } from '@/lib/constants';
import { ErrorState } from '@/components/shared/ErrorState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UtensilsCrossed, Loader2, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { DayOfWeek, MealType, MessMenu } from '@/types/api';

const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const dayLabels: Record<DayOfWeek, string> = {
  monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday',
  thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
};

const mealLabels: Record<MealType, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner',
};

const mealOptions: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];

export function MessManagement() {
  const queryClient = useQueryClient();
  const [day, setDay] = useState<DayOfWeek>('monday');
  const [meal, setMeal] = useState<MealType>('breakfast');
  const [items, setItems] = useState('');

  const menuQuery = useQuery({
    queryKey: [QUERY_KEYS.MESS_WEEKLY],
    queryFn: () => messApi.getMenuWeekly(),
  });

  const analyticsQuery = useQuery({
    queryKey: [QUERY_KEYS.ADMIN_MESS_ANALYTICS],
    queryFn: () => messApi.getAnalyticsToday(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      messApi.createOrUpdateMenu({ day_of_week: day, meal_type: meal, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MESS_WEEKLY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MESS_TODAY] });
      toast.success('Menu updated');
      setItems('');
    },
    onError: () => toast.error('Failed to update menu'),
  });

  const weeklyMenus: MessMenu[] = (menuQuery.data?.data?.data as MessMenu[]) ?? [];
  const analytics = analyticsQuery.data?.data?.data as Record<string, unknown> | null;

  const menusByDay: Record<string, MessMenu[]> = {};
  weeklyMenus.forEach((m) => {
    if (!menusByDay[m.day_of_week]) menusByDay[m.day_of_week] = [];
    menusByDay[m.day_of_week].push(m);
  });

  if (menuQuery.error) {
    return <ErrorState onRetry={() => menuQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Create / Update Menu</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="day">Day</Label>
                  <Select value={day} onValueChange={(v) => setDay(v as DayOfWeek)}>
                    <SelectTrigger id="day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {dayLabels[d]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meal">Meal</Label>
                  <Select value={meal} onValueChange={(v) => setMeal(v as MealType)}>
                    <SelectTrigger id="meal">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mealOptions.map((m) => (
                        <SelectItem key={m} value={m}>
                          {mealLabels[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="items">Menu Items</Label>
                <Textarea
                  id="items"
                  value={items}
                  onChange={(e) => setItems(e.target.value)}
                  placeholder="e.g., Rice, Dal, Sabzi, Salad, Curd"
                  required
                  rows={3}
                  maxLength={1000}
                />
              </div>

              <Button type="submit" disabled={createMutation.isPending || items.length < 2}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Menu'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Today's Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsQuery.isLoading ? (
              <div className="h-32 animate-pulse rounded-lg bg-muted" />
            ) : analytics ? (
              <div className="space-y-3">
                {Object.entries(analytics).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <span className="text-sm text-muted-foreground capitalize">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-semibold text-foreground">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No analytics data available for today
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-4 text-base font-semibold text-foreground">Current Weekly Menu</h3>
        {menuQuery.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DAYS.slice(0, 6).map((d) => (
              <div key={d} className="h-32 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : weeklyMenus.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-center">
            <UtensilsCrossed className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No menu items configured yet</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {DAYS.filter((d) => menusByDay[d]?.length > 0).map((d) => (
              <Card key={d} className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{dayLabels[d]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {menusByDay[d].map((m, i) => (
                    <div key={i}>
                      <p className="text-xs font-medium text-muted-foreground">
                        {mealLabels[m.meal_type]}
                      </p>
                      <p className="text-sm text-foreground">{m.items}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
