import { Button } from '@/components/ui/button';
import { Transition } from '@headlessui/react';
import { Save } from 'lucide-react';

interface SavePanelProps {
    processing: boolean;
    recentlySuccessful: boolean;
}

/** Sticky bar under the settings cards with the Save button. */
export function SavePanel({ processing, recentlySuccessful }: SavePanelProps) {
    return (
        <div className="bg-card/95 sticky bottom-3 z-10 rounded-2xl border p-3 shadow-lg backdrop-blur-md sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <Save className="size-4" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">Save invoice settings</p>
                        <p className="text-muted-foreground text-xs">Changes apply after saving.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-out duration-200"
                        enterFrom="translate-y-1 opacity-0"
                        enterTo="translate-y-0 opacity-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <span className="text-sm font-medium text-green-600">Saved successfully</span>
                    </Transition>
                    <Button type="submit" disabled={processing} className="w-full min-w-32 sm:w-auto">
                        {processing ? (
                            'Saving...'
                        ) : (
                            <>
                                <Save className="mr-2 size-4" />
                                Save Changes
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
