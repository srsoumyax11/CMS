import { Check, X } from 'lucide-react';
import { usePasswordRules } from '@/hooks/usePasswordRules';
import { cn } from '@/lib/utils';

interface PasswordRequirementsProps {
  password?: string;
  className?: string;
}

export function PasswordRequirements({ password = '', className }: PasswordRequirementsProps) {
  const { data: rules, isLoading } = usePasswordRules();

  if (isLoading || !rules) {
    return <div className="text-xs text-muted-foreground animate-pulse">Loading requirements...</div>;
  }

  const checks = [
    {
      id: 'length',
      label: `At least ${rules.minLength} characters`,
      met: password.length >= rules.minLength,
      active: true,
    },
    {
      id: 'uppercase',
      label: 'One uppercase letter',
      met: /[A-Z]/.test(password),
      active: rules.requireUppercase,
    },
    {
      id: 'lowercase',
      label: 'One lowercase letter',
      met: /[a-z]/.test(password),
      active: rules.requireLowercase,
    },
    {
      id: 'number',
      label: 'One number',
      met: /[0-9]/.test(password),
      active: rules.requireNumber,
    },
    {
      id: 'special',
      label: 'One special character',
      met: /[^A-Za-z0-9]/.test(password),
      active: rules.requireSpecial,
    },
  ].filter(check => check.active);

  return (
    <div className={cn("grid gap-2 text-sm", className)}>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {checks.map((check) => (
          <li
            key={check.id}
            className={cn(
              "flex items-center gap-2 text-xs transition-colors",
              check.met ? "text-emerald-500" : "text-muted-foreground"
            )}
          >
            {check.met ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <div className="h-3.5 w-3.5 rounded-full border border-current opacity-50" />
            )}
            {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
