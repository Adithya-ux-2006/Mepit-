'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Navigation } from '@/components/layout/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      const redirectPath = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.push(redirectPath);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="flex flex-1 min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Navigation />
      <main className="flex-1 overflow-auto p-6 bg-background">{children}</main>
    </div>
  );
}
