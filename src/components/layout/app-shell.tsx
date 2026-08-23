'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Navigation } from '@/components/layout/navigation';
import { RouteBuffer } from '@/components/ui/loading-buffer';

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/board1/create-project': 'Project input',
  '/board2/repository': 'Project repository',
  '/board3/kpi-engine': 'KPI engine',
  '/admin/approvals': 'Approvals',
  '/admin/kpi-library': 'KPI library',
  '/admin/validation-rules': 'Validation rules',
  '/admin/trust-dashboard': 'Trust dashboard',
};

function getPageName(pathname: string): string {
  const exact = pageNames[pathname];
  if (exact) return exact;
  const parent = Object.keys(pageNames)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname.startsWith(`${path}/`));
  return parent ? pageNames[parent] : 'Workspace';
}

function isSameRouteSection(pending: string, current: string): boolean {
  return current === pending || current.startsWith(`${pending}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const visiblePendingPath = pendingPath && pendingPath !== pathname && !isSameRouteSection(pendingPath, pathname) ? pendingPath : null;

  useEffect(() => {
    if (pendingPath && isSameRouteSection(pendingPath, pathname)) {
      setPendingPath(null);
    }
  }, [pathname, pendingPath]);

  return (
    <div className="app-shell">
      <Navigation onNavigate={(href) => {
        if (href !== pathname) setPendingPath(href);
      }} />
      <div className="app-workspace">
        <header className="app-topbar">
          <div>
            <span className="app-breadcrumb">Grüne workspace</span>
            <strong>{getPageName(pathname)}</strong>
          </div>
          <div className="app-session-state">
            <ShieldCheck aria-hidden="true" />
            Secure session
          </div>
        </header>
        <main className="app-content">
          <div className="app-content-wrap">
            {visiblePendingPath && <RouteBuffer label={`Opening ${getPageName(visiblePendingPath)}`} />}
            <div className="page-enter">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
