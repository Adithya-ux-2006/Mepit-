'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FilePlus2, FolderKanban, ChartNoAxesCombined,
  ShieldCheck, BookOpen, ShieldAlert, LogOut,
} from 'lucide-react';

const mainItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/board1/create-project', label: 'Project input', icon: FilePlus2 },
  { href: '/board2/repository', label: 'Repository', icon: FolderKanban },
  { href: '/board3/kpi-engine', label: 'KPI engine', icon: ChartNoAxesCombined },
];

const adminItems = [
  { href: '/admin/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/admin/kpi-library', label: 'KPI library', icon: BookOpen },
  { href: '/admin/validation-rules', label: 'Validation rules', icon: ShieldAlert },
];

function NavGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: typeof mainItems;
  pathname: string;
  onNavigate?: (href: string) => void;
}) {
  return (
    <div className="nav-group">
      <p>{label}</p>
      <nav aria-label={label}>
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
              onClick={() => onNavigate?.(item.href)}
              className={cn('nav-link', active && 'is-active')}>
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Navigation({ onNavigate }: { onNavigate?: (href: string) => void }) {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();

  return (
    <aside className="app-sidebar">
      <Link href="/dashboard" className="app-brand">
        <Image src="/grune-logo.png" alt="Grüne Designs" width={34} height={34} priority />
        <span><strong>Grüne</strong><small>MEP intelligence</small></span>
      </Link>
      <NavGroup label="Workspace" items={mainItems} pathname={pathname} onNavigate={onNavigate} />
      {role === 'admin' && <NavGroup label="Governance" items={adminItems} pathname={pathname} onNavigate={onNavigate} />}
      <div className="nav-account">
        <div className="nav-avatar" aria-hidden="true">{(user?.name || user?.email || 'U').slice(0, 1).toUpperCase()}</div>
        <div className="nav-account-copy"><strong>{user?.name || 'Grüne user'}</strong><small>{role}</small></div>
        <Button variant="ghost" size="icon-sm" onClick={signOut} aria-label="Sign out">
          <LogOut aria-hidden="true" />
        </Button>
      </div>
    </aside>
  );
}
