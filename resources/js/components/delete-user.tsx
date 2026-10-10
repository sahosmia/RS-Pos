import { useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

import { FormField, fieldAriaProps } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { PasswordInput } from '@/components/ui/password-input';
import { SettingsSection } from '@/layouts/settings/layout';
import { Trash2 } from 'lucide-react';

export default function DeleteUser() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const { data, setData, delete: destroy, processing, reset, errors, clearErrors } = useForm({ password: '' });

    const deleteUser: FormEventHandler = (e) => {
        e.preventDefault();

        destroy(route('profile.destroy'), {
            preserveScroll: true,
            onSuccess: () => closeModal(),
            onError: () => passwordInput.current?.focus(),
            onFinish: () => reset(),
        });
    };

    const closeModal = () => {
        clearErrors();
        reset();
    };

    return (
        <SettingsSection
            danger
            title="Delete account"
            description="Delete your account and all of its resources. Please proceed with caution — this cannot be undone."
        >
            <Dialog>
                <DialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 />
                        Delete account
                    </Button>
                </DialogTrigger>
                <DialogContent size="sm" busy={processing}>
                    <DialogHeader icon={<Trash2 />} iconTone="danger">
                        <DialogTitle>Delete your account?</DialogTitle>
                        <DialogDescription>
                            Once your account is deleted, all of its resources and data will also be permanently deleted. Enter your password to
                            confirm.
                        </DialogDescription>
                    </DialogHeader>
                    <form className="space-y-5" onSubmit={deleteUser}>
                        <FormField id="delete-password" label="Password" required error={errors.password}>
                            <PasswordInput
                                id="delete-password"
                                name="password"
                                ref={passwordInput}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Password"
                                autoComplete="current-password"
                                {...fieldAriaProps('delete-password', errors.password)}
                            />
                        </FormField>

                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="secondary" onClick={closeModal} disabled={processing}>
                                    Cancel
                                </Button>
                            </DialogClose>

                            <Button type="submit" variant="destructive" loading={processing}>
                                Delete account
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </SettingsSection>
    );
}
