import { cn } from '@/lib/utils';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

/** What the shop has set up in Business Settings → Branding, with the shop name as the final fallback. */
export function useShopBrand() {
    const { shop } = usePage<SharedData>().props;

    return {
        name: shop.shop_name?.trim() || 'Sahos POS',
        logo: shop.shop_logo_url,
        logoSmall: shop.shop_logo_small_url,
    };
}

/** The first letter of the shop name in a coloured square — the last-resort mark when no image was uploaded. */
export function BrandInitial({ className }: { className?: string }) {
    const { name } = useShopBrand();

    return (
        <div
            className={cn(
                'bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold uppercase',
                className,
            )}
        >
            {name.charAt(0)}
        </div>
    );
}

/**
 * The full brand mark: the large logo when there is one; otherwise the small logo (or the shop's initial)
 * beside the shop name. Used wherever there is room for it — the open sidebar, the login page.
 */
export function BrandLogo({ className, imageClassName, nameClassName }: { className?: string; imageClassName?: string; nameClassName?: string }) {
    const { name, logo, logoSmall } = useShopBrand();

    if (logo) {
        return <img src={logo} alt={name} className={cn('h-8 w-auto max-w-40 object-contain', imageClassName)} />;
    }

    return (
        <div className={cn('flex min-w-0 items-center gap-2', className)}>
            {logoSmall ? <img src={logoSmall} alt="" className="size-8 shrink-0 object-contain" /> : <BrandInitial />}
            <span className={cn('truncate text-sm leading-none font-semibold', nameClassName)}>{name}</span>
        </div>
    );
}
