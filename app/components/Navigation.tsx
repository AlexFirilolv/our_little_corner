'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Heart, Plus, Map, User, Settings, LucideIcon } from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    primary?: boolean;
}

const navItems: NavItem[] = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Timeline', href: '/timeline', icon: Heart },
    { label: 'Create', href: '/upload', icon: Plus, primary: true },
    { label: 'Journey', href: '/journey', icon: Map },
    { label: 'Profile', href: '/profile', icon: User },
];

export function Navigation() {
    const pathname = usePathname();

    const isActive = (href: string) =>
        pathname === href || (href !== '/' && pathname?.startsWith(href));

    return (
        <>
            {/* ── Mobile Bottom Tab Bar ── */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-elevated/95 backdrop-blur-md border-t border-border pb-safe md:hidden">
                <div className="flex justify-between items-center h-16 px-2">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center flex-1 py-2 transition-colors duration-150 relative",
                                    item.primary
                                        ? "text-primary"
                                        : active
                                            ? "text-primary"
                                            : "text-faint"
                                )}
                            >
                                <Icon size={22} className={cn(item.primary && "stroke-[2.5]")} />
                                {(active || item.primary) && (
                                    <span className="text-[10px] font-medium mt-0.5 tracking-wide">
                                        {item.label}
                                    </span>
                                )}
                                {active && !item.primary && (
                                    <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* ── Desktop Collapsible Icon Rail ── */}
            <nav className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 flex-col bg-background border-r border-border w-[72px] hover:w-[220px] transition-[width] duration-200 ease-out group/rail overflow-hidden">
                {/* Monogram */}
                <div className="flex items-center h-16 px-5 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="font-display text-display text-primary shrink-0 leading-none">T</span>
                        <span className="font-display text-subheading text-foreground whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200">
                            Twofold
                        </span>
                    </div>
                </div>

                {/* Nav items */}
                <div className="flex-1 flex flex-col gap-1 px-3 mt-2">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 h-11 px-3 rounded-lg transition-colors duration-150 relative group/item",
                                    active
                                        ? "text-primary bg-primary/8"
                                        : "text-muted hover:text-foreground hover:bg-foreground/5"
                                )}
                            >
                                {/* Active left bar */}
                                {active && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
                                )}

                                <Icon size={20} className="shrink-0" />
                                <span className="text-body-sm font-medium whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Bottom: Settings */}
                <div className="px-3 pb-4 mt-auto">
                    <div className="h-px bg-border mb-3 mx-2" />
                    <Link
                        href="/settings"
                        className={cn(
                            "flex items-center gap-3 h-11 px-3 rounded-lg transition-colors duration-150",
                            isActive('/settings')
                                ? "text-primary bg-primary/8"
                                : "text-muted hover:text-foreground hover:bg-foreground/5"
                        )}
                    >
                        <Settings size={20} className="shrink-0" />
                        <span className="text-body-sm font-medium whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200">
                            Settings
                        </span>
                    </Link>
                </div>
            </nav>
        </>
    );
}
