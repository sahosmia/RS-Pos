import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { useTranslation } from '@/hooks/use-translation';
import { router } from '@inertiajs/react';
import { Save, X } from 'lucide-react';
import { type MouseEventHandler } from 'react';

interface ActionBarProps {
    mode: 'create' | 'edit';
    processing: boolean;
}

function useSaveLabel({ mode, processing }: ActionBarProps): string {
    const { t } = useTranslation();

    if (processing) return t('common', 'saving');

    return mode === 'create' ? t('productForm', 'create_product') : t('productForm', 'save_changes');
}

function CancelButton() {
    const { t } = useTranslation();

    return (
        <Button type="button" variant="ghost" onClick={() => router.get(route('products.index'))} className="gap-1.5">
            <X className="size-4" />
            {t('common', 'cancel')}
        </Button>
    );
}

/** Cancel / Save row under the form (sm screens and up). Lives inside the `<form>`, so Save is a plain submit. */
export function DesktopActionBar(props: ActionBarProps) {
    const label = useSaveLabel(props);

    return (
        <div className="hidden items-center justify-between gap-2 border-t pt-4 sm:flex">
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
                <Kbd>⌘</Kbd>
                <Kbd>S</Kbd>
                to save
            </p>
            <div className="flex items-center gap-2">
                <CancelButton />
                <Button type="submit" disabled={props.processing} className="gap-1.5">
                    <Save className="size-4" />
                    {label}
                </Button>
            </div>
        </div>
    );
}

/** Sticky Cancel / Save bar pinned to the bottom of small screens. Rendered outside the `<form>`, so Save calls `onSave`. */
export function MobileActionBar({ onSave, ...props }: ActionBarProps & { onSave: MouseEventHandler<HTMLButtonElement> }) {
    const label = useSaveLabel(props);

    return (
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t p-3 shadow-lg backdrop-blur sm:hidden">
            <CancelButton />
            <Button type="submit" disabled={props.processing} onClick={onSave} className="flex-1 gap-1.5">
                <Save className="size-4" />
                {label}
            </Button>
        </div>
    );
}
