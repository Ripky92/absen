<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'division_id',
        'name',
        'email',
        'password',
        'role',
        'avatar',
        'phone',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'avatar_url',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    protected function avatarUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                if (! $this->avatar) {
                    return null;
                }
                if (str_starts_with($this->avatar, 'http://') || str_starts_with($this->avatar, 'https://')) {
                    return $this->avatar;
                }
                return asset(Storage::url($this->avatar));
            }
        );
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function division(): BelongsTo
    {
        return $this->belongsTo(Division::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Schedule::class, 'created_by');
    }

    public function sharedNotes(): HasMany
    {
        return $this->hasMany(SharedNote::class);
    }
}
