import RoleFormModal from '@/components/roles/role-form-modal';
import { useConfirmDelete } from '@/hooks/use-confirm-delete';
import UserFormModal from '@/components/roles/user-form-modal';
import { RolesTab, UsersTab } from '@/components/roles/users-roles-tabs';
import ConfirmDialog from '@/components/shared/confirm-dialog';
import { MetricCard, MetricGrid } from '@/components/shared/metric-card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type PermissionOption, type RoleListItem, type RoleUserListItem } from '@/types/models';
import { Head, usePage } from '@inertiajs/react';
import { KeyRound, Plus, Shield, ShieldCheck, UserPlus, UserRound, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'User Management', href: '/roles' }];

interface RolesIndexProps {
    roles: RoleListItem[];
    permissionsByModule: Record<string, PermissionOption[]>;
    users: RoleUserListItem[];
}

/** Which tab is open, kept in the URL (`?tab=roles`) so a link or refresh lands on the same one. */
function useUrlTab() {
    const { url } = usePage();
    const [tab, setTab] = useState('users');

    useEffect(() => {
        const requested = new URLSearchParams(window.location.search).get('tab');
        setTab(requested === 'users' || requested === 'roles' ? requested : 'users');
    }, [url]);

    const changeTab = (value: string) => {
        setTab(value);

        const next = new URL(window.location.href);
        next.searchParams.set('tab', value);
        window.history.replaceState({}, '', next.toString());
    };

    return [tab, changeTab] as const;
}

/** Users and roles of the shop: who can sign in, and what each role may do. */
export default function RolesIndex({ roles, permissionsByModule, users }: RolesIndexProps) {
    const [tab, changeTab] = useUrlTab();

    const [roleFormOpen, setRoleFormOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<RoleListItem | null>(null);
    const [userFormOpen, setUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<RoleUserListItem | null>(null);

    const roleDelete = useConfirmDelete<RoleListItem>({ routeName: 'roles.destroy', errorKey: 'role', fallbackError: 'Could not delete role.' });
    const userDelete = useConfirmDelete<RoleUserListItem>({ routeName: 'users.destroy', errorKey: 'user', fallbackError: 'Could not delete user.' });

    const openRoleForm = (role: RoleListItem | null) => {
        setEditingRole(role);
        setRoleFormOpen(true);
    };

    const openUserForm = (user: RoleUserListItem | null) => {
        setEditingUser(user);
        setUserFormOpen(true);
    };

    const activeUsers = users.filter((user) => user.is_active).length;
    const protectedRoles = roles.filter((role) => role.protected).length;
    const permissionCount = roles.reduce((total, role) => total + role.permissions.length, 0);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles & Permissions" />

            <div className="bg-muted/20 min-h-full">
                <div className="mx-auto w-full max-w-[1600px] space-y-6 px-3 py-5 sm:px-5 sm:py-7 lg:px-8">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3">
                            <div className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm">
                                <ShieldCheck className="size-6" />
                            </div>

                            <div className="min-w-0">
                                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">User Management</h1>
                                <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
                                    ইউজার, রোল এবং পারমিশন পরিচালনা করুন। আপনার application-এর access control এখান থেকে নিয়ন্ত্রণ করতে পারবেন।
                                </p>
                            </div>
                        </div>

                        <div className="bg-card text-muted-foreground flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs sm:self-center">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            Access management
                        </div>
                    </div>

                    <MetricGrid columns={4}>
                        <MetricCard label="Total Users" value={users.length} caption="Registered accounts" icon={Users} accent="info" />
                        <MetricCard
                            label="Active Users"
                            value={activeUsers}
                            caption={`${users.length - activeUsers} inactive`}
                            icon={UserRound}
                            accent="success"
                        />
                        <MetricCard
                            label="Total Roles"
                            value={roles.length}
                            caption={`${protectedRoles} protected`}
                            icon={Shield}
                            accent="financial"
                        />
                        <MetricCard
                            label="Assigned Permissions"
                            value={permissionCount}
                            caption="Across all roles"
                            icon={KeyRound}
                            accent="warning"
                        />
                    </MetricGrid>

                    <div className="bg-card overflow-hidden rounded-2xl border shadow-sm">
                        <Tabs value={tab} onValueChange={changeTab} className="w-full">
                            <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                                <TabsList className="bg-muted/70 grid h-10 w-full grid-cols-2 rounded-xl p-1 sm:w-auto sm:min-w-64">
                                    <TabsTrigger value="users" className="gap-2 rounded-lg text-sm">
                                        <Users className="size-4" />
                                        Users
                                        <span className="bg-background/70 ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
                                            {users.length}
                                        </span>
                                    </TabsTrigger>

                                    <TabsTrigger value="roles" className="gap-2 rounded-lg text-sm">
                                        <ShieldCheck className="size-4" />
                                        Roles
                                        <span className="bg-background/70 ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
                                            {roles.length}
                                        </span>
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex w-full items-center justify-end sm:w-auto">
                                    {tab === 'users' ? (
                                        <Button type="button" onClick={() => openUserForm(null)} className="w-full gap-2 sm:w-auto">
                                            <UserPlus className="size-4" />
                                            Add User
                                        </Button>
                                    ) : (
                                        <Button type="button" onClick={() => openRoleForm(null)} className="w-full gap-2 sm:w-auto">
                                            <Plus className="size-4" />
                                            Add Role
                                        </Button>
                                    )}
                                </div>
                            </div>

                            <UsersTab
                                users={users}
                                roleNames={roles.map((role) => role.name)}
                                onAdd={() => openUserForm(null)}
                                onEdit={openUserForm}
                                onDelete={userDelete.setTarget}
                            />
                            <RolesTab roles={roles} onAdd={() => openRoleForm(null)} onEdit={openRoleForm} onDelete={roleDelete.setTarget} />
                        </Tabs>
                    </div>

                    <RoleFormModal
                        open={roleFormOpen}
                        onOpenChange={setRoleFormOpen}
                        editing={editingRole}
                        permissionsByModule={permissionsByModule}
                    />
                    <UserFormModal open={userFormOpen} onOpenChange={setUserFormOpen} editing={editingUser} roles={roles} />

                    <ConfirmDialog
                        open={userDelete.target !== null}
                        onOpenChange={(open) => !open && userDelete.setTarget(null)}
                        title="Delete user?"
                        description={`"${userDelete.target?.name}" মুছে ফেলা হবে। কোনো transaction থাকলে এটা করা যাবে না।`}
                        confirmLabel="Delete"
                        onConfirm={userDelete.confirm}
                    />

                    <ConfirmDialog
                        open={roleDelete.target !== null}
                        onOpenChange={(open) => !open && roleDelete.setTarget(null)}
                        title="Delete role?"
                        description={`"${roleDelete.target?.name}" মুছে ফেলা হবে। কোনো user-কে assign করা থাকলে এটা করা যাবে না।`}
                        confirmLabel="Delete"
                        onConfirm={roleDelete.confirm}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
