import RoleFormModal from '@/components/roles/role-form-modal';
import { getRoleActions } from '@/components/roles/role-actions';
import UserFormModal from '@/components/roles/user-form-modal';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import DataTableRowActions, { type RowAction } from '@/components/data-table/data-table-row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import HeadingSmall from '@/components/heading-small';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type PermissionOption, type RoleListItem, type RoleUserListItem } from '@/types/models';
import { Head, router } from '@inertiajs/react';
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'User Management', href: '/roles' }];

interface RolesIndexProps {
    roles: RoleListItem[];
    permissionsByModule: Record<string, PermissionOption[]>;
    users: RoleUserListItem[];
}

export default function RolesIndex({ roles, permissionsByModule, users }: RolesIndexProps) {
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editing, setEditing] = useState<RoleListItem | null>(null);
    const [deleting, setDeleting] = useState<RoleListItem | null>(null);
    const [userFormOpen, setUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<RoleUserListItem | null>(null);
    const [deletingUser, setDeletingUser] = useState<RoleUserListItem | null>(null);
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        if (tab === 'users' || tab === 'roles') {
            setActiveTab(tab);
        }
    }, []);

    const handleTabChange = (val: string) => {
        setActiveTab(val);
        const url = new URL(window.location.href);
        url.searchParams.set('tab', val);
        window.history.replaceState({}, '', url.toString());
    };

    const allRoleNames = roles.map((role) => role.name);

    const openCreate = () => {
        setEditing(null);
        setFormModalOpen(true);
    };

    const openEdit = (role: RoleListItem) => {
        setEditing(role);
        setFormModalOpen(true);
    };

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(route('roles.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${deleting.name}" deleted.`),
            onError: (errors) => toast.error(errors.role ?? 'Could not delete role.'),
            onFinish: () => setDeleting(null),
        });
    };

    const openCreateUser = () => {
        setEditingUser(null);
        setUserFormOpen(true);
    };

    const openEditUser = (user: RoleUserListItem) => {
        setEditingUser(user);
        setUserFormOpen(true);
    };

    const confirmDeleteUser = () => {
        if (!deletingUser) {
            return;
        }

        router.delete(route('users.destroy', deletingUser.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${deletingUser.name}" deleted.`),
            onError: (errors) => toast.error(errors.user ?? 'Could not delete user.'),
            onFinish: () => setDeletingUser(null),
        });
    };

    const getUserActions = (user: RoleUserListItem): RowAction[] => [
        { label: 'Edit', icon: Pencil, onClick: () => openEditUser(user) },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => setDeletingUser(user),
            hidden: !user.can_delete,
        },
    ];

    const toggleUserRole = (user: RoleUserListItem, roleName: string, checked: boolean) => {
        const roles = checked ? [...user.roles, roleName] : user.roles.filter((name) => name !== roleName);

        router.patch(
            route('users.roles.update', user.id),
            { roles },
            {
                preserveScroll: true,
                onError: (errors) => toast.error(errors.roles ?? 'Could not update roles.'),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles & Permissions" />

            <div className="space-y-6 px-4 py-6">
                <HeadingSmall title="User Management" description="ইউজার তালিকা, ইউজারদের রোল ও বিভিন্ন পারমিশন পরিচালনা" />

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                    <TabsList>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="roles">Roles</TabsTrigger>
                    </TabsList>

                    <TabsContent value="roles" className="space-y-4">
                        <div className="flex justify-end">
                            <Button onClick={openCreate}>
                                <Plus /> Add Role
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {roles.map((role) => (
                                <div key={role.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{role.name}</span>
                                            {role.protected && <Badge variant="outline">Protected</Badge>}
                                            <span className="text-muted-foreground text-xs">
                                                {role.users_count} user{role.users_count === 1 ? '' : 's'}
                                            </span>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {role.permissions.length === 0 ? (
                                                <span className="text-muted-foreground text-xs">No permissions yet</span>
                                            ) : (
                                                role.permissions.map((permission) => (
                                                    <Badge key={permission} variant="secondary" className="text-xs">
                                                        {permission}
                                                    </Badge>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0">
                                        <DataTableRowActions
                                            actions={getRoleActions(role, { onEdit: openEdit, onDelete: setDeleting })}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="users" className="space-y-4">
                        <div className="flex justify-end">
                            <Button onClick={openCreateUser}>
                                <Plus /> Add User
                            </Button>
                        </div>

                        <div className="space-y-3">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between gap-4 rounded-lg border p-4">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">{user.name}</span>
                                        <Badge variant={user.is_active ? 'secondary' : 'outline'}>{user.is_active ? 'Active' : 'Inactive'}</Badge>
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                        {user.email}
                                        {user.username && ` • @${user.username}`}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <div className="flex flex-wrap justify-end gap-1">
                                        {user.roles.length === 0 ? (
                                            <span className="text-muted-foreground text-xs">No role</span>
                                        ) : (
                                            user.roles.map((role) => (
                                                <Badge key={role} variant="secondary" className="text-xs">
                                                    {role}
                                                </Badge>
                                            ))
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                Roles <ChevronDown className="size-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Assign roles</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {allRoleNames.map((roleName) => (
                                                <DropdownMenuCheckboxItem
                                                    key={roleName}
                                                    checked={user.roles.includes(roleName)}
                                                    onCheckedChange={(checked) => toggleUserRole(user, roleName, checked === true)}
                                                    onSelect={(e) => e.preventDefault()}
                                                >
                                                    {roleName}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    <DataTableRowActions actions={getUserActions(user)} />
                                </div>
                            </div>
                        ))}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            <RoleFormModal open={formModalOpen} onOpenChange={setFormModalOpen} editing={editing} permissionsByModule={permissionsByModule} />

            <UserFormModal open={userFormOpen} onOpenChange={setUserFormOpen} editing={editingUser} roles={roles} />

            <ConfirmDialog
                open={deletingUser !== null}
                onOpenChange={(open) => !open && setDeletingUser(null)}
                title="Delete user?"
                description={`"${deletingUser?.name}" মুছে ফেলা হবে। কোনো transaction থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDeleteUser}
            />

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title="Delete role?"
                description={`"${deleting?.name}" মুছে ফেলা হবে। কোনো user-কে assign করা থাকলে এটা করা যাবে না।`}
                confirmLabel="Delete"
                onConfirm={confirmDelete}
            />
        </AppLayout>
    );
}
