import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { noticesApi } from '@/api/noticesApi';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileUpload } from '@/components/shared/FileUpload';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { NoticeCreateRequest } from '@/types/api';

export function NoticeCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targetHostel, setTargetHostel] = useState('');
  const [targetYear, setTargetYear] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: NoticeCreateRequest) => noticesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTICES] });
      toast.success('Notice published');
      navigate(-1);
    },
    onError: () => toast.error('Failed to publish notice'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      content,
      target_hostel: targetHostel || null,
      target_year: targetYear ? parseInt(targetYear, 10) : null,
      file: file,
    });
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">New Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notice title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write the notice content..."
                required
                rows={6}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target_hostel">Target Hostel (optional)</Label>
                <Input
                  id="target_hostel"
                  value={targetHostel}
                  onChange={(e) => setTargetHostel(e.target.value)}
                  placeholder="e.g., Block A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_year">Target Year (optional)</Label>
                <Input
                  id="target_year"
                  type="number"
                  value={targetYear}
                  onChange={(e) => setTargetYear(e.target.value)}
                  placeholder="e.g., 2024"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Attachment (optional)</Label>
              <FileUpload
                label="Upload attachment"
                accept="image/*,.pdf"
                maxSizeMB={10}
                onFileSelect={setFile}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !title || !content}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Notice'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
