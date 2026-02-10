/**
 * @file BottomNav.js
 * @description Bottom navigation component for mobile view.
 * Displays navigation links with icons and highlights the active route.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingUp, BarChart2, Gamepad2 } from 'lucide-react';

/**
 * BottomNav Component
 * @returns {JSX.Element} The bottom navigation bar
 */
export default function BottomNav() {
    const pathname = usePathname();

    /**
     * Array of navigation items.
     * @type {Array<{name: string, href: string, icon: Component}>}
     */
    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'Data', href: '/data', icon: BarChart2 },
        { name: 'LP', href: '/screen1', icon: TrendingUp },
        { name: 'MP', href: '/screen2', icon: BarChart2 },
        { name: 'Trading', href: '/screen3', icon: Gamepad2 },
    ];

    return (
        <nav className="bottom-nav">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-item ${isActive ? 'active' : ''}`}
                    >
                        <Icon size={24} />
                        <span>{item.name}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
