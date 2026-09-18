import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/api/rolesApi';
import { QUERY_KEYS } from '@/lib/constants';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ShieldCheck,
  Plus,
  Loader2,
  Lock,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  RoleResponse,
  PermissionMatrixResponse,
  AssetMatrixItem,
} from '@/types/api';


const ACTION_DESCRIPTIONS: Record<string, string> = {
  view: 'Can view details and records',
  list: 'Can view a list of all records',
  create: 'Can create new records',
  edit: 'Can modify existing records',
  delete: 'Can permanently remove records',
  approve: 'Can approve pending requests',
  reject: 'Can reject pending requests',
  resolve: 'Can mark issues as resolved',
  assign: 'Can assign tasks or issues',
  view_private: 'Can view sensitive information',
  manage: 'Full administrative control',
  mark: 'Can mark attendance or status',
  feedback: 'Can provide feedback or ratings',
  cancel: 'Can cancel requests',
};

export function RolesPermissions() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(undefined);
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<RoleResponse | null>(null);
  const [showDelete, setShowDelete] = useState<RoleResponse | null>(null);
  const [roleToDeleteCount, setRoleToDeleteCount] = useState<number | null>(null);
  const [isCheckingCount, setIsCheckingCount] = useState<string | null>(null);
  const [assignUserId, setAssignUserId] = useState('');
  const [draftPermissions, setDraftPermissions] = useState<Set<string> | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('none');
  const [showSaveWarning, setShowSaveWarning] = useState(false);

  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permission_ids: [] as string[],
  });

  const rolesQuery = useQuery({
    queryKey: [QUERY_KEYS.ROLES],
    queryFn: () => rolesApi.list(),
  });

  const matrixQuery = useQuery({
    queryKey: [QUERY_KEYS.PERMISSION_MATRIX, selectedRoleId],
    queryFn: () => rolesApi.getPermissionMatrix(selectedRoleId),
    enabled: !!selectedRoleId,
  });

  const templatesQuery = useQuery({
    queryKey: [QUERY_KEYS.ROLE_TEMPLATES],
    queryFn: () => rolesApi.getTemplates(),
  });

  const roles: RoleResponse[] = useMemo(() => {
    const raw = rolesQuery.data?.data?.data ?? [];
    return [...raw].sort((a, b) => {
      if (a.is_system_role !== b.is_system_role) {
        return a.is_system_role ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [rolesQuery.data?.data?.data]);
  const matrix: PermissionMatrixResponse | null = matrixQuery.data?.data?.data ?? null;
  const templates = templatesQuery.data?.data?.data ?? {};

  const createMutation = useMutation({
    mutationFn: () => rolesApi.create(newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROLES] });
      setShowCreate(false);
      setNewRole({ name: '', description: '', permission_ids: [] });
      setSelectedTemplate('none');
      toast.success('Role created successfully');
    },
    onError: () => toast.error('Failed to create role'),
  });

  const savePermissionsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) =>
      rolesApi.updatePermissions(roleId, { permission_ids: permissionIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.PERMISSION_MATRIX] });
      toast.success('Permissions updated');
      setDraftPermissions(null);
    },
    onError: () => toast.error('Failed to update permissions'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      rolesApi.assignRole(roleId, { user_id: userId }),
    onSuccess: () => {
      toast.success('Role assigned to user');
      setShowAssign(null);
      setAssignUserId('');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Failed to assign role');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => rolesApi.delete(id, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROLES] });
      toast.success('Role deleted successfully');
      setShowDelete(null);
      setRoleToDeleteCount(null);
      if (selectedRoleId === showDelete?.id) {
        setSelectedRoleId(undefined);
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.detail || 'Failed to delete role');
      setShowDelete(null);
      setRoleToDeleteCount(null);
    },
  });

  const handleCheckDelete = async (role: RoleResponse) => {
    setIsCheckingCount(role.id);
    try {
      const res = await rolesApi.getAssignmentCount(role.id);
      setRoleToDeleteCount(res.data.data ?? 0);
      setShowDelete(role);
    } catch {
      toast.error('Failed to check role assignments');
    } finally {
      setIsCheckingCount(null);
    }
  };

  const selectedRoleData = roles.find((r) => r.id === selectedRoleId) ?? null;
  const selectedRoleName = selectedRoleData?.name;

  const currentPermissions = new Set(
    matrix?.assets.flatMap((a) => a.actions.filter((ac) => ac.granted).map((ac) => ac.id)) || []
  );

  const activePermissions = draftPermissions !== null ? draftPermissions : currentPermissions;
  const templateKey = selectedRoleName
    ? Object.keys(templates).find((k) => k.toLowerCase() === selectedRoleName.toLowerCase())
    : undefined;
  const isTemplateRole = !!templateKey;

  let isDeviating = false;
  let recommendedPermissions: string[] = [];

  if (isTemplateRole && templateKey) {
    recommendedPermissions = templates[templateKey] || [];
    if (activePermissions.size !== recommendedPermissions.length) {
      isDeviating = true;
    } else {
      for (const id of recommendedPermissions) {
        if (!activePermissions.has(id)) {
          isDeviating = true;
          break;
        }
      }
    }
  }

  const handleResetToRecommended = () => {
    if (recommendedPermissions.length > 0) {
      setDraftPermissions(new Set(recommendedPermissions));
      toast.info('Permissions reset to recommended defaults. Click Save Changes to apply.');
    }
  };

  const togglePermission = (actionId: string, currentlyGranted: boolean) => {
    if (selectedRoleData?.is_system_role) return;
    if (!matrix) return;
    
    // If we don't have a draft yet, initialize it with all currently granted permissions
    let nextDraft: Set<string>;
    if (draftPermissions === null) {
      nextDraft = new Set<string>();
      matrix.assets.forEach((asset) => {
        asset.actions.forEach((action) => {
          if (action.granted) nextDraft.add(action.id);
        });
      });
    } else {
      nextDraft = new Set(draftPermissions);
    }

    // Toggle the specific permission
    if (nextDraft.has(actionId)) {
      nextDraft.delete(actionId);
    } else {
      nextDraft.add(actionId);
    }

    // Check if the draft is different from the original matrix
    let isDifferent = false;
    let originalCount = 0;
    matrix.assets.forEach((asset) => {
      asset.actions.forEach((action) => {
        if (action.granted) originalCount++;
        if (action.granted !== nextDraft.has(action.id)) {
          isDifferent = true;
        }
      });
    });

    if (isDifferent || originalCount !== nextDraft.size) {
      setDraftPermissions(nextDraft);
    } else {
      setDraftPermissions(null); // Reset if identical to original
    }
  };

  const executeSave = () => {
    if (selectedRoleId && draftPermissions !== null) {
      savePermissionsMutation.mutate({
        roleId: selectedRoleId,
        permissionIds: Array.from(draftPermissions),
      });
      setShowSaveWarning(false);
    }
  };

  const handleSavePermissions = () => {
    if (isTemplateRole && isDeviating) {
      setShowSaveWarning(true);
    } else {
      executeSave();
    }
  };

  if (rolesQuery.error) {
    return <ErrorState onRetry={() => rolesQuery.refetch()} />;
  }

  const hasPendingChanges = draftPermissions !== null;


  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] md:h-[calc(100vh-8rem)] overflow-hidden -m-1 p-1">
      <div className="flex shrink-0 items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Roles & Permissions</h2>
          <p className="text-sm text-muted-foreground">
            Manage system roles and configure access
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Role
        </Button>
      </div>

      <div className="grid flex-1 min-h-0 gap-6 lg:grid-cols-3">
        <div className="flex flex-col space-y-3 overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground shrink-0">Roles</h3>
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-4 pb-4">
          {rolesQuery.isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))
          ) : roles.length === 0 ? (
            <EmptyState title="No roles" description="No roles have been configured." />
          ) : (
            roles.map((role) => (
              <Card
                key={role.id}
                className={`cursor-pointer shadow-sm transition-all hover:shadow-md ${
                  selectedRoleId === role.id ? 'border-primary border-2' : 'border-border border'
                }`}
                onClick={() => {
                  setSelectedRoleId(role.id);
                  setDraftPermissions(null);
                }}
              >
                <CardContent className="p-0">
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-semibold text-foreground">{role.name}</p>
                      {role.is_system_role && (
                        <Badge variant="secondary" className="text-xs shrink-0 ml-2">
                          <Lock className="mr-1 h-3 w-3" />
                          System
                        </Badge>
                      )}
                    </div>
                    {role.description && (
                      <div className="overflow-hidden whitespace-nowrap mt-1 group">
                        <p className="inline-block animate-marquee group-hover:[animation-play-state:paused] text-xs text-muted-foreground leading-relaxed pr-8">
                          {role.description}
                        </p>
                      </div>
                    )}
                  </div>
                  {!role.is_system_role && (
                    <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAssign(role);
                        }}
                      >
                        Assign to User
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCheckDelete(role);
                        }}
                        disabled={isCheckingCount === role.id}
                      >
                        {isCheckingCount === role.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex flex-col overflow-hidden lg:col-span-2">
          {!selectedRoleId ? (
            <EmptyState
              title="Select a role"
              description="Choose a role from the left to view and edit its permissions."
              icon={<ShieldCheck className="h-6 w-6" />}
            />
          ) : matrixQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : !matrix ? (
            <EmptyState title="No permissions data" description="Could not load the permission matrix." />
          ) : (
            <div className="flex h-full flex-col space-y-4 overflow-hidden">
              <div className="flex shrink-0 items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">
                  Permission Matrix
                </h3>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDraftPermissions(null)}
                    disabled={draftPermissions === null}
                  >
                    Discard
                  </Button>
                  {selectedRoleData?.is_system_role ? (
                    <Button size="sm" disabled>
                      System Role Locked
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleSavePermissions}
                      disabled={savePermissionsMutation.isPending || !hasPendingChanges}
                    >
                      {savePermissionsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-4">
                  {isTemplateRole && isDeviating && (
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20 p-4">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                            Deviation from Recommended Template
                          </h4>
                          <p className="text-sm text-amber-800/90 dark:text-amber-300/90">
                            You have modified permissions for a core role ({selectedRoleName}). This may cause unexpected behavior for users.
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="shrink-0 bg-white dark:bg-black hover:bg-amber-100 hover:text-amber-900 dark:hover:bg-amber-900/40"
                        onClick={handleResetToRecommended}
                        disabled={selectedRoleData?.is_system_role}
                      >
                        Reset to Recommended
                      </Button>
                    </div>
                  )}

                  {matrix.assets.map((asset: AssetMatrixItem) => {
                    if (asset.actions.length === 0) return null;

                    return (
                      <div key={asset.id} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-foreground">
                          {asset.name}
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                          {asset.actions.map((action) => {
                            const isChecked = draftPermissions !== null ? draftPermissions.has(action.id) : action.granted;
                            const isChanged = draftPermissions !== null && (draftPermissions.has(action.id) !== action.granted);
                            return (
                              <div
                                key={action.id}
                                className={`flex items-start gap-3 rounded p-2 transition-colors ${
                                  isChanged ? 'bg-amber-50 dark:bg-amber-950/30' : 'hover:bg-muted/50'
                                }`}
                              >
                                <Checkbox
                                  id={action.id}
                                  checked={isChecked}
                                  onCheckedChange={() => togglePermission(action.id, action.granted)}
                                  disabled={selectedRoleData?.is_system_role}
                                  className="mt-0.5 h-4 w-4"
                                />
                                <div className="space-y-1">
                                  <Label
                                    htmlFor={action.id}
                                    className="cursor-pointer text-sm font-medium leading-none text-foreground block"
                                  >
                                    {action.code}
                                  </Label>
                                  <p className="text-xs text-muted-foreground">
                                    {ACTION_DESCRIPTIONS[action.code] || 'Standard action permission'}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="role-template">Role Template (Optional)</Label>
              <Select
                value={selectedTemplate}
                onValueChange={(val) => {
                  setSelectedTemplate(val);
                  if (val !== 'none') {
                    setNewRole({ name: val, description: '', permission_ids: templates[val] || [] });
                  } else {
                    setNewRole({ name: '', description: '', permission_ids: [] });
                  }
                }}
              >
                <SelectTrigger id="role-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Blank Role)</SelectItem>
                  {Object.keys(templates).map((tmpl) => (
                    <SelectItem key={tmpl} value={tmpl}>
                      {tmpl}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role-description">Description (Optional)</Label>
              <Input
                id="role-description"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                placeholder="Brief description of this role"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !newRole.name}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Role'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!showAssign} onOpenChange={(open) => !open && setShowAssign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role: {showAssign?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="assign-user">User ID</Label>
              <Input
                id="assign-user"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                placeholder="Enter the user's UUID..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssign(null)}>
              Cancel
            </Button>
            <Button
              disabled={!assignUserId || assignMutation.isPending}
              onClick={() =>
                showAssign &&
                assignMutation.mutate({ roleId: showAssign.id, userId: assignUserId })
              }
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!showDelete} onOpenChange={(open) => {
        if (!open) {
          setShowDelete(null);
          setRoleToDeleteCount(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {roleToDeleteCount && roleToDeleteCount > 0 
                ? 'Warning: Role is actively assigned' 
                : 'Are you absolutely sure?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {roleToDeleteCount && roleToDeleteCount > 0 ? (
                <>
                  This role is currently assigned to <strong className="text-foreground">{roleToDeleteCount} users</strong>. 
                  Deleting it will instantly revoke their access. What do you want to do?
                </>
              ) : (
                <>
                  This action cannot be undone. This will permanently delete the <strong className="text-foreground">{showDelete?.name}</strong> role and remove all its permissions.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (showDelete) {
                  deleteMutation.mutate({ 
                    id: showDelete.id, 
                    force: (roleToDeleteCount ?? 0) > 0 
                  });
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : roleToDeleteCount && roleToDeleteCount > 0 ? (
                'Unassign Users & Force Delete'
              ) : (
                'Delete Role'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={showSaveWarning} onOpenChange={setShowSaveWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
              <AlertTriangle className="h-5 w-5" />
              Deviation Warning
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <p className="text-sm text-foreground">
              You are about to save permissions that deviate from the recommended <strong>{selectedRoleName}</strong> template.
            </p>
            <p className="text-sm text-muted-foreground">
              This may cause unexpected behavior for users assigned to this role, as they might have access to things they shouldn't, or lose access to essential features.
            </p>
            <p className="text-sm font-medium">Are you sure you want to proceed?</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveWarning(false)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={savePermissionsMutation.isPending}
              onClick={executeSave}
            >
              {savePermissionsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Proceed Anyway'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
