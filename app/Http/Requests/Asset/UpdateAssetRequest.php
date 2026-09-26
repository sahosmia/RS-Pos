<?php

namespace App\Http\Requests\Asset;

use App\Models\Asset;
use App\Rules\AssetOpeningValueEditable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateAssetRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var Asset $asset */
        $asset = $this->route('asset');

        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'purchase_date' => ['nullable', 'date'],
            'opening_value' => ['required', 'numeric', 'min:0', new AssetOpeningValueEditable($asset)],
        ];
    }
}
