import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, LoaderCircle, MailCheck, ShieldCheck, Zap } from 'lucide-react';
import { FormEventHandler } from 'react';

import AuthSplitShell from '@/components/auth/auth-split-shell';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('verification.send'));
    };

    return (
        <>
            <Head title="Email Verification" />

            <AuthSplitShell
                heading="Verify your email"
                subheading="Please verify your email address by clicking the link we just sent you. Didn't get it? We'll gladly send another."
                badge={{ icon: MailCheck, label: 'Email Verification Required' }}
                heroTitle="Verify your identity to get started."
                heroDescription="We need to verify your email address to ensure account security and activate all terminal management capabilities."
                features={[
                    { icon: ShieldCheck, label: 'Account Security', iconClassName: 'h-4 w-4 text-indigo-400' },
                    { icon: Zap, label: 'Instant Access', iconClassName: 'h-4 w-4 text-amber-400' },
                ]}
            >
                {status === 'verification-link-sent' && (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>A new verification link has been sent to the email address on your account.</span>
                    </div>
                )}

                <form onSubmit={submit} className="flex flex-col gap-4">
                    <Button type="submit" className="h-11 w-full bg-indigo-600 hover:bg-indigo-700" disabled={processing}>
                        {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                        Resend verification email
                    </Button>

                    <div className="pt-2 text-center">
                        <TextLink
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Log out
                        </TextLink>
                    </div>
                </form>
            </AuthSplitShell>
        </>
    );
}
