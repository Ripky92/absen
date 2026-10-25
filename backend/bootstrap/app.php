<?php

use App\Http\Middleware\RoleMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson()
        );

        $json = fn (string $message, int $code, mixed $data = null) => response()->json([
            'status' => 'error',
            'message' => $message,
            'data' => $data,
        ], $code);

        $exceptions->render(fn (ValidationException $e, Request $r) => $r->is('api/*')
            ? $json($e->validator->errors()->first() ?: 'Data tidak valid.', 422, $e->errors())
            : null);

        $exceptions->render(fn (AuthenticationException $e, Request $r) => $r->is('api/*')
            ? $json('Tidak terautentikasi. Silakan login.', 401)
            : null);

        $exceptions->render(fn (ModelNotFoundException|NotFoundHttpException $e, Request $r) => $r->is('api/*')
            ? $json('Data tidak ditemukan.', 404)
            : null);
    })->create();
