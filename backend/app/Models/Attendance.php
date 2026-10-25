<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Attendance extends Model
{
    protected $fillable = [
        'user_id',
        'date',
        'check_in',
        'check_out',
        'status',
        'notes',
        'attachment',
        'latitude',
        'longitude',
        'is_late',
    ];

    protected $appends = [
        'attachment_url',
        'maps_url',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date:Y-m-d',
            'is_late' => 'boolean',
            'latitude' => 'float',
            'longitude' => 'float',
        ];
    }

    protected function mapsUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                if ($this->latitude === null || $this->longitude === null) {
                    return null;
                }
                return "https://www.google.com/maps?q={$this->latitude},{$this->longitude}";
            }
        );
    }

    protected function attachmentUrl(): Attribute
    {
        return Attribute::make(
            get: function () {
                if (! $this->attachment) {
                    return null;
                }
                if (str_starts_with($this->attachment, 'http://') || str_starts_with($this->attachment, 'https://')) {
                    return $this->attachment;
                }
                return asset(Storage::url($this->attachment));
            }
        );
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
