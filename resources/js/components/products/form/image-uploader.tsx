import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/use-translation';
import { ImagePlus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface ImageUploaderProps {
    /** The newly chosen file, if any. */
    file: File | null;
    /** The image already saved on the product — what's shown (and restored on "Remove") when no new file is chosen. */
    savedUrl: string | null;
    onChange: (file: File | null) => void;
    error?: string;
}

/** Click-to-upload image field with a preview and Replace / Remove once something is chosen. */
export function ImageUploader({ file, savedUrl, onChange, error }: ImageUploaderProps) {
    const { t } = useTranslation();
    const inputRef = useRef<HTMLInputElement>(null);
    const [objectUrl, setObjectUrl] = useState<string | null>(null);

    // Preview URL for the chosen file — released when the file changes, and the native input cleared when the
    // form resets, so the same file can be picked again.
    useEffect(() => {
        if (!file) {
            setObjectUrl(null);
            if (inputRef.current) inputRef.current.value = '';
            return;
        }

        const url = URL.createObjectURL(file);
        setObjectUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const preview = objectUrl ?? savedUrl;
    const openPicker = () => inputRef.current?.click();

    return (
        <div className="grid gap-2">
            <Label htmlFor="image">{t('productForm', 'product_image')}</Label>

            <input
                ref={inputRef}
                id="image"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
            />

            {preview ? (
                <div className="bg-card flex items-start gap-4 rounded-lg border p-3">
                    <img src={preview} alt="Preview" className="size-24 shrink-0 rounded-md border object-cover" />
                    <div className="flex flex-1 flex-col gap-2">
                        <div className="space-y-0.5">
                            <div className="text-sm font-medium">Current image</div>
                            <p className="text-muted-foreground text-xs">PNG, JPG — max ~2MB recommended</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={openPicker} className="gap-1.5">
                                <ImagePlus className="size-3.5" />
                                Replace
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => onChange(null)}
                                className="text-destructive hover:text-destructive gap-1.5"
                            >
                                <X className="size-3.5" />
                                Remove
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={openPicker}
                    className="bg-muted/20 hover:border-primary/40 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 transition-colors"
                >
                    <div className="bg-card ring-border flex size-11 items-center justify-center rounded-full ring-1">
                        <ImagePlus className="text-muted-foreground size-5" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium">Click to upload an image</p>
                        <p className="text-muted-foreground text-xs">PNG or JPG · up to 2MB</p>
                    </div>
                </button>
            )}
            <InputError message={error} />
        </div>
    );
}
