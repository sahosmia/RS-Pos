<?php

namespace App\Http\Requests\Products\Unit;

use App\Models\Unit;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UnitRequest extends FormRequest
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
        /** @var Unit|null $unit */
        $unit = $this->route('unit');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('units', 'name')->ignore($unit?->id)],
        ];
    }
}
