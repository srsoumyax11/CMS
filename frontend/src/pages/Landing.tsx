import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Sun, 
  Moon, 
  ArrowUpRight, 
  BookOpen, 
  Compass, 
  Award, 
  CheckCircle2, 
  Calendar, 
  Globe, 
  Sparkles, 
  ChevronRight,
  Landmark,
  Shield,
  GraduationCap,
  Users,
  Search
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/components/theme-provider';
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
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const isAuthenticated = !!user;

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // Smooth scroll handler for anchor links
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Active program tab filter in Academic Programs section
  const [activeTab, setActiveTab] = useState<'undergraduate' | 'graduate' | 'research'>('undergraduate');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-foreground selection:text-background font-sans antialiased transition-colors duration-300">
      
      {/* 1. Header: Sticky Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/90 backdrop-blur-md transition-colors duration-300">
        <div className="container max-w-screen-xl mx-auto flex h-20 items-center justify-between px-6 lg:px-12">
          
          {/* Institution Logo / Crest */}
          <Link to="/" className="flex items-center gap-3 group">
            <img src="/apple-touch-icon.png" alt="CampusOne Logo" className="h-10 w-10 object-contain rounded-lg transition-transform group-hover:scale-105 shadow-2xs" />
            <div className="flex flex-col">
              <span className="font-serif text-lg tracking-wider font-semibold text-foreground leading-none">
                CampusOne
              </span>
              <span className="text-[10px] tracking-[0.15em] font-medium text-muted-foreground uppercase mt-1">
                CampusOne • Odisha
              </span>
            </div>
          </Link>

          {/* Center Navigation Links (With Smooth Scroll) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium tracking-wide">
            <a 
              href="#academic-programs" 
              onClick={(e) => handleScrollTo(e, 'academic-programs')}
              className="text-foreground/75 hover:text-foreground transition-colors duration-200"
            >
              Academic Programs
            </a>
            <a 
              href="#campus-life" 
              onClick={(e) => handleScrollTo(e, 'campus-life')}
              className="text-foreground/75 hover:text-foreground transition-colors duration-200"
            >
              Campus Life
            </a>
            <a 
              href="#admissions" 
              onClick={(e) => handleScrollTo(e, 'admissions')}
              className="text-foreground/75 hover:text-foreground transition-colors duration-200"
            >
              Admissions
            </a>
            <a 
              href="#research" 
              onClick={(e) => handleScrollTo(e, 'research')}
              className="text-foreground/75 hover:text-foreground transition-colors duration-200"
            >
              Research & Impact
            </a>
          </nav>

          {/* Right Header Controls: Dark Toggle, Plain Log In, Solid Create Account */}
          <div className="flex items-center gap-4">
            
            {/* Theme Toggle Icon Button */}
            <button
              onClick={toggleTheme}
              type="button"
              className="p-2 rounded-full text-foreground/70 hover:text-foreground hover:bg-muted/60 transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-border"
              aria-label="Toggle Dark/Light Mode"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-300" />
              ) : (
                <Moon className="h-4 w-4 text-slate-700" />
              )}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link to="/dashboard">
                  <Button variant="ghost" className="text-sm font-medium">
                    Portal Dashboard
                  </Button>
                </Link>
                {user && role && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors focus:outline-none">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarImage src={user.photo_url ?? undefined} alt={user.name ?? ''} />
                          <AvatarFallback className="bg-foreground text-background text-xs font-bold font-serif">
                            {(user.name || user.email).split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 mt-2">
                      <DropdownMenuLabel>
                        <div className="flex flex-col space-y-0.5">
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
                        className="cursor-pointer text-destructive focus:text-destructive text-xs font-medium"
                      >
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-4">
                {/* Plain text "Log In" button */}
                <Link 
                  to="/login"
                  className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors px-2 py-1.5"
                >
                  Log In
                </Link>

                {/* Solid "Create Account" button */}
                <Link to="/register">
                  <Button 
                    className="bg-foreground text-background hover:bg-foreground/90 font-medium text-xs md:text-sm tracking-wide rounded-none px-5 py-2.5 shadow-sm transition-all duration-200"
                  >
                    Create Account
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">

        {/* 2. Hero Section */}
        <section className="relative w-full pt-16 md:pt-24 pb-20 md:pb-32 px-6 lg:px-12 border-b border-border/40">
          <div className="container max-w-screen-xl mx-auto">
            
            {/* Tagline Badge */}
            <div className="mb-6 inline-flex items-center gap-2 border border-border/80 bg-muted/40 px-3.5 py-1.5 text-xs font-medium tracking-wider text-foreground/80 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
              Fall 2026 Admissions Open
            </div>

            {/* Editorial Typographic Headline */}
            <div className="max-w-5xl">
              <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal tracking-tight text-foreground leading-[1.06] mb-8">
                Cultivating Minds, <br className="hidden sm:inline" />
                Inspiring Inquiry, & <br className="hidden sm:inline" />
                Shaping Global Leaders.
              </h1>
              
              {/* Subheadline */}
              <p className="text-lg md:text-xl text-muted-foreground font-light max-w-3xl leading-relaxed mb-10">
                Founded in 1884, Valdora College is an independent liberal arts and sciences university dedicated to academic rigor, original undergraduate research, and ethical leadership in a changing world.
              </p>

              {/* Primary Calls to Action */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-16">
                <a 
                  href="#admissions" 
                  onClick={(e) => handleScrollTo(e, 'admissions')}
                >
                  <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 font-medium rounded-none px-8 py-6 text-sm tracking-wide w-full sm:w-auto">
                    Apply for Admission <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Button>
                </a>
                
                <a 
                  href="#academic-programs" 
                  onClick={(e) => handleScrollTo(e, 'academic-programs')}
                >
                  <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted/50 font-medium rounded-none px-8 py-6 text-sm tracking-wide w-full sm:w-auto">
                    Explore Programs
                  </Button>
                </a>
              </div>
            </div>

            {/* Hero Image Showcase */}
            <div className="relative w-full mt-4 overflow-hidden border border-border/60 group">
              <img 
                src="/images/hero.jpg" 
                alt="Valdora College Historic Quadrangle"
                className="w-full h-[380px] md:h-[540px] lg:h-[620px] object-cover filter contrast-[1.02] transition-transform duration-700 group-hover:scale-[1.01]"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 md:p-8 text-white flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] font-medium text-white/70 mb-1">
                    Central Campus Architecture
                  </p>
                  <h2 className="font-serif text-xl md:text-2xl font-normal text-white">
                    The Historic Memorial Quadrangle & Founders Tower
                  </h2>
                </div>
                <div className="text-xs text-white/80 font-mono tracking-wide">
                  42° 21' N, 71° 03' W • Cambridge Precinct
                </div>
              </div>
            </div>

            {/* Institutional At-a-Glance Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-16 mt-8 border-t border-border/40">
              <div className="space-y-1">
                <p className="font-serif text-3xl md:text-4xl text-foreground font-normal">1884</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Year Established</p>
              </div>
              <div className="space-y-1">
                <p className="font-serif text-3xl md:text-4xl text-foreground font-normal">9 : 1</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Student-Faculty Ratio</p>
              </div>
              <div className="space-y-1">
                <p className="font-serif text-3xl md:text-4xl text-foreground font-normal">98%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Demonstrated Financial Aid Met</p>
              </div>
              <div className="space-y-1">
                <p className="font-serif text-3xl md:text-4xl text-foreground font-normal">#4</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">National Liberal Arts Rank</p>
              </div>
            </div>

          </div>
        </section>

        {/* 3. Section: Academic Programs */}
        <section id="academic-programs" className="w-full py-28 md:py-36 px-6 lg:px-12 border-b border-border/40">
          <div className="container max-w-screen-xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div className="max-w-2xl">
                <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground block mb-3">
                  01. Intellectual Foundations
                </span>
                <h2 className="font-serif text-3xl md:text-5xl font-normal text-foreground tracking-tight leading-tight">
                  Academic Programs & Schools
                </h2>
              </div>
              <p className="text-muted-foreground text-sm md:text-base max-w-md font-light leading-relaxed">
                Discover over 45 major degree concentrations designed to foster critical reasoning, quantitative mastery, and imaginative scholarship.
              </p>
            </div>

            {/* Academic Filter Tabs */}
            <div className="flex items-center gap-6 border-b border-border mb-12 text-sm font-medium overflow-x-auto pb-3">
              <button
                onClick={() => setActiveTab('undergraduate')}
                className={`pb-3 transition-colors uppercase tracking-wider text-xs font-semibold whitespace-nowrap border-b-2 -mb-[14px] ${
                  activeTab === 'undergraduate' 
                    ? 'border-foreground text-foreground' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Undergraduate Majors (B.A. / B.S.)
              </button>
              <button
                onClick={() => setActiveTab('graduate')}
                className={`pb-3 transition-colors uppercase tracking-wider text-xs font-semibold whitespace-nowrap border-b-2 -mb-[14px] ${
                  activeTab === 'graduate' 
                    ? 'border-foreground text-foreground' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Graduate & Doctoral Fellowships
              </button>
              <button
                onClick={() => setActiveTab('research')}
                className={`pb-3 transition-colors uppercase tracking-wider text-xs font-semibold whitespace-nowrap border-b-2 -mb-[14px] ${
                  activeTab === 'research' 
                    ? 'border-foreground text-foreground' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Interdisciplinary Research Institutes
              </button>
            </div>

            {/* Clean Grid Layout with High Contrast */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              
              {/* School 1 */}
              <div className="border border-border/80 bg-card p-8 flex flex-col justify-between hover:border-foreground/40 transition-colors duration-300">
                <div>
                  <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase block mb-4">
                    School of Humanities
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-foreground mb-3">
                    Philosophy, Politics & Economics
                  </h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6">
                    An integrated inquiry into classical political theory, moral philosophy, and international macroeconomic policy.
                  </p>
                </div>
                <div className="pt-6 border-t border-border/50 flex items-center justify-between text-xs text-foreground/80 font-medium">
                  <span>B.A., Honors Thesis Track</span>
                  <span className="font-serif italic">12 Students / Class</span>
                </div>
              </div>

              {/* School 2 */}
              <div className="border border-border/80 bg-card p-8 flex flex-col justify-between hover:border-foreground/40 transition-colors duration-300">
                <div>
                  <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase block mb-4">
                    School of Natural Sciences
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-foreground mb-3">
                    Biophysics & Molecular Genome
                  </h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6">
                    Hands-on laboratory research exploring macromolecular dynamics, gene editing ethics, and structural cellular biophysics.
                  </p>
                </div>
                <div className="pt-6 border-t border-border/50 flex items-center justify-between text-xs text-foreground/80 font-medium">
                  <span>B.S., M.S. Integrated</span>
                  <span className="font-serif italic">Direct Lab Placement</span>
                </div>
              </div>

              {/* School 3 */}
              <div className="border border-border/80 bg-card p-8 flex flex-col justify-between hover:border-foreground/40 transition-colors duration-300">
                <div>
                  <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase block mb-4">
                    Mathematical & Computational Sciences
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-foreground mb-3">
                    Computer Science & Artificial Logic
                  </h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6">
                    Rigorous theoretical computer science, algorithmic complexity, cryptography, and foundational machine learning principles.
                  </p>
                </div>
                <div className="pt-6 border-t border-border/50 flex items-center justify-between text-xs text-foreground/80 font-medium">
                  <span>B.S., Ph.D. Pathway</span>
                  <span className="font-serif italic">AI Ethics Center</span>
                </div>
              </div>

              {/* School 4 */}
              <div className="border border-border/80 bg-card p-8 flex flex-col justify-between hover:border-foreground/40 transition-colors duration-300">
                <div>
                  <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase block mb-4">
                    Global Affairs & Policy
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-foreground mb-3">
                    International Relations & Security
                  </h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6">
                    Analyzing global governance, diplomatic history, international law, and conflict resolution in Geneva and Washington.
                  </p>
                </div>
                <div className="pt-6 border-t border-border/50 flex items-center justify-between text-xs text-foreground/80 font-medium">
                  <span>B.A., Study Abroad Required</span>
                  <span className="font-serif italic">United Nations Practicum</span>
                </div>
              </div>

              {/* School 5 */}
              <div className="border border-border/80 bg-card p-8 flex flex-col justify-between hover:border-foreground/40 transition-colors duration-300">
                <div>
                  <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase block mb-4">
                    School of Fine Arts
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-foreground mb-3">
                    Architectural Theory & Urban Design
                  </h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6">
                    Studying historical preservation, sustainable structural design, and civic space planning in dedicated design studios.
                  </p>
                </div>
                <div className="pt-6 border-t border-border/50 flex items-center justify-between text-xs text-foreground/80 font-medium">
                  <span>B.Arch, B.A. Art History</span>
                  <span className="font-serif italic">Private Studio Access</span>
                </div>
              </div>

              {/* School 6 */}
              <div className="border border-border/80 bg-card p-8 flex flex-col justify-between hover:border-foreground/40 transition-colors duration-300">
                <div>
                  <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase block mb-4">
                    Environmental Studies
                  </span>
                  <h3 className="font-serif text-2xl font-normal text-foreground mb-3">
                    Climate Policy & Ecosystem Science
                  </h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed mb-6">
                    Field-based research combining ecological conservation, environmental economics, and public climate advocacy.
                  </p>
                </div>
                <div className="pt-6 border-t border-border/50 flex items-center justify-between text-xs text-foreground/80 font-medium">
                  <span>B.S., Field Research Station</span>
                  <span className="font-serif italic">100% Funded Fieldwork</span>
                </div>
              </div>

            </div>

          </div>
        </section>

        {/* 4. Section: Campus Life */}
        <section id="campus-life" className="w-full py-28 md:py-36 px-6 lg:px-12 border-b border-border/40 bg-muted/20">
          <div className="container max-w-screen-xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div className="max-w-2xl">
                <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground block mb-3">
                  02. Residential Tradition & Community
                </span>
                <h2 className="font-serif text-3xl md:text-5xl font-normal text-foreground tracking-tight leading-tight">
                  Life at Valdora
                </h2>
              </div>
              <p className="text-muted-foreground text-sm md:text-base max-w-md font-light leading-relaxed">
                A close-knit residential campus community where intellectual debate extends seamlessly from seminar rooms to dining halls.
              </p>
            </div>

            {/* Split Editorial Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
              
              <div className="lg:col-span-7 space-y-8">
                <div className="relative border border-border/60 overflow-hidden group">
                  <img 
                    src="/images/campus-life.jpg" 
                    alt="Valdora Campus Student Discussion"
                    className="w-full h-[400px] md:h-[480px] object-cover transition-transform duration-700 group-hover:scale-[1.01]"
                  />
                  <div className="p-6 bg-card border-t border-border">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">
                      Courtyard Discussions • West Quad
                    </p>
                    <p className="font-serif text-lg text-foreground font-normal">
                      Students gathering for informal weekly tutorial debates under the historic campus archways.
                    </p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-10">
                <div className="space-y-3 pb-8 border-b border-border/60">
                  <h3 className="font-serif text-2xl font-normal text-foreground">
                    Residential Houses & Commons
                  </h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed">
                    All undergraduate students reside in one of 12 historic residential houses, each staffed by a senior faculty master, resident tutors, and dedicated library study spaces.
                  </p>
                </div>

                <div className="space-y-3 pb-8 border-b border-border/60">
                  <h3 className="font-serif text-2xl font-normal text-foreground">
                    Sterling Memorial Library & Archives
                  </h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed">
                    Housing 2.8 million volumes, rare medieval manuscripts, and 24-hour quiet study halls under vaulted gothic masonry arches.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="font-serif text-2xl font-normal text-foreground">
                    Athletics & Intellectual Societies
                  </h3>
                  <p className="text-muted-foreground text-sm font-light leading-relaxed">
                    Over 140 student publications, debate unions, varsity crew teams, chamber orchestras, and outdoor expedition clubs.
                  </p>
                </div>
              </div>

            </div>

            {/* Second Image Feature Card */}
            <div className="border border-border/80 bg-card p-8 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-5 space-y-4">
                <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase block">
                  Scholarship & Research Space
                </span>
                <h3 className="font-serif text-3xl font-normal text-foreground leading-tight">
                  The Sanctuary of Quiet Discovery
                </h3>
                <p className="text-muted-foreground text-sm font-light leading-relaxed">
                  Our libraries offer individual private research carrels for senior thesis writers, high-speed digital research archives, and specialist subject bibliographers available around the clock.
                </p>
                <div className="pt-2">
                  <a 
                    href="#admissions" 
                    onClick={(e) => handleScrollTo(e, 'admissions')}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground hover:underline"
                  >
                    Schedule a Guided Library Tour <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>

              <div className="lg:col-span-7">
                <img 
                  src="/images/library.jpg" 
                  alt="Sterling Memorial Library Reading Room"
                  className="w-full h-[320px] md:h-[400px] object-cover border border-border"
                />
              </div>
            </div>

          </div>
        </section>

        {/* 5. Section: Admissions & Financial Aid */}
        <section id="admissions" className="w-full py-28 md:py-36 px-6 lg:px-12 border-b border-border/40">
          <div className="container max-w-screen-xl mx-auto">
            
            <div className="max-w-3xl mb-16">
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground block mb-3">
                03. Entry & Opportunity
              </span>
              <h2 className="font-serif text-3xl md:text-5xl font-normal text-foreground tracking-tight leading-tight mb-6">
                Admissions & Financial Commitment
              </h2>
              <p className="text-muted-foreground text-base font-light leading-relaxed">
                Valdora College practices need-blind admissions for all domestic and international candidates. We evaluate candidates holistically based on academic curiosity, character, and promise.
              </p>
            </div>

            {/* Application Process Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-16">
              
              <div className="border border-border p-6 bg-card space-y-4">
                <span className="font-serif text-3xl text-foreground font-normal block">01</span>
                <h4 className="font-serif text-lg font-normal text-foreground">Application Deadline</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Early Decision: Nov 1 <br />
                  Regular Decision: Jan 5 <br />
                  Submit via Common App or Coalition.
                </p>
              </div>

              <div className="border border-border p-6 bg-card space-y-4">
                <span className="font-serif text-3xl text-foreground font-normal block">02</span>
                <h4 className="font-serif text-lg font-normal text-foreground">Holistic Review</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Transcripts, secondary school reports, 2 teacher recommendations, and writing supplement.
                </p>
              </div>

              <div className="border border-border p-6 bg-card space-y-4">
                <span className="font-serif text-3xl text-foreground font-normal block">03</span>
                <h4 className="font-serif text-lg font-normal text-foreground">100% Need-Based Aid</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  100% of demonstrated financial need is met through grants—no loans required.
                </p>
              </div>

              <div className="border border-border p-6 bg-card space-y-4">
                <span className="font-serif text-3xl text-foreground font-normal block">04</span>
                <h4 className="font-serif text-lg font-normal text-foreground">Decision Release</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  ED Notifications: Mid-December <br />
                  RD Notifications: Late March <br />
                  National Candidate Reply: May 1
                </p>
              </div>

            </div>

            {/* Admissions Callout Banner */}
            <div className="bg-foreground text-background p-10 md:p-14 flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="max-w-2xl space-y-3">
                <h3 className="font-serif text-2xl md:text-3xl font-normal leading-tight">
                  Ready to begin your journey at Valdora College?
                </h3>
                <p className="text-background/80 text-sm font-light leading-relaxed">
                  Join our upcoming virtual information session or schedule an in-person campus walking tour led by current undergraduate fellows.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 shrink-0">
                <Link to="/register">
                  <Button size="lg" className="bg-background text-foreground hover:bg-background/90 font-medium text-xs tracking-wider uppercase rounded-none px-7 py-5">
                    Start Application
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="border-background/30 text-background hover:bg-background/10 font-medium text-xs tracking-wider uppercase rounded-none px-7 py-5">
                    Sign In to Portal
                  </Button>
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* 6. Section: Research & Impact */}
        <section id="research" className="w-full py-28 md:py-36 px-6 lg:px-12 border-b border-border/40">
          <div className="container max-w-screen-xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
              <div>
                <span className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground block mb-3">
                  04. Global Contributions
                </span>
                <h2 className="font-serif text-3xl md:text-5xl font-normal text-foreground tracking-tight leading-tight">
                  Research & Faculty News
                </h2>
              </div>
              <a 
                href="#admissions"
                onClick={(e) => handleScrollTo(e, 'admissions')}
                className="text-xs uppercase tracking-widest text-foreground font-semibold hover:underline"
              >
                View Academic Publications →
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              <article className="border border-border p-8 bg-card flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-muted-foreground">OCTOBER 2026 • PHYSICS & PHILOSOPHY</span>
                  <h3 className="font-serif text-xl font-normal text-foreground leading-snug">
                    Dr. Aris Thorne Awarded Crafoord Prize in Quantum Foundations
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed font-light">
                    Recognized for pioneering experimental work on decoherence boundaries in micro-mechanical quantum oscillators.
                  </p>
                </div>
                <span className="text-xs font-medium text-foreground underline cursor-pointer">Read Full Monograph</span>
              </article>

              <article className="border border-border p-8 bg-card flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-muted-foreground">SEPTEMBER 2026 • PUBLIC HEALTH</span>
                  <h3 className="font-serif text-xl font-normal text-foreground leading-snug">
                    Undergraduate Team Publishes Global Water Security Study in Science
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed font-light">
                    Senior thesis candidates detail low-cost solar-powered filtration models tested in rural East Africa.
                  </p>
                </div>
                <span className="text-xs font-medium text-foreground underline cursor-pointer">Read Full Monograph</span>
              </article>

              <article className="border border-border p-8 bg-card flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <span className="text-xs font-mono text-muted-foreground">AUGUST 2026 • CLASSICAL STUDIES</span>
                  <h3 className="font-serif text-xl font-normal text-foreground leading-snug">
                    CampusOne Archaeological & Historical Expedition Discovers Hellenistic Archive
                  </h3>
                  <p className="text-muted-foreground text-xs leading-relaxed font-light">
                    Excavations in Asia Minor unearth 400 intact clay tablets detailing civic trade law from the 3rd century BCE.
                  </p>
                </div>
                <span className="text-xs font-medium text-foreground underline cursor-pointer">Read Full Monograph</span>
              </article>

            </div>

          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border bg-card py-16 px-6 lg:px-12 text-muted-foreground">
        <div className="container max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between gap-12">
          
          <div className="space-y-4 max-w-sm">
            <div className="flex items-center gap-3">
              <img src="/apple-touch-icon.png" alt="CampusOne Logo" className="h-8 w-8 object-contain rounded-md" />
              <span className="font-serif text-lg tracking-wider font-semibold text-foreground">
                CampusOne
              </span>
            </div>
            <p className="text-xs font-light leading-relaxed">
              CampusOne <br />
              Main Campus, Chhend, Rourkela, Odisha 769015
            </p>
            <p className="text-xs text-muted-foreground/70">
              State Technical University of Odisha • UGC Recognized & NAAC Accredited.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs font-medium">
            <div className="space-y-3">
              <span className="text-foreground uppercase tracking-widest font-semibold block">Academics</span>
              <ul className="space-y-2 font-light">
                <li><a href="#academic-programs" onClick={(e) => handleScrollTo(e, 'academic-programs')} className="hover:text-foreground">Course Catalog</a></li>
                <li><a href="#academic-programs" onClick={(e) => handleScrollTo(e, 'academic-programs')} className="hover:text-foreground">Faculty Directory</a></li>
                <li><a href="#academic-programs" onClick={(e) => handleScrollTo(e, 'academic-programs')} className="hover:text-foreground">Academic Calendar</a></li>
                <li><a href="#academic-programs" onClick={(e) => handleScrollTo(e, 'academic-programs')} className="hover:text-foreground">Libraries & Archives</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="text-foreground uppercase tracking-widest font-semibold block">Admissions</span>
              <ul className="space-y-2 font-light">
                <li><a href="#admissions" onClick={(e) => handleScrollTo(e, 'admissions')} className="hover:text-foreground">Undergraduate Apply</a></li>
                <li><a href="#admissions" onClick={(e) => handleScrollTo(e, 'admissions')} className="hover:text-foreground">Financial Aid & Grants</a></li>
                <li><a href="#admissions" onClick={(e) => handleScrollTo(e, 'admissions')} className="hover:text-foreground">Campus Visits & Tours</a></li>
                <li><a href="#admissions" onClick={(e) => handleScrollTo(e, 'admissions')} className="hover:text-foreground">Request Information</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <span className="text-foreground uppercase tracking-widest font-semibold block">Portal & Legal</span>
              <ul className="space-y-2 font-light">
                <li><Link to="/login" className="hover:text-foreground">Student Portal Log In</Link></li>
                <li><Link to="/register" className="hover:text-foreground">New User Account</Link></li>
                <li><a href="#admissions" className="hover:text-foreground">Privacy Policy</a></li>
                <li><a href="#admissions" className="hover:text-foreground">Title IX Notice</a></li>
              </ul>
            </div>
          </div>

        </div>

        <div className="container max-w-screen-xl mx-auto pt-12 mt-12 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between text-xs font-light text-muted-foreground/70">
          <p>&copy; {new Date().getFullYear()} CampusOne. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-mono text-[10px]">CampusOne Platform Integrated</p>
        </div>
      </footer>

    </div>
  );
}
