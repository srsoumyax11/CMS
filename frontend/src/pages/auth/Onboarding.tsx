import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/authApi';
import { metadataApi } from '@/api/metadataApi';
import { useAuth } from '@/context/AuthContext';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GraduationCap, Loader2, AlertCircle } from 'lucide-react';
import type { Course } from '@/types/api';

export function Onboarding() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  
  const [courseId, setCourseId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [year, setYear] = useState('');
  const [hostel, setHostel] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Determine if this is an edit (revision) or first-time creation
  const isRevision = user?.account_status === 'revision';
  const hasExistingProfile = user?.academic_status !== null && user?.academic_status !== undefined;

  // Fetch existing profile data for pre-filling when in revision mode
  const existingProfileQuery = useQuery({
    queryKey: ['my-student-profile'],
    queryFn: () => authApi.getStudentProfile(),
    enabled: hasExistingProfile,
  });

  const coursesQuery = useQuery({
    queryKey: [QUERY_KEYS.COURSES],
    queryFn: () => metadataApi.getCourses(),
  });

  const courses: Course[] = coursesQuery.data?.data?.data ?? [];
  const selectedCourse = courses.find((c) => c.id === courseId);
  const branches = selectedCourse?.branches ?? [];

  // Pre-fill form when existing profile data is loaded
  useEffect(() => {
    const profile = existingProfileQuery.data?.data?.data;
    if (profile) {
      setCourseId(profile.course_id);
      setBranchId(profile.branch_id);
      setYear(String(profile.year));
      setHostel(profile.hostel ?? '');
    }
  }, [existingProfileQuery.data]);

  const profileMutation = useMutation({
    mutationFn: () => {
      const payload = {
        course_id: courseId,
        branch_id: branchId,
        year: parseInt(year, 10),
        hostel: hostel || undefined,
      };
      // Use PUT if profile exists, POST if creating new
      return hasExistingProfile
        ? authApi.updateStudentProfile(payload)
        : authApi.createStudentProfile(payload);
    },
    onSuccess: async () => {
      await refreshUser();
      if (isRevision) {
        // After updating, go back to account-status (still under review)
        navigate('/account-status', { replace: true });
      } else {
        navigate('/student', { replace: true });
      }
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to save academic details. Please try again.';
      setError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!courseId || !branchId || !year) {
      setError('Course, Branch, and Year are required.');
      return;
    }
    profileMutation.mutate();
  };

  const handleSkip = () => {
    if (!courseId || !branchId || !year) {
      setError('Please fill out Course, Branch, and Year before skipping optional details.');
      return;
    }
    profileMutation.mutate();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {hasExistingProfile ? 'Update Your Profile' : 'Complete Your Profile'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {hasExistingProfile
              ? 'Please review and update your details as requested by the administrator.'
              : `Almost there, ${user.name}!`}
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-xl">Academic Details</CardTitle>
            <CardDescription>
              {hasExistingProfile
                ? 'Your application requires corrections. Update the fields below and resubmit.'
                : 'We need these details to assign you to the correct batches and timetable. Your account is currently under review.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Select
                  value={courseId}
                  onValueChange={(v) => {
                    setCourseId(v);
                    setBranchId('');
                  }}
                >
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">Branch *</Label>
                <Select
                  value={branchId}
                  onValueChange={setBranchId}
                  disabled={!branches.length}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Admission Year *</Label>
                <Input
                  id="year"
                  type="number"
                  min={1990}
                  max={2100}
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  required
                  placeholder="e.g., 2024"
                />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <h3 className="text-sm font-medium">Optional Details</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hostel">Hostel / Room</Label>
                <Input
                  id="hostel"
                  value={hostel}
                  onChange={(e) => setHostel(e.target.value)}
                  placeholder="e.g., Block A, Room 102"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                {isRevision && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/account-status')}
                    disabled={profileMutation.isPending}
                  >
                    Back
                  </Button>
                )}
                {!hasExistingProfile && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={handleSkip}
                    disabled={profileMutation.isPending}
                  >
                    Skip Optional
                  </Button>
                )}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={profileMutation.isPending || !courseId || !branchId || !year}
                >
                  {profileMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : hasExistingProfile ? (
                    'Update & Resubmit'
                  ) : (
                    'Complete Setup'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
