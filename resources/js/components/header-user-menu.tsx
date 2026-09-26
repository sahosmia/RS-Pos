import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { type SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';

/**
 * The account/profile dropdown, relocated from the sidebar footer into the
 * sticky top header (doc/corrections2.md #3) — avatar, name (hidden on
 * narrow screens so the header stays uncrowded), a small "active session"
 * status dot, and a chevron that opens `UserMenuContent`.
 */
export default function HeaderUserMenu() {
    const { auth } = usePage<SharedData>().props;
    const getInitials = useInitials();
    const user = auth.user;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm outline-hidden focus-visible:ring-2"
                >
                    <span className="relative inline-flex">
                        <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback className="rounded-full bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                {getInitials(user.name)}
                            </AvatarFallback>
                        </Avatar>
                        <span
                            className="border-background absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 bg-emerald-500"
                            aria-hidden="true"
                        />
                    </span>
                    <span className="hidden max-w-32 truncate font-medium md:inline">{user.name}</span>
                    <ChevronDown className="size-4 opacity-60" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 rounded-lg" align="end" side="bottom">
                <UserMenuContent user={user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
