<?php

namespace App\Http\Controllers\Staff;

use App\Actions\Staff\AddStaffTransactionAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Staff\StaffTransactionRequest;
use App\Models\Staff;
use Illuminate\Http\RedirectResponse;

class StaffTransactionController extends Controller
{
    public function store(StaffTransactionRequest $request, Staff $staff, AddStaffTransactionAction $addTransaction): RedirectResponse
    {
        $addTransaction->execute($staff, $request->validated());

        return to_route('staff.show', $staff);
    }
}
