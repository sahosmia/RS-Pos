<?php

namespace App\Http\Requests\Products\Product;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreStockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A serial-tracked product is adjusted by naming the units (gone / found), never by typing a count.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($this->tracksSerials() && $this->input('remove_serials', []) === [] && $this->input('add_serials', []) === []) {
                    $validator->errors()->add('remove_serials', 'Pick the units that are gone, or enter the serial numbers that were found.');
                }
            },
        ];
    }

    public function tracksSerials(): bool
    {
        return (bool) $this->route('product')?->track_serial_number;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $product = $this->route('product');
        $needsCost = $product && $product->avg_cost <= 0;

        if ($this->tracksSerials()) {
            return [
                'remove_serials' => ['nullable', 'array'],
                'remove_serials.*' => ['string', 'max:100'],
                'add_serials' => ['nullable', 'array'],
                'add_serials.*' => ['string', 'max:100'],
                'reason' => ['required', 'string', 'max:255'],
                'unit_cost' => ['nullable', 'numeric', 'gt:0'],
            ];
        }

        return [
            'quantity' => ['required', 'numeric', 'min:0'],
            'reason' => ['required', 'string', 'max:255'],
            'unit_cost' => [$needsCost ? 'required' : 'nullable', 'numeric', 'gt:0'],
        ];
    }
}
