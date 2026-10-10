<?php

namespace App\Http\Requests\Sales\Serial;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * Which serial of a sale line to act on (`from`), and for a correction the unit that was really sold (`to`).
 * Permission comes from the route's `module:sale,edit`.
 */
class SaleSerialRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'from' => ['required', 'string', 'max:255'],
            'to' => ['nullable', 'string', 'max:255'],
        ];
    }
}
