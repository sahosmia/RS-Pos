import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, BarChart3, LoaderCircle, ShieldCheck, Zap } from 'lucide-react';
import { FormEventHandler } from 'react';

import AuthSplitShell from '@/components/auth/auth-split-shell';
import { FormInput } from '@/components/form/form-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.email'));
    };

    return (
        <>
            <Head title="Forgot Password" />

            <AuthSplitShell
                heading="Forgot password"
                subheading="Enter your email to receive a password reset link"
                badge={{ icon: ShieldCheck, label: 'Secure Password Recovery' }}
                heroTitle="Forgot your password? No worries."
                heroDescription="Enter your registered cashier or staff email address, and we will send you a password reset link to regain access."
                features={[
                    { icon: Zap, label: 'Instant Reset Link' },
                    { icon: BarChart3, label: 'Protected Terminal' },
                ]}
            >
                {status && (
                    <div className="rounded-md bg-green-500/10 p-3 text-center text-sm font-medium text-green-600 dark:text-green-400">{status}</div>
                )}

                <form className="flex flex-col gap-5" onSubmit={submit}>
                    <div className="grid gap-5">
                        <FormInput
                            id="email"
                            label="Email address"
                            type="email"
                            name="email"
                            autoComplete="off"
                            value={data.email}
                            autoFocus
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="email@example.com"
                            error={errors.email}
                        />

                        <Button
                            type="submit"
                            className="hover:shadow-brand-primary/35 h-11 w-full transition-all hover:-translate-y-px hover:shadow-lg"
                            disabled={processing}
                        >
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Email password reset link
                        </Button>
                    </div>
                </form>

                <div className="text-muted-foreground text-center text-sm">
                    <TextLink
                        href={route('login')}
                        className="text-brand-primary-text decoration-brand-primary/40 hover:decoration-brand-primary! inline-flex items-center gap-1 font-medium"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" /> Return to log in
                    </TextLink>
                </div>
            </AuthSplitShell>
        </>
    );
}
