import { type LookupKind, type ProductFormApi } from '@/components/products/form/types';
import { type Brand, type Category, type Unit } from '@/types/models';
import { useEffect, useState } from 'react';

interface Options {
    form: ProductFormApi;
    categories: Category[];
    brands: Brand[];
    units: Unit[];
}

/**
 * State for the "+" buttons next to Category / Brand / Unit: which manager modal is open, and — once something
 * was created in it — selecting that new item in the form as soon as it shows up in the refreshed list.
 */
export function useLookupAutoSelect({ form, categories, brands, units }: Options) {
    const [active, setActive] = useState<LookupKind | null>(null);
    // The name of what was just created; the refreshed list arrives a moment later (the create is an Inertia visit).
    const [pending, setPending] = useState<{ kind: LookupKind; name: string } | null>(null);

    useEffect(() => {
        if (!pending) {
            return;
        }

        const list: { id: number; name: string }[] = { category: categories, brand: brands, unit: units }[pending.kind];
        const wanted = pending.name.trim().toLowerCase();
        const created = list.filter((item) => item.name.trim().toLowerCase() === wanted).sort((a, b) => b.id - a.id)[0];

        if (!created) {
            return; // the refreshed list hasn't arrived yet — runs again when it does
        }

        if (pending.kind === 'category') {
            form.setData('category_id', created.id);
        } else if (pending.kind === 'brand') {
            form.setData('brand_id', created.id);
        } else {
            form.setData('unit_id', created.id);
        }

        setPending(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pending, categories, brands, units]);

    return {
        active,
        open: (kind: LookupKind) => setActive(kind),
        close: () => setActive(null),
        onCreated: (kind: LookupKind, name: string) => {
            setPending({ kind, name });
            setActive(null);
        },
    };
}
