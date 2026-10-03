import { BrandLogo, useShopBrand } from '@/components/brand-logo';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface AuthSplitShellProps {
    /** Right-panel heading (the branding panel's own headline/description are separate — see `heroTitle`/`heroDescription`). */
    heading: string;
    subheading: string;
    badge: { icon: LucideIcon; label: string; tone?: 'indigo' | 'amber' };
    heroTitle: string;
    heroDescription: string;
    features: { icon: LucideIcon; label: string; iconClassName?: string }[];
    children: ReactNode;
}

const badgeToneClasses = {
    indigo: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
} as const;

const Logo = ({ className }: { className?: string }) => (
    <div className={className}>
        <BrandLogo imageClassName="h-10 max-w-56" nameClassName="text-xl font-bold tracking-tight" />
    </div>
);

/**
 * The split-screen shell every auth page (Login, Forgot/Reset/Confirm
 * Password, Verify Email) shares — previously ~60 lines of this markup were
 * copy-pasted into each page. Only the branding panel's copy (headline,
 * badge, feature badges) and the actual form differ per page; everything
 * else — the radial-gradient panel, logo, mobile fallback logo, footer
 * copyright, right-panel frame — lives here once.
 */
export default function AuthSplitShell({ heading, subheading, badge, heroTitle, heroDescription, features, children }: AuthSplitShellProps) {
    const BadgeIcon = badge.icon;
    const { name } = useShopBrand();

    return (
        <div className="bg-background flex min-h-screen w-full font-sans antialiased overflow-hidden">
            {/* Left Side: Modern POS Branding Showcase (Hidden on small screens) */}
            <div className="relative hidden w-1/2 flex-col justify-between bg-slate-900 p-12 text-white lg:flex xl:w-7/12">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-600/25 via-transparent to-transparent animate-pulse duration-10000" />
                <div className="pointer-events-none absolute -left-20 -top-20 size-96 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" />

                <Logo className="relative z-10 flex items-center gap-3 transition-transform hover:scale-[1.02]" />

                <div className="relative z-10 my-auto max-w-lg space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    <div
                        className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-md shadow-sm transition-all hover:scale-105 ${badgeToneClasses[badge.tone ?? 'indigo']}`}
                    >
                        <BadgeIcon className="h-3.5 w-3.5 animate-bounce" /> {badge.label}
                    </div>
                    <h1 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">{heroTitle}</h1>
                    <p className="text-base leading-relaxed text-slate-400">{heroDescription}</p>

                    <div className="flex items-center gap-6 text-xs font-medium text-slate-300 pt-2">
                        {features.map((feature, idx) => {
                            const FeatureIcon = feature.icon;

                            return (
                                <div
                                    key={feature.label}
                                    className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 border border-white/10 backdrop-blur-xs transition-all hover:bg-white/10 hover:text-white"
                                    style={{ animationDelay: `${idx * 150}ms` }}
                                >
                                    <FeatureIcon className={feature.iconClassName ?? 'h-4 w-4 text-amber-400'} /> {feature.label}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="relative z-10 text-xs text-slate-500">&copy; {new Date().getFullYear()} {name}. All rights reserved.</div>
            </div>

            {/* Right Side: Page content */}
            <div className="flex w-full items-center justify-center p-6 sm:p-12 lg:w-1/2 xl:w-5/12 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="w-full max-w-md space-y-6">
                    <Logo className="flex items-center gap-3 lg:hidden" />

                    <div className="flex flex-col space-y-1.5">
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{heading}</h2>
                        <p className="text-muted-foreground text-sm">{subheading}</p>
                    </div>

                    {children}
                </div>
            </div>
        </div>
    );
}
