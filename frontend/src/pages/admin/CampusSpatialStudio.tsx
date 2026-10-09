import React, { useState, useEffect } from 'react';
import {
  Building,
  Plus,
  Search,
  Trash2,
  Edit2,
  MapPin,
  Layers,
  Link,
  Shield,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Compass,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header/PageHeader';
import { mapApi } from '../../api/mapApi';
import { MapLocationResponse, LocationType, MapLocationCreateRequest } from '../../types/api';

export const CampusSpatialStudio: React.FC = () => {
  const [locations, setLocations] = useState<MapLocationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Modals state
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<MapLocationResponse | null>(null);

  const [isPathModalOpen, setIsPathModalOpen] = useState(false);

  // Location Form
  const [formData, setFormData] = useState<MapLocationCreateRequest>({
    code: '',
    name: '',
    type: 'BUILDING',
    parent_id: '',
    floor: 0,
    latitude: undefined,
    longitude: undefined,
    description: '',
  });

  // Path Connection Form
  const [pathFromId, setPathFromId] = useState('');
  const [pathToId, setPathToId] = useState('');
  const [pathDistance, setPathDistance] = useState<number>(10.0);
  const [pathAccessible, setPathAccessible] = useState(true);

  // Status/Error Feedback
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [searchQuery, selectedType]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await mapApi.listLocations({
        q: searchQuery.trim() || undefined,
        location_type: selectedType ? (selectedType as LocationType) : undefined,
        limit: 300,
      });
      if (res.success && res.data) {
        setLocations(res.data.items);
      }
    } catch (err) {
      console.error('Failed to load spatial locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingLocation(null);
    setFormData({
      code: '',
      name: '',
      type: 'BUILDING',
      parent_id: '',
      floor: 0,
      latitude: undefined,
      longitude: undefined,
      description: '',
    });
    setIsLocationModalOpen(true);
  };

  const handleOpenEditModal = (loc: MapLocationResponse) => {
    setEditingLocation(loc);
    setFormData({
      code: loc.code,
      name: loc.name,
      type: loc.type,
      parent_id: loc.parent_id || '',
      floor: loc.floor ?? 0,
      latitude: loc.latitude ?? undefined,
      longitude: loc.longitude ?? undefined,
      description: loc.description || '',
    });
    setIsLocationModalOpen(true);
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      const payload: MapLocationCreateRequest = {
        ...formData,
        code: formData.code.toUpperCase().trim(),
        parent_id: formData.parent_id ? formData.parent_id : undefined,
        floor: formData.floor !== undefined ? Number(formData.floor) : undefined,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
      };

      if (editingLocation) {
        await mapApi.updateLocation(editingLocation.id, payload);
        setFeedback({ type: 'success', message: `Location '${payload.name}' updated successfully.` });
      } else {
        await mapApi.createLocation(payload);
        setFeedback({ type: 'success', message: `Location '${payload.name}' created successfully.` });
      }

      setIsLocationModalOpen(false);
      fetchLocations();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.detail || err.message || 'Failed to save spatial location.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete spatial node '${name}'?`)) return;

    try {
      await mapApi.deleteLocation(id);
      setFeedback({ type: 'success', message: `Location '${name}' deleted successfully.` });
      fetchLocations();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.detail || err.message || 'Failed to delete spatial node.',
      });
    }
  };

  const handleCreatePathEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathFromId || !pathToId) return;

    if (pathFromId === pathToId) {
      setFeedback({ type: 'error', message: 'Source and destination nodes cannot be the same.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await mapApi.createPath({
        from_location_id: pathFromId,
        to_location_id: pathToId,
        distance_m: Number(pathDistance),
        accessible: pathAccessible,
      });

      setFeedback({ type: 'success', message: 'Navigation path edge connected successfully.' });
      setIsPathModalOpen(false);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.response?.data?.detail || err.message || 'Failed to connect path edge.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Aggregated Stats
  const totalLocations = locations.length;
  const totalBuildings = locations.filter((l) => l.type === 'BUILDING').length;
  const totalRooms = locations.filter((l) => l.type === 'CLASSROOM' || l.type === 'LAB').length;
  const totalGates = locations.filter((l) => l.type === 'GATE' || l.type === 'PARKING').length;

  const locationTypeOptions: LocationType[] = [
    'BUILDING',
    'CLASSROOM',
    'LAB',
    'HOSTEL',
    'LIBRARY',
    'CANTEEN',
    'GATE',
    'OFFICE',
    'GROUND',
    'PARKING',
    'STAIRS',
    'ELEVATOR',
    'OTHER',
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Campus Spatial & Infrastructure Studio"
        description="Manage spatial hierarchy, campus buildings, room inventories, and walking path graph edges."
        icon={Building}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPathModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card text-foreground hover:bg-accent border border-border transition-colors shadow-sm"
            >
              <Link className="w-3.5 h-3.5 text-primary" />
              Connect Path Edge
            </button>
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Location Node
            </button>
          </div>
        }
      />

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center justify-between transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
              : 'bg-destructive/10 border-destructive/20 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Total Spatial Nodes</span>
            <Compass className="w-4 h-4 text-primary" />
          </div>
          <span className="text-2xl font-bold text-foreground">{totalLocations}</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Buildings</span>
            <Building className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-2xl font-bold text-foreground">{totalBuildings}</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Classrooms & Labs</span>
            <Layers className="w-4 h-4 text-emerald-500" />
          </div>
          <span className="text-2xl font-bold text-foreground">{totalRooms}</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            <span>Gates & Amenities</span>
            <Shield className="w-4 h-4 text-purple-500" />
          </div>
          <span className="text-2xl font-bold text-foreground">{totalGates}</span>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm">
        {/* Search and Filters Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search code, name, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
            >
              <option value="">All Location Types</option>
              {locationTypeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <button
              onClick={fetchLocations}
              className="p-2 rounded-xl border border-border bg-background text-foreground hover:bg-accent transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Spatial Locations Table */}
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-xs text-foreground">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Location Name</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Floor</th>
                <th className="p-3.5">Coordinates</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading spatial inventory...
                  </td>
                </tr>
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    No spatial locations registered in database.
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-accent/40 transition-colors">
                    <td className="p-3.5 font-mono font-medium">{loc.code}</td>
                    <td className="p-3.5">
                      <div className="font-semibold text-foreground">{loc.name}</div>
                      {loc.description && (
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {loc.description}
                        </div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-primary/10 text-primary border border-primary/20">
                        {loc.type}
                      </span>
                    </td>
                    <td className="p-3.5 text-muted-foreground">
                      {loc.floor !== null && loc.floor !== undefined ? `Floor ${loc.floor}` : 'Ground / N/A'}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                      {loc.latitude && loc.longitude ? (
                        `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`
                      ) : (
                        'Not set'
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(loc)}
                          className="p-1.5 rounded-lg border border-border hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit Location"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLocation(loc.id, loc.name)}
                          className="p-1.5 rounded-lg border border-destructive/20 hover:bg-destructive/10 text-destructive transition-colors"
                          title="Delete Location"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add / Edit Location Node */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-base">
                {editingLocation ? 'Edit Spatial Node' : 'Create New Spatial Node'}
              </h3>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Location Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BLK_A"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Location Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as LocationType })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    {locationTypeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Academic Block A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Parent Building (Optional)
                  </label>
                  <select
                    value={formData.parent_id || ''}
                    onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  >
                    <option value="">None (Top Level)</option>
                    {locations
                      .filter((l) => l.type === 'BUILDING' && l.id !== editingLocation?.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Floor Level
                  </label>
                  <input
                    type="number"
                    value={formData.floor ?? 0}
                    onChange={(e) => setFormData({ ...formData, floor: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Latitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="28.6139"
                    value={formData.latitude ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        latitude: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Longitude (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="77.2090"
                    value={formData.longitude ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        longitude: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Details, facilities, capacity, opening hours..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingLocation ? 'Save Changes' : 'Create Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Connect Path Edge */}
      {isPathModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-semibold text-foreground text-base">Connect Navigation Edge</h3>
              <button
                onClick={() => setIsPathModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePathEdge} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Source Location (From) *
                </label>
                <select
                  required
                  value={pathFromId}
                  onChange={(e) => setPathFromId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">Select source node...</option>
                  {locations.map((loc) => (
                    <option key={`edge-from-${loc.id}`} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Destination Location (To) *
                </label>
                <select
                  required
                  value={pathToId}
                  onChange={(e) => setPathToId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <option value="">Select target node...</option>
                  {locations.map((loc) => (
                    <option key={`edge-to-${loc.id}`} value={loc.id}>
                      {loc.name} ({loc.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Walking Distance (Meters) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0.1"
                  value={pathDistance}
                  onChange={(e) => setPathDistance(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pathAccessible"
                  checked={pathAccessible}
                  onChange={(e) => setPathAccessible(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="pathAccessible" className="text-xs text-foreground cursor-pointer">
                  Accessible Path (Wheelchair / Pedestrian friendly)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsPathModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !pathFromId || !pathToId}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Connect Path Edge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
