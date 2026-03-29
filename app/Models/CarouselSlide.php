<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class CarouselSlide extends Model
{
    protected $fillable = [
        'category',
        'badge',
        'title',
        'greeting',
        'story',
        'image_path',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        $path = (string) ($this->image_path ?? '');
        if ($path === '') return null;

        // Return an absolute URL so it works even when the frontend is served
        // from a different origin/port (e.g. Vite dev server).
        $relative = null;
        try {
            $relative = Storage::disk('public')->url($path); // usually "/storage/..."
        } catch (\Throwable $e) {
            $relative = '/storage/' . ltrim($path, '/');
        }

        $relative = (string) $relative;
        if ($relative === '') return null;

        if (preg_match('/^https?:\/\//i', $relative)) {
            return $relative;
        }

        // Ensure leading slash.
        $relative = '/' . ltrim($relative, '/');

        // Prefer request host (includes port), fall back to APP_URL.
        $base = null;
        try {
            $req = request();
            if ($req) {
                $base = $req->getSchemeAndHttpHost();
            }
        } catch (\Throwable $e) {
            $base = null;
        }

        if (!$base) {
            $base = (string) config('app.url');
        }

        $base = rtrim($base, '/');
        return $base . $relative;
    }
}
