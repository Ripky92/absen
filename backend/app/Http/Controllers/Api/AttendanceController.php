<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Attendance;
use App\Models\Division;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttendanceController extends Controller
{
    use ApiResponse;

    /** Statistik absensi bulan berjalan, tren 7 hari, dan rekap divisi (khusus admin). */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $startOfMonth = Carbon::today()->startOfMonth();
        $endOfMonth = Carbon::today()->endOfMonth();

        // 1. Ringkasan status bulan ini
        $monthQuery = Attendance::whereBetween('date', [$startOfMonth, $endOfMonth]);
        if (! $isAdmin) {
            $monthQuery->where('user_id', $user->id);
        }

        $allMonth = $monthQuery->get();
        $hadirOnTime = $allMonth->where('status', 'hadir')->where('is_late', false)->count();
        $terlambat = $allMonth->where('status', 'hadir')->where('is_late', true)->count();
        $izin = $allMonth->where('status', 'izin')->count();
        $sakit = $allMonth->where('status', 'sakit')->count();
        $total = $allMonth->count();

        $daysMap = [
            'Sun' => 'Min', 'Mon' => 'Sen', 'Tue' => 'Sel', 'Wed' => 'Rab',
            'Thu' => 'Kam', 'Fri' => 'Jum', 'Sat' => 'Sab',
        ];

        // 2. Tren 7 hari terakhir
        $trend = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = Carbon::today()->subDays($i);
            $dStr = $d->toDateString();

            $dayQuery = Attendance::whereDate('date', $dStr);
            if (! $isAdmin) {
                $dayQuery->where('user_id', $user->id);
            }
            $dayRecords = $dayQuery->get();

            $trend[] = [
                'date' => $dStr,
                'day' => $daysMap[$d->format('D')] ?? $d->format('D'),
                'short_date' => $d->format('d/m'),
                'hadir' => $dayRecords->where('status', 'hadir')->where('is_late', false)->count(),
                'terlambat' => $dayRecords->where('status', 'hadir')->where('is_late', true)->count(),
                'izin' => $dayRecords->where('status', 'izin')->count(),
                'sakit' => $dayRecords->where('status', 'sakit')->count(),
                'total' => $dayRecords->count(),
            ];
        }

        // 3. Rekap jumlah kehadiran per divisi (khusus Admin)
        $divisionStats = [];
        if ($isAdmin) {
            $divisions = Division::withCount('users')->get();
            foreach ($divisions as $div) {
                $divAtts = Attendance::whereHas('user', fn ($u) => $u->where('division_id', $div->id))
                    ->whereBetween('date', [$startOfMonth, $endOfMonth])
                    ->get();

                $divisionStats[] = [
                    'division_id' => $div->id,
                    'division_name' => $div->name,
                    'total_members' => $div->users_count,
                    'hadir' => $divAtts->where('status', 'hadir')->where('is_late', false)->count(),
                    'terlambat' => $divAtts->where('status', 'hadir')->where('is_late', true)->count(),
                    'izin' => $divAtts->where('status', 'izin')->count(),
                    'sakit' => $divAtts->where('status', 'sakit')->count(),
                    'total' => $divAtts->count(),
                ];
            }
        }

        return $this->success([
            'is_admin' => $isAdmin,
            'summary' => [
                'hadir' => $hadirOnTime,
                'terlambat' => $terlambat,
                'izin' => $izin,
                'sakit' => $sakit,
                'total' => $total,
                'month_label' => Carbon::today()->format('F Y'),
            ],
            'trend' => $trend,
            'divisions' => $divisionStats,
        ], 'Statistik absensi');
    }

    /** Status absensi hari ini milik user login. */
    public function today(Request $request): JsonResponse
    {
        $attendance = Attendance::where('user_id', $request->user()->id)
            ->whereDate('date', Carbon::today())
            ->first();

        return $this->success($attendance, 'Absensi hari ini');
    }

    /** Rekan yang sudah absen hari ini (bisa difilter per divisi). */
    public function todayColleagues(Request $request): JsonResponse
    {
        $request->validate([
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
        ]);

        $attendances = Attendance::with(['user:id,division_id,name,email,avatar,phone', 'user.division:id,name'])
            ->whereDate('date', Carbon::today())
            ->when($request->division_id, function ($q, $divisionId) {
                $q->whereHas('user', fn ($u) => $u->where('division_id', $divisionId));
            })
            ->orderByRaw("CASE WHEN status = 'hadir' THEN 1 WHEN status = 'izin' THEN 2 WHEN status = 'sakit' THEN 3 ELSE 4 END")
            ->orderBy('check_in')
            ->get();

        return $this->success($attendances, 'Daftar rekan aktif hari ini');
    }

    public function checkIn(Request $request): JsonResponse
    {
        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
        ]);

        $today = Carbon::today();

        $exists = Attendance::where('user_id', $request->user()->id)
            ->whereDate('date', $today)
            ->exists();

        if ($exists) {
            return $this->error('Anda sudah memiliki catatan absensi hari ini.', 422);
        }

        $checkInTime = now()->format('H:i:s');
        $isLate = $checkInTime > '08:00:00';

        $attendance = Attendance::create([
            'user_id' => $request->user()->id,
            'date' => $today,
            'check_in' => $checkInTime,
            'status' => 'hadir',
            'notes' => $data['notes'] ?? null,
            'latitude' => $data['latitude'] ?? null,
            'longitude' => $data['longitude'] ?? null,
            'is_late' => $isLate,
        ]);

        $message = $isLate ? 'Check-in berhasil (Terlambat)' : 'Check-in berhasil (Tepat Waktu)';

        return $this->success($attendance, $message, 201);
    }

    public function checkOut(Request $request): JsonResponse
    {
        $attendance = Attendance::where('user_id', $request->user()->id)
            ->whereDate('date', Carbon::today())
            ->first();

        if (! $attendance || $attendance->status !== 'hadir' || ! $attendance->check_in) {
            return $this->error('Anda belum check-in hari ini.', 422);
        }

        if ($attendance->check_out) {
            return $this->error('Anda sudah check-out hari ini.', 422);
        }

        $attendance->update(['check_out' => now()->format('H:i:s')]);

        return $this->success($attendance->fresh(), 'Check-out berhasil');
    }

    /** Pengajuan izin / sakit. */
    public function requestLeave(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:izin,sakit'],
            'date' => ['nullable', 'date', 'after_or_equal:today'],
            'notes' => ['required', 'string', 'max:1000'],
            'attachment' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:5120'],
        ]);

        $date = Carbon::parse($data['date'] ?? Carbon::today())->toDateString();

        $exists = Attendance::where('user_id', $request->user()->id)
            ->whereDate('date', $date)
            ->exists();

        if ($exists) {
            return $this->error('Sudah ada catatan absensi pada tanggal tersebut.', 422);
        }

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            $attachmentPath = $request->file('attachment')->store('attachments', 'public');
        }

        $attendance = Attendance::create([
            'user_id' => $request->user()->id,
            'date' => $date,
            'status' => $data['status'],
            'notes' => $data['notes'],
            'attachment' => $attachmentPath,
        ]);

        return $this->success($attendance, 'Pengajuan '.$data['status'].' berhasil', 201);
    }

    /** Riwayat absensi milik sendiri. */
    public function history(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'in:hadir,izin,sakit,alpha'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $attendances = Attendance::where('user_id', $request->user()->id)
            ->when($request->start_date, fn ($q, $d) => $q->whereDate('date', '>=', $d))
            ->when($request->end_date, fn ($q, $d) => $q->whereDate('date', '<=', $d))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('date')
            ->paginate($request->integer('per_page', 15));

        return $this->success($attendances, 'Riwayat absensi');
    }

    /** Admin: rekap seluruh absensi (filter date / start_date-end_date / division_id). */
    public function recap(Request $request): JsonResponse
    {
        $request->validate([
            'date' => ['nullable', 'date'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'status' => ['nullable', 'in:hadir,izin,sakit,alpha'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $attendances = Attendance::with('user.division')
            ->when($request->date, fn ($q, $d) => $q->whereDate('date', $d))
            ->when($request->start_date, fn ($q, $d) => $q->whereDate('date', '>=', $d))
            ->when($request->end_date, fn ($q, $d) => $q->whereDate('date', '<=', $d))
            ->when($request->division_id, fn ($q, $id) => $q->whereHas('user', fn ($u) => $u->where('division_id', $id)))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('date')
            ->paginate($request->integer('per_page', 15));

        return $this->success($attendances, 'Rekap absensi');
    }

    /** Admin: Export rekapitulasi absensi ke file CSV. */
    public function exportCsv(Request $request): StreamedResponse
    {
        $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'status' => ['nullable', 'in:hadir,izin,sakit,alpha'],
        ]);

        $query = Attendance::with(['user.division'])
            ->when($request->start_date, fn ($q, $d) => $q->whereDate('date', '>=', $d))
            ->when($request->end_date, fn ($q, $d) => $q->whereDate('date', '<=', $d))
            ->when($request->division_id, fn ($q, $id) => $q->whereHas('user', fn ($u) => $u->where('division_id', $id)))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('date')
            ->orderBy('check_in');

        $fileName = 'rekap_absensi_'.now()->format('Ymd_His').'.csv';

        $headers = [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response()->stream(function () use ($query) {
            $handle = fopen('php://output', 'w');

            // UTF-8 BOM untuk Microsoft Excel
            fprintf($handle, chr(0xEF).chr(0xBB).chr(0xBF));

            fputcsv($handle, [
                'Tanggal',
                'Nama',
                'Email',
                'Divisi',
                'Jam Masuk',
                'Jam Pulang',
                'Status',
                'Terlambat',
                'Koordinat GPS',
                'Link Google Maps',
                'Catatan',
            ]);

            $query->chunk(250, function ($attendances) use ($handle) {
                foreach ($attendances as $row) {
                    $dateStr = $row->date instanceof \Illuminate\Support\Carbon
                        ? $row->date->format('Y-m-d')
                        : substr((string) $row->date, 0, 10);

                    $isLateText = $row->status === 'hadir'
                        ? ($row->is_late ? 'Ya (Terlambat)' : 'Tepat Waktu')
                        : '-';

                    $coordinates = ($row->latitude !== null && $row->longitude !== null)
                        ? "{$row->latitude}, {$row->longitude}"
                        : '-';

                    $mapsUrl = $row->maps_url ?? '-';

                    fputcsv($handle, [
                        $dateStr,
                        $row->user?->name ?? '-',
                        $row->user?->email ?? '-',
                        $row->user?->division?->name ?? 'Tanpa Divisi',
                        $row->check_in ?? '-',
                        $row->check_out ?? '-',
                        ucfirst($row->status),
                        $isLateText,
                        $coordinates,
                        $mapsUrl,
                        $row->notes ?? '-',
                    ]);
                }
            });

            fclose($handle);
        }, 200, $headers);
    }
}
