import { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  RoleResponse,
  ScopeType,
  PermissionMatrixResponse,
  AssetMatrixItem,
} from '@/types/api';

const scopeLabels: Record<ScopeType, string> = {
  college: 'College',
  hostel: 'Hostel',
  department: 'Department',
  self: 'Self',
};

const scopeOptions: ScopeType[] = ['college', 'hostel', 'department', 'self'];

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

  const [newRole, setNewRole] = useState({
    name: '',
    scope_type: 'college' as ScopeType,
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

  const roles: RoleResponse[] = rolesQuery.data?.data?.data ?? [];
  const matrix: PermissionMatrixResponse | null = matrixQuery.data?.data?.data ?? null;

  const createMutation = useMutation({
    mutationFn: () => rolesApi.create(newRole),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.ROLES] });
      toast.success('Role created');
      setShowCreate(false);
      setNewRole({ name: '', scope_type: 'college', permission_ids: [] });
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
      setRoleToDeleteCount(res.data.data);
      setShowDelete(role);
    } catch {
      toast.error('Failed to check role assignments');
    } finally {
      setIsCheckingCount(null);
    }
  };

  const togglePermission = (actionId: string, currentlyGranted: boolean) => {
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

  const handleSavePermissions = () => {
    if (selectedRoleId && draftPermissions !== null) {
      savePermissionsMutation.mutate({
        roleId: selectedRoleId,
        permissionIds: Array.from(draftPermissions),
      });
    }
  };

  if (rolesQuery.error) {
    return <ErrorState onRetry={() => rolesQuery.refetch()} />;
  }

  const hasPendingChanges = draftPermissions !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="grid h-[calc(100vh-10rem)] gap-6 lg:grid-cols-3">
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
                  <div className="p-4 flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{role.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {scopeLabels[role.scope_type]} scope
                      </p>
                    </div>
                    {role.is_system_role && (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="mr-1 h-3 w-3" />
                        System
                      </Badge>
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
                {hasPendingChanges && (
                  <Button
                    size="sm"
                    onClick={handleSavePermissions}
                    disabled={savePermissionsMutation.isPending}
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

              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 pb-4">
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
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                value={newRole.name}
                onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-scope">Scope Type</Label>
              <Select
                value={newRole.scope_type}
                onValueChange={(v) => setNewRole({ ...newRole, scope_type: v as ScopeType })}
              >
                <SelectTrigger id="role-scope">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {scopeOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {scopeLabels[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
    </div>
  );
}
