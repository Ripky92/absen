<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\NoteComment;
use App\Models\SharedNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    use ApiResponse;

    /**
     * User biasa: catatan divisinya + catatan umum (division_id null).
     * Admin: semua, bisa difilter ?division_id=.
     * Catatan yang di-pin tampil paling atas.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'search' => ['nullable', 'string', 'max:100'],
            'is_pinned' => ['nullable', 'boolean'],
        ]);

        $user = $request->user();

        $notes = SharedNote::with(['user:id,name,avatar', 'division:id,name'])
            ->withCount('comments')
            ->when(
                $user->isAdmin(),
                fn ($q) => $q->when($request->division_id, fn ($q, $id) => $q->where('division_id', $id)),
                fn ($q) => $q->where(fn ($q) => $q->whereNull('division_id')->orWhere('division_id', $user->division_id)),
            )
            ->when($request->filled('is_pinned'), fn ($q) => $q->where('is_pinned', $request->boolean('is_pinned')))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q->where('title', 'like', "%{$s}%")->orWhere('content', 'like', "%{$s}%")))
            ->orderByDesc('is_pinned')
            ->latest()
            ->get();

        return $this->success($notes, 'Daftar catatan');
    }

    public function show(Request $request, SharedNote $note): JsonResponse
    {
        if (! $this->canView($request, $note)) {
            return $this->error('Anda tidak memiliki akses ke catatan ini.', 403);
        }

        return $this->success(
            $note->load([
                'user:id,name,avatar',
                'division:id,name',
                'comments.user:id,name,avatar,division_id',
                'comments.user.division:id,name',
            ])->loadCount('comments'),
            'Detail catatan'
        );
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string'],
            'is_pinned' => ['sometimes', 'boolean'],
        ]);

        // User biasa hanya boleh membuat catatan di divisinya sendiri.
        if (! $user->isAdmin()) {
            $data['division_id'] = $user->division_id;
        }

        $data['user_id'] = $user->id;

        $note = SharedNote::create($data);

        return $this->success($note->load(['user:id,name,avatar', 'division:id,name'])->loadCount('comments'), 'Catatan berhasil dibuat', 201);
    }

    public function update(Request $request, SharedNote $note): JsonResponse
    {
        if (! $this->canModify($request, $note)) {
            return $this->error('Hanya pembuat catatan atau admin yang dapat mengubah.', 403);
        }

        $data = $request->validate([
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'content' => ['sometimes', 'required', 'string'],
            'is_pinned' => ['sometimes', 'boolean'],
        ]);

        if (! $request->user()->isAdmin()) {
            unset($data['division_id']);
        }

        $note->update($data);

        return $this->success($note->fresh(['user:id,name,avatar', 'division:id,name'])->loadCount('comments'), 'Catatan berhasil diperbarui');
    }

    public function togglePin(Request $request, SharedNote $note): JsonResponse
    {
        if (! $this->canModify($request, $note)) {
            return $this->error('Hanya pembuat catatan atau admin yang dapat mem-pin.', 403);
        }

        $note->update(['is_pinned' => ! $note->is_pinned]);

        return $this->success($note, $note->is_pinned ? 'Catatan di-pin' : 'Pin catatan dilepas');
    }

    public function destroy(Request $request, SharedNote $note): JsonResponse
    {
        if (! $this->canModify($request, $note)) {
            return $this->error('Hanya pembuat catatan atau admin yang dapat menghapus.', 403);
        }

        $note->delete();

        return $this->success(null, 'Catatan berhasil dihapus');
    }

    /**
     * Ambil daftar komentar untuk suatu catatan.
     */
    public function comments(Request $request, SharedNote $note): JsonResponse
    {
        if (! $this->canView($request, $note)) {
            return $this->error('Anda tidak memiliki akses ke catatan ini.', 403);
        }

        $comments = $note->comments()
            ->with(['user:id,name,avatar,division_id', 'user.division:id,name'])
            ->oldest()
            ->get();

        return $this->success($comments, 'Daftar komentar');
    }

    /**
     * Tambah komentar baru pada catatan.
     */
    public function storeComment(Request $request, SharedNote $note): JsonResponse
    {
        if (! $this->canView($request, $note)) {
            return $this->error('Anda tidak memiliki akses ke catatan ini.', 403);
        }

        $data = $request->validate([
            'comment' => ['required', 'string', 'max:2000'],
        ]);

        $comment = $note->comments()->create([
            'user_id' => $request->user()->id,
            'comment' => $data['comment'],
        ]);

        return $this->success(
            $comment->load(['user:id,name,avatar,division_id', 'user.division:id,name']),
            'Komentar berhasil ditambahkan',
            201
        );
    }

    /**
     * Hapus komentar (milik sendiri atau oleh admin).
     */
    public function destroyComment(Request $request, SharedNote $note, NoteComment $comment): JsonResponse
    {
        if ($comment->shared_note_id !== $note->id) {
            return $this->error('Komentar tidak ditemukan pada catatan ini.', 404);
        }

        $user = $request->user();
        if (! $user->isAdmin() && $comment->user_id !== $user->id) {
            return $this->error('Anda tidak berhak menghapus komentar ini.', 403);
        }

        $comment->delete();

        return $this->success(null, 'Komentar berhasil dihapus');
    }

    private function canView(Request $request, SharedNote $note): bool
    {
        $user = $request->user();

        return $user->isAdmin()
            || $note->division_id === null
            || $note->division_id === $user->division_id;
    }

    private function canModify(Request $request, SharedNote $note): bool
    {
        $user = $request->user();

        return $user->isAdmin() || $note->user_id === $user->id;
    }
}
