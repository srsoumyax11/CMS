import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { NAV_ITEMS, ROLE_LABELS } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { GraduationCap, LogOut, Menu, User as UserIcon, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardLayout() {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!user || !role) return null;

  const navItems = NAV_ITEMS[role];
  const roleLabel = ROLE_LABELS[role];

  const currentNav = navItems.find(
    (item) => location.pathname === item.to || location.pathname.startsWith(item.to + '/')
  );
  const pageTitle = currentNav?.label ?? 'Dashboard';

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
            Synergy CMS
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

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <TooltipProvider delayDuration={0}>
          {navItems.map((item) => {
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
                        ? 'bg-primary text-primary-foreground'
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
        </TooltipProvider>
      </nav>

      <div className="border-t px-3 py-4">
        <div className={cn(
          "flex items-center rounded-lg bg-muted transition-all duration-300 ease-in-out",
          collapsed ? "justify-center w-10 h-10 mx-auto p-0" : "px-3 py-2.5 gap-3 w-full"
        )}>
          {collapsed ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background border shadow-sm">
              <UserIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className={cn(
            "flex flex-col overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out",
            collapsed ? "w-0 opacity-0" : "w-full opacity-100"
          )}>
            <p className="truncate text-xs font-medium text-foreground">{user.name || user.email}</p>
            <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>
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

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SidebarContent collapsed={false} isMobile={true} />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold text-foreground">{pageTitle}</h1>
          </div>

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
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {user.account_status === 'pending' && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <h4 className="font-semibold">Account Pending Approval</h4>
                <p className="text-sm">
                  Your account is currently pending administrator approval. You can explore the dashboard, but you won't be able to view or perform actions until approved.
                </p>
              </div>
            </div>
          )}

          {user.account_status === 'revision' && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <h4 className="font-semibold">Revision Required</h4>
                <p className="text-sm mb-2">
                  Your application requires updates before it can be approved. 
                  {user.status_note && <span className="block mt-1 italic">Note: {user.status_note}</span>}
                </p>
                <Button size="sm" variant="secondary" onClick={() => navigate('/onboarding')}>
                  Update Application Details
                </Button>
              </div>
            </div>
          )}

          {user.account_status === 'suspended' && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <h4 className="font-semibold">Account Suspended</h4>
                <p className="text-sm">
                  Your account has been suspended. You cannot access most features.
                  {user.status_note && <span className="block mt-1 italic">Reason: {user.status_note}</span>}
                </p>
              </div>
            </div>
          )}

          {user.account_status === 'rejected' && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-900 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
              <div>
                <h4 className="font-semibold">Application Rejected</h4>
                <p className="text-sm">
                  Your application has been rejected. 
                  {user.status_note && <span className="block mt-1 italic">Reason: {user.status_note}</span>}
                </p>
              </div>
            </div>
          )}
          
          <Outlet />
        </main>
      </div>
    </div>
  );
}
