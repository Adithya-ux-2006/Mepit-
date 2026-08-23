'use client';

import dynamic from 'next/dynamic';
import { LoginFormSkeleton } from './login-form';

const LoginForm = dynamic(() => import('./login-form'), {
  ssr: false,
  loading: () => <LoginFormSkeleton />,
});

export default function LoginPage() {
  return <LoginForm />;
}
