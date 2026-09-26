import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import FormModal from '@/components/shared/form-modal';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { type PermissionOption, type RoleListItem } from '@/types/models';
import { useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect } from 'react';
import { toast } from 'sonner';

interface RoleFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editing: RoleListItem | null;
    permissionsByModule: Record<string, PermissionOption[]>;
}

const humanize = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

export default function RoleFormModal({ open, onOpenChange, editing, permissionsByModule }: RoleFormModalProps) {
    const form = useForm({
        name: '',
        permissions: [] as string[],
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({ name: editing?.name ?? '', permissions: editing?.permissions ?? [] });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editing?.id]);

    const togglePermission = (name: string, checked: boolean) => {
        form.setData('permissions', checked ? [...form.data.permissions, name] : form.data.permissions.filter((p) => p !== name));
    };

    const checkedState = (names: string[]) => {
        const selected = names.filter((name) => form.data.permissions.includes(name));

        if (selected.length === 0) {
            return false;
        }

        return selected.length === names.length ? true : 'indeterminate';
    };

    const setPermissions = (names: string[], checked: boolean) => {
        form.setData(
            'permissions',
            checked ? [...new Set([...form.data.permissions, ...names])] : form.data.permissions.filter((p) => !names.includes(p)),
        );
    };

    const allPermissionNames = Object.values(permissionsByModule)
        .flat()
        .map((permission) => permission.name);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(editing ? 'Role updated.' : 'Role created.');
                onOpenChange(false);
            },
            onError: () => toast.error('Could not save — check the form for errors.'),
        };

        if (editing) {
            form.patch(route('roles.update', editing.id), options);
        } else {
            form.post(route('roles.store'), options);
        }
    };

    return (
        <FormModal
            open={open}
            onOpenChange={onOpenChange}
            title={editing ? 'Edit Role' : 'Add Role'}
            submitLabel={editing ? 'Save' : 'Create'}
            processing={form.processing}
            onSubmit={submit}
            contentClassName="sm:max-w-4xl lg:max-w-5xl max-h-[90vh] overflow-y-auto"
        >
            <div className="grid gap-2">
                <FormInput
                    id="name"
                    label="Role name"
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    disabled={editing?.protected}
                    error={form.errors.name}
                    required
                />
                {editing?.protected && <p className="text-muted-foreground text-xs">Admin role-এর নাম পরিবর্তন করা যায় না।</p>}
            </div>

            <div className="grid gap-3">
                <div className="flex items-center justify-between">
                    <Label>Permissions</Label>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="permissions-select-all"
                            checked={checkedState(allPermissionNames)}
                            onCheckedChange={(checked) => setPermissions(allPermissionNames, checked === true)}
                        />
                        <Label htmlFor="permissions-select-all" className="text-muted-foreground text-sm font-normal">
                            Select all ({form.data.permissions.length}/{allPermissionNames.length})
                        </Label>
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(permissionsByModule).map(([module, permissions]) => {
                        const names = permissions.map((permission) => permission.name);

                        return (
                            <div key={module} className="rounded-md border p-3">
                                <div className="mb-2 flex items-center gap-2 border-b pb-2">
                                    <Checkbox
                                        id={`module-${module}`}
                                        checked={checkedState(names)}
                                        onCheckedChange={(checked) => setPermissions(names, checked === true)}
                                    />
                                    <Label htmlFor={`module-${module}`} className="font-medium">
                                        {humanize(module)}
                                    </Label>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                    {permissions.map((permission) => (
                                        <div key={permission.id} className="flex items-center gap-2">
                                            <Checkbox
                                                id={`permission-${permission.id}`}
                                                checked={form.data.permissions.includes(permission.name)}
                                                onCheckedChange={(checked) => togglePermission(permission.name, checked === true)}
                                            />
                                            <Label htmlFor={`permission-${permission.id}`} className="text-sm font-normal">
                                                {humanize(permission.action)}
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <InputError message={form.errors.permissions} />
            </div>
        </FormModal>
    );
}
