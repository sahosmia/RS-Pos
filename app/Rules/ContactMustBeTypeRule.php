<?php

namespace App\Rules;

use App\Models\Contact;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A Sale needs a customer, a Purchase needs a supplier — `both` always
 * satisfies either.
 */
class ContactMustBeTypeRule implements ValidationRule
{
    public function __construct(private string $requiredType) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $contact = Contact::find($value);

        if (! $contact || ! in_array($contact->type->value, [$this->requiredType, 'both'], true)) {
            $fail("This contact isn't a {$this->requiredType}.");
        }
    }
}
