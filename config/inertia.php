<?php

return [

    'ssr' => [
        'enabled' => false,
        'url' => 'http://127.0.0.1:13714',
    ],

    'testing' => [
        'ensure_pages_exist' => true,
        'page_extensions' => [
            'js',
            'jsx',
            'ts',
            'tsx',
        ],
        'page_paths' => [
            resource_path('js/pages'),
            resource_path('js/Pages'),
        ],
    ],

];
