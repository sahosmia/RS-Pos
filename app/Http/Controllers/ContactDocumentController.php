<?php

namespace App\Http\Controllers;

use App\Http\Requests\Contact\StoreContactDocumentRequest;
use App\Models\Contact;
use Illuminate\Http\RedirectResponse;
use Spatie\MediaLibrary\MediaCollections\Models\Media;

class ContactDocumentController extends Controller
{
    public function store(StoreContactDocumentRequest $request, Contact $contact): RedirectResponse
    {
        $contact->addMediaFromRequest('file')->toMediaCollection('documents');

        return back();
    }

    public function destroy(Contact $contact, Media $media): RedirectResponse
    {
        abort_unless($media->model_id === $contact->id && $media->model_type === Contact::class, 404);

        $media->delete();

        return back();
    }
}
