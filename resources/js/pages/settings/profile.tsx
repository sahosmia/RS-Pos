import { type BreadcrumbItem, type SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import DeleteUser from '@/components/delete-user';
import { FormInput } from '@/components/form/form-input';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout, { SettingsSection } from '@/layouts/settings/layout';
import { CircleCheck } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Profile settings',
        href: '/settings/profile',
    },
];

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const { auth } = usePage<SharedData>().props;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: auth.user.name,
        username: auth.user.username ?? '',
        email: auth.user.email,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profile settings" />

            <SettingsLayout>
                <form onSubmit={submit}>
                    <SettingsSection
                        title="Profile information"
                        description="Update your name, username, and email address"
                        footer={
                            <>
                                <Button type="submit" variant="primary" loading={processing}>
                                    Save changes
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
                        <div className="grid gap-5 sm:grid-cols-2">
                            <FormInput
                                id="name"
                                label="Name"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Full name"
                                error={errors.name}
                            />

                            <FormInput
                                id="username"
                                label="Username"
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                required
                                autoComplete="username"
                                placeholder="Username"
                                error={errors.username}
                            />
                        </div>

                        <FormInput
                            id="email"
                            label="Email address"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            required
                            autoComplete="username"
                            placeholder="Email address"
                            error={errors.email}
                        />

                        {mustVerifyEmail && auth.user.email_verified_at === null && (
                            <Alert
                                variant="warning"
                                title="Your email address is unverified"
                                action={
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={route('verification.send')} method="post" as="button">
                                            Resend email
                                        </Link>
                                    </Button>
                                }
                            >
                                {status === 'verification-link-sent' && (
                                    <p className="text-brand-success-text text-[0.8125rem] font-medium">
                                        A new verification link has been sent to your email address.
                                    </p>
                                )}
                            </Alert>
                        )}
                    </SettingsSection>
                </form>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
