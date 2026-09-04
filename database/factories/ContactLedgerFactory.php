<?php

namespace Database\Factories;

use App\Enums\ContactLedgerType;
use App\Models\Contact;
use App\Models\ContactLedger;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContactLedger>
 */
class ContactLedgerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'contact_id' => Contact::factory(),
            'type' => ContactLedgerType::OpeningBalance,
            'amount' => fake()->randomFloat(2, -5000, 5000),
            'reference_type' => null,
            'reference_id' => null,
            'note' => null,
        ];
    }
}
