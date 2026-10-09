import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  Building,
  BookOpen,
  Coffee,
  Home,
  Shield,
  Layers,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Compass,
  RefreshCw,
  Info,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { mapApi } from '../../api/mapApi';
import { MapLocationResponse, RouteResponse, LocationType } from '../../types/api';

export const CampusMapPage: React.FC = () => {
  const [locations, setLocations] = useState<MapLocationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Route Planning State
  const [fromLocationId, setFromLocationId] = useState<string>('');
  const [toLocationId, setToLocationId] = useState<string>('');
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  // Selected Location for details
  const [activeLocation, setActiveLocation] = useState<MapLocationResponse | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [searchQuery, selectedCategory]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const typeFilter = selectedCategory === 'ALL' ? undefined : (selectedCategory as LocationType);
      const res = await mapApi.listLocations({
        q: searchQuery.trim() || undefined,
        location_type: typeFilter,
        limit: 200,
      });
      if (res.success && res.data) {
        setLocations(res.data.items);
      }
    } catch (err) {
      console.error('Failed to load campus locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocationId || !toLocationId) return;

    if (fromLocationId === toLocationId) {
      setRouteError('Source and destination locations cannot be the same.');
      return;
    }

    setCalculatingRoute(true);
    setRouteError(null);
    setRouteResult(null);

    try {
      const res = await mapApi.calculateRoute(fromLocationId, toLocationId);
      if (res.success && res.data) {
        setRouteResult(res.data);
      } else {
        setRouteError(res.error || 'Failed to calculate walking route.');
      }
    } catch (err: any) {
      setRouteError(err?.response?.data?.error || err.message || 'Route planning service error.');
    } finally {
      setCalculatingRoute(false);
    }
  };

  const getTypeBadgeClass = (type: LocationType) => {
    switch (type) {
      case 'BUILDING':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'CLASSROOM':
      case 'LAB':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'LIBRARY':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'HOSTEL':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'CANTEEN':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'GATE':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const categoryTabs = [
    { id: 'ALL', label: 'All Places', icon: Compass },
    { id: 'BUILDING', label: 'Buildings', icon: Building },
    { id: 'CLASSROOM', label: 'Classrooms', icon: BookOpen },
    { id: 'LIBRARY', label: 'Library', icon: BookOpen },
    { id: 'HOSTEL', label: 'Hostels', icon: Home },
    { id: 'CANTEEN', label: 'Canteen', icon: Coffee },
    { id: 'GATE', label: 'Gates & POIs', icon: Shield },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Campus Map & Wayfinding"
        description="Explore campus buildings, classrooms, amenities, and calculate shortest walking directions."
        icon={Navigation}
        actions={
          <button
            onClick={fetchLocations}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-accent border border-border transition-colors text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
        }
      />

      {/* Main Grid: Left Route Planner + Right Interactive Map/Catalog */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Route Planner & Step Directions */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-foreground font-semibold text-base">
              <Navigation className="w-5 h-5 text-primary" />
              <span>A-to-B Route Planner</span>
            </div>

            <form onSubmit={handleCalculateRoute} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Source Location (Start)
                </label>
                <select
                  value={fromLocationId}
                  onChange={(e) => setFromLocationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  required
                >
                  <option value="">Select starting node...</option>
                  {locations.map((loc) => (
                    <option key={`from-${loc.id}`} value={loc.id}>
                      {loc.name} ({loc.code}) — {loc.type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Destination Location (End)
                </label>
                <select
                  value={toLocationId}
                  onChange={(e) => setToLocationId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  required
                >
                  <option value="">Select target destination...</option>
                  {locations.map((loc) => (
                    <option key={`to-${loc.id}`} value={loc.id}>
                      {loc.name} ({loc.code}) — {loc.type}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={calculatingRoute || !fromLocationId || !toLocationId}
                className="w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              >
                {calculatingRoute ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Calculating Route...
                  </>
                ) : (
                  <>
                    <Navigation className="w-4 h-4" />
                    Find Shortest Route
                  </>
                )}
              </button>
            </form>

            {routeError && (
              <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{routeError}</span>
              </div>
            )}
          </div>

          {/* Route Results Box */}
          {routeResult && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold text-foreground text-sm">Route Found</span>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {routeResult.total_distance_m} meters
                </span>
              </div>

              <p className="text-xs text-muted-foreground">{routeResult.message}</p>

              {/* Turn-by-Turn Steps */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Step-by-Step Directions ({routeResult.steps.length} stops)
                </span>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {routeResult.steps.map((step, idx) => (
                    <div key={`step-${step.location_id}-${idx}`} className="relative flex items-start gap-3">
                      <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-card border-2 border-primary flex items-center justify-center text-[10px] font-bold text-primary">
                        {idx + 1}
                      </div>
                      <div className="bg-muted/40 border border-border/60 rounded-xl p-3 w-full">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-foreground">{step.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getTypeBadgeClass(step.type)}`}>
                            {step.type}
                          </span>
                        </div>
                        {step.floor !== null && step.floor !== undefined && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <Layers className="w-3 h-3 text-muted-foreground" />
                            <span>Floor {step.floor}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Location Detail Panel */}
          {activeLocation && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-foreground text-base">{activeLocation.name}</h4>
                  <span className="text-xs text-muted-foreground">Code: {activeLocation.code}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getTypeBadgeClass(activeLocation.type)}`}>
                  {activeLocation.type}
                </span>
              </div>

              {activeLocation.description && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {activeLocation.description}
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border">
                {activeLocation.floor !== null && activeLocation.floor !== undefined && (
                  <div className="bg-muted/30 p-2 rounded-lg">
                    <span className="text-muted-foreground block text-[10px]">Floor</span>
                    <span className="font-semibold text-foreground">Floor {activeLocation.floor}</span>
                  </div>
                )}
                {activeLocation.latitude && activeLocation.longitude && (
                  <div className="bg-muted/30 p-2 rounded-lg col-span-2">
                    <span className="text-muted-foreground block text-[10px]">Coordinates</span>
                    <span className="font-mono text-foreground font-medium">
                      {activeLocation.latitude.toFixed(4)}, {activeLocation.longitude.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setFromLocationId(activeLocation.id)}
                  className="flex-1 py-1.5 text-xs font-medium bg-muted hover:bg-muted/80 text-foreground rounded-lg transition-colors"
                >
                  Set as Start (A)
                </button>
                <button
                  onClick={() => setToLocationId(activeLocation.id)}
                  className="flex-1 py-1.5 text-xs font-medium bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition-colors"
                >
                  Set as End (B)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Category Filter & Location Node Catalog */}
        <div className="lg:col-span-8 space-y-6">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categoryTabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search campus buildings, lecture halls, labs, hostels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>

          {/* Location Nodes Grid */}
          {loading ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Loading campus spatial database...</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center space-y-3">
              <MapPin className="w-8 h-8 text-muted-foreground/40 mx-auto" />
              <h4 className="font-semibold text-foreground text-base">No Locations Found</h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No campus locations match your search filter. Try changing your search query or selecting another category tab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {locations.map((loc) => {
                const isSelected = activeLocation?.id === loc.id;
                return (
                  <div
                    key={loc.id}
                    onClick={() => setActiveLocation(loc)}
                    className={`bg-card border rounded-2xl p-4 cursor-pointer transition-all hover:border-primary/50 space-y-3 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 shadow-md'
                        : 'border-border shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-mono text-muted-foreground">{loc.code}</span>
                        <h4 className="font-semibold text-foreground text-sm line-clamp-1">{loc.name}</h4>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border shrink-0 ${getTypeBadgeClass(loc.type)}`}>
                        {loc.type}
                      </span>
                    </div>

                    {loc.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{loc.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-border/60 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-primary" />
                        {loc.floor !== null && loc.floor !== undefined ? `Floor ${loc.floor}` : 'Campus Node'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
