import { Head, useForm } from '@inertiajs/react';
import { BarChart3, LoaderCircle, ShieldCheck, Zap } from 'lucide-react';
import { FormEventHandler } from 'react';

import AuthSplitShell from '@/components/auth/auth-split-shell';
import { FormInput } from '@/components/form/form-input';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';

interface LoginForm {
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <>
            <Head title="Log in" />

            <AuthSplitShell
                heading="Log in to POS"
                subheading="Enter your employee credentials to access terminal"
                badge={{ icon: ShieldCheck, label: 'Enterprise POS Solution' }}
                heroTitle="Powering fast & seamless retail checkout."
                heroDescription="Manage inventory, process sales, and access real-time financial insights in one unified workspace."
                features={[
                    { icon: Zap, label: 'Fast Terminal Speed', iconClassName: 'h-4 w-4 text-amber-400' },
                    { icon: BarChart3, label: 'Live Sales Tracking', iconClassName: 'h-4 w-4 text-emerald-400' },
                ]}
            >
                {status && (
                    <div className="rounded-md bg-green-500/10 p-3 text-center text-sm font-medium text-green-600 dark:text-green-400">{status}</div>
                )}

                <form className="flex flex-col gap-5" onSubmit={submit}>
                    <div className="grid gap-5">
                        <FormInput
                            id="email"
                            label="Email or Username"
                            type="text"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="username"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="cashier@store.com"
                            error={errors.email}
                        />

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                {canResetPassword && (
                                    <TextLink href={route('password.request')} className="text-xs" tabIndex={5}>
                                        Forgot password?
                                    </TextLink>
                                )}
                            </div>
                            <PasswordInput
                                id="password"
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="••••••••"
                            />
                            <InputError message={errors.password} />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="remember"
                                name="remember"
                                tabIndex={3}
                                checked={data.remember}
                                onCheckedChange={(checked) => setData('remember', checked === true)}
                            />
                            <Label htmlFor="remember" className="text-muted-foreground cursor-pointer text-sm font-normal">
                                Remember me on this terminal
                            </Label>
                        </div>

                        <Button type="submit" className="mt-2 h-11 w-full bg-indigo-600 hover:bg-indigo-700" tabIndex={4} disabled={processing}>
                            {processing && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />}
                            Log in
                        </Button>
                    </div>
                </form>

                <div className="bg-muted/40 text-muted-foreground rounded-lg border p-4 text-center text-xs">
                    Don&apos;t have a cashier account or lost access? <br />
                    <span className="text-foreground font-semibold">Contact your System Administrator or Store Manager.</span>
                </div>
            </AuthSplitShell>
        </>
    );
}
