import AppLayout from '@/layouts/app-layout';
import SettingsLayout, { SettingsSection } from '@/layouts/settings/layout';
import { type BreadcrumbItem } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

import { FormField, fieldAriaProps } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { PasswordInput } from '@/components/ui/password-input';
import { CircleCheck } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Password settings',
        href: '/settings/password',
    },
];

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Password settings" />

            <SettingsLayout>
                <form onSubmit={updatePassword}>
                    <SettingsSection
                        title="Update password"
                        description="Ensure your account is using a long, random password to stay secure"
                        footer={
                            <>
                                <Button type="submit" variant="primary" loading={processing}>
                                    Save password
                                </Button>
                                {recentlySuccessful && (
                                    <p className="text-brand-success-text flex items-center gap-1.5 text-sm" role="status">
                                        <CircleCheck className="size-4" aria-hidden="true" />
                                        Saved
                                    </p>
                                )}
                            </>
                        }
                    >
                        <FormField id="current_password" label="Current password" required error={errors.current_password}>
                            <PasswordInput
                                id="current_password"
                                ref={currentPasswordInput}
                                value={data.current_password}
                                onChange={(e) => setData('current_password', e.target.value)}
                                autoComplete="current-password"
                                placeholder="Current password"
                                {...fieldAriaProps('current_password', errors.current_password)}
                            />
                        </FormField>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <FormField id="password" label="New password" required error={errors.password}>
                                <PasswordInput
                                    id="password"
                                    ref={passwordInput}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    autoComplete="new-password"
                                    placeholder="New password"
                                    {...fieldAriaProps('password', errors.password)}
                                />
                            </FormField>

                            <FormField id="password_confirmation" label="Confirm password" required error={errors.password_confirmation}>
                                <PasswordInput
                                    id="password_confirmation"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    autoComplete="new-password"
                                    placeholder="Confirm password"
                                    {...fieldAriaProps('password_confirmation', errors.password_confirmation)}
                                />
                            </FormField>
                        </div>
                    </SettingsSection>
                </form>
            </SettingsLayout>
        </AppLayout>
    );
}
