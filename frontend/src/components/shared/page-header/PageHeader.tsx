import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getPageMetadata } from '@/config/pages';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { getBreadcrumbLabel } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface BreadcrumbSegment {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: BreadcrumbSegment[];
  showBreadcrumbs?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  breadcrumbs,
  showBreadcrumbs = true,
  className,
}: PageHeaderProps) {
  const location = useLocation();
  const pageMeta = getPageMetadata(location.pathname);

  const resolvedTitle = title ?? pageMeta?.title ?? 'Dashboard';
  const resolvedDescription = description ?? pageMeta?.description;
  const ResolvedIcon = Icon ?? pageMeta?.icon;

  // Auto-generate breadcrumbs if not explicitly provided
  const resolvedBreadcrumbs: BreadcrumbSegment[] = React.useMemo(() => {
    if (breadcrumbs) return breadcrumbs;

    const segments = location.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return [];

    const crumbs: BreadcrumbSegment[] = [];
    let currentPath = '';

    segments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === segments.length - 1;
      crumbs.push({
        label: getBreadcrumbLabel(segment),
        to: isLast ? undefined : currentPath,
      });
    });

    return crumbs;
  }, [breadcrumbs, location.pathname]);

  return (
    <div className={cn('space-y-3 pb-2', className)}>
      {showBreadcrumbs && resolvedBreadcrumbs.length > 1 && (
        <Breadcrumb className="mb-1">
          <BreadcrumbList>
            {resolvedBreadcrumbs.map((crumb, idx) => {
              const isLast = idx === resolvedBreadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  <BreadcrumbItem>
                    {isLast || !crumb.to ? (
                      <BreadcrumbPage className="font-medium text-foreground">
                        {crumb.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink asChild>
                        <Link to={crumb.to} className="transition-colors hover:text-foreground">
                          {crumb.label}
                        </Link>
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast && <BreadcrumbSeparator />}
                </React.Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            {ResolvedIcon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ResolvedIcon className="h-5 w-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                  {resolvedTitle}
                </h1>
                {badge}
              </div>
              {resolvedDescription && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {resolvedDescription}
                </p>
              )}
            </div>
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
