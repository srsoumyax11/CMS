import { useState, useMemo } from 'react';
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

interface OutpassCreateProps {
  basePath: string;
}

export function OutpassCreate({ basePath }: OutpassCreateProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [destination, setDestination] = useState('');
  const [reason, setReason] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [expectedReturnTime, setExpectedReturnTime] = useState('');

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
    mutationFn: () =>
      outpassesApi.create({
        destination,
        reason,
        departure_time: new Date(departureTime).toISOString(),
        expected_return_time: new Date(expectedReturnTime).toISOString(),
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(departureTime) >= new Date(expectedReturnTime)) {
      toast.error('Return time must be after departure time');
      return;
    }
    createMutation.mutate();
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Where are you going?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for leaving campus..."
                required
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departure">Departure Time</Label>
                <Input
                  id="departure"
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="return">Expected Return Time</Label>
                <Input
                  id="return"
                  type="datetime-local"
                  value={expectedReturnTime}
                  onChange={(e) => setExpectedReturnTime(e.target.value)}
                  required
                />
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
                disabled={
                  createMutation.isPending ||
                  !destination ||
                  !reason ||
                  !departureTime ||
                  !expectedReturnTime
                }
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
