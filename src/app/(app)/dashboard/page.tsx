import { redirect } from 'next/navigation';
import { DashboardClient } from './dashboard-client';
import { getAuthUser } from '@/lib/auth';
import { loadDashboardData } from '@/lib/dashboard-data';

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  const initialData = await loadDashboardData(user);
  return <DashboardClient initialData={initialData} />;
}
