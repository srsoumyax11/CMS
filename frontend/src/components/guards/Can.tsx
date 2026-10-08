import React, { type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

interface CanProps {
  perform: string | string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Declarative Capability Guard Component.
 * Usage:
 *   <Can perform="notice:create">
 *     <CreateNoticeButton />
 *   </Can>
 */
export const Can: React.FC<CanProps> = ({
  perform,
  requireAll = false,
  fallback = null,
  children,
}) => {
  const { hasPermission } = useAuth();

  const permissions = Array.isArray(perform) ? perform : [perform];
  
  const isAllowed = requireAll
    ? permissions.every((p) => hasPermission(p))
    : permissions.some((p) => hasPermission(p));

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default Can;
