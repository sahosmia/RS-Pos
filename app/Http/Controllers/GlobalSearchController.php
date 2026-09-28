<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\Expense;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    /**
     * Cmd+K command palette — Product/Contact/Sale/Purchase/Expense at once,
     * capped at 5 per module so the palette stays scannable.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:1', 'max:255'],
        ]);

        $search = $validated['q'];

        $user = $request->user();

        $products = collect();
        if ($user->can('product.view')) {
            $products = Product::query()
                ->where(function (Builder $query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('sku', 'like', "%{$search}%")
                        ->orWhere('barcode', 'like', "%{$search}%");
                })
                ->orderBy('name')
                ->limit(5)
                ->get(['id', 'name', 'sku', 'selling_price']);
        }

        $contacts = collect();
        if ($user->can('contact.view')) {
            $contacts = Contact::query()
                ->where(function (Builder $query) use ($search) {
                    $query->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('business_name', 'like', "%{$search}%");
                })
                ->orderBy('name')
                ->limit(5)
                ->get(['id', 'name', 'phone']);
        }

        $sales = collect();
        if ($user->can('sale.view_all')) {
            $sales = Sale::query()
                ->where('invoice_no', 'like', "%{$search}%")
                ->with('customer:id,name')
                ->orderByDesc('sale_date')
                ->limit(5)
                ->get(['id', 'customer_id', 'invoice_no', 'sale_date', 'total_amount']);
        } elseif ($user->can('sale.view_own')) {
            $sales = Sale::query()
                ->where('created_by', $user->id)
                ->where('invoice_no', 'like', "%{$search}%")
                ->with('customer:id,name')
                ->orderByDesc('sale_date')
                ->limit(5)
                ->get(['id', 'customer_id', 'invoice_no', 'sale_date', 'total_amount']);
        }

        $purchases = collect();
        if ($user->can('purchase.view_all')) {
            $purchases = Purchase::query()
                ->where('invoice_no', 'like', "%{$search}%")
                ->with('supplier:id,name')
                ->orderByDesc('purchase_date')
                ->limit(5)
                ->get(['id', 'supplier_id', 'invoice_no', 'purchase_date', 'total_amount']);
        } elseif ($user->can('purchase.view_own')) {
            $purchases = Purchase::query()
                ->where('created_by', $user->id)
                ->where('invoice_no', 'like', "%{$search}%")
                ->with('supplier:id,name')
                ->orderByDesc('purchase_date')
                ->limit(5)
                ->get(['id', 'supplier_id', 'invoice_no', 'purchase_date', 'total_amount']);
        }

        $expenses = collect();
        if ($user->can('expense.view')) {
            $expenses = Expense::query()
                ->where('note', 'like', "%{$search}%")
                ->with('category:id,name')
                ->orderByDesc('expense_date')
                ->limit(5)
                ->get(['id', 'expense_category_id', 'note', 'expense_date', 'total_amount']);
        }

        return response()->json([
            // Products/Expenses have no dedicated "show" page (Phase 6/11 kept
            // them list+modal/edit only) — link to the closest equivalent.
            'products' => $products->map(fn (Product $product) => [
                'id' => $product->id,
                'title' => $product->name,
                'subtitle' => $product->sku,
                'amount' => $product->selling_price,
                'url' => route('products.edit', $product),
            ]),
            'contacts' => $contacts->map(fn (Contact $contact) => [
                'id' => $contact->id,
                'title' => $contact->name,
                'subtitle' => $contact->phone,
                'amount' => null,
                'url' => route('contacts.show', $contact),
            ]),
            'sales' => $sales->map(fn (Sale $sale) => [
                'id' => $sale->id,
                'title' => $sale->invoice_no,
                'subtitle' => $sale->customer?->name,
                'amount' => $sale->total_amount,
                'url' => route('sales.show', $sale),
            ]),
            'purchases' => $purchases->map(fn (Purchase $purchase) => [
                'id' => $purchase->id,
                'title' => $purchase->invoice_no,
                'subtitle' => $purchase->supplier?->name,
                'amount' => $purchase->total_amount,
                'url' => route('purchases.show', $purchase),
            ]),
            'expenses' => $expenses->map(fn (Expense $expense) => [
                'id' => $expense->id,
                'title' => $expense->category?->name ?? 'Expense',
                'subtitle' => $expense->note,
                'amount' => $expense->total_amount,
                // No expenses.show/edit page — it's edited via a modal on the index list.
                'url' => route('expenses.index'),
            ]),
        ]);
    }
}
