<!DOCTYPE html>
<html
    lang="{{ str_replace('_', '-', app()->getLocale()) }}"
    @class(['dark' => $appearance === 'dark'])
    @if ($themeColor !== 'neutral') data-theme-color="{{ $themeColor }}" @endif
>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ \App\Models\Settings::currentOrNull()?->shop_name ?: 'RS Pos' }}</title>

        @if ($appearance === 'system')
            {{-- 'system' can't be resolved server-side — inline + render-blocking so it still applies before first paint (no flash) --}}
            <script>
                (function () {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        document.documentElement.classList.add('dark');
                    }
                })();
            </script>
        @endif

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
