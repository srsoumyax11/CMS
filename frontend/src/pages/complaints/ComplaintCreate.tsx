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

export function ComplaintCreate() {
  const { role } = useAuth();
  const basePath = role ? `/${role}` : '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<ComplaintCategory>('electrical');
  const [hostel, setHostel] = useState('');
  const [room, setRoom] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ComplaintVisibility>('public');
  const [photo, setPhoto] = useState<File | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      complaintsApi.create({
        category,
        location_hostel: hostel,
        location_room: room || null,
        description,
        visibility,
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as ComplaintCategory)}
              >
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hostel">Hostel / Block</Label>
                <Input
                  id="hostel"
                  value={hostel}
                  onChange={(e) => setHostel(e.target.value)}
                  placeholder="e.g., Block A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="room">Room (optional)</Label>
                <Input
                  id="room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g., 204"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                required
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="visibility">Visibility</Label>
              <Select
                value={visibility}
                onValueChange={(v) => setVisibility(v as ComplaintVisibility)}
              >
                <SelectTrigger id="visibility" className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
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
                disabled={createMutation.isPending || !hostel || !description}
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
