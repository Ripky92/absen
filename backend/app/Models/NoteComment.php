<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NoteComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'shared_note_id',
        'user_id',
        'comment',
    ];

    public function sharedNote(): BelongsTo
    {
        return $this->belongsTo(SharedNote::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
