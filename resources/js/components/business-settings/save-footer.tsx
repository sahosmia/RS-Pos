import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Transition } from '@headlessui/react';
import { Check, ChevronRight, Settings2 } from 'lucide-react';

interface SaveFooterProps {
    processing: boolean;
    recentlySuccessful: boolean;
}

/** Sticky bar at the bottom of the page: save status on the left, the Save button on the right. */
export function SaveFooter({ processing, recentlySuccessful }: SaveFooterProps) {
    return (
        <div className="bg-card/95 sticky bottom-2 z-10 flex flex-col gap-3 rounded-xl border p-3 shadow-lg backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
            <div className="flex min-w-0 items-center gap-2">
                <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
                    {recentlySuccessful ? <Check className="size-4 text-emerald-600" /> : <Settings2 className="text-muted-foreground size-4" />}
                </div>

                <div className="min-w-0">
                    <p className="text-sm font-medium">{recentlySuccessful ? 'Changes saved successfully' : 'Remember to save your changes'}</p>
                    <p className="text-muted-foreground text-xs">
                        {processing ? 'Saving settings...' : 'Your settings will be applied after saving.'}
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Transition
                    show={recentlySuccessful}
                    enter="transition ease-in-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="transition ease-in-out duration-300"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <Badge variant="secondary" className="gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <Check className="size-3.5" />
                        Saved
                    </Badge>
                </Transition>

                <Button type="submit" disabled={processing} className="min-w-28 gap-2">
                    {processing ? (
                        <>
                            <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Saving
                        </>
                    ) : (
                        <>
                            Save Changes
                            <ChevronRight className="size-4" />
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
