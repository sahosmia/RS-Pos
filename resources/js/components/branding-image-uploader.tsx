import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface BrandingImageUploaderProps {
    /** One of the backend's `Settings::BRANDING_SLOTS` keys: `logo`, `logo-small` or `favicon`. */
    slot: 'logo' | 'logo-small' | 'favicon';
    label: string;
    description: string;
    /** Current image's public URL, or null when none has been uploaded. */
    imageUrl: string | null;
    accept?: string;
    /** Size of the preview box — match the shape the image is shown in (wide for a logo, square for an icon). */
    previewClassName?: string;
}

/**
 * Uploads/removes one Branding image right away on its own endpoints — it deliberately isn't part of the
 * Business Settings form, so choosing a file never depends on pressing "Save".
 */
export default function BrandingImageUploader({
    slot,
    label,
    description,
    imageUrl,
    accept = 'image/png,image/jpeg,image/webp',
    previewClassName = 'h-16 w-40',
}: BrandingImageUploaderProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputId = `branding-${slot}`;

    const upload = (file: File | null) => {
        if (!file) {
            return;
        }

        setError(null);
        router.post(
            route('business-settings.branding.store', slot),
            { image: file },
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setBusy(true),
                onSuccess: () => toast.success(`${label} updated.`),
                onError: (errors) => setError(errors.image ?? 'Could not upload the image.'),
                onFinish: () => {
                    setBusy(false);

                    if (inputRef.current) {
                        inputRef.current.value = '';
                    }
                },
            },
        );
    };

    const remove = () => {
        setError(null);
        router.delete(route('business-settings.branding.destroy', slot), {
            preserveScroll: true,
            onStart: () => setBusy(true),
            onSuccess: () => toast.success(`${label} removed.`),
            onFinish: () => setBusy(false),
        });
    };

return (
    <div className="flex min-w-0 flex-col rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5">

        {/* Card header */}
        <div className="mb-4 flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
                <Label htmlFor={inputId} className="text-sm font-semibold">
                    {label}
                </Label>
                <p className="text-xs leading-relaxed text-muted-foreground">
                    {description}
                </p>
            </div>

            <span
                className={cn(
                    'shrink-0 rounded-full px-2 py-1 text-[10px] font-medium sm:text-xs',
                    imageUrl
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground',
                )}
            >
                {imageUrl ? 'Uploaded' : 'Empty'}
            </span>
        </div>

        {/* Hidden file input */}
        <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={accept}
            className="sr-only"
            disabled={busy}
            onChange={(e) => upload(e.target.files?.[0] ?? null)}
        />

        {/* Image preview */}
        <div className="flex min-h-36 flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/30 p-4">
            <div
                className={cn(
                    'flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-background',
                    previewClassName,
                )}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={label}
                        className="max-h-full max-w-full object-contain p-2"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImagePlus className="size-7 opacity-40" />
                        <span className="text-xs">No image</span>
                    </div>
                )}
            </div>

            <p className="text-center text-xs text-muted-foreground">
                {imageUrl ? 'Current image preview' : 'Upload an image to preview'}
            </p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
                type="button"
                variant="default"
                size="sm"
                disabled={busy}
                onClick={() => inputRef.current?.click()}
                className="flex-1 gap-1.5"
            >
                <ImagePlus className="size-4" />
                {busy ? 'Uploading...' : imageUrl ? 'Replace' : 'Upload'}
            </Button>

            {imageUrl && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={remove}
                    className="flex-1 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                    <Trash2 className="size-4" />
                    Remove
                </Button>
            )}
        </div>

        {error && (
            <p className="mt-3 text-xs text-destructive" role="alert">
                {error}
            </p>
        )}
    </div>
);



}
