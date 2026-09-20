import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, ShieldCheck, MessageSquare, Calendar, ArrowRight, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROLE_LABELS } from '@/lib/navigation';

export function Landing() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const isAuthenticated = !!user;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-soft">
      {/* Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold text-foreground">Synergy CMS</span>
          </div>
          <nav className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" className="hidden sm:inline-flex">Dashboard</Button>
                </Link>
                {user && role && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="flex items-center gap-2 px-2">
                        <Avatar className="h-8 w-8 border">
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
                            {ROLE_LABELS[role]}
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
                        Role: {ROLE_LABELS[role]}
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
                )}
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center w-full">
        {/* Hero Section */}
        <section className="w-full relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background pt-24 md:pt-32 lg:pt-40 pb-16 md:pb-24">
          <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
          <div className="container max-w-screen-xl px-4 relative z-10 flex flex-col items-center text-center space-y-8">
            <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
              Welcome to the future of campus management
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground max-w-4xl">
              Campus Management <br className="hidden sm:block" />
              <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">Simplified.</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-lg text-muted-foreground sm:text-xl">
              Synergy CMS brings role-based access, automated workflows, and seamless communication to your entire institution in one unified platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-8">
              {isAuthenticated ? (
                <Link to="/dashboard" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full gap-2 shadow-lg hover:shadow-primary/25 transition-all">
                    Go to Dashboard <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/login" className="w-full sm:w-auto">
                    <Button size="lg" className="w-full gap-2 shadow-lg hover:shadow-primary/25 transition-all">
                      Access Dashboard <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/register" className="w-full sm:w-auto">
                    <Button size="lg" variant="outline" className="w-full bg-background/50 backdrop-blur-sm hover:bg-accent/10">
                      Create Account
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container max-w-screen-xl px-4 py-24 mb-24 relative z-10">
          <div className="bg-card rounded-3xl shadow-card border border-border/50 p-8 md:p-12 lg:p-16 overflow-hidden relative">
            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-accent/5 blur-3xl"></div>
            
            <div className="text-center mb-16 relative z-10">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Everything you need</h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">Purpose-built modules to run your campus efficiently, securely, and transparently.</p>
            </div>
            
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
              <div className="flex flex-col items-center text-center p-6 space-y-4 rounded-2xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary shadow-sm">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Granular RBAC</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Strict, dynamic role-based access control ensuring users only see what they are supposed to see.</p>
              </div>

              <div className="flex flex-col items-center text-center p-6 space-y-4 rounded-2xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary shadow-sm">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Complaints & Notices</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Centralized communication hub for broadcasting notices and resolving student grievances.</p>
              </div>

              <div className="flex flex-col items-center text-center p-6 space-y-4 rounded-2xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50">
                <div className="p-4 bg-primary/10 rounded-2xl text-primary shadow-sm">
                  <Calendar className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold">Outpasses & Timetables</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Fully automated digital outpass approval workflows and live class schedules.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 bg-card">
        <div className="container max-w-screen-xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <GraduationCap className="h-5 w-5" />
            <span className="font-semibold text-sm">Synergy CMS</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Synergy CMS. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
