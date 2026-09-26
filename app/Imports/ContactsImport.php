<?php

namespace App\Imports;

use App\Actions\Contact\CreateContactAction;
use App\Imports\Concerns\BindsCellsAsStrings;
use App\Models\Contact;
use App\Support\ImportResult;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Validator;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

/**
 * Bulk supplier/customer upload for initial data migration (পর্ব ২). A
 * contact is matched by phone+type — re-importing the same file (or one
 * that overlaps an existing contact) skips the duplicate instead of
 * creating a second row for the same person.
 */
class ContactsImport implements ToCollection, WithCustomValueBinder, WithHeadingRow
{
    use BindsCellsAsStrings;

    public ImportResult $result;

    public function __construct(private CreateContactAction $createContact)
    {
        $this->result = new ImportResult;
    }

    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $rowNumber = $index + 2;
            $data = $row->toArray();

            $validator = Validator::make($data, [
                'name' => ['required', 'string', 'max:255'],
                'phone' => ['required', 'string', 'max:30'],
                'email' => ['nullable', 'email', 'max:255'],
                'type' => ['required', 'in:customer,supplier,both'],
            ]);

            if ($validator->fails()) {
                $this->result->addSkipped("Row {$rowNumber}: ".$validator->errors()->first());

                continue;
            }

            if (Contact::query()->where('phone', $data['phone'])->where('type', $data['type'])->exists()) {
                $this->result->addSkipped("Row {$rowNumber}: a {$data['type']} with phone \"{$data['phone']}\" already exists");

                continue;
            }

            $this->createContact->execute([
                'name' => $data['name'],
                'phone' => $data['phone'],
                'email' => $data['email'] ?? null,
                'address' => $data['address'] ?? null,
                'type' => $data['type'],
                'business_name' => $data['business_name'] ?? null,
                'entity_type' => ! empty($data['business_name']) ? 'business' : 'individual',
                'opening_balance' => $data['opening_balance'] ?? 0,
            ]);

            $this->result->addCreated();
        }
    }
}
