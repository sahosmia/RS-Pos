<?php

namespace App\Http\Controllers;

use App\Http\Requests\Unit\UnitRequest;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;

class UnitController extends Controller
{
    public function store(UnitRequest $request): RedirectResponse
    {
        Unit::create($request->validated());

        return back();
    }

    public function update(UnitRequest $request, Unit $unit): RedirectResponse
    {
        $unit->update($request->validated());

        return back();
    }

    /**
     * Units already used by a product are kept.
     */
    public function destroy(Unit $unit): RedirectResponse
    {
        if ($unit->products()->exists()) {
            return back()->withErrors([
                'unit' => 'This unit is in use by a product and cannot be deleted.',
            ]);
        }

        $unit->delete();

        return back();
    }
}
