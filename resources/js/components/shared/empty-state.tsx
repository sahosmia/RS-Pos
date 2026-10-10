import { StateMessage } from '@/components/shared/state-message';
import { Button } from '@/components/ui/button';
import { Lock, PackageOpen, RotateCcw, SearchX, Sparkles, type LucideIcon } from 'lucide-react';
import { ReactNode } from 'react';

type EmptyVariant = 'no-data' | 'no-results' | 'no-permission' | 'first-use';

const PRESETS: Record<EmptyVariant, { icon: LucideIcon; title: string; description: string }> = {
    'no-data': { icon: PackageOpen, title: 'Nothing here yet', description: 'There is nothing to show here.' },
    'no-results': { icon: SearchX, title: 'No results found', description: 'Try changing your search or filters.' },
    'no-permission': { icon: Lock, title: "You don't have access", description: 'Ask an administrator for permission to view this.' },
    'first-use': { icon: Sparkles, title: 'Get started', description: 'Create your first record and it will show up here.' },
};

interface EmptyStateProps {
    /** Required unless a `variant` supplies a default. */
    title?: string;
    description?: string;
    /** Optional icon above the title (a `variant` supplies one by default). */
    icon?: LucideIcon;
    /** Typically the call-to-action button. */
    children?: ReactNode;
    /** For use inside a Card/widget: no dashed frame, tighter padding, smaller icon. */
    compact?: boolean;
    /**
     * Preset copy + icon for the common cases. Any prop you pass overrides the preset.
     * Without a variant the component behaves exactly as before (only what you pass is shown).
     */
    variant?: EmptyVariant;
}

/** "Nothing to show" — no data, no search results, no permission, first use. Words and actions come from the caller. */
export default function EmptyState({ title, description, icon, children, compact = false, variant }: EmptyStateProps) {
    const preset = variant ? PRESETS[variant] : undefined;

    return (
        <StateMessage
            icon={icon ?? preset?.icon}
            title={title ?? preset?.title ?? ''}
            description={description ?? preset?.description}
            compact={compact}
            frame="dashed"
            role="status"
        >
            {children}
        </StateMessage>
    );
}

/**
 * Search/filter produced nothing. Pass `onReset` to offer "Reset filters"; `query` echoes what was searched.
 */
export function NoResultsState({
    query,
    onReset,
    resetLabel = 'Reset filters',
    title,
    description,
    compact,
}: {
    query?: string;
    onReset?: () => void;
    resetLabel?: string;
    title?: string;
    description?: string;
    compact?: boolean;
}) {
    return (
        <EmptyState
            variant="no-results"
            compact={compact}
            title={title ?? (query ? `No results for "${query}"` : undefined)}
            description={description}
        >
            {onReset && (
                <Button type="button" variant="outline" onClick={onReset}>
                    <RotateCcw />
                    {resetLabel}
                </Button>
            )}
        </EmptyState>
    );
}
