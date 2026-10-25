<?php

return [

    /*
    | CORS untuk API. Frontend React (Vite) berjalan di http://localhost:5173.
    | Tambahkan origin lain (mis. domain produksi) lewat CORS_ALLOWED_ORIGINS,
    | dipisah koma. Autentikasi memakai Bearer token, jadi credentials tidak diperlukan.
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => array_filter(array_map(
        'trim',
        explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173'))
    )),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
