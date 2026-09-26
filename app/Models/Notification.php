<?php

namespace App\Models;

use App\Enums\NotificationType;
use Database\Factories\NotificationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Hand-rolled alert row (low stock / due payment / expense due / loan
 * repayment) — deliberately separate from Laravel's built-in Notifiable
 * database channel (different schema, and nothing in this app calls
 * `->notify()`), populated only by the daily `notifications:generate` job
 * and the EMI-overdue job.
 */
class Notification extends Model
{
    /** @use HasFactory<NotificationFactory> */
    use HasFactory;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'type',
        'title',
        'message',
        'reference_type',
        'reference_id',
        'is_read',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => NotificationType::class,
            'is_read' => 'boolean',
        ];
    }

    /**
     * Whether an unread notification already exists for this type+reference
     * — the daily generator checks this first so it doesn't spam a fresh
     * duplicate every time it runs while the underlying condition persists.
     */
    public static function existsUnreadFor(NotificationType $type, string $referenceType, int $referenceId): bool
    {
        return static::query()
            ->where('type', $type)
            ->where('reference_type', $referenceType)
            ->where('reference_id', $referenceId)
            ->where('is_read', false)
            ->exists();
    }
}
