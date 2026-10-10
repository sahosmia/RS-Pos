import { BrandLogo, useShopBrand } from '@/components/brand-logo';
import { type LucideIcon } from 'lucide-react';
import { type PointerEvent, type ReactNode, useCallback, useRef } from 'react';

interface AuthSplitShellProps {
    /** Right-panel heading (the branding panel's own headline/description are separate — see `heroTitle`/`heroDescription`). */
    heading: string;
    subheading: string;
    badge: { icon: LucideIcon; label: string };
    heroTitle: string;
    heroDescription: string;
    features: { icon: LucideIcon; label: string; tone?: FeatureTone }[];
    children: ReactNode;
}

/** Each feature tag has its own colour so the row reads at a glance; the panel behind it stays in the shop's theme. */
const TONES = {
    amber: 'border-amber-300/30 bg-amber-400/15 text-amber-200 [&_svg]:text-amber-300',
    emerald: 'border-emerald-300/30 bg-emerald-400/15 text-emerald-200 [&_svg]:text-emerald-300',
    sky: 'border-sky-300/30 bg-sky-400/15 text-sky-200 [&_svg]:text-sky-300',
    violet: 'border-violet-300/30 bg-violet-400/15 text-violet-200 [&_svg]:text-violet-300',
    rose: 'border-rose-300/30 bg-rose-400/15 text-rose-200 [&_svg]:text-rose-300',
    orange: 'border-orange-300/30 bg-orange-400/15 text-orange-200 [&_svg]:text-orange-300',
    teal: 'border-teal-300/30 bg-teal-400/15 text-teal-200 [&_svg]:text-teal-300',
    cyan: 'border-cyan-300/30 bg-cyan-400/15 text-cyan-200 [&_svg]:text-cyan-300',
} as const;

export type FeatureTone = keyof typeof TONES;

const TONE_ORDER = Object.keys(TONES) as FeatureTone[];

const Logo = ({ className }: { className?: string }) => (
    <div className={className}>
        <BrandLogo imageClassName="h-10 max-w-56" nameClassName="text-xl font-bold tracking-tight" />
    </div>
);

/** How far (in px) each glow drifts toward the pointer — the deeper the layer, the less it moves. */
const PARALLAX = { near: 46, mid: 30, far: 18 } as const;

/**
 * The split-screen shell every auth page (Login, Forgot/Reset/Confirm Password, Verify Email) shares.
 *
 * Everything coloured here comes from the shop's theme (`--brand-primary`), so a green shop gets a green sign-in page.
 * The branding panel is alive but calm: soft glows drift forever on their own, a light sweeps across the panel, the
 * feature chips bob gently — and it answers the pointer: a spotlight follows the cursor and the glows lean toward it.
 * Every motion switches off for people who ask their system for reduced motion.
 */
export default function AuthSplitShell({ heading, subheading, badge, heroTitle, heroDescription, features, children }: AuthSplitShellProps) {
    const BadgeIcon = badge.icon;
    const { name } = useShopBrand();

    const panel = useRef<HTMLDivElement>(null);
    const frame = useRef<number | null>(null);

    // The pointer position goes straight into CSS variables (no React re-render per mouse move).
    const follow = useCallback((event: PointerEvent<HTMLDivElement>) => {
        const element = panel.current;
        if (!element || event.pointerType === 'touch') return;

        const { clientX, clientY } = event;

        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(() => {
            const rect = element.getBoundingClientRect();
            const x = clientX - rect.left;
            const y = clientY - rect.top;

            element.style.setProperty('--mx', `${x}px`);
            element.style.setProperty('--my', `${y}px`);
            element.style.setProperty('--px', String(x / rect.width - 0.5));
            element.style.setProperty('--py', String(y / rect.height - 0.5));
        });
    }, []);

    const settle = useCallback(() => {
        const element = panel.current;
        if (!element) return;

        element.style.setProperty('--px', '0');
        element.style.setProperty('--py', '0');
    }, []);

    const lean = (depth: number) => ({ transform: `translate3d(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth}px), 0)` });

    return (
        <div className="bg-background flex min-h-screen w-full overflow-hidden font-sans antialiased">
            {/* Left side: the branding showcase (hidden on small screens) */}
            <div
                ref={panel}
                onPointerMove={follow}
                onPointerLeave={settle}
                className="group relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[color-mix(in_oklab,var(--brand-primary)_26%,hsl(224_30%_7%))] p-12 text-white lg:flex xl:w-7/12"
            >
                {/* Static colour washes */}
                <div className="from-brand-primary/45 pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] via-transparent to-transparent" />
                <div className="from-brand-primary/25 pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] via-transparent to-transparent" />

                {/* Drifting glows: the outer layer leans toward the pointer, the inner one floats on its own, forever */}
                <div className="pointer-events-none absolute -top-28 -left-28 transition-transform duration-700 ease-out" style={lean(PARALLAX.near)}>
                    <div className="bg-brand-primary/30 animate-auth-float-a size-[28rem] rounded-full blur-3xl motion-reduce:animate-none" />
                </div>
                <div
                    className="pointer-events-none absolute right-[-6rem] bottom-[-6rem] transition-transform duration-700 ease-out"
                    style={lean(-PARALLAX.mid)}
                >
                    <div className="bg-brand-primary/25 animate-auth-float-b size-[26rem] rounded-full blur-3xl motion-reduce:animate-none" />
                </div>
                <div className="pointer-events-none absolute top-1/3 left-1/2 transition-transform duration-700 ease-out" style={lean(PARALLAX.far)}>
                    <div className="animate-auth-float-c size-72 rounded-full bg-white/8 blur-3xl motion-reduce:animate-none" />
                </div>

                {/* Rings that swell and fade, like a pulse leaving the terminal */}
                <div className="pointer-events-none absolute right-24 bottom-32 size-64 motion-reduce:hidden" aria-hidden="true">
                    <span className="animate-auth-ring absolute inset-0 rounded-full border border-white/30" />
                    <span className="animate-auth-ring absolute inset-0 rounded-full border border-white/30 [animation-delay:2s]" />
                    <span className="animate-auth-ring absolute inset-0 rounded-full border border-white/30 [animation-delay:4s]" />
                </div>

                {/* A soft band of light sweeping across, again and again */}
                <div className="animate-auth-sheen pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_38%,rgba(255,255,255,0.07)_50%,transparent_62%)] bg-[length:250%_100%] motion-reduce:hidden" />

                {/* The spotlight that follows the cursor (fades in while the pointer is over the panel) */}
                <div
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{
                        background:
                            'radial-gradient(170px circle at var(--mx, 50%) var(--my, 50%), color-mix(in oklab, var(--brand-primary) 32%, transparent), transparent 75%)',
                    }}
                />

                <Logo className="animate-in fade-in slide-in-from-top-3 relative z-10 flex items-center gap-3 duration-700 [animation-fill-mode:backwards]" />

                <div className="relative z-10 my-auto max-w-lg space-y-6">
                    <div
                        className="animate-in fade-in slide-in-from-bottom-4 bg-brand-primary/20 inline-flex items-center gap-2 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-md duration-700 [animation-fill-mode:backwards]"
                        style={{ animationDelay: '100ms' }}
                    >
                        <BadgeIcon className="h-3.5 w-3.5" /> {badge.label}
                    </div>

                    <h1
                        className="animate-in fade-in slide-in-from-bottom-4 animate-auth-shimmer bg-[linear-gradient(100deg,white_40%,color-mix(in_oklab,var(--brand-primary)_30%,white)_50%,white_60%)] bg-[length:250%_100%] bg-clip-text text-4xl leading-tight font-extrabold tracking-tight text-transparent duration-700 [animation-fill-mode:backwards] motion-reduce:animate-none sm:text-5xl"
                        style={{ animationDelay: '200ms' }}
                    >
                        {heroTitle}
                    </h1>

                    <p
                        className="animate-in fade-in slide-in-from-bottom-4 text-base leading-relaxed text-white/70 duration-700 [animation-fill-mode:backwards]"
                        style={{ animationDelay: '300ms' }}
                    >
                        {heroDescription}
                    </p>

                    <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-medium">
                        {features.map((feature, index) => {
                            const FeatureIcon = feature.icon;

                            return (
                                // Outer: a gentle never-ending bob. Inner: the hover lift. (Two elements so the two transforms never fight.)
                                <div
                                    key={feature.label}
                                    className="animate-auth-bob motion-reduce:animate-none"
                                    style={{ animationDelay: `${index * 700}ms` }}
                                >
                                    <div
                                        className={`animate-in fade-in zoom-in-95 flex cursor-default items-center gap-2 rounded-full border px-3.5 py-1.5 backdrop-blur-xs transition-all duration-300 [animation-fill-mode:backwards] hover:-translate-y-0.5 hover:shadow-md hover:brightness-125 ${TONES[feature.tone ?? TONE_ORDER[index % TONE_ORDER.length]]}`}
                                        style={{ animationDelay: `${450 + index * 120}ms` }}
                                    >
                                        <FeatureIcon className="h-4 w-4" /> {feature.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="relative z-10 text-xs text-white/50">
                    &copy; {new Date().getFullYear()} {name}. All rights reserved.
                </div>
            </div>

            {/* Right side: the page's own form */}
            <div className="relative flex w-full items-center justify-center overflow-hidden p-6 sm:p-12 lg:w-1/2 xl:w-5/12">
                {/* A faint glow in the corner so the form side carries the theme colour too (and the phone layout has some life) */}
                <div className="pointer-events-none absolute -top-24 -right-24">
                    <div className="bg-brand-primary/12 animate-auth-float-c size-80 rounded-full blur-3xl motion-reduce:animate-none" />
                </div>

                <div className="animate-in fade-in slide-in-from-right-4 bg-card relative w-full max-w-md space-y-6 rounded-2xl p-6 shadow-[0_0_0_1px_rgb(16_24_40/0.07),0_12px_40px_-8px_rgb(16_24_40/0.18)] duration-700 sm:p-8 dark:bg-transparent dark:shadow-none">
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
