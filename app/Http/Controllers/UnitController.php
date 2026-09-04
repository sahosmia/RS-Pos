<?php

namespace App\Http\Controllers;

use App\Http\Requests\Unit\UnitRequest;
use App\Models\Unit;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class UnitController extends Controller
{
    public function index(): Response
    {
        $units = Unit::query()->withCount('products')->orderBy('name')->get();

        return Inertia::render('units/index', [
            'units' => $units->map(fn (Unit $unit) => [
                'id' => $unit->id,
                'name' => $unit->name,
                'products_count' => $unit->products_count,
                'can_delete' => $unit->products_count === 0,
            ]),
        ]);
    }

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
