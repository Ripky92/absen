<?php

namespace Database\Seeders;

use App\Models\Division;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $it = Division::firstOrCreate(
            ['name' => 'IT'],
            ['description' => 'Divisi Teknologi Informasi']
        );

        $humas = Division::firstOrCreate(
            ['name' => 'Humas'],
            ['description' => 'Divisi Hubungan Masyarakat']
        );

        Division::firstOrCreate(
            ['name' => 'Keuangan'],
            ['description' => 'Divisi Keuangan']
        );

        // Password di-hash otomatis oleh cast 'hashed' pada model User.
        User::firstOrCreate(
            ['email' => 'admin@mail.com'],
            [
                'division_id' => $it->id,
                'name' => 'Admin',
                'password' => 'password123',
                'role' => 'admin',
            ]
        );

        User::firstOrCreate(
            ['email' => 'user1@mail.com'],
            [
                'division_id' => $it->id,
                'name' => 'User Satu',
                'password' => 'password123',
                'role' => 'user',
            ]
        );

        User::firstOrCreate(
            ['email' => 'user2@mail.com'],
            [
                'division_id' => $humas->id,
                'name' => 'User Dua',
                'password' => 'password123',
                'role' => 'user',
            ]
        );
    }
}
