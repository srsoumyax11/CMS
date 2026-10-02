import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messApi } from '@/api/messApi';
import { QUERY_KEYS } from '@/lib/constants';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Star, UtensilsCrossed, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { DayOfWeek, MealType, MessMenu } from '@/types/api';

const dayLabels: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

const mealLabels: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  snacks: 'Snacks',
  dinner: 'Dinner',
};

const mealOrder: MealType[] = ['breakfast', 'lunch', 'snacks', 'dinner'];
const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export function MessView() {
  const queryClient = useQueryClient();
  const [feedbackMeal, setFeedbackMeal] = useState<MealType>('breakfast');
  const [rating, setRating] = useState(4);
  const [comments, setComments] = useState('');

  const todayQuery = useQuery({
    queryKey: [QUERY_KEYS.MESS_TODAY],
    queryFn: () => messApi.getMenuToday(),
  });

  const weeklyQuery = useQuery({
    queryKey: [QUERY_KEYS.MESS_WEEKLY],
    queryFn: () => messApi.getMenuWeekly(),
    enabled: false,
  });

  const feedbackMutation = useMutation({
    mutationFn: () =>
      messApi.submitFeedback({
        date: format(new Date(), 'yyyy-MM-dd'),
        meal_type: feedbackMeal,
        rating,
        comments: comments || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_MESS_FEEDBACK] });
      toast.success('Feedback submitted');
      setComments('');
      setRating(4);
    },
    onError: () => toast.error('Failed to submit feedback'),
  });

  const todayMenus: MessMenu[] = (todayQuery.data?.data?.data as MessMenu[]) ?? [];
  const weeklyMenus: MessMenu[] = (weeklyQuery.data?.data?.data as MessMenu[]) ?? [];

  const menusByDay: Record<DayOfWeek, MessMenu[]> = {
    monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [], sunday: [],
  };
  weeklyMenus.forEach((m) => {
    if (menusByDay[m.day_of_week]) menusByDay[m.day_of_week].push(m);
  });

  const renderMenuCard = (menu: MessMenu, idx: number) => (
    <Card key={idx} className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-foreground">
          {mealLabels[menu.meal_type]}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{menu.items}</p>
      </CardContent>
    </Card>
  );

  if (todayQuery.error) {
    return <ErrorState onRetry={() => todayQuery.refetch()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Mess Menu</h2>
        <p className="text-sm text-muted-foreground">Today's meals and feedback</p>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">Today's Menu</TabsTrigger>
          <TabsTrigger value="weekly" onClick={() => weeklyQuery.refetch()}>
            Weekly Menu
          </TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          {todayQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {mealOrder.map((meal) => (
                <div key={meal} className="h-32 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : todayMenus.length === 0 ? (
            <EmptyState
              title="No menu for today"
              description="The mess menu hasn't been published for today."
              icon={<UtensilsCrossed className="h-6 w-6" />}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {mealOrder.map((meal) => {
                const menu = todayMenus.find((m) => m.meal_type === meal);
                return menu
                  ? renderMenuCard(menu, meal.length)
                  : (
                    <Card key={meal} className="shadow-sm opacity-50">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold text-foreground">
                          {mealLabels[meal]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Not available</p>
                      </CardContent>
                    </Card>
                  );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-4">
          {weeklyQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DAYS.slice(0, 6).map((d) => (
                <div key={d} className="h-40 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : weeklyMenus.length === 0 ? (
            <EmptyState
              title="No weekly menu available"
              description="The weekly menu hasn't been published yet."
              icon={<UtensilsCrossed className="h-6 w-6" />}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {DAYS.filter((d) => menusByDay[d].length > 0).map((day) => (
                <Card key={day} className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-foreground">
                      {dayLabels[day]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {menusByDay[day].map((m, i) => (
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
        </TabsContent>

        <TabsContent value="feedback">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Submit Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  feedbackMutation.mutate();
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="meal">Meal</Label>
                  <Select
                    value={feedbackMeal}
                    onValueChange={(v) => setFeedbackMeal(v as MealType)}
                  >
                    <SelectTrigger id="meal" className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {mealOrder.map((meal) => (
                        <SelectItem key={meal} value={meal}>
                          {mealLabels[meal]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium leading-none">Rating: {rating}/5</div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110"
                        aria-label={`Rate ${star} out of 5 stars`}
                      >
                        <Star
                          className={`h-6 w-6 ${
                            star <= rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="comments">Comments (optional)</Label>
                  <Textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Share your thoughts about the meal..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={feedbackMutation.isPending}
                >
                  {feedbackMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Feedback'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
