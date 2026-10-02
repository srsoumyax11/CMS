import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface SwitchFieldProps {
  id?: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function SwitchField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled = false,
  className,
}: SwitchFieldProps) {
  const switchId = id || `switch-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-lg border p-3 shadow-xs transition-colors',
        disabled ? 'opacity-60 bg-muted/30 cursor-not-allowed' : 'hover:bg-accent/40 bg-card',
        className
      )}
    >
      <div className="space-y-0.5 pr-4">
        <Label
          htmlFor={switchId}
          className={cn(
            'text-sm font-medium leading-none cursor-pointer',
            disabled && 'cursor-not-allowed'
          )}
        >
          {label}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {description}
          </p>
        )}
      </div>
      <Switch
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
