'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Home,
    Heart,
    Plus,
    Map,
    User,
    Settings,
    LayoutGrid,
    Gift,
    CheckSquare,
    FileText,
    ShoppingCart,
    Sparkles,
    HeartHandshake,
    LucideIcon,
} from 'lucide-react';

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    primary?: boolean;
    isTogether?: boolean;
}

const togetherLinks: { label: string; href: string; icon: LucideIcon }[] = [
    { label: 'Wishlist', href: '/wishlist', icon: Gift },
    { label: 'Chores', href: '/chores', icon: CheckSquare },
    { label: 'Documents', href: '/documents', icon: FileText },
    { label: 'Grocery', href: '/grocery', icon: ShoppingCart },
    { label: 'Date nights', href: '/date-nights', icon: Sparkles },
    { label: 'Gratitude', href: '/gratitude', icon: HeartHandshake },
];

const togetherHrefs = new Set(togetherLinks.map((l) => l.href));

const navItems: NavItem[] = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Timeline', href: '/timeline', icon: Heart },
    { label: 'Create', href: '/upload', icon: Plus, primary: true },
    { label: 'Journey', href: '/journey', icon: Map },
    { label: 'Together', href: '#together', icon: LayoutGrid, isTogether: true },
    { label: 'Profile', href: '/profile', icon: User },
];

export function Navigation() {
    const pathname = usePathname();
    const [mobileTogetherOpen, setMobileTogetherOpen] = useState(false);
    const [desktopTogetherOpen, setDesktopTogetherOpen] = useState(false);
    const mobileRef = useRef<HTMLDivElement | null>(null);
    const desktopRef = useRef<HTMLDivElement | null>(null);

    const isActive = (href: string) =>
        pathname === href || (href !== '/' && pathname?.startsWith(href));

    const isTogetherActive = () =>
        Array.from(togetherHrefs).some((h) => pathname === h || pathname?.startsWith(h));

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) {
                setMobileTogetherOpen(false);
            }
            if (desktopRef.current && !desktopRef.current.contains(e.target as Node)) {
                setDesktopTogetherOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Close on route change
    useEffect(() => {
        setMobileTogetherOpen(false);
        setDesktopTogetherOpen(false);
    }, [pathname]);

    return (
        <>
            {/* ── Mobile Bottom Tab Bar ── */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-elevated/95 backdrop-blur-md border-t border-border pb-safe md:hidden">
                <div ref={mobileRef} className="relative flex justify-between items-center h-16 px-2">
                    {navItems.map((item) => {
                        const active = item.isTogether ? isTogetherActive() : isActive(item.href);
                        const Icon = item.icon;

                        if (item.isTogether) {
                            return (
                                <button
                                    key={item.href}
                                    type="button"
                                    onClick={() => setMobileTogetherOpen((v) => !v)}
                                    aria-expanded={mobileTogetherOpen}
                                    aria-label="Together menu"
                                    className={cn(
                                        "flex flex-col items-center justify-center flex-1 py-2 transition-colors duration-150 relative",
                                        active || mobileTogetherOpen ? "text-primary" : "text-faint"
                                    )}
                                >
                                    <Icon size={22} />
                                    {(active || mobileTogetherOpen) && (
                                        <span className="text-[10px] font-medium mt-0.5 tracking-wide">
                                            {item.label}
                                        </span>
                                    )}
                                    {active && (
                                        <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                                    )}
                                </button>
                            );
                        }

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

                    {/* Mobile Together popover */}
                    {mobileTogetherOpen && (
                        <div className="absolute bottom-full left-2 right-2 mb-2 bg-elevated border border-border rounded-xl shadow-lg p-2 grid grid-cols-2 gap-1 animate-fade-in">
                            {togetherLinks.map((link) => {
                                const LinkIcon = link.icon;
                                const active = pathname === link.href || pathname?.startsWith(link.href);
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileTogetherOpen(false)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors duration-150",
                                            active
                                                ? "text-primary bg-primary/8"
                                                : "text-muted hover:text-foreground hover:bg-foreground/5"
                                        )}
                                    >
                                        <LinkIcon size={18} className="shrink-0" />
                                        <span className="text-body-sm font-medium">{link.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </nav>

            {/* ── Desktop Collapsible Icon Rail ── */}
            <nav className="hidden md:flex fixed left-0 top-0 bottom-0 z-50 flex-col bg-background border-r border-border w-[72px] hover:w-[220px] transition-[width] duration-200 ease-out group/rail overflow-visible">
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
                <div ref={desktopRef} className="flex-1 flex flex-col gap-1 px-3 mt-2 relative">
                    {navItems.map((item) => {
                        const active = item.isTogether ? isTogetherActive() : isActive(item.href);
                        const Icon = item.icon;

                        if (item.isTogether) {
                            return (
                                <div key={item.href} className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setDesktopTogetherOpen((v) => !v)}
                                        aria-expanded={desktopTogetherOpen}
                                        className={cn(
                                            "w-full flex items-center gap-3 h-11 px-3 rounded-lg transition-colors duration-150 relative group/item",
                                            active || desktopTogetherOpen
                                                ? "text-primary bg-primary/8"
                                                : "text-muted hover:text-foreground hover:bg-foreground/5"
                                        )}
                                    >
                                        {active && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
                                        )}
                                        <Icon size={20} className="shrink-0" />
                                        <span className="text-body-sm font-medium whitespace-nowrap opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200">
                                            {item.label}
                                        </span>
                                    </button>

                                    {desktopTogetherOpen && (
                                        <div className="absolute left-full top-0 ml-2 w-48 bg-elevated border border-border rounded-xl shadow-lg p-2 flex flex-col gap-1 z-50 animate-fade-in">
                                            {togetherLinks.map((link) => {
                                                const LinkIcon = link.icon;
                                                const linkActive = pathname === link.href || pathname?.startsWith(link.href);
                                                return (
                                                    <Link
                                                        key={link.href}
                                                        href={link.href}
                                                        onClick={() => setDesktopTogetherOpen(false)}
                                                        className={cn(
                                                            "flex items-center gap-3 h-10 px-3 rounded-lg transition-colors duration-150",
                                                            linkActive
                                                                ? "text-primary bg-primary/8"
                                                                : "text-muted hover:text-foreground hover:bg-foreground/5"
                                                        )}
                                                    >
                                                        <LinkIcon size={18} className="shrink-0" />
                                                        <span className="text-body-sm font-medium whitespace-nowrap">
                                                            {link.label}
                                                        </span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

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
