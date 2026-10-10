import { FormField, fieldAriaProps } from '@/components/form/form-field';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CheckCircle2, FileSpreadsheet, UploadCloud } from 'lucide-react';
import { type DragEvent, type ReactNode, useRef, useState } from 'react';

interface FileDropzoneProps {
    id: string;
    /** Shown above the zone. */
    label?: ReactNode;
    required?: boolean;
    /** Comma-separated extensions, e.g. `.xlsx,.xls,.csv`. Used for the file picker and to reject wrong files on drop. */
    accept: string;
    file: File | null;
    onFileChange: (file: File | null) => void;
    /** Server/validation message for this field. */
    error?: string;
    helperText?: ReactNode;
    /** Max size in MB for the "up to N MB" hint and a client-side check (the server still enforces it). */
    maxSizeMb?: number;
    disabled?: boolean;
    className?: string;
}

const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`);

/**
 * Large drag-and-drop file area: drop a file or click anywhere to browse (a real, keyboard-focusable
 * `<input type="file">` sits underneath). Shows the chosen file with Replace / Remove, and surfaces both
 * server errors and its own "wrong type / too big" checks in the field's error slot.
 */
export function FileDropzone({ id, label, required, accept, file, onFileChange, error, helperText, maxSizeMb, disabled = false, className }: FileDropzoneProps) {
    const [dragging, setDragging] = useState(false);
    const [localError, setLocalError] = useState<string>();
    const inputRef = useRef<HTMLInputElement>(null);

    const extensions = accept.split(',').map((item) => item.trim().toLowerCase());
    const shownError = error ?? localError;
    const aria = fieldAriaProps(id, shownError, helperText);

    const choose = (candidate: File | null) => {
        setLocalError(undefined);

        if (!candidate) {
            onFileChange(null);

            return;
        }

        const extension = `.${candidate.name.split('.').pop()?.toLowerCase() ?? ''}`;

        if (!extensions.includes(extension)) {
            setLocalError(`That file type isn't supported. Use ${extensions.join(', ')}.`);

            return;
        }

        if (maxSizeMb && candidate.size > maxSizeMb * 1024 * 1024) {
            setLocalError(`The file is too large. The limit is ${maxSizeMb} MB.`);

            return;
        }

        onFileChange(candidate);
    };

    const remove = () => {
        if (inputRef.current) {
            inputRef.current.value = '';
        }

        choose(null);
    };

    const onDrop = (event: DragEvent<HTMLLabelElement>) => {
        event.preventDefault();
        setDragging(false);

        if (!disabled) {
            choose(event.dataTransfer.files?.[0] ?? null);
        }
    };

    return (
        <FormField id={id} label={label} required={required} error={shownError} helperText={helperText} className={className}>
            <input
                ref={inputRef}
                id={id}
                type="file"
                accept={accept}
                disabled={disabled}
                className="peer sr-only"
                onChange={(event) => choose(event.target.files?.[0] ?? null)}
                {...aria}
            />

            {file ? (
                <div className="border-brand-success/40 bg-brand-success/5 rounded-brand-card flex flex-col gap-4 border p-5 sm:flex-row sm:items-center">
                    <div className="bg-brand-success/10 text-brand-success-text flex size-14 shrink-0 items-center justify-center rounded-brand-control">
                        <FileSpreadsheet className="size-7" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-brand-success-text mb-0.5 flex items-center gap-1.5 text-xs font-medium">
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            Ready to import
                        </p>
                        <p className="truncate text-base font-semibold">{file.name}</p>
                        <p className="text-muted-foreground text-sm tabular-nums">{formatSize(file.size)}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        <Button type="button" variant="outline" disabled={disabled} onClick={() => inputRef.current?.click()}>
                            Replace
                        </Button>
                        <Button type="button" variant="ghost" disabled={disabled} onClick={remove}>
                            Remove
                        </Button>
                    </div>
                </div>
            ) : (
                <label
                    htmlFor={id}
                    onDragOver={(event) => {
                        event.preventDefault();
                        if (!disabled) setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={cn(
                        'rounded-brand-card flex min-h-56 w-full cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-10 text-center',
                        'motion-field peer-focus-visible:border-brand-focus-ring peer-focus-visible:ring-[3px] peer-focus-visible:ring-brand-focus-ring/25',
                        dragging
                            ? 'border-brand-primary bg-brand-primary/5'
                            : shownError
                              ? 'border-brand-danger/60 bg-brand-danger/[0.03]'
                              : 'border-brand-control-border hover:border-brand-primary/60 hover:bg-brand-primary/[0.03]',
                        disabled && 'pointer-events-none opacity-60',
                    )}
                >
                    <span
                        className={cn(
                            'flex size-16 items-center justify-center rounded-full motion-colors',
                            dragging ? 'bg-brand-primary text-brand-primary-foreground' : 'bg-brand-primary/10 text-brand-primary-text',
                        )}
                    >
                        <UploadCloud className="size-8" aria-hidden="true" />
                    </span>
                    <span className="space-y-1">
                        <span className="block text-base font-semibold">{dragging ? 'Drop the file to upload' : 'Drag & drop your file here'}</span>
                        <span className="text-muted-foreground block text-sm">
                            or <span className="text-brand-primary-text font-medium underline underline-offset-2">click to browse</span> from your computer
                        </span>
                    </span>
                    <span className="text-muted-foreground flex flex-wrap items-center justify-center gap-1.5 text-xs">
                        {extensions.map((extension) => (
                            <span key={extension} className="bg-brand-secondary rounded-sm px-1.5 py-0.5 font-mono font-medium uppercase">
                                {extension.replace('.', '')}
                            </span>
                        ))}
                        {maxSizeMb && <span>· up to {maxSizeMb} MB</span>}
                    </span>
                </label>
            )}
        </FormField>
    );
}
