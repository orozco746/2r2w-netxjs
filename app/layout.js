/**
 * @file layout.js
 * @description Root layout component for the application.
 * Defines the global HTML structure, metadata, and viewport settings.
 */

import './globals.css';

/**
 * Metadata for the application.
 * @type {import('next').Metadata}
 */
export const metadata = {
  title: 'Mobile Web App',
  description: 'A React PWA',
  manifest: '/manifest.json',
};

/**
 * Viewport configuration.
 * Disables user scaling to provide a native-app-like feel.
 * @type {import('next').Viewport}
 */
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

/**
 * RootLayout Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @returns {JSX.Element} The root HTML structure
 */
export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  );
}
