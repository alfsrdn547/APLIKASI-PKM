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
    // 17 kode PRD — sync dgn Front-End/src/constants/products.ts
    $products = [
        ['code'=>'PC','name'=>'Ayam Utuh Parting/Potong','unit'=>'kg','category'=>'ayam_utuh'],
        ['code'=>'KRKS','name'=>'Karkas Utuh','unit'=>'kg','category'=>'ayam_utuh'],
        ['code'=>'BLD','name'=>'Boneless Dada','unit'=>'kg','category'=>'daging'],
        ['code'=>'BLD-K','name'=>'Boneless Dada Kulit','unit'=>'kg','category'=>'daging'],
        ['code'=>'BLP','name'=>'Boneless Paha','unit'=>'kg','category'=>'daging'],
        ['code'=>'BLP-K','name'=>'Boneless Paha Kulit','unit'=>'kg','category'=>'daging'],
        ['code'=>'PAHA-P','name'=>'Paha (P)','unit'=>'kg','category'=>'daging'],
        ['code'=>'PAHA-U','name'=>'Paha (U)','unit'=>'kg','category'=>'daging'],
        ['code'=>'PAHA-A','name'=>'Paha (A)','unit'=>'kg','category'=>'daging'],
        ['code'=>'SAYAP-B','name'=>'Sayap (B)','unit'=>'kg','category'=>'daging'],
        ['code'=>'SAYAP-R','name'=>'Sayap (R)','unit'=>'kg','category'=>'daging'],
        ['code'=>'CKR','name'=>'Cakar','unit'=>'kg','category'=>'sampingan'],
        ['code'=>'KPL','name'=>'Kepala','unit'=>'ekor','category'=>'sampingan'],
        ['code'=>'KULIT','name'=>'Kulit','unit'=>'kg','category'=>'sampingan'],
        ['code'=>'USUS','name'=>'Usus','unit'=>'kg','category'=>'sampingan'],
        ['code'=>'ATI','name'=>'Ati','unit'=>'kg','category'=>'sampingan'],
        ['code'=>'TULANG','name'=>'Tulang','unit'=>'kg','category'=>'sampingan'],
    ];
    $res->getBody()->write(json_encode([
        'products' => $products,
        'defaultPrices' => ['PC'=>38000,'KRKS'=>36000,'BLD'=>45000,'BLD-K'=>46000,'BLP'=>40000,'BLP-K'=>41000,'PAHA-P'=>40000,'PAHA-U'=>39000,'PAHA-A'=>38000,'SAYAP-B'=>25000,'SAYAP-R'=>24000,'CKR'=>20000,'KPL'=>10000,'KULIT'=>15000,'USUS'=>12000,'ATI'=>25000,'TULANG'=>8000],
        'butcheryDistribution' => ['PC'=>0.55,'KRKS'=>0.55,'BLD'=>0.18,'BLD-K'=>0.15,'BLP'=>0.15,'BLP-K'=>0.12,'PAHA-P'=>0.06,'PAHA-U'=>0.05,'PAHA-A'=>0.05,'SAYAP-B'=>0.04,'SAYAP-R'=>0.04,'CKR'=>0.04,'KPL'=>1,'KULIT'=>0.06,'USUS'=>0.03,'ATI'=>0.02,'TULANG'=>0.05],
        'avgWeightPerEkor' => 1.8,
    ]));
    return $res->withHeader('Content-Type', 'application/json');
});

// …resource routes dimuat dari file tersendiri
require __DIR__ . '/routes.php';

$app->run();