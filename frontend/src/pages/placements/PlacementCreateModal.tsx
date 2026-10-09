import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { placementsApi } from '@/api/placementsApi';
import { adminApi } from '@/api/adminApi';
import type {
  PlacementNoticeResponse,
  PlacementNoticeCreateRequest,
  PlacementStatus,
} from '@/types/api';
import { Briefcase, Building2, Calendar, DollarSign, GraduationCap } from 'lucide-react';

interface PlacementCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noticeToEdit?: PlacementNoticeResponse | null;
}

export function PlacementCreateModal({
  open,
  onOpenChange,
  noticeToEdit,
}: PlacementCreateModalProps) {
  const queryClient = useQueryClient();

  const [company, setCompany] = useState(noticeToEdit?.company || '');
  const [title, setTitle] = useState(noticeToEdit?.title || '');
  const [description, setDescription] = useState(noticeToEdit?.description || '');
  const [jobType, setJobType] = useState(noticeToEdit?.job_type || 'Full-time');
  const [packageText, setPackageText] = useState(noticeToEdit?.package_text || '');
  const [minCgpa, setMinCgpa] = useState<string>(
    noticeToEdit?.min_cgpa ? String(noticeToEdit.min_cgpa) : ''
  );
  const [passoutYear, setPassoutYear] = useState<string>(
    noticeToEdit?.passout_year ? String(noticeToEdit.passout_year) : '2026'
  );
  const [lastDate, setLastDate] = useState(noticeToEdit?.last_date || '');
  const [driveDate, setDriveDate] = useState(noticeToEdit?.drive_date || '');
  const [status, setStatus] = useState<PlacementStatus>(
    noticeToEdit?.status || 'PUBLISHED'
  );

  // Fetch departments & courses for multi-select dropdowns
  const { data: deptRes } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => adminApi.listDepartments(),
  });

  const { data: courseRes } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: () => adminApi.listCourses(),
  });

  const departments = deptRes?.data?.data || [];
  const courses = courseRes?.data?.data || [];

  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>(
    noticeToEdit?.eligible_department_ids || []
  );
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>(
    noticeToEdit?.eligible_course_ids || []
  );

  const createMutation = useMutation({
    mutationFn: (req: PlacementNoticeCreateRequest) =>
      noticeToEdit
        ? placementsApi.updateNotice(noticeToEdit.id, req)
        : placementsApi.createNotice(req),
    onSuccess: () => {
      toast.success(
        noticeToEdit ? 'Placement notice updated successfully' : 'Placement notice created successfully'
      );
      queryClient.invalidateQueries({ queryKey: ['placement-notices'] });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || 'Failed to save placement notice');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim() || !title.trim() || !description.trim()) {
      toast.error('Please fill in Company, Job Title, and Description');
      return;
    }

    const payload: PlacementNoticeCreateRequest = {
      company: company.trim(),
      title: title.trim(),
      description: description.trim(),
      job_type: jobType,
      package_text: packageText.trim() || null,
      min_cgpa: minCgpa ? parseFloat(minCgpa) : null,
      passout_year: passoutYear ? parseInt(passoutYear, 10) : null,
      last_date: lastDate || null,
      drive_date: driveDate || null,
      eligible_department_ids: selectedDeptIds.length > 0 ? selectedDeptIds : null,
      eligible_course_ids: selectedCourseIds.length > 0 ? selectedCourseIds : null,
      status,
    };

    createMutation.mutate(payload);
  };

  const toggleDept = (id: string) => {
    setSelectedDeptIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const toggleCourse = (id: string) => {
    setSelectedCourseIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            {noticeToEdit ? 'Edit Placement Drive' : 'Post New Placement Drive'}
          </DialogTitle>
          <DialogDescription>
            Configure company hiring details, eligibility cutoffs, and application deadlines.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <div className="relative">
                <Building2 className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  id="company"
                  placeholder="e.g. Google India"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Job Title / Role *</Label>
              <Input
                id="title"
                placeholder="e.g. Software Engineer (SDE-1)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobType">Employment Type</Label>
              <Select value={jobType} onValueChange={setJobType}>
                <SelectTrigger id="jobType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Internship">Internship</SelectItem>
                  <SelectItem value="Internship + PPO">Internship + PPO</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="packageText">CTC Package</Label>
              <div className="relative">
                <DollarSign className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
                <Input
                  id="packageText"
                  placeholder="e.g. ₹12.5 LPA"
                  value={packageText}
                  onChange={(e) => setPackageText(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minCgpa">Min CGPA Cutoff</Label>
              <Input
                id="minCgpa"
                type="number"
                step="0.1"
                min="0"
                max="10"
                placeholder="e.g. 7.5"
                value={minCgpa}
                onChange={(e) => setMinCgpa(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passoutYear">Passout Batch Year</Label>
              <Input
                id="passoutYear"
                type="number"
                placeholder="e.g. 2026"
                value={passoutYear}
                onChange={(e) => setPassoutYear(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastDate">Application Deadline</Label>
              <Input
                id="lastDate"
                type="date"
                value={lastDate}
                onChange={(e) => setLastDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="driveDate">Drive / Interview Date</Label>
              <Input
                id="driveDate"
                type="date"
                value={driveDate}
                onChange={(e) => setDriveDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Job Description & Qualification Rules *</Label>
            <Textarea
              id="description"
              rows={4}
              placeholder="Paste job responsibilities, skills required, selection rounds info..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          {/* Target Branch / Department Filter */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-primary" />
              Eligible Departments (Leave blank for all departments)
            </Label>
            <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/20">
              {departments.map((dept) => {
                const isSelected = selectedDeptIds.includes(dept.id);
                return (
                  <button
                    type="button"
                    key={dept.id}
                    onClick={() => toggleDept(dept.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:bg-accent'
                    }`}
                  >
                    {dept.code || dept.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drive Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Publish Status</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as PlacementStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLISHED">Published (Visible to Students)</SelectItem>
                <SelectItem value="DRAFT">Draft (Private)</SelectItem>
                <SelectItem value="CLOSED">Closed (Applications Ended)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : noticeToEdit ? 'Save Changes' : 'Publish Drive'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
