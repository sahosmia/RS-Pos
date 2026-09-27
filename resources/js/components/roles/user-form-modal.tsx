import { FormInput } from '@/components/form/form-input';
import { FormSelect } from '@/components/form/form-select';
import FormModal from '@/components/shared/form-modal';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { type RoleListItem, type RoleUserListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface UserFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: RoleUserListItem | null;
    roles: RoleListItem[];
}

export default function UserFormModal({ open, onOpenChange, editing, roles }: UserFormModalProps) {
    const form = useForm({
        name: '',
        email: '',
        username: '',
        password: '',
        role: '',
        is_active: true as boolean,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            name: editing?.name ?? '',
            email: editing?.email ?? '',
            username: editing?.username ?? '',
            password: '',
            role: editing?.roles[0] ?? '',
            is_active: editing?.is_active ?? true,
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing?.id]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(editing ? 'User updated.' : 'User created.');
                onOpenChange(false);
            },
            onError: () => toast.error('Could not save — check the form for errors.'),
        };

        if (editing) {
            form.patch(route('users.update', editing.id), options);
        } else {
            form.post(route('users.store'), options);
        }
    };

    const roleOptions = roles.map((role) => ({ value: role.name, label: role.name }));

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? 'Edit User' : 'Add User'}
            submitLabel={editing ? 'Save' : 'Create'}
            processing={form.processing}
            onSubmit={submit}
        >
            <FormInput
                id="name"
                label="Name"
                value={form.data.name}
                onChange={(e) => form.setData('name', e.target.value)}
                error={form.errors.name}
                placeholder="e.g. John Doe"
                required
            />

            <FormInput
                id="email"
                label="Email"
                type="email"
                value={form.data.email}
                onChange={(e) => form.setData('email', e.target.value)}
                error={form.errors.email}
                placeholder="john@example.com"
                required
            />

            <FormInput
                id="username"
                label="Username"
                value={form.data.username}
                onChange={(e) => form.setData('username', e.target.value)}
                error={form.errors.username}
                placeholder="e.g. john_doe"
                required
            />

            <FormInput
                id="password"
                label="Password"
                type="password"
                value={form.data.password}
                onChange={(e) => form.setData('password', e.target.value)}
                error={form.errors.password}
                required={!editing}
                autoComplete="new-password"
                placeholder={editing ? 'Leave blank to keep unchanged' : '••••••••'}
            />

            <FormSelect
                id="role"
                label="Role"
                value={form.data.role}
                onChange={(value) => form.setData('role', value ?? '')}
                options={roleOptions}
                error={form.errors.role}
                placeholder="Select a role"
                required
            />

            <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                    <Label htmlFor="is_active">Active</Label>
                    <p className="text-muted-foreground text-sm">An inactive user cannot log in.</p>
                </div>
                <Switch id="is_active" checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', checked)} />
            </div>
        </FormModal>
    );
}
