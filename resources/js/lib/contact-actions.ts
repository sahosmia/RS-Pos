import { type ContactType } from '@/types/models';

interface ContactStanding {
    type: ContactType;
    /** Positive: the contact owes us (receivable). Negative: we owe the contact (payable). */
    balance: number;
}

/**
 * Which money buttons make sense for a contact right now.
 * - We owe them (balance < 0): we pay them — only if they are a supplier/both; a pure customer's credit is refunded instead.
 * - They owe us (balance > 0): we collect from a customer/both; paying a pure supplier who owes us makes no sense.
 * - Nothing owed: an advance either way is fine, in whichever direction the contact's type allows.
 */
export function canPayDue({ type, balance }: ContactStanding): boolean {
    if (balance < 0) {
        return type !== 'customer';
    }

    if (balance > 0) {
        return type !== 'supplier';
    }

    return true;
}

/** A discount forgives what the contact owes us, so it exists only while they owe us — never when we owe them. */
export function canGiveDiscount({ balance }: ContactStanding): boolean {
    return balance > 0;
}
