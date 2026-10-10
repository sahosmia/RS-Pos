<?php

namespace App\Http\Requests\Products\ServiceRequest;

use App\Models\SaleItem;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreServiceRequestRequest extends FormRequest
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
        $saleItem = SaleItem::find($this->input('sale_item_id'));
        $isInstallation = $this->input('type') === 'installation';

        // Recomputed the same way CreateServiceRequestAction will — never trust a client-submitted free/paid flag,
        // only whether an amount and account are required here. An installation is never free: its charge is
        // optional (the invoice may already have billed it), but any charge needs an account.
        $requiredIfPaid = ! $isInstallation && $saleItem !== null && ! $saleItem->isNextServiceFree();
        $hasCharge = (float) $this->input('charge_amount', 0) > 0;

        return [
            'type' => ['nullable', Rule::in(['service', 'installation'])],
            'sale_item_id' => ['required', 'integer', 'exists:sale_items,id'],
            'request_date' => ['required', 'date'],
            'service_date' => ['nullable', 'date'],
            'staff_id' => ['nullable', 'integer', 'exists:staff,id'],
            'account_id' => [($requiredIfPaid || ($isInstallation && $hasCharge)) ? 'required' : 'nullable', 'integer', 'exists:accounts,id'],
            // A free service is sent with a charge of 0 (the form fills it in); only a paid one needs a real amount.
            'charge_amount' => $requiredIfPaid ? ['required', 'numeric', 'min:0.01'] : ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:pending,scheduled,completed,cancelled'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'charge_amount.required' => 'This service is no longer free (the free visits are used up), so enter the charge.',
            'charge_amount.min' => 'This service is no longer free (the free visits are used up), so enter a charge above 0.',
            'account_id.required' => 'Choose the account the charge was paid into.',
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $saleItem = SaleItem::with('sale', 'product')->find($this->input('sale_item_id'));

            if ($saleItem === null) {
                return;
            }

            if ($saleItem->sale->status->value !== 'confirmed') {
                $validator->errors()->add('sale_item_id', 'Only a confirmed invoice can have a service request.');

                return;
            }

            if ($this->input('type') === 'installation' && ! $saleItem->product->has_installation_service) {
                $validator->errors()->add('type', "{$saleItem->product->name} has no installation service.");
            }
        }];
    }
}
