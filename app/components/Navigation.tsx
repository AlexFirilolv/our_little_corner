'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Map as MapIcon, PlusCircle, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming Shadcn utility exists, if not we might need to adjust imports

export function Navigation() {
    const pathname = usePathname();

    const navItems = [
        {
            label: 'Home',
            href: '/',
            icon: Home,
        },
        {
            label: 'Timeline',
            href: '/timeline',
            icon: Heart, // Using Heart for Timeline as it's the "Locket" core
        },
        {
            label: 'Upload',
            href: '/upload',
            icon: PlusCircle,
            primary: true,
        },
        {
            label: 'Journey',
            href: '/journey',
            icon: MapIcon,
        },
        {
            label: 'Profile',
            href: '/profile',
            icon: User,
        },
    ];

    return (
        <>
            {/* Mobile Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-rose-100 pb-safe md:hidden shadow-[0_-4px_20px_rgba(186,74,104,0.05)]">
                <div className="flex justify-between items-end h-16 px-4 pb-2 relative">
                    {navItems.map((item, index) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                        const Icon = item.icon;

                        if (item.primary) {
                            return (
                                <div key={item.href} className="relative -top-5 mx-auto">
                                    <Link
                                        href={item.href}
                                        className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 border-4 border-background transition-transform active:scale-95"
                                    >
                                        <Icon size={28} strokeWidth={2.5} />
                                    </Link>
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center w-14 space-y-1 transition-colors duration-200 py-1",
                                    isActive
                                        ? "text-primary font-medium"
                                        : "text-muted-foreground/60 hover:text-primary/70"
                                )}
                            >
                                <Icon
                                    size={24}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    fill={isActive ? "currentColor" : "none"}
                                    className={cn("transition-transform duration-300", isActive && "scale-110")}
                                />
                                <span className={cn("text-[10px] tracking-wide transition-opacity", isActive ? "opacity-100" : "opacity-80")}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Desktop Sidebar Navigation */}
            <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-white border-r border-rose-100 p-6 z-50">
                <div className="mb-10 pl-2">
                    <h1 className="font-heading text-3xl text-primary font-bold">Twofold</h1>
                </div>

                <div className="space-y-2 flex-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                    isActive
                                        ? "bg-rose-50 text-primary font-medium shadow-sm"
                                        : "text-muted-foreground hover:bg-rose-50/50 hover:text-primary"
                                )}
                            >
                                <Icon
                                    size={22}
                                    strokeWidth={isActive ? 2.5 : 2}
                                    fill={isActive && !item.primary ? "currentColor" : "none"}
                                    className={cn("transition-transform group-hover:scale-110", isActive && "text-primary")}
                                />
                                <span className="text-base">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>

                <div className="mt-auto pt-6 border-t border-rose-100">
                    <div className="flex items-center space-x-3 px-4">
                        <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-primary">
                            <Heart size={20} fill="currentColor" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-truffle">Our Locket</p>
                            <p className="text-xs text-muted-foreground">Est. 2024</p>
                        </div>
                    </div>
                </div>
            </nav>
        </>
    );
}
