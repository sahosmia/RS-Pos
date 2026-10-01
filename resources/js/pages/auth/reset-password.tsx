import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, KeyRound, LoaderCircle, ShieldCheck, Zap } from 'lucide-react';
import { FormEventHandler } from 'react';

import AuthSplitShell from '@/components/auth/auth-split-shell';
import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

interface ResetPasswordProps {
    token: string;
    email: string;
}

interface ResetPasswordForm {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export default function ResetPassword({ token, email }: ResetPasswordProps) {
    const { data, setData, post, processing, errors, reset } = useForm<ResetPasswordForm>({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <>
            <Head title="Reset Password" />

            <AuthSplitShell
                heading="Reset password"
                subheading="Please enter your new password below"
                badge={{ icon: KeyRound, label: 'Account Credentials' }}
                heroTitle="Set a new password for your account."
                heroDescription="Ensure your new password is strong and secure to protect your store transaction data and terminal access."
                features={[
                    { icon: ShieldCheck, label: 'Secure Encryption', iconClassName: 'h-4 w-4 text-emerald-400' },
                    { icon: Zap, label: 'Instant Update', iconClassName: 'h-4 w-4 text-amber-400' },
                ]}
            >
                <form className="flex flex-col gap-5" onSubmit={submit}>
                    <div className="grid gap-5">
                        <FormInput
                            id="email"
                            label="Email address"
                            type="email"
                            name="email"
                            autoComplete="email"
                            value={data.email}
                            readOnly
                            className="bg-muted/50 cursor-not-allowed"
                            onChange={(e) => setData('email', e.target.value)}
                            error={errors.email}
                        />

                        <div className="grid min-w-0 content-start gap-2">
                            <Label htmlFor="password">New Password</Label>
                            <PasswordInput
                                id="password"
                                name="password"
                                autoComplete="new-password"
                                value={data.password}
                                autoFocus
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="grid min-w-0 content-start gap-2">
                            <Label htmlFor="password_confirmation">Confirm Password</Label>
                            <PasswordInput
                                id="password_confirmation"
                                name="password_confirmation"
                                autoComplete="new-password"
                                value={data.password_confirmation}
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="••••••••"
                            />
                            <InputError message={errors.password_confirmation} />
                        </div>

                        <Button type="submit" className="mt-2 h-11 w-full bg-indigo-600 hover:bg-indigo-700" disabled={processing}>
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Reset password
                        </Button>
                    </div>
                </form>

                <div className="text-muted-foreground text-center text-sm">
                    <TextLink href={route('login')} className="inline-flex items-center gap-1">
                        <ArrowLeft className="h-3.5 w-3.5" /> Return to log in
                    </TextLink>
                </div>
            </AuthSplitShell>
        </>
    );
}
