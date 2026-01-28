'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';

export default function MainLayout({ children }) {
    const router = useRouter();

    useEffect(() => {
        const user = localStorage.getItem('user');
        if (!user) {
            router.push('/login');
        }
    }, [router]);

    return (
        <div className="mobile-container">
            <main className="content">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
