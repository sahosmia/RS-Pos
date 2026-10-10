import Heading from '@/components/heading';
import { PageTabs, type PageTab } from '@/components/shared/page-tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { KeyRound, Palette, UserRound } from 'lucide-react';
import { type ReactNode } from 'react';

const TABS: PageTab[] = [
    { href: '/settings/profile', label: 'Profile', icon: <UserRound /> },
    { href: '/settings/password', label: 'Password', icon: <KeyRound /> },
    { href: '/settings/appearance', label: 'Appearance', icon: <Palette /> },
];

/**
 * Account settings shell: a heading, link-tabs between the settings pages, and a centred, narrow column
 * for the page's `SettingsSection` cards.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
            <Heading title="Settings" description="Manage your profile and account settings" />
            <PageTabs tabs={TABS} currentPath={window.location.pathname} label="Settings" />
            <div className="space-y-6">{children}</div>
        </div>
    );
}

interface SettingsSectionProps {
    title: ReactNode;
    description?: ReactNode;
    /** Buttons / status on the footer strip (e.g. Save + "Saved"). Omit for sections with no form. */
    footer?: ReactNode;
    /** Draws the card with a red-tinted border — for destructive sections like deleting the account. */
    danger?: boolean;
    children: ReactNode;
    className?: string;
}

/** One titled card in a settings page: header, body, optional action footer. */
export function SettingsSection({ title, description, footer, danger = false, children, className }: SettingsSectionProps) {
    return (
        <Card className={cn(danger && 'border-brand-danger/30', className)}>
            <CardHeader divided>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-5">{children}</CardContent>
            {footer && <CardFooter className="justify-start gap-3">{footer}</CardFooter>}
        </Card>
    );
}
