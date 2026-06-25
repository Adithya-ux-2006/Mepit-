'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  BarChart3,
  ShieldCheck,
  BookOpen,
  ShieldAlert,
  Activity,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/board1/create-project', label: 'New Project', icon: FilePlus },
  { href: '/board2/repository', label: 'Repository', icon: FolderOpen },
  { href: '/board3/kpi-engine', label: 'KPI Engine', icon: BarChart3 },
];

const adminItems = [
  { href: '/admin/approvals', label: 'Approvals', icon: ShieldCheck },
  { href: '/admin/kpi-library', label: 'KPI Library', icon: BookOpen },
  { href: '/admin/validation-rules', label: 'Validation Rules', icon: ShieldAlert },
  { href: '/admin/trust-dashboard', label: 'Trust Dashboard', icon: Activity },
];

export function Navigation() {
  const pathname = usePathname();
  const { role, signOut } = useAuth();

  return (
    <aside className="w-60 border-r border-border bg-white flex flex-col shrink-0">
      <div className="px-5 py-4 border-b border-border">
        <Link href="/dashboard" className="text-base font-semibold text-foreground tracking-tight">
          Grüne Platform
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-xs font-medium text-muted-foreground px-2 pb-1 uppercase tracking-wider">
          Main
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md transition-colors ${
                isActive
                  ? 'bg-secondary text-secondary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {role === 'admin' && (
          <>
            <div className="pt-4">
              <p className="text-xs font-medium text-muted-foreground px-2 pb-1 uppercase tracking-wider">
                Admin
              </p>
            </div>
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2 py-1.5 text-sm rounded-md transition-colors ${
                    isActive
                      ? 'bg-secondary text-secondary-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
