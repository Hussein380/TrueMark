<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function send_error($code, $message) {
    http_response_code($code);
    echo json_encode([ 'error' => $message ]);
    exit;
}

$apiKey = getenv('GEMINI_API_KEY');
if (!$apiKey && isset($_SERVER['GEMINI_API_KEY'])) {
    $apiKey = $_SERVER['GEMINI_API_KEY'];
}
if (!$apiKey) {
    $keyFile = realpath(__DIR__ . '/../.keys/gemini_key.txt');
    if ($keyFile && file_exists($keyFile)) {
        $apiKey = trim((string)file_get_contents($keyFile));
    }
}
if (!$apiKey) {
    send_error(500, 'Server not configured: Set GEMINI_API_KEY or upload .keys/gemini_key.txt');
}

$raw = file_get_contents('php://input');
if (!$raw) {
    send_error(400, 'Missing request body.');
}

$data = json_decode($raw, true);
if ($data === null) {
    send_error(400, 'Invalid JSON.');
}

$messages = isset($data['messages']) && is_array($data['messages']) ? $data['messages'] : [];
$model = isset($data['model']) && is_string($data['model']) ? $data['model'] : 'models/gemini-1.5-flash';
$temperature = isset($data['temperature']) ? floatval($data['temperature']) : 0.6;
$companyContext = isset($data['companyContext']) && is_string($data['companyContext']) ? $data['companyContext'] : '';

$factsPath = __DIR__ . '/../assets/company_facts.txt';
$facts = file_exists($factsPath) ? file_get_contents($factsPath) : '';

$systemInstruction = "You are TruemarkCreatives company assistant. Be concise, helpful, and brand-aligned.\n" .
    "Only answer using verified company facts. If unsure, say you don't know and offer to connect the user.\n" .
    "Company facts (trusted):\n" . $companyContext . "\n" . $facts;

$contents = [];
$contents[] = [
    'role' => 'user',
    'parts' => [ [ 'text' => $systemInstruction ] ]
];

foreach ($messages as $m) {
    $role = isset($m['role']) ? $m['role'] : 'user';
    $text = isset($m['content']) ? $m['content'] : '';
    $geminiRole = ($role === 'assistant') ? 'model' : 'user';
    $contents[] = [
        'role' => $geminiRole,
        'parts' => [ [ 'text' => $text ] ]
    ];
}

$payload = [
    'contents' => $contents,
    'generationConfig' => [ 'temperature' => $temperature ]
];

$endpoint = 'https://generativelanguage.googleapis.com/v1beta/' . $model . ':generateContent?key=' . urlencode($apiKey);

$ch = curl_init($endpoint);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [ 'Content-Type: application/json' ]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

$resp = curl_exec($ch);
if ($resp === false) {
    $err = curl_error($ch);
    curl_close($ch);
    send_error(502, 'Upstream error: ' . $err);
}

$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($status < 200 || $status >= 300) {
    http_response_code($status);
    echo $resp;
    exit;
}

$json = json_decode($resp, true);
if ($json === null) {
    send_error(502, 'Invalid upstream JSON');
}

$text = '';
if (isset($json['candidates'][0]['content']['parts'][0]['text'])) {
    $text = $json['candidates'][0]['content']['parts'][0]['text'];
} elseif (isset($json['candidates'][0]['content']['parts']) && is_array($json['candidates'][0]['content']['parts'])) {
    foreach ($json['candidates'][0]['content']['parts'] as $p) {
        if (isset($p['text'])) { $text .= $p['text']; }
    }
}

echo json_encode([ 'reply' => $text ]);
?>


