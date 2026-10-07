import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { NAV_GROUPS, ROLE_LABELS, getBreadcrumbLabel } from '@/lib/navigation';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/layout/NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GraduationCap, LogOut, Menu, User as UserIcon, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';

export function DashboardLayout() {
  const { user, role, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user || !role) return null;

  const navGroups = (NAV_GROUPS[role] || [])
    .map(group => ({
      ...group,
      items: group.items.filter(item => {
        if (!item.requiredPermissions || item.requiredPermissions.length === 0) return true;
        return item.requiredPermissions.every(perm => hasPermission(perm));
      })
    }))
    .filter(group => group.items.length > 0);

  const roleLabel = ROLE_LABELS[role] || role;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const SidebarContent = ({ 
    collapsed, 
    onToggle, 
    isMobile 
  }: { 
    collapsed: boolean; 
    onToggle?: () => void;
    isMobile?: boolean;
  }) => (
    <div className="flex h-full flex-col">
      <div 
        className={cn(
          "group relative flex h-16 cursor-pointer items-center border-b transition-colors hover:bg-accent/50", 
          collapsed ? "justify-center" : "px-6"
        )}
        onClick={onToggle}
      >
        <div className={cn("flex items-center gap-3", collapsed && !isMobile && "transition-opacity group-hover:opacity-0")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className={cn(
            "text-lg font-bold text-foreground whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out",
            collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
          )}>
            BPUT CMS
          </span>
        </div>
        
        {onToggle && !isMobile && (
          <div className={cn(
            "absolute opacity-0 transition-opacity group-hover:opacity-100",
            collapsed ? "inset-0 flex items-center justify-center" : "right-4 top-1/2 -translate-y-1/2"
          )}>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background border shadow-sm text-foreground">
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        <TooltipProvider delayDuration={0}>
          {navGroups.map((group, groupIdx) => (
            <div key={group.name} className="flex flex-col gap-1">
              {!collapsed && (
                <span className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 mt-2">
                  {group.name}
                </span>
              )}
              {collapsed && groupIdx > 0 && <div className="h-px bg-border mx-2 my-2" />}
              {group.items.map((item) => {
                const isExact = item.to === `/${role}`;
                const isActive = isExact 
                  ? location.pathname === item.to 
                  : location.pathname.startsWith(item.to);

                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.to}
                        end={isExact}
                        onClick={() => isMobile && setMobileOpen(false)}
                        className={cn(
                          'flex items-center rounded-lg text-sm font-medium transition-all duration-300 ease-in-out',
                          collapsed ? 'justify-center w-10 h-10 mx-auto p-0' : 'px-3 py-2.5 gap-3 w-full',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        )}
                      >
                        <item.icon className={cn("shrink-0", collapsed ? "h-5 w-5" : "h-4 w-4")} />
                        <span className={cn(
                          "whitespace-nowrap overflow-hidden transition-all duration-300 ease-in-out",
                          collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                        )}>
                          {item.label}
                        </span>
                      </NavLink>
                    </TooltipTrigger>
                    {collapsed && !isMobile && (
                      <TooltipContent side="right" className="font-medium">
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </TooltipProvider>
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside 
        className={cn(
          "hidden shrink-0 border-r bg-card transition-all duration-300 ease-in-out md:block",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <SidebarContent collapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden bg-muted/30">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Toggle mobile menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Navigation Menu</SheetTitle>
                  <SheetDescription>Dashboard sidebar navigation</SheetDescription>
                </SheetHeader>
                <SidebarContent collapsed={false} isMobile={true} />
              </SheetContent>
            </Sheet>
            
            <div className="flex items-center text-sm">
              {location.pathname.split('/').filter(Boolean).map((segment, index, arr) => {
                const isLast = index === arr.length - 1;
                const title = getBreadcrumbLabel(segment);
                const to = `/${arr.slice(0, index + 1).join('/')}`;
                
                return (
                  <div key={to} className="flex items-center">
                    {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground" />}
                    {isLast ? (
                      <span className="font-semibold text-foreground">{title}</span>
                    ) : (
                      <Link to={to} className="text-muted-foreground hover:text-foreground transition-colors">
                        {title}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.photo_url ?? undefined} alt={user.name ?? ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {(user.name || user.email).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium leading-tight text-foreground">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs leading-tight text-muted-foreground">
                    {roleLabel}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{user.name || user.email}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
                Role: {roleLabel}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {user.account_status === 'pending' && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Account Pending Approval</AlertTitle>
              <AlertDescription>
                Your account is currently pending administrator approval. You can explore the dashboard, but you won't be able to view or perform actions until approved.
              </AlertDescription>
            </Alert>
          )}

          {user.account_status === 'revision' && (
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Revision Required</AlertTitle>
              <AlertDescription>
                Your application requires updates before it can be approved. 
                {user.status_note && <span className="block mt-1 italic">Note: {user.status_note}</span>}
                <Button size="sm" variant="secondary" onClick={() => navigate('/onboarding')} className="mt-3">
                  Update Application Details
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {user.account_status === 'suspended' && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Account Suspended</AlertTitle>
              <AlertDescription>
                Your account has been suspended. You cannot access most features.
                {user.status_note && <span className="block mt-1 italic">Reason: {user.status_note}</span>}
              </AlertDescription>
            </Alert>
          )}

          {user.account_status === 'rejected' && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Application Rejected</AlertTitle>
              <AlertDescription>
                Your application has been rejected. 
                {user.status_note && <span className="block mt-1 italic">Reason: {user.status_note}</span>}
              </AlertDescription>
            </Alert>
          )}
          
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
