<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\ApiResponse;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'role' => ['nullable', 'in:admin,user'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $users = User::with('division')
            ->when($request->division_id, fn ($q, $id) => $q->where('division_id', $id))
            ->when($request->role, fn ($q, $r) => $q->where('role', $r))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%")))
            ->latest()
            ->paginate($request->integer('per_page', 15));

        return $this->success($users, 'Daftar user');
    }

    public function show(User $user): JsonResponse
    {
        return $this->success($user->load('division'), 'Detail user');
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', Password::min(8)],
            'role' => ['sometimes', 'in:admin,user'],
            'avatar' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $user = User::create($data);

        return $this->success($user->load('division'), 'User berhasil dibuat', 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'division_id' => ['nullable', 'integer', 'exists:divisions,id'],
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', Password::min(8)],
            'role' => ['sometimes', 'in:admin,user'],
            'avatar' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        if ($user->id === $request->user()->id && isset($data['role']) && $data['role'] !== 'admin') {
            return $this->error('Anda tidak dapat menurunkan role akun sendiri.', 422);
        }

        $user->update($data);

        return $this->success($user->fresh('division'), 'User berhasil diperbarui');
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return $this->error('Anda tidak dapat menghapus akun sendiri.', 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return $this->success(null, 'User berhasil dihapus');
    }
}
