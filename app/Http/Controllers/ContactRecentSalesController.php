<?php

namespace App\Http\Controllers;

use App\Enums\SaleStatus;
use App\Models\Contact;
use Illuminate\Http\JsonResponse;

class ContactRecentSalesController extends Controller
{
    /**
     * A customer's last few confirmed sales — surfaced on the Add Sale page
     * so "same as last time" is a one-click re-add, not a detour to a
     * separate page.
     */
    public function __invoke(Contact $contact): JsonResponse
    {
        $sales = $contact->sales()
            ->where('status', SaleStatus::Confirmed)
            ->with('items.product:id,name,sku,selling_price')
            ->orderByDesc('sale_date')
            ->orderByDesc('id')
            ->limit(5)
            ->get();

        return response()->json([
            'sales' => $sales->map(fn ($sale) => [
                'id' => $sale->id,
                'invoice_no' => $sale->invoice_no,
                'sale_date' => $sale->sale_date->toDateString(),
                'total_amount' => $sale->total_amount,
                'items' => $sale->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'product_name' => $item->product->name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->product->selling_price,
                ]),
            ]),
        ]);
    }
}
