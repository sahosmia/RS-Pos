import { Badge } from '@/components/ui/badge';
import { type LucideIcon } from 'lucide-react';

interface TabHeadingProps {
    title: string;
    description: string;
    badgeIcon: LucideIcon;
    badgeText: string;
}

/** Title + one-line description on the left, a count pill on the right — the top of each tab's list. */
export function TabHeading({ title, description, badgeIcon: BadgeIcon, badgeText }: TabHeadingProps) {
    return (
        <div className="border-b px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h2 className="font-semibold">{title}</h2>
                    <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
                </div>

                <Badge variant="outline" className="gap-1.5 rounded-full">
                    <BadgeIcon className="size-3.5" />
                    {badgeText}
                </Badge>
            </div>
        </div>
    );
}
