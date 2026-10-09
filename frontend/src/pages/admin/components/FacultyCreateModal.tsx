import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { authApi } from '@/api/authApi';
import type { FacultyCreateRequest, Department } from '@/types/api';

interface FacultyCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: FacultyCreateRequest) => void;
  isPending: boolean;
  departments: Department[];
}

export function FacultyCreateModal({ isOpen, onClose, onSubmit, isPending, departments }: FacultyCreateModalProps) {
  const [form, setForm] = useState<FacultyCreateRequest>({
    email: '',
    password: '',
    name: '',
    department_id: '',
    designation: '',
  });
  const [formErrors, setFormErrors] = useState<{ dept?: boolean }>({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setForm({ email: '', password: '', name: '', department_id: '', designation: '' });
      setFormErrors({});
      setEmailError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!form.email) {
      setEmailError(null);
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setEmailError("Invalid email format");
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingEmail(true);
      try {
        const response = await authApi.checkEmail(form.email);
        if (!response.data.data) {
          setEmailError("Email is already registered");
        } else {
          setEmailError(null);
        }
      } catch {
        setEmailError("Failed to verify email");
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [form.email]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let hasError = false;
    const newErrors: { dept?: boolean } = {};
    
    if (!form.department_id) {
      newErrors.dept = true;
      hasError = true;
    }
    
    setFormErrors(newErrors);
    if (emailError) {
      toast.error("Please fix email errors before submitting");
      return;
    }
    
    if (hasError) {
      toast.error("Please fill in all mandatory fields");
      return;
    }
    
    onSubmit(form);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Faculty Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="f-name">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="f-name"
              placeholder="e.g. Dr. Ananya Sharma"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-email" className={emailError ? "text-destructive" : ""}>Email <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                id="f-email"
                type="email"
                placeholder="e.g. ananya.sharma@campusone.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={emailError ? "border-destructive pr-10" : "pr-10"}
                required
              />
              {isCheckingEmail && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            {emailError && (
              <p className="text-sm font-medium text-destructive">{emailError}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-password">Password <span className="text-destructive">*</span></Label>
            <Input
              id="f-password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-dept">Department <span className="text-destructive">*</span></Label>
            <Select
              value={form.department_id}
              onValueChange={(val) => setForm({ ...form, department_id: val })}
              required
            >
              <SelectTrigger id="f-dept" className={formErrors.dept ? "border-destructive" : ""}>
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.code} - {d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="f-desig">Designation <span className="text-destructive">*</span></Label>
            <Input
              id="f-desig"
              placeholder="e.g. Associate Professor"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              required
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Faculty'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
