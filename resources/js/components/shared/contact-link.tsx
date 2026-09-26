import { Link } from '@inertiajs/react';

interface ContactLinkProps {
    id: number;
    name: string;
    className?: string;
}

/**
 * A customer/supplier's name, wherever it shows up outside their own page
 * (list columns, grid cards, another record's detail header) — links
 * straight to their profile instead of leaving the name as inert text.
 */
export default function ContactLink({ id, name, className }: ContactLinkProps) {
    return (
        <Link href={route('contacts.show', id)} className={className ?? 'underline-offset-2 hover:underline'} onClick={(e) => e.stopPropagation()}>
            {name}
        </Link>
    );
}
