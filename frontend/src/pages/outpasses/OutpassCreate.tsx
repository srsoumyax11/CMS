import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { outpassesApi } from '@/api/outpassesApi';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
    onError: () => toast.error('Failed to submit outpass request'),
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
    <div className="space-y-6">
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
