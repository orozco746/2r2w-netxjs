/**
 * @file layout.js
 * @description Layout for the main authenticated area of the application.
 * Includes the bottom navigation bar and enforces authentication.
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * MainLayout Component
 * Wraps the main application content and adds the bottom navigation.
 * Redirects unauthenticated users to the login page.
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @returns {JSX.Element} The main layout structure
 */
export default function MainLayout({ children }) {
    const router = useRouter();
    const [isAuth, setIsAuth] = useState(false);

    // Check for authentication on mount
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push('/login');
            } else {
                setIsAuth(true);
            }
        });
        return () => unsubscribe();
    }, [router]);

    if (!isAuth) {
        return <div className="mobile-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Cargando...</div>;
    }

    return (
        <div className="mobile-container">
            <main className="content">
                {children}
            </main>
            <BottomNav />
        </div>
    );
}
