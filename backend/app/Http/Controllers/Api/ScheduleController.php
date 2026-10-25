<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Schedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ScheduleController extends Controller
{
    use ApiResponse;

    /**
     * User biasa: hanya jadwal divisinya + jadwal publik (division_id null).
     * Admin: semua jadwal, bisa difilter ?division_id=.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $user = $request->user();

        $schedules = Schedule::with(['division', 'creator:id,name'])
            ->when(
                $user->isAdmin(),
                fn ($q) => $q->when($request->division_id, fn ($q, $id) => $q->where('division_id', $id)),
                fn ($q) => $q->where(fn ($q) => $q->whereNull('division_id')->orWhere('division_id', $user->division_id)),
            )
            ->when($request->start_date, fn ($q, $d) => $q->whereDate('start_time', '>=', $d))
            ->when($request->end_date, fn ($q, $d) => $q->whereDate('start_time', '<=', $d))
            ->orderBy('start_time')
            ->get();

        return $this->success($schedules, 'Daftar jadwal');
    }

    public function show(Request $request, Schedule $schedule): JsonResponse
    {
        if (! $this->canView($request, $schedule)) {
            return $this->error('Anda tidak memiliki akses ke jadwal ini.', 403);
        }

        return $this->success($schedule->load(['division', 'creator:id,name']), 'Detail jadwal');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['created_by'] = $request->user()->id;

        $schedule = Schedule::create($data);

        return $this->success($schedule->load(['division', 'creator:id,name']), 'Jadwal berhasil dibuat', 201);
    }

    public function update(Request $request, Schedule $schedule): JsonResponse
    {
        $schedule->update($this->validated($request));

        return $this->success($schedule->fresh(['division', 'creator:id,name']), 'Jadwal berhasil diperbarui');
    }

    public function destroy(Schedule $schedule): JsonResponse
    {
        $schedule->delete();

        return $this->success(null, 'Jadwal berhasil dihapus');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'], // null = semua divisi
            'title' => ['required', 'string', 'max:255'],
            'description' => ['required', 'string'],
            'start_time' => ['required', 'date'],
            'end_time' => ['required', 'date', 'after:start_time'],
            'location' => ['required', 'string', 'max:255'],
        ]);
    }

    private function canView(Request $request, Schedule $schedule): bool
    {
        $user = $request->user();

        return $user->isAdmin()
            || $schedule->division_id === null
            || $schedule->division_id === $user->division_id;
    }
}
