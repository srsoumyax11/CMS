import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { outpassesApi } from '@/api/outpassesApi';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { outpassCreateSchema, type OutpassCreateFormValues } from '@/schemas/validation-schemas';

export function OutpassCreate() {
  const { role } = useAuth();
  const basePath = role ? `/${role}` : '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OutpassCreateFormValues>({
    resolver: zodResolver(outpassCreateSchema),
    defaultValues: { destination: '', reason: '', departure_time: '', expected_return_time: '' }
  });

  const departureTime = watch('departure_time');
  const expectedReturnTime = watch('expected_return_time');

  const { data: myOutpassesResp } = useQuery({
    queryKey: [QUERY_KEYS.MY_OUTPASSES],
    queryFn: () => outpassesApi.getMine(),
  });

  const activeOutpasses = useMemo(() => {
    return (myOutpassesResp?.data?.data?.items || []).filter(
      (o: any) => o.status !== 'rejected' && o.status !== 'cancelled'
    );
  }, [myOutpassesResp]);

  const hasOverlap = useMemo(() => {
    if (!departureTime || !expectedReturnTime) return false;
    const pStart = new Date(departureTime).getTime();
    const pEnd = new Date(expectedReturnTime).getTime();
    
    return activeOutpasses.some((o: any) => {
      const eStart = new Date(o.start_time).getTime();
      const eEnd = new Date(o.end_time).getTime();
      return eStart < pEnd && eEnd > pStart;
    });
  }, [departureTime, expectedReturnTime, activeOutpasses]);

  const createMutation = useMutation({
    mutationFn: (data: OutpassCreateFormValues) =>
      outpassesApi.create({
        destination: data.destination,
        reason: data.reason,
        departure_time: new Date(data.departure_time).toISOString(),
        expected_return_time: new Date(data.expected_return_time).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_OUTPASSES] });
      toast.success('Outpass request submitted');
      navigate(`${basePath}/outpasses`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to submit outpass request';
      toast.error(msg);
    },
  });

  const onSubmit = (data: OutpassCreateFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/outpasses`)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Outpasses
      </Button>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Request Outpass</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                {...register('destination')}
                placeholder="Where are you going?"
              />
              {errors.destination && <p className="text-xs text-red-500">{errors.destination.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                {...register('reason')}
                placeholder="Reason for leaving campus..."
                rows={3}
              />
              {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departure">Departure Time</Label>
                <Input
                  id="departure"
                  type="datetime-local"
                  {...register('departure_time')}
                />
                {errors.departure_time && <p className="text-xs text-red-500">{errors.departure_time.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="return">Expected Return Time</Label>
                <Input
                  id="return"
                  type="datetime-local"
                  {...register('expected_return_time')}
                />
                {errors.expected_return_time && <p className="text-xs text-red-500">{errors.expected_return_time.message}</p>}
              </div>
            </div>

            {hasOverlap && (
              <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm mt-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex flex-col">
                  <h3 className="font-semibold text-amber-800">Overlap Warning</h3>
                  <p className="text-sm mt-1">
                    You already have an active outpass request overlapping with these dates. Submitting this may result in a rejection.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`${basePath}/outpasses`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
