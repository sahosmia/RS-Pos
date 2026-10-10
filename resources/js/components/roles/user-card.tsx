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
import { cn } from '@/lib/utils';
import { type RoleUserListItem } from '@/types/models';
import { router } from '@inertiajs/react';
import { ChevronDown, LockKeyhole, Mail, Pencil, Shield, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

interface UserCardProps {
    user: RoleUserListItem;
    /** Every role that can be assigned. */
    roleNames: string[];
    onEdit: (user: RoleUserListItem) => void;
    onDelete: (user: RoleUserListItem) => void;
}

/** One user: who they are, their status and roles, a quick role picker, and the edit / delete menu. */
export function UserCard({ user, roleNames, onEdit, onDelete }: UserCardProps) {
    const actions: RowAction[] = [
        { label: 'Edit', icon: Pencil, onClick: () => onEdit(user) },
        { label: 'Delete', icon: Trash2, variant: 'destructive', separatorBefore: true, onClick: () => onDelete(user), hidden: !user.can_delete },
    ];

    const toggleRole = (roleName: string, checked: boolean) => {
        const roles = checked ? [...user.roles, roleName] : user.roles.filter((name) => name !== roleName);

        router.patch(
            route('users.roles.update', user.id),
            { roles },
            { preserveScroll: true, onError: (errors) => toast.error(errors.roles ?? 'Could not update roles.') },
        );
    };

    return (
        <div className="group bg-background hover:border-primary/30 motion-surface rounded-xl border p-3 hover:shadow-[var(--brand-card-shadow)] sm:p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                        <UserRound className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="max-w-full truncate text-sm font-semibold sm:text-base">{user.name}</h3>

                            <Badge
                                variant={user.is_active ? 'secondary' : 'outline'}
                                className={cn(
                                    user.is_active
                                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                        : 'text-muted-foreground',
                                )}
                            >
                                <span className={cn('mr-1.5 size-1.5 rounded-full', user.is_active ? 'bg-emerald-500' : 'bg-muted-foreground')} />
                                {user.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>

                        <div className="text-muted-foreground mt-1 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span className="flex min-w-0 items-center gap-1.5">
                                <Mail className="size-3.5 shrink-0" />
                                <span className="truncate">{user.email}</span>
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

                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t pt-3 sm:justify-end sm:border-0 sm:pt-0">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 sm:max-w-56 sm:justify-end">
                        {user.roles.length === 0 ? (
                            <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs">No role assigned</span>
                        ) : (
                            user.roles.map((role) => (
                                <Badge key={role} variant="secondary" className="max-w-full truncate rounded-md text-xs font-medium">
                                    <Shield className="mr-1 size-3 shrink-0" />
                                    {role}
                                </Badge>
                            ))
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5">
                                    <LockKeyhole className="size-3.5" />
                                    <span>Roles</span>
                                    <ChevronDown className="size-3.5" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Assign roles</DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {roleNames.length === 0 ? (
                                    <div className="text-muted-foreground px-2 py-4 text-center text-xs">No roles available</div>
                                ) : (
                                    roleNames.map((roleName) => (
                                        <DropdownMenuCheckboxItem
                                            key={roleName}
                                            checked={user.roles.includes(roleName)}
                                            onCheckedChange={(checked) => toggleRole(roleName, checked === true)}
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            {roleName}
                                        </DropdownMenuCheckboxItem>
                                    ))
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <DataTableRowActions actions={actions} />
                    </div>
                </div>
            </div>
        </div>
    );
}
