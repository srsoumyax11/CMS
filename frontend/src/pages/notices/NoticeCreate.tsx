import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noticesApi } from '@/api/noticesApi';
import { adminApi } from '@/api/adminApi';
import { useAuth } from '@/context/AuthContext';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/shared/FileUpload';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/error-utils';
import type { NoticeCreateRequest } from '@/types/api';

export function NoticeCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targetHostel, setTargetHostel] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const [audienceGroupId, setAudienceGroupId] = useState<string>('none');
  const { role } = useAuth();

  const { data: audienceRes } = useQuery({
    queryKey: ['audience_groups'],
    queryFn: () => adminApi.listAudienceGroups(),
    enabled: role === 'admin',
  });
  const audienceGroups = audienceRes?.data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: NoticeCreateRequest) => noticesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTICES] });
      toast.success('Notice published');
      navigate(-1);
    },
    onError: (err: any) => toast.error(getErrorMessage(err)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      content,
      target_hostel: audienceGroupId !== 'none' ? null : (targetHostel || null),
      target_year: audienceGroupId !== 'none' ? null : (targetYear ? parseInt(targetYear, 10) : null),
      target_audience_group_id: audienceGroupId !== 'none' ? audienceGroupId : null,
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

            {role === 'admin' && audienceGroups.length > 0 && (
              <div className="space-y-2 border-t pt-4 mt-4">
                <Label htmlFor="audienceGroup">Target Audience Group</Label>
                <Select value={audienceGroupId} onValueChange={setAudienceGroupId}>
                  <SelectTrigger id="audienceGroup">
                    <SelectValue placeholder="Select an audience group..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Manual Targeting (Use fields below)</SelectItem>
                    {audienceGroups.map((ag) => (
                      <SelectItem key={ag.id} value={ag.id}>
                        {ag.name} ({ag.member_count} members)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {audienceGroupId !== 'none' && (
                  <p className="text-xs text-muted-foreground mt-1">Manual targeting filters are disabled because an Audience Group is selected.</p>
                )}
              </div>
            )}

            <div className={`grid grid-cols-2 gap-4 ${audienceGroupId !== 'none' ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="space-y-2">
                <Label htmlFor="target_hostel">Target Hostel (optional)</Label>
                <Input
                  id="target_hostel"
                  value={targetHostel}
                  onChange={(e) => setTargetHostel(e.target.value)}
                  placeholder="e.g., Block A"
                  disabled={audienceGroupId !== 'none'}
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
                  disabled={audienceGroupId !== 'none'}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment">Attachment (optional)</Label>
              <FileUpload
                id="attachment"
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
