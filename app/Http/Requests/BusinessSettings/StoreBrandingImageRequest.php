<?php

namespace App\Http\Requests\BusinessSettings;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

/**
 * One image for one of the Branding slots (see `Settings::BRANDING_SLOTS`). SVG is deliberately not
 * accepted — it can carry scripts.
 */
class StoreBrandingImageRequest extends FormRequest
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
        // Favicons are tiny and may be a real .ico file, which Laravel's `image` rule does not recognise.
        $rules = $this->route('slot') === 'favicon'
            ? ['required', 'file', 'mimes:png,ico,webp,jpg,jpeg', 'max:512']
            : ['required', 'image', 'mimes:png,jpg,jpeg,webp', 'max:2048'];

        return ['image' => $rules];
    }
}
