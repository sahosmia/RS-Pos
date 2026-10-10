import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, LoaderCircle, Lock, ShieldCheck, Zap } from 'lucide-react';
import { FormEventHandler } from 'react';

import AuthSplitShell from '@/components/auth/auth-split-shell';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

export default function ConfirmPassword() {
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Confirm Password" />

            <AuthSplitShell
                heading="Confirm your password"
                subheading="This is a secure area of the application. Please confirm your password before continuing."
                badge={{ icon: Lock, label: 'High-Security Zone' }}
                heroTitle="Protected area of your terminal."
                heroDescription="To access sensitive system settings, administrative controls, or financial records, please confirm your identity."
                features={[
                    { icon: ShieldCheck, label: 'End-to-End Encryption' },
                    { icon: Zap, label: 'Session Security' },
                ]}
            >
                <form className="flex flex-col gap-5" onSubmit={submit}>
                    <div className="grid gap-5">
                        <div className="grid min-w-0 content-start gap-2">
                            <Label htmlFor="password">Password</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                placeholder="••••••••"
                                autoComplete="current-password"
                                value={data.password}
                                autoFocus
                                onChange={(e) => setData('password', e.target.value)}
                            />
                            <InputError message={errors.password} />
                        </div>

                        <Button
                            type="submit"
                            className="hover:shadow-brand-primary/35 h-11 w-full transition-all hover:-translate-y-px hover:shadow-lg"
                            disabled={processing}
                        >
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm password
                        </Button>
                    </div>
                </form>

                <div className="text-muted-foreground text-center text-sm">
                    <TextLink
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="hover:text-foreground text-brand-primary-text decoration-brand-primary/40 hover:decoration-brand-primary! inline-flex items-center gap-1 font-medium transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Log out instead
                    </TextLink>
                </div>
            </AuthSplitShell>
        </>
    );
}
