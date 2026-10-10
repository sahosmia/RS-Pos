import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import {
    defineConfig
} from 'vite';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
    build: {
        // The charts + PDF/PNG export stack is one deliberate ~1.2 MB chunk (about 400 kB over the wire, cached after the
        // first visit). The default 500 kB warning would complain about it on every build.
        chunkSizeWarningLimit: 1300,
        rollupOptions: {
            output: {
                // Every Inertia page is requested by its own manifest entry (`resources/js/pages/<name>.tsx`, see
                // app.blade.php). The charts' export stack (highcharts, jsPDF, svg2pdf, canvg ...) shares helper modules
                // between the dashboard and its lazily loaded parts; left alone, Rollup hoisted those helpers into the
                // dashboard's own chunk, which turned it into a shared chunk and dropped `pages/dashboard.tsx` from the
                // manifest ("Unable to locate file in Vite manifest"). Keeping that stack in one vendor chunk of its own
                // leaves the page chunk as a plain entry again.
                manualChunks(id) {
                    if (/node_modules[\\/](highcharts|highcharts-react-official|jspdf|svg2pdf\.js|canvg|html2canvas|fflate|dompurify|core-js|rgbcolor|stackblur-canvas|raf|performance-now|fast-png|iobuffer|atob|btoa|@babel[\\/]runtime|regenerator-runtime)[\\/]/.test(id)) {
                        return 'charts-vendor';
                    }
                },
            },
        },
    },
});
