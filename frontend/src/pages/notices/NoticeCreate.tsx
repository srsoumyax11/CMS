import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noticesApi } from '@/api/noticesApi';
import { metadataApi } from '@/api/metadataApi';
import { useAuth } from '@/context/AuthContext';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload } from '@/components/shared/FileUpload';
import { ArrowLeft, Loader2, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/error-utils';
import { extractItems } from '@/lib/utils';
import type { NoticeCreateRequest } from '@/types/api';

export function NoticeCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>('all');
  const [targetCourseId, setTargetCourseId] = useState<string>('all');
  const [targetUserTypes, setTargetUserTypes] = useState<string>('all');
  const [targetHostel, setTargetHostel] = useState('');
  const [targetYear, setTargetYear] = useState('');
  const { role } = useAuth();

  // Fetch departments & courses for targeting filters
  const { data: deptRes } = useQuery({
    queryKey: ['metadata', 'departments'],
    queryFn: () => metadataApi.getDepartments(),
  });
  const departments = extractItems(deptRes);

  const { data: courseRes } = useQuery({
    queryKey: ['metadata', 'courses'],
    queryFn: () => metadataApi.getCourses(),
  });
  const courses = extractItems(courseRes);

  const createMutation = useMutation({
    mutationFn: (data: NoticeCreateRequest) => noticesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.NOTICES] });
      toast.success('Notice published successfully!');
      navigate(-1);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Failed to publish notice')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      content,
      target_department_id: targetDepartmentId !== 'all' ? targetDepartmentId : null,
      target_course_id: targetCourseId !== 'all' ? targetCourseId : null,
      target_user_types: targetUserTypes !== 'all' ? targetUserTypes : null,
      target_hostel: targetHostel.trim() || null,
      target_year: targetYear ? parseInt(targetYear, 10) : null,
      file: file,
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Notices
      </Button>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            Create Announcement Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Notice Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. End Semester Examination Schedule 2026"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Notice Details / Announcement *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write the complete announcement content..."
                required
                rows={6}
              />
            </div>

            {/* Target Audience Filters */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Target Audience Filters (Optional)
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target_user_types">Target User Group</Label>
                  <Select value={targetUserTypes} onValueChange={setTargetUserTypes}>
                    <SelectTrigger id="target_user_types">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users (Campus Wide)</SelectItem>
                      <SelectItem value="student">Students Only</SelectItem>
                      <SelectItem value="faculty">Faculty Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_department">Target Department</Label>
                  <Select value={targetDepartmentId} onValueChange={setTargetDepartmentId}>
                    <SelectTrigger id="target_department">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name} ({dept.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_course">Target Degree Program</Label>
                  <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                    <SelectTrigger id="target_course">
                      <SelectValue placeholder="All Courses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Courses</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name} ({course.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target_year">Target Academic Year</Label>
                  <Select value={targetYear} onValueChange={setTargetYear}>
                    <SelectTrigger id="target_year">
                      <SelectValue placeholder="All Academic Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Academic Years</SelectItem>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target_hostel">Target Hostel Block (optional)</Label>
                <Input
                  id="target_hostel"
                  value={targetHostel}
                  onChange={(e) => setTargetHostel(e.target.value)}
                  placeholder="e.g. Block A or Subhash Hall"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attachment">Attachment (Optional - PDF or Image)</Label>
              <FileUpload
                id="attachment"
                label="Upload PDF circular or banner image"
                accept="image/*,.pdf"
                maxSizeMB={10}
                onFileSelect={setFile}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !title.trim() || !content.trim()}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Publishing Notice...
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

export default NoticeCreate;
