import { RoleCard } from '@/components/roles/role-card';
import { TabHeading } from '@/components/roles/tab-heading';
import { UserCard } from '@/components/roles/user-card';
import EmptyState from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { TabsContent } from '@/components/ui/tabs';
import { type RoleListItem, type RoleUserListItem } from '@/types/models';
import { Plus, Shield, ShieldCheck, UserPlus, Users, UsersRound } from 'lucide-react';

interface UsersTabProps {
    users: RoleUserListItem[];
    roleNames: string[];
    onAdd: () => void;
    onEdit: (user: RoleUserListItem) => void;
    onDelete: (user: RoleUserListItem) => void;
}

/** Every user with their roles and status. */
export function UsersTab({ users, roleNames, onAdd, onEdit, onDelete }: UsersTabProps) {
    return (
        <TabsContent value="users" className="m-0">
            <TabHeading
                title="System Users"
                description="ইউজারদের account, assigned roles ও status দেখুন।"
                badgeIcon={UsersRound}
                badgeText={`${users.length} users`}
            />

            <div className="space-y-3 p-3 sm:p-5">
                {users.length === 0 ? (
                    <EmptyState
                        title="No users found"
                        description="এখনো কোনো user যোগ করা হয়নি। Add User বাটনে ক্লিক করে নতুন user তৈরি করুন।"
                        icon={Users}
                    >
                        <Button type="button" onClick={onAdd} className="mt-3">
                            <UserPlus className="mr-2 size-4" />
                            Add First User
                        </Button>
                    </EmptyState>
                ) : (
                    users.map((user) => <UserCard key={user.id} user={user} roleNames={roleNames} onEdit={onEdit} onDelete={onDelete} />)
                )}
            </div>
        </TabsContent>
    );
}

interface RolesTabProps {
    roles: RoleListItem[];
    onAdd: () => void;
    onEdit: (role: RoleListItem) => void;
    onDelete: (role: RoleListItem) => void;
}

/** Every role with the permissions it grants. */
export function RolesTab({ roles, onAdd, onEdit, onDelete }: RolesTabProps) {
    return (
        <TabsContent value="roles" className="m-0">
            <TabHeading
                title="Roles & Permissions"
                description="Role অনুযায়ী user access ও permissions পরিচালনা করুন।"
                badgeIcon={ShieldCheck}
                badgeText={`${roles.length} roles`}
            />

            <div className="space-y-3 p-3 sm:p-5">
                {roles.length === 0 ? (
                    <EmptyState
                        title="No roles created"
                        description="এখনো কোনো role তৈরি করা হয়নি। Add Role বাটনে ক্লিক করে প্রথম role তৈরি করুন।"
                        icon={Shield}
                    >
                        <Button type="button" onClick={onAdd} className="mt-3">
                            <Plus className="mr-2 size-4" />
                            Create First Role
                        </Button>
                    </EmptyState>
                ) : (
                    roles.map((role) => <RoleCard key={role.id} role={role} onEdit={onEdit} onDelete={onDelete} />)
                )}
            </div>
        </TabsContent>
    );
}
