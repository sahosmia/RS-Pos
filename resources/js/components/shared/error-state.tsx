import { StateMessage } from '@/components/shared/state-message';
import { Button } from '@/components/ui/button';
import { CloudOff, CircleX, RotateCcw, ShieldAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

type ErrorVariant = 'recoverable' | 'load-failed' | 'permission' | 'system';

const PRESETS: Record<ErrorVariant, { icon: LucideIcon; tone: 'warning' | 'danger'; title: string; description: string }> = {
    recoverable: { icon: TriangleAlert, tone: 'warning', title: 'Something went wrong', description: 'Please try again.' },
    'load-failed': { icon: CloudOff, tone: 'warning', title: "Couldn't load this data", description: 'Check your connection and try again.' },
    permission: { icon: ShieldAlert, tone: 'danger', title: 'Access denied', description: "You don't have permission to do this. Contact an administrator if you need access." },
    system: { icon: CircleX, tone: 'danger', title: 'Unexpected error', description: "We couldn't complete that. If it keeps happening, contact support." },
};

interface ErrorStateProps {
    variant?: ErrorVariant;
    title?: string;
    description?: ReactNode;
    /** Technical detail (error message, reference id) shown small and muted. Keep user-safe. */
    detail?: ReactNode;
    /** Shows a Retry button. Permission errors usually shouldn't have one. */
    onRetry?: () => void;
    retryLabel?: string;
    /** Retry is running — the button shows a spinner and can't be pressed again. */
    retrying?: boolean;
    /** Extra actions next to Retry (e.g. "Go back"). */
    children?: ReactNode;
    compact?: boolean;
    className?: string;
}

/**
 * Failed-load / failed-action / no-access message with an optional retry. Announced as an alert, so mount it
 * when the failure happens rather than rendering it hidden. It performs no request itself — `onRetry` does.
 */
export default function ErrorState({
    variant = 'recoverable',
    title,
    description,
    detail,
    onRetry,
    retryLabel = 'Try again',
    retrying = false,
    children,
    compact,
    className,
}: ErrorStateProps) {
    const preset = PRESETS[variant];

    return (
        <StateMessage
            icon={preset.icon}
            tone={preset.tone}
            title={title ?? preset.title}
            description={description ?? preset.description}
            detail={detail}
            compact={compact}
            frame="solid"
            role="alert"
            className={className}
        >
            {onRetry && (
                <Button type="button" variant="outline" loading={retrying} onClick={onRetry}>
                    <RotateCcw />
                    {retryLabel}
                </Button>
            )}
            {children}
        </StateMessage>
    );
}
