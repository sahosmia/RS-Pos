
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type PermissionOption, type RoleListItem, type RoleUserListItem } from '@/types/models';
import { Head, router, usePage } from '@inertiajs/react';
import {
    Users,
    ShieldCheck,
    Shield,
    UserPlus,
    Plus,
    ChevronDown,
    Pencil,
    Trash2,
    Mail,
    UserRound,
    LockKeyhole,
    UsersRound,
    KeyRound,
    SearchX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'User Management', href: '/roles' },
];

interface RolesIndexProps {
    roles: RoleListItem[];
    permissionsByModule: Record<string, PermissionOption[]>;
    users: RoleUserListItem[];
}

function StatCard({
    title,
    value,
    description,
    icon: Icon,
    accent = 'primary',
}: {
    title: string;
    value: number | string;
    description: string;
    icon: React.ElementType;
    accent?: 'primary' | 'green' | 'violet' | 'amber';
}) {
    const accentStyles = {
        primary: 'bg-primary/10 text-primary',
        green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    };

    return (
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md sm:gap-4 sm:p-4">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-12 ${accentStyles[accent]}`}>
                <Icon className="size-5 sm:size-6" />
            </div>
            <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground sm:text-sm">
                    {title}
                </p>
                <p className="mt-0.5 text-xl font-bold tracking-tight sm:text-2xl">
                    {value}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
                    {description}
                </p>
            </div>
        </div>
    );
}

function EmptyState({
    title,
    description,
    icon: Icon,
    action,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed bg-card px-5 py-14 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Icon className="size-7" />
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {description}
            </p>
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export default function RolesIndex({
    roles,
    permissionsByModule,
    users,
}: RolesIndexProps) {
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editing, setEditing] = useState<RoleListItem | null>(null);
    const [deleting, setDeleting] = useState<RoleListItem | null>(null);

    const [userFormOpen, setUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<RoleUserListItem | null>(null);
    const [deletingUser, setDeletingUser] = useState<RoleUserListItem | null>(null);

    const [activeTab, setActiveTab] = useState('users');

    const { url } = usePage();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');

        if (tab === 'users' || tab === 'roles') {
            setActiveTab(tab);
        } else {
            setActiveTab('users');
        }
    }, [url]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);

        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('tab', value);

        window.history.replaceState({}, '', currentUrl.toString());
    };

    const allRoleNames = roles.map((role) => role.name);
    const activeUsers = users.filter((user) => user.is_active).length;
    const inactiveUsers = users.length - activeUsers;
    const protectedRoles = roles.filter((role) => role.protected).length;
    const permissionCount = roles.reduce(
        (total, role) => total + role.permissions.length,
        0,
    );

    const openCreate = () => {
        setEditing(null);
        setFormModalOpen(true);
    };

    const openEdit = (role: RoleListItem) => {
        setEditing(role);
        setFormModalOpen(true);
    };

    const confirmDelete = () => {
        if (!deleting) return;

        router.delete(route('roles.destroy', deleting.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${deleting.name}" deleted.`),
            onError: (errors) =>
                toast.error(errors.role ?? 'Could not delete role.'),
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
        if (!deletingUser) return;

        router.delete(route('users.destroy', deletingUser.id), {
            preserveScroll: true,
            onSuccess: () => toast.success(`"${deletingUser.name}" deleted.`),
            onError: (errors) =>
                toast.error(errors.user ?? 'Could not delete user.'),
            onFinish: () => setDeletingUser(null),
        });
    };

    const getUserActions = (user: RoleUserListItem): RowAction[] => [
        {
            label: 'Edit',
            icon: Pencil,
            onClick: () => openEditUser(user),
        },
        {
            label: 'Delete',
            icon: Trash2,
            variant: 'destructive',
            separatorBefore: true,
            onClick: () => setDeletingUser(user),
            hidden: !user.can_delete,
        },
    ];

    const toggleUserRole = (
        user: RoleUserListItem,
        roleName: string,
        checked: boolean,
    ) => {
        const updatedRoles = checked
            ? [...user.roles, roleName]
            : user.roles.filter((name) => name !== roleName);

        router.patch(
            route('users.roles.update', user.id),
            { roles: updatedRoles },
            {
                preserveScroll: true,
                onError: (errors) =>
                    toast.error(errors.roles ?? 'Could not update roles.'),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Roles & Permissions" />

            <div className="min-h-full bg-muted/20">
                <div className="mx-auto w-full max-w-[1600px] space-y-6 px-3 py-5 sm:px-5 sm:py-7 lg:px-8">

                    {/* Page Header */}
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-start gap-3">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                                <ShieldCheck className="size-6" />
                            </div>

                            <div className="min-w-0">
                                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                                    User Management
                                </h1>
                                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                                    ইউজার, রোল এবং পারমিশন পরিচালনা করুন।
                                    আপনার application-এর access control
                                    এখান থেকে নিয়ন্ত্রণ করতে পারবেন।
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-start rounded-full border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:self-center">
                            <span className="size-2 rounded-full bg-emerald-500" />
                            Access management
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                        <StatCard
                            title="Total Users"
                            value={users.length}
                            description="Registered accounts"
                            icon={Users}
                            accent="primary"
                        />
                        <StatCard
                            title="Active Users"
                            value={activeUsers}
                            description={`${inactiveUsers} inactive`}
                            icon={UserRound}
                            accent="green"
                        />
                        <StatCard
                            title="Total Roles"
                            value={roles.length}
                            description={`${protectedRoles} protected`}
                            icon={Shield}
                            accent="violet"
                        />
                        <StatCard
                            title="Assigned Permissions"
                            value={permissionCount}
                            description="Across all roles"
                            icon={KeyRound}
                            accent="amber"
                        />
                    </div>

                    {/* Main Content */}
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <Tabs
                            value={activeTab}
                            onValueChange={handleTabChange}
                            className="w-full"
                        >
                            {/* Tabs Header */}
                            <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
                                <TabsList className="grid h-10 w-full grid-cols-2 rounded-xl bg-muted/70 p-1 sm:w-auto sm:min-w-64">
                                    <TabsTrigger
                                        value="users"
                                        className="gap-2 rounded-lg text-sm"
                                    >
                                        <Users className="size-4" />
                                        Users
                                        <span className="ml-1 rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold">
                                            {users.length}
                                        </span>
                                    </TabsTrigger>

                                    <TabsTrigger
                                        value="roles"
                                        className="gap-2 rounded-lg text-sm"
                                    >
                                        <ShieldCheck className="size-4" />
                                        Roles
                                        <span className="ml-1 rounded-md bg-background/70 px-1.5 py-0.5 text-[10px] font-semibold">
                                            {roles.length}
                                        </span>
                                    </TabsTrigger>
                                </TabsList>

                                <div className="flex w-full items-center justify-end sm:w-auto">
                                    {activeTab === 'users' ? (
                                        <Button
                                            type="button"
                                            onClick={openCreateUser}
                                            className="w-full gap-2 sm:w-auto"
                                        >
                                            <UserPlus className="size-4" />
                                            Add User
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            onClick={openCreate}
                                            className="w-full gap-2 sm:w-auto"
                                        >
                                            <Plus className="size-4" />
                                            Add Role
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Users Tab */}
                            <TabsContent value="users" className="m-0">
                                <div className="border-b px-4 py-3 sm:px-5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <h2 className="font-semibold">
                                                System Users
                                            </h2>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                ইউজারদের account, assigned roles
                                                ও status দেখুন।
                                            </p>
                                        </div>

                                        <Badge variant="outline" className="gap-1.5 rounded-full">
                                            <UsersRound className="size-3.5" />
                                            {users.length} users
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-3 p-3 sm:p-5">
                                    {users.length === 0 ? (
                                        <EmptyState
                                            title="No users found"
                                            description="এখনো কোনো user যোগ করা হয়নি। Add User বাটনে ক্লিক করে নতুন user তৈরি করুন।"
                                            icon={Users}
                                            action={
                                                <Button
                                                    type="button"
                                                    onClick={openCreateUser}
                                                >
                                                    <UserPlus className="mr-2 size-4" />
                                                    Add First User
                                                </Button>
                                            }
                                        />
                                    ) : (
                                        users.map((user) => (
                                            <div
                                                key={user.id}
                                                className="group rounded-xl border bg-background p-3 transition-all hover:border-primary/30 hover:shadow-sm sm:p-4"
                                            >
                                                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                                                    {/* User Details */}
                                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                            <UserRound className="size-5" />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="max-w-full truncate text-sm font-semibold sm:text-base">
                                                                    {user.name}
                                                                </h3>

                                                                <Badge
                                                                    variant={user.is_active ? 'secondary' : 'outline'}
                                                                    className={
                                                                        user.is_active
                                                                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                                            : 'text-muted-foreground'
                                                                    }
                                                                >
                                                                    <span
                                                                        className={`mr-1.5 size-1.5 rounded-full ${
                                                                            user.is_active
                                                                                ? 'bg-emerald-500'
                                                                                : 'bg-muted-foreground'
                                                                        }`}
                                                                    />
                                                                    {user.is_active ? 'Active' : 'Inactive'}
                                                                </Badge>
                                                            </div>

                                                            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                                                <span className="flex min-w-0 items-center gap-1.5">
                                                                    <Mail className="size-3.5 shrink-0" />
                                                                    <span className="truncate">
                                                                        {user.email}
                                                                    </span>
                                                                </span>

                                                                {user.username && (
                                                                    <span className="flex items-center gap-1">
                                                                        <span className="text-muted-foreground/60">@</span>
                                                                        {user.username}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Roles & Actions */}
                                                    <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t pt-3 sm:justify-end sm:border-0 sm:pt-0">
                                                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:max-w-56 sm:justify-end">
                                                            {user.roles.length === 0 ? (
                                                                <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                                                                    No role assigned
                                                                </span>
                                                            ) : (
                                                                user.roles.map((role) => (
                                                                    <Badge
                                                                        key={role}
                                                                        variant="secondary"
                                                                        className="max-w-full truncate rounded-md text-xs font-medium"
                                                                    >
                                                                        <Shield className="mr-1 size-3 shrink-0" />
                                                                        {role}
                                                                    </Badge>
                                                                ))
                                                            )}
                                                        </div>

                                                        <div className="flex shrink-0 items-center gap-1.5">
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-9 gap-1.5"
                                                                    >
                                                                        <LockKeyhole className="size-3.5" />
                                                                        <span>Roles</span>
                                                                        <ChevronDown className="size-3.5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>

                                                                <DropdownMenuContent
                                                                    align="end"
                                                                    className="w-56"
                                                                >
                                                                    <DropdownMenuLabel>
                                                                        Assign roles
                                                                    </DropdownMenuLabel>
                                                                    <DropdownMenuSeparator />

                                                                    {allRoleNames.length === 0 ? (
                                                                        <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                                                                            No roles available
                                                                        </div>
                                                                    ) : (
                                                                        allRoleNames.map((roleName) => (
                                                                            <DropdownMenuCheckboxItem
                                                                                key={roleName}
                                                                                checked={user.roles.includes(roleName)}
                                                                                onCheckedChange={(checked) =>
                                                                                    toggleUserRole(
                                                                                        user,
                                                                                        roleName,
                                                                                        checked === true,
                                                                                    )
                                                                                }
                                                                                onSelect={(e) => e.preventDefault()}
                                                                            >
                                                                                {roleName}
                                                                            </DropdownMenuCheckboxItem>
                                                                        ))
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>

                                                            <DataTableRowActions
                                                                actions={getUserActions(user)}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </TabsContent>

                            {/* Roles Tab */}
                            <TabsContent value="roles" className="m-0">
                                <div className="border-b px-4 py-3 sm:px-5">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <h2 className="font-semibold">
                                                Roles & Permissions
                                            </h2>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                Role অনুযায়ী user access ও permissions
                                                পরিচালনা করুন।
                                            </p>
                                        </div>

                                        <Badge variant="outline" className="gap-1.5 rounded-full">
                                            <ShieldCheck className="size-3.5" />
                                            {roles.length} roles
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-3 p-3 sm:p-5">
                                    {roles.length === 0 ? (
                                        <EmptyState
                                            title="No roles created"
                                            description="এখনো কোনো role তৈরি করা হয়নি। Add Role বাটনে ক্লিক করে প্রথম role তৈরি করুন।"
                                            icon={Shield}
                                            action={
                                                <Button
                                                    type="button"
                                                    onClick={openCreate}
                                                >
                                                    <Plus className="mr-2 size-4" />
                                                    Create First Role
                                                </Button>
                                            }
                                        />
                                    ) : (
                                        roles.map((role) => (
                                            <div
                                                key={role.id}
                                                className="rounded-xl border bg-background p-3 transition-all hover:border-primary/30 hover:shadow-sm sm:p-4"
                                            >
                                                <div className="flex min-w-0 items-start justify-between gap-3">
                                                    <div className="flex min-w-0 flex-1 items-start gap-3">
                                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                                                            <ShieldCheck className="size-5" />
                                                        </div>

                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="break-words text-sm font-semibold sm:text-base">
                                                                    {role.name}
                                                                </h3>

                                                                {role.protected && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="gap-1 rounded-full border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                                    >
                                                                        <LockKeyhole className="size-3" />
                                                                        Protected
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                                <span className="flex items-center gap-1">
                                                                    <Users className="size-3.5" />
                                                                    {role.users_count} user{role.users_count === 1 ? '' : 's'}
                                                                </span>
                                                                <span className="text-muted-foreground/50">•</span>
                                                                <span className="flex items-center gap-1">
                                                                    <KeyRound className="size-3.5" />
                                                                    {role.permissions.length} permissions
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="shrink-0">
                                                        <DataTableRowActions
                                                            actions={getRoleActions(role, {
                                                                onEdit: openEdit,
                                                                onDelete: setDeleting,
                                                            })}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="mt-4 border-t pt-3">
                                                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                                                        Assigned permissions
                                                    </p>

                                                    {role.permissions.length === 0 ? (
                                                        <div className="rounded-lg bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                                                            No permissions assigned to this role.
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {role.permissions.map((permission) => (
                                                                <Badge
                                                                    key={permission}
                                                                    variant="secondary"
                                                                    className="max-w-full rounded-md px-2 py-1 text-[11px] font-normal"
                                                                >
                                                                    <KeyRound className="mr-1 size-3 shrink-0 opacity-60" />
                                                                    <span className="break-all">
                                                                        {permission}
                                                                    </span>
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Modals */}
                    <RoleFormModal
                        open={formModalOpen}
                        onOpenChange={setFormModalOpen}
                        editing={editing}
                        permissionsByModule={permissionsByModule}
                    />

                    <UserFormModal
                        open={userFormOpen}
                        onOpenChange={setUserFormOpen}
                        editing={editingUser}
                        roles={roles}
                    />

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
                </div>
            </div>
        </AppLayout>
    );
}

