import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ShortcutGroup {
    title: string;
    shortcuts: { keys: string[]; description: string }[];
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
const mod = isMac ? '⌘' : 'Ctrl';

const GROUPS: ShortcutGroup[] = [
    {
        title: 'Global',
        shortcuts: [
            { keys: [mod, 'K'], description: 'Open global search (Products, Contacts, Sales, Purchases, Expenses)' },
            { keys: [mod, 'B'], description: 'Collapse/expand the sidebar' },
        ],
    },
    {
        title: 'Add / Edit Sale',
        shortcuts: [
            { keys: ['F2'], description: 'Focus the product search box' },
            { keys: ['F4'], description: 'Jump to the Payment section' },
            { keys: ['Enter'], description: 'Confirm & save the sale (while not typing in a field)' },
            { keys: ['Esc'], description: 'Cancel and return to the Sales list' },
        ],
    },
    {
        title: 'Search & Picker Dropdowns',
        shortcuts: [
            { keys: ['↑', '↓'], description: 'Move the highlighted result (Global Search, Product/Category/Brand/Supplier pickers)' },
            { keys: ['Enter'], description: 'Pick the highlighted result' },
            { keys: ['Esc'], description: 'Close the dropdown' },
        ],
    },
    {
        title: 'List Pages',
        shortcuts: [{ keys: ['Enter'], description: "Search immediately, while typing in a list page's search box" }],
    },
];

function Kbd({ children }: { children: string }) {
    return (
        <kbd className="bg-muted text-muted-foreground inline-flex min-w-6 items-center justify-center rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium">
            {children}
        </kbd>
    );
}

/**
 * A self-contained "what can I press?" reference — its own trigger button,
 * dialog, and global `?` listener, mirroring how `GlobalSearchDialog`
 * already owns its own `Ctrl/⌘+K` listener rather than relying on a parent.
 * The list itself is hand-maintained against the real `onKeyDown`/
 * `addEventListener('keydown', ...)` handlers in the app — add a row here
 * whenever a new one is added elsewhere, not the other way round.
 */
export default function ShortcutsDialog() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== '?') {
                return;
            }

            const tag = (document.activeElement?.tagName ?? '').toLowerCase();
            const isEditable = tag === 'input' || tag === 'textarea' || (document.activeElement as HTMLElement | null)?.isContentEditable;

            if (isEditable) {
                return;
            }

            e.preventDefault();
            setOpen((current) => !current);
        };

        document.addEventListener('keydown', onKeyDown);

        return () => document.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label="Keyboard shortcuts"
                className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-9 items-center gap-2 rounded-md border px-3 text-sm transition-colors"
            >
                <Keyboard className="h-4 w-4" />
                <span className="hidden sm:inline">Shortcuts</span>
                <kbd className="bg-muted text-muted-foreground pointer-events-none hidden items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
                    ?
                </kbd>
            </button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Keyboard Shortcuts</DialogTitle>
                        <DialogDescription>Everything you can do from the keyboard, in one place.</DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] space-y-5 overflow-y-auto">
                        {GROUPS.map((group) => (
                            <div key={group.title} className="space-y-2">
                                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{group.title}</h3>
                                <div className="space-y-1.5">
                                    {group.shortcuts.map((shortcut) => (
                                        <div
                                            key={shortcut.description}
                                            className="flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm"
                                        >
                                            <span className="text-foreground">{shortcut.description}</span>
                                            <span className="flex shrink-0 items-center gap-1">
                                                {shortcut.keys.map((key, index) => (
                                                    <span key={key} className="flex items-center gap-1">
                                                        {index > 0 && <span className="text-muted-foreground text-xs">+</span>}
                                                        <Kbd>{key}</Kbd>
                                                    </span>
                                                ))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
