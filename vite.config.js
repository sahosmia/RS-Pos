import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { defineConfig } from 'vite';
import tailwindcss from "@tailwindcss/vite";
import fs from 'node:fs';
import path from 'node:path';

function getPageFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getPageFiles(filePath));
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(filePath);
        }
    });
    return results;
}

const pageFiles = getPageFiles('resources/js/pages');

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx', ...pageFiles],
            ssr: 'resources/js/ssr.jsx',
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],
    esbuild: {
        jsx: 'automatic',
    },
});