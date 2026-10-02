import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsApi } from '@/api/complaintsApi';
import { QUERY_KEYS } from '@/lib/constants';
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
import { FileUpload } from '@/components/shared/FileUpload';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ComplaintCategory, ComplaintVisibility } from '@/types/api';

const categories: { value: ComplaintCategory; label: string }[] = [
  { value: 'electrical', label: 'Electrical' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'cleanliness', label: 'Cleanliness' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'security', label: 'Security' },
  { value: 'other', label: 'Other' },
];

import { useAuth } from '@/context/AuthContext';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { complaintCreateSchema, type ComplaintCreateFormValues } from '@/schemas/validation-schemas';

export function ComplaintCreate() {
  const { role } = useAuth();
  const basePath = role ? `/${role}` : '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ComplaintCreateFormValues>({
    resolver: zodResolver(complaintCreateSchema),
    defaultValues: { category: 'electrical', location_hostel: '', location_room: '', description: '', visibility: 'public' }
  });

  const [photo, setPhoto] = useState<File | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: ComplaintCreateFormValues) =>
      complaintsApi.create({
        ...data,
        location_room: data.location_room || null,
        photo,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.MY_COMPLAINTS] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PUBLIC_COMPLAINTS] });
      toast.success('Complaint filed successfully');
      navigate(`${basePath}/complaints`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Failed to file complaint';
      toast.error(msg);
    },
  });

  const onSubmit = (data: ComplaintCreateFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/complaints`)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Complaints
      </Button>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">File a Complaint</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location_hostel">Hostel / Block</Label>
                <Input
                  id="location_hostel"
                  {...register('location_hostel')}
                  placeholder="e.g., Block A"
                />
                {errors.location_hostel && <p className="text-xs text-red-500">{errors.location_hostel.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_room">Room (optional)</Label>
                <Input
                  id="location_room"
                  {...register('location_room')}
                  placeholder="e.g., 204"
                />
                {errors.location_room && <p className="text-xs text-red-500">{errors.location_room.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Describe the issue in detail..."
                rows={5}
              />
              {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Controller
                name="visibility"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger id="visibility" className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.visibility && <p className="text-xs text-red-500">{errors.visibility.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Photo (optional)</Label>
              <FileUpload
                label="Upload photo"
                accept="image/*"
                maxSizeMB={5}
                onFileSelect={setPhoto}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`${basePath}/complaints`)}
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
                  'Submit Complaint'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
