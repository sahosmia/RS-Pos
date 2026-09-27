<?php

namespace App\Http\Requests\Contacts\CustomerGroup;

use App\Models\CustomerGroup;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CustomerGroupRequest extends FormRequest
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
        /** @var CustomerGroup|null $customerGroup */
        $customerGroup = $this->route('customer_group');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('customer_groups', 'name')->ignore($customerGroup?->id)],
        ];
    }
}
