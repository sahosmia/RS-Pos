import '../css/app.css';

import Toaster from '@/components/ui/sonner';
import { type SharedData } from '@/types';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import { route as routeFn } from 'ziggy-js';

declare global {
    const route: typeof routeFn;
}

// The page-title fallback ("RS Pos") until `setup()` below reads the shop's
// actual name from the initial page's shared `shop` prop. `title` is a plain
// string-transform callback (not itself reactive), so it can't read React
// state or context — it just closes over this module-level variable, which
// only ever needs to be set once per full page load.
let appName = 'RS Pos';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const sharedProps = props.initialPage.props as unknown as SharedData;
        appName = sharedProps.shop?.shop_name || 'RS Pos';

        const root = createRoot(el);

        // Rendered as a sibling of <App>, outside the page tree, so it stays
        // mounted across Inertia navigations instead of unmounting with
        // whichever page fired the toast.
        root.render(
            <>
                <App {...props} />
                <Toaster />
            </>,
        );
    },
    progress: {
        color: '#4B5563',
    },
});
