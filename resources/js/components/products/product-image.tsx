import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

/** Shown whenever a product has no photo, or its photo cannot be loaded (file missing, broken link). */
export const DEFAULT_PRODUCT_IMAGE = '/images/default.png';

interface ProductImageProps {
    src: string | null | undefined;
    alt: string;
    className?: string;
}

/** A product photo that quietly falls back to the default picture instead of a broken-image icon. */
export function ProductImage({ src, alt, className }: ProductImageProps) {
    const [failed, setFailed] = useState(false);

    // A new photo (e.g. after the product is edited) gets a fresh chance to load.
    useEffect(() => setFailed(false), [src]);

    return (
        <img src={failed || !src ? DEFAULT_PRODUCT_IMAGE : src} alt={alt} onError={() => setFailed(true)} className={cn('object-cover', className)} />
    );
}
