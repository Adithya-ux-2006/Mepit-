import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { AuthProvider } from '@/lib/auth-context';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const authUser = await getAuthUser();
  if (!authUser) redirect('/login');
  const user = {
    id: authUser.dbUserId,
    name: authUser.name,
    email: authUser.email,
    role: authUser.role,
    created_at: authUser.createdAt,
  };
  return <AuthProvider initialUser={user}><AppShell>{children}</AppShell></AuthProvider>;
}
