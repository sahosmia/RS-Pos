<?php

namespace App\Http\Requests\Products\ServiceRequest;

use App\Models\SaleItem;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

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
        // Recomputed the same way CreateServiceRequestAction will — never
        // trust a client-submitted free/paid flag, only whether an amount
        // and account are required here.
        $saleItem = SaleItem::find($this->input('sale_item_id'));
        $requiredIfPaid = $saleItem !== null && ! $saleItem->isNextServiceFree();

        return [
            'sale_item_id' => ['required', 'integer', 'exists:sale_items,id'],
            'request_date' => ['required', 'date'],
            'service_date' => ['nullable', 'date'],
            'staff_id' => ['nullable', 'integer', 'exists:staff,id'],
            'account_id' => [$requiredIfPaid ? 'required' : 'nullable', 'integer', 'exists:accounts,id'],
            'charge_amount' => [$requiredIfPaid ? 'required' : 'nullable', 'numeric', 'min:0.01'],
            'status' => ['nullable', 'in:pending,scheduled,completed,cancelled'],
            'note' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
