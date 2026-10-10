<?php

namespace App\Http\Requests\Common;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * The ticked row ids of a list page's "Delete selected". Authorization is the route's `module:x,delete`
 * middleware; whether each record may actually go is decided per record by the same rule as the single delete.
 */
class BulkDestroyRequest extends FormRequest
{
    public const MAX_IDS = 200;

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
            'ids' => ['required', 'array', 'min:1', 'max:'.self::MAX_IDS],
            'ids.*' => ['integer', 'distinct'],
        ];
    }
}
