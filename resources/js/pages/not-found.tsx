import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Home, SearchX, Store } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="flex min-h-screen w-full bg-background font-sans antialiased">
            <Head title="404 - Page Not Found" />

            {/* Left Side: Modern POS Branding Showcase (Hidden on small screens) */}
            <div className="relative hidden w-1/2 flex-col justify-between bg-slate-900 p-12 text-white lg:flex xl:w-7/12">
                {/* Background Accent */}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-600/25 via-transparent to-transparent" />

                {/* Header Logo */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-500/30">
                        <Store className="h-6 w-6" />
                    </div>
                    <span className="text-xl font-bold tracking-tight">ApexPOS</span>
                </div>

                {/* Hero Showcase */}
                <div className="relative z-10 my-auto max-w-lg">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 backdrop-blur-sm">
                        <SearchX className="h-3.5 w-3.5" /> Error 404
                    </div>
                    <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                        Lost in the system?
                    </h1>
                    <p className="mt-4 text-base text-slate-400 leading-relaxed">
                        The page or terminal endpoint you are looking for doesn't exist, has been moved, or is temporarily unavailable.
                    </p>
                </div>

                {/* Footer Copyright */}
                <div className="relative z-10 text-xs text-slate-500">
                    &copy; {new Date().getFullYear()} ApexPOS Systems. All rights reserved.
                </div>
            </div>

            {/* Right Side: 404 Main Action Card */}
            <div className="flex w-full items-center justify-center p-6 sm:p-12 lg:w-1/2 xl:w-5/12">
                <div className="w-full max-w-md space-y-6 text-center sm:text-left">
                    {/* Mobile View Logo */}
                    <div className="flex items-center justify-center gap-3 lg:hidden sm:justify-start">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white">
                            <Store className="h-6 w-6" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">ApexPOS</span>
                    </div>

                    {/* Big 404 Graphic/Badge */}
                    <div className="flex flex-col items-center space-y-3 sm:items-start">
                        <span className="text-7xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-500 sm:text-8xl">
                            404
                        </span>
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Page not found</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Sorry, we couldn't find the page you were looking for. Please check the URL or return back to the dashboard.
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-3 sm:flex-row pt-2">
                        <Button asChild className="h-11 w-full bg-indigo-600 hover:bg-indigo-700 sm:w-auto">
                            <Link href={route('dashboard')}>
                                <Home className="mr-2 h-4 w-4" /> Go to Dashboard
                            </Link>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-11 w-full sm:w-auto"
                            onClick={() => window.history.back()}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}