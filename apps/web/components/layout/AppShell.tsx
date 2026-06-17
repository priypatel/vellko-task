'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { FullScreenSpinner } from '@/components/ui/spinner';

interface AppShellProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

/**
 * Authenticated app shell: Navbar + Sidebar + content, with a client-side
 * guard. The Next.js middleware provides the fast redirect; this guard handles
 * the case where the session can't be restored and gates admin-only areas.
 */
export function AppShell({ children, requireAdmin = false }: AppShellProps) {
  const { user, initialized } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!user) {
      router.replace('/login');
    } else if (requireAdmin && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [initialized, user, requireAdmin, router]);

  if (!initialized) {
    return <FullScreenSpinner />;
  }

  if (!user || (requireAdmin && user.role !== 'admin')) {
    // Redirect in-flight — avoid flashing protected content.
    return <FullScreenSpinner />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-x-hidden p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
