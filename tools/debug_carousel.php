<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$slide = App\Models\CarouselSlide::orderByDesc('id')->first();
if (!$slide) {
    echo "No slides found.\n";
    exit(0);
}

echo "id: {$slide->id}\n";
echo "image_path: {$slide->image_path}\n";
echo "image_url: {$slide->image_url}\n";

$path = (string) $slide->image_path;
$full = storage_path('app/public/' . ltrim($path, '/'));
echo "storage file: {$full}\n";
echo "exists: " . (file_exists($full) ? 'yes' : 'no') . "\n";
