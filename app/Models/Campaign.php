<?php

namespace App\Models;

use App\Enums\CampaignStatus;
use App\Enums\CampaignTargetType;
use App\Enums\MessageChannel;
use App\Models\Concerns\HasCreator;
use App\Models\Concerns\LogsActivityDefaults;
use Database\Factories\CampaignFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A bulk send — either the Contacts-page "select some contacts and send"
 * flow (target_type = custom_selection) or a broader all-customers/
 * customer-group broadcast. Recipients live in `campaign_recipients`;
 * each actual send is additionally logged into `message_logs`.
 */
class Campaign extends Model
{
    use HasCreator;

    /** @use HasFactory<CampaignFactory> */
    use HasFactory;

    use LogsActivityDefaults;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'title',
        'message',
        'channel',
        'target_type',
        'target_group_id',
        'status',
        'created_by',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'channel' => MessageChannel::class,
            'target_type' => CampaignTargetType::class,
            'status' => CampaignStatus::class,
        ];
    }

    /**
     * @return BelongsTo<CustomerGroup, $this>
     */
    public function targetGroup(): BelongsTo
    {
        return $this->belongsTo(CustomerGroup::class, 'target_group_id');
    }

    /**
     * @return HasMany<CampaignRecipient, $this>
     */
    public function recipients(): HasMany
    {
        return $this->hasMany(CampaignRecipient::class);
    }
}
