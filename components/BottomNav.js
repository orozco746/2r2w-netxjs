'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, TrendingUp, BarChart2, User } from 'lucide-react';

export default function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Home', href: '/', icon: Home },
        { name: 'LP', href: '/screen1', icon: TrendingUp },
        { name: 'MP', href: '/screen2', icon: BarChart2 },
        { name: 'Perfil', href: '/screen3', icon: User },
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
