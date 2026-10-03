import { BrandInitial, BrandLogo, useShopBrand } from '@/components/brand-logo';

/**
 * The sidebar brand, in both of the sidebar's states (pure CSS — the sidebar root carries
 * `data-collapsible="icon"` while it is collapsed to icons):
 *  - open: the large logo, or the small logo/initial plus the shop name
 *  - collapsed: only the small logo, or the shop's initial
 */
export default function AppLogo() {
    const { name, logoSmall } = useShopBrand();

    return (
        <>
            <div className="flex min-w-0 flex-1 items-center group-data-[collapsible=icon]:hidden">
                <BrandLogo />
            </div>

            <div className="hidden items-center justify-center group-data-[collapsible=icon]:flex">
                {logoSmall ? <img src={logoSmall} alt={name} className="size-8 object-contain" /> : <BrandInitial />}
            </div>
        </>
    );
}
