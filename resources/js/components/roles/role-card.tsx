import DataTableRowActions from '@/components/data-table/data-table-row-actions';
import { getRoleActions } from '@/components/roles/role-actions';
import { Badge } from '@/components/ui/badge';
import { type RoleListItem } from '@/types/models';
import { KeyRound, LockKeyhole, ShieldCheck, Users } from 'lucide-react';

interface RoleCardProps {
    role: RoleListItem;
    onEdit: (role: RoleListItem) => void;
    onDelete: (role: RoleListItem) => void;
}

/** One role: its name, user and permission counts, the edit / delete menu, and every permission it grants. */
export function RoleCard({ role, onEdit, onDelete }: RoleCardProps) {
    return (
        <div className="bg-background hover:border-primary/30 motion-surface rounded-xl border p-3 hover:shadow-[var(--brand-card-shadow)] sm:p-4">
            <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <ShieldCheck className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold break-words sm:text-base">{role.name}</h3>

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

                        <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2 text-xs">
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
                    <DataTableRowActions actions={getRoleActions(role, { onEdit, onDelete })} />
                </div>
            </div>

            <div className="mt-4 border-t pt-3">
                <p className="text-muted-foreground mb-2 text-xs font-medium">Assigned permissions</p>

                {role.permissions.length === 0 ? (
                    <div className="bg-muted/40 text-muted-foreground rounded-lg px-3 py-3 text-xs">No permissions assigned to this role.</div>
                ) : (
                    <div className="flex flex-wrap gap-1.5">
                        {role.permissions.map((permission) => (
                            <Badge key={permission} variant="secondary" className="max-w-full rounded-md px-2 py-1 text-[11px] font-normal">
                                <KeyRound className="mr-1 size-3 shrink-0 opacity-60" />
                                <span className="break-all">{permission}</span>
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
