<?php
declare(strict_types=1);

use App\ApiException;
use App\AuditLog;
use App\Supabase;
use Firebase\JWT\JWT;
use GuzzleHttp\Psr7\Stream;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$config = require __DIR__ . '/../src/config.php';
$db = new Supabase($config);

$app = AppFactory::create();

// ── Error handler ────────────────────────────────────────────────────
$app->addErrorMiddleware(false, true, true)
    ->setDefaultErrorHandler(function (Request $request, Throwable $e) use ($app, $db): Response {
        $status = $e instanceof ApiException ? $e->status() : 500;
        $code   = $e instanceof ApiException ? $e->codeName : 'INTERNAL_ERROR';
        $msg    = $e instanceof ApiException ? $e->publicMessage : 'Terjadi kesalahan server';
        $fields = $e instanceof ApiException ? $e->fields : [];

        $res = $app->getResponseFactory()->createResponse($status);
        $res->getBody()->write(json_encode([
            'error' => ['code' => $code, 'message' => $msg, 'fields' => $fields ?: null],
        ]));
        return $res->withHeader('Content-Type', 'application/json');
    });

// ── Auth middleware (JWT Supabase) ───────────────────────────────────
$auth = function (Request $request, Response $response, callable $next) use ($config): Response {
    $h = $request->getHeaderLine('Authorization');
    if (!preg_match('/^Bearer\s+(\S+)$/', $h, $m)) {
        throw new ApiException('UNAUTHORIZED', 'Token tidak ada', [], 401);
    }
    try {
        $claims = (array) JWT::decode($m[1], $config['supabase_jwt_secret'], ['HS256']);
        $request = $request->withAttribute('actor', $claims['sub'] ?? $claims['email'] ?? 'anonymous');
    } catch (\Throwable) {
        throw new ApiException('UNAUTHORIZED', 'Token tidak valid', [], 401);
    }
    /** @var Response $r */
    $r = $next($request, $response);
    return $r;
};

$app->add($auth);

// ── Body JSON parse ──────────────────────────────────────────────────
$app->addBodyParsingMiddleware();

// ── Routes ───────────────────────────────────────────────────────────
$app->get('/products', function (Request $req, Response $res) {
    $products = [
        ['code' => 'PC',   'name' => 'Ayam Potong Bersih', 'unit' => 'kg', 'category' => 'karkas'],
        ['code' => 'KRKS', 'name' => 'Karkas Utuh',        'unit' => 'kg', 'category' => 'karkas'],
        ['code' => 'BLD',  'name' => 'Bulat Utuh',         'unit' => 'kg', 'category' => 'karkas'],
        ['code' => 'DAD',  'name' => 'Dada Fillet',        'unit' => 'kg', 'category' => 'potongan'],
        ['code' => 'PAH',  'name' => 'Paha Atas + Bawah',  'unit' => 'kg', 'category' => 'potongan'],
        ['code' => 'SAY',  'name' => 'Sayap Utuh',         'unit' => 'kg', 'category' => 'potongan'],
        ['code' => 'FIL',  'name' => 'Fillet Dada',        'unit' => 'kg', 'category' => 'fillet'],
        ['code' => 'GLG',  'name' => 'Gelonggong / Back',  'unit' => 'kg', 'category' => 'lainnya'],
        ['code' => 'CKR',  'name' => 'Ceker / Feet',       'unit' => 'kg', 'category' => 'lainnya'],
        ['code' => 'KPL',  'name' => 'Kepala',             'unit' => 'ekor', 'category' => 'organ'],
        ['code' => 'ATI',  'name' => 'Ati / Hati',         'unit' => 'kg', 'category' => 'organ'],
        ['code' => 'AMP',  'name' => 'Ampela',             'unit' => 'kg', 'category' => 'organ'],
    ];
    $res->getBody()->write(json_encode([
        'products' => $products,
        'defaultPrices' => ['PC'=>38000,'KRKS'=>36000,'BLD'=>37000,'DAD'=>45000,'PAH'=>40000,'SAY'=>25000,'FIL'=>55000,'GLG'=>15000,'CKR'=>20000,'KPL'=>10000,'ATI'=>25000,'AMP'=>22000],
        'butcheryDistribution' => ['PC'=>0.55,'KRKS'=>0.55,'BLD'=>0.55,'DAD'=>0.18,'PAH'=>0.15,'SAY'=>0.08,'FIL'=>0.06,'GLG'=>0.10,'CKR'=>0.04,'KPL'=>1,'ATI'=>0.02,'AMP'=>0.015],
        'avgWeightPerEkor' => 1.8,
    ]));
    return $res->withHeader('Content-Type', 'application/json');
});

// …resource routes dimuat dari file tersendiri
require __DIR__ . '/routes.php';

$app->run();