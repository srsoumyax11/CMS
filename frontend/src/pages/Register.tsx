import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi } from '@/api/authApi';
import { metadataApi } from '@/api/metadataApi';
import { useAuth } from '@/context/AuthContext';
import { STORAGE_KEYS } from '@/lib/constants';
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
import { GraduationCap, Loader2, AlertCircle, ArrowLeft,CheckCircle2, Eye, EyeOff } from 'lucide-react';


export function Register() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [courseId, setCourseId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: coursesData } = useQuery({
    queryKey: ['metadata', 'courses'],
    queryFn: () => metadataApi.getCourses().then(res => res.data.data || []),
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['metadata', 'departments'],
    queryFn: () => metadataApi.getDepartments().then(res => res.data.data || []),
  });

  const academicDepts = departmentsData?.filter(d => d.department_type === 'academic') || [];

  const [userIdError, setUserIdError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) {
      setUserIdError(null);
      setIsUsernameAvailable(null);
      return;
    }
    const timer = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const res = await authApi.checkUsername(userId);
        if (res.data.data) {
          setUserIdError(null);
          setIsUsernameAvailable(true);
        } else {
          setUserIdError('User ID is already taken');
          setIsUsernameAvailable(false);
        }
      } catch (_err) {
        // ignore network error for live validation
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [userId]);

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.register({
        email,
        password,
        name,
        user_id: userId,
        course_id: courseId,
        department_id: departmentId,
        year: parseInt(year),
      }),
    onSuccess: async (response) => {
      const tokenData = response.data.data;
      if (tokenData) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokenData.access_token);
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokenData.refresh_token);
        await refreshUser();
        navigate('/onboarding', { replace: true });
      }
    },
    onError: (err: Error | unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.';
      setError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (userIdError) {
      setError('Please choose an available User ID.');
      return;
    }
    registerMutation.mutate();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-soft px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Synergy CMS</h1>
          <p className="text-sm text-muted-foreground">Student Registration</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-xl">Create Account</CardTitle>
            <CardDescription>
              Register as a student. Your account will be reviewed by an administrator.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your full name"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="userId">Registration No.</Label>
                  {isCheckingUsername && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  {!isCheckingUsername && isUsernameAvailable && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                </div>
                <Input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  placeholder="e.g. 2301230114"
                  className={userIdError ? "border-destructive focus-visible:ring-destructive" : ""}
                />
                {userIdError && (
                  <p className="text-xs text-destructive">{userIdError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@synergyinstitute.net"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Choose a password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showPassword ? 'Hide password' : 'Show password'}
                    </span>
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courseId">Course</Label>
                  <Select value={courseId} onValueChange={setCourseId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Course" />
                    </SelectTrigger>
                    <SelectContent>
                      {coursesData?.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department</Label>
                  <Select value={departmentId} onValueChange={setDepartmentId} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {academicDepts.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Admission Year</Label>
                <Select value={year} onValueChange={setYear} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 7 }).map((_, i) => {
                      const y = new Date().getFullYear() - i + 4;
                      return (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending || !email || !userId || !password || !name || !courseId || !departmentId || !year}
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register'
                )}
              </Button>
            </form>

            <div className="mt-4 border-t pt-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => navigate('/login')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
