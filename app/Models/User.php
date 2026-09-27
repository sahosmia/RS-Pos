<?php

namespace App\Models;

use App\Enums\Appearance;
use App\Enums\Locale;
use App\Enums\ThemeColor;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    use HasRoles;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'username',
        'password',
        'locale',
        'theme_color',
        'appearance',
        'is_active',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'locale' => Locale::class,
            'theme_color' => ThemeColor::class,
            'appearance' => Appearance::class,
            'is_active' => 'boolean',
        ];
    }
}
