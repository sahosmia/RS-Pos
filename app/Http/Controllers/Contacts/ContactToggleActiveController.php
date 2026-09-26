<?php

namespace App\Http\Controllers\Contacts;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use Illuminate\Http\RedirectResponse;

class ContactToggleActiveController extends Controller
{
    /**
     * Flips a contact's active flag from the list page's row-action menu —
     * doesn't touch anything else, so it skips the full contact form/validation.
     */
    public function store(Contact $contact): RedirectResponse
    {
        $contact->update(['is_active' => ! $contact->is_active]);

        return back();
    }
}
