<?php

namespace App\Http\Requests\Staff;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreStaffRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:500'],
            'designation' => ['nullable', 'string', 'max:255'],
            'joining_date' => ['nullable', 'date'],
            'salary_amount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:active,inactive'],
            'investor_id' => ['nullable', 'integer', 'exists:investors,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
