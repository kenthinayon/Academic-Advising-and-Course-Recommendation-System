<?php

namespace App\Http\Controllers;

use App\Models\CarouselSlide;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class CarouselSlideController extends Controller
{
    public function index(Request $request)
    {
        $limit = (int) ($request->query('limit', 10));
        $limit = $limit > 0 ? min($limit, 50) : 10;

        $slides = CarouselSlide::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->limit($limit)
            ->get();

        return response()->json(['slides' => $slides]);
    }

    public function adminIndex(Request $request)
    {
        $slides = CarouselSlide::query()
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        return response()->json(['slides' => $slides]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'category' => ['nullable', 'string', 'max:40'],
            'badge' => ['nullable', 'string', 'max:40'],
            'title' => ['required', 'string', 'max:120'],
            'greeting' => ['nullable', 'string', 'max:120'],
            'story' => ['nullable', 'string', 'max:600'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'is_active' => ['nullable', 'boolean'],
            'image' => ['required', 'image', 'max:4096'],
        ]);

        $path = $request->file('image')->store('carousel', 'public');

        $sortOrder = null;
        if (array_key_exists('sort_order', $data) && $data['sort_order'] !== null && $data['sort_order'] !== '') {
            $sortOrder = (int) $data['sort_order'];
        } else {
            $max = (int) (CarouselSlide::max('sort_order') ?? 0);
            $sortOrder = $max + 10;
        }

        $slide = CarouselSlide::create([
            'category' => $data['category'] ?? 'featured',
            'badge' => $data['badge'] ?? null,
            'title' => $data['title'],
            'greeting' => $data['greeting'] ?? null,
            'story' => $data['story'] ?? null,
            'image_path' => $path,
            'sort_order' => $sortOrder,
            'is_active' => array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true,
        ]);

        return response()->json([
            'message' => 'Slide created.',
            'slide' => $slide,
        ], 201);
    }

    public function update(Request $request, int $id)
    {
        $slide = CarouselSlide::findOrFail($id);

        $data = $request->validate([
            'category' => ['nullable', 'string', 'max:40'],
            'badge' => ['nullable', 'string', 'max:40'],
            'title' => ['required', 'string', 'max:120'],
            'greeting' => ['nullable', 'string', 'max:120'],
            'story' => ['nullable', 'string', 'max:600'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'is_active' => ['nullable', 'boolean'],
            'image' => ['nullable', 'image', 'max:4096'],
        ]);

        if ($request->hasFile('image')) {
            $old = (string) ($slide->image_path ?? '');
            $path = $request->file('image')->store('carousel', 'public');
            $slide->image_path = $path;
            if ($old !== '') {
                try {
                    Storage::disk('public')->delete($old);
                } catch (\Throwable $e) {
                    // ignore
                }
            }
        }

        $slide->category = $data['category'] ?? $slide->category;
        $slide->badge = array_key_exists('badge', $data) ? ($data['badge'] ?: null) : $slide->badge;
        $slide->title = $data['title'];
        $slide->greeting = array_key_exists('greeting', $data) ? ($data['greeting'] ?: null) : $slide->greeting;
        $slide->story = array_key_exists('story', $data) ? ($data['story'] ?: null) : $slide->story;
        $slide->sort_order = array_key_exists('sort_order', $data) ? (int) $data['sort_order'] : $slide->sort_order;
        $slide->is_active = array_key_exists('is_active', $data) ? (bool) $data['is_active'] : $slide->is_active;

        $slide->save();

        return response()->json([
            'message' => 'Slide updated.',
            'slide' => $slide,
        ]);
    }

    public function destroy(Request $request, int $id)
    {
        $slide = CarouselSlide::findOrFail($id);
        $old = (string) ($slide->image_path ?? '');

        $slide->delete();

        if ($old !== '') {
            try {
                Storage::disk('public')->delete($old);
            } catch (\Throwable $e) {
                // ignore
            }
        }

        return response()->json(['message' => 'Slide deleted.']);
    }

    public function move(Request $request, int $id)
    {
        $slide = CarouselSlide::findOrFail($id);

        $data = $request->validate([
            'direction' => ['required', Rule::in(['up', 'down'])],
        ]);

        $ordered = CarouselSlide::query()
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $idx = $ordered->search(fn ($s) => (int) $s->id === (int) $slide->id);
        if ($idx === false) {
            return response()->json(['message' => 'Slide not found in order list.'], 404);
        }

        $idx = (int) $idx;
        $newIdx = $data['direction'] === 'up' ? $idx - 1 : $idx + 1;
        if ($newIdx < 0 || $newIdx >= $ordered->count()) {
            return response()->json(['message' => 'Already at boundary.']);
        }

        $moved = $ordered->splice($idx, 1)->first();
        $ordered->splice($newIdx, 0, [$moved]);

        // Normalize sort_order to stable increments.
        foreach ($ordered as $i => $s) {
            $nextOrder = $i * 10;
            if ((int) $s->sort_order !== $nextOrder) {
                $s->sort_order = $nextOrder;
                $s->save();
            }
        }

        return response()->json(['message' => 'Reordered.']);
    }
}
