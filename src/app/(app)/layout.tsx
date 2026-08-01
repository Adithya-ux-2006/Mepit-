import { redirect } from 'next/navigation';
import { Navigation } from '@/components/layout/navigation';
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

  return (
    <AuthProvider initialUser={user}>
      <div className="flex min-h-screen">
        <Navigation />
        <main className="flex-1 overflow-auto p-6 bg-background">{children}</main>
      </div>
    </AuthProvider>
  );
}
