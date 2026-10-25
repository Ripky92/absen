<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\Division;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DivisionController extends Controller
{
    use ApiResponse;

    /** Bisa diakses semua user login (untuk dropdown/filter). */
    public function index(): JsonResponse
    {
        return $this->success(Division::withCount('users')->orderBy('name')->get(), 'Daftar divisi');
    }

    public function show(Division $division): JsonResponse
    {
        return $this->success($division->loadCount('users'), 'Detail divisi');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:divisions,name'],
            'description' => ['nullable', 'string'],
        ]);

        return $this->success(Division::create($data), 'Divisi berhasil dibuat', 201);
    }

    public function update(Request $request, Division $division): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255', 'unique:divisions,name,'.$division->id],
            'description' => ['nullable', 'string'],
        ]);

        $division->update($data);

        return $this->success($division->fresh(), 'Divisi berhasil diperbarui');
    }

    public function destroy(Division $division): JsonResponse
    {
        $division->delete();

        return $this->success(null, 'Divisi berhasil dihapus');
    }
}
