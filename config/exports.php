<?php

/*
 * Row limits for the list pages' "Export" dialog. CSV is streamed in chunks (constant memory, no limit);
 * Excel and PDF are built fully in memory, so they get a cap — over it the dialog disables that format
 * and the endpoint refuses, pointing people to a narrower filter or CSV.
 */
return [
    'limits' => [
        'xlsx' => (int) env('EXPORT_LIMIT_XLSX', 25000),
        'pdf' => (int) env('EXPORT_LIMIT_PDF', 1000),
    ],

    // Rows fetched per query while streaming/collecting an export.
    'chunk_size' => 1000,
];
