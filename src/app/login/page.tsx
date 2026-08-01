'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function safeRedirectTarget(): string {
  if (typeof window === 'undefined') return '/dashboard';
  const value = new URLSearchParams(window.location.search).get('redirect');
  return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({ error: null }));
        throw new Error(body?.error || 'Unable to sign in');
      }
      window.location.assign(safeRedirectTarget());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-brand" aria-label="Grüne Designs">
        <div className="login-brand-lockup">
          <Image src="/grune-logo.png" alt="" width={46} height={46} priority />
          <span><strong>Grüne</strong><small>MEP intelligence</small></span>
        </div>
        <div className="login-brand-copy">
          <p>Future-proof buildings</p>
          <h1>Engineering decisions, governed from concept to completion.</h1>
        </div>
        <div className="login-trust"><ShieldCheck aria-hidden="true" />Protected company workspace</div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-mobile-brand"><Image src="/grune-logo.png" alt="Grüne Designs" width={36} height={36} /><strong>Grüne</strong></div>
          <div className="login-heading"><LockKeyhole aria-hidden="true" /><div><h2>Welcome back</h2><p>Sign in with your company account.</p></div></div>
          <form onSubmit={handleSubmit} className="login-form">
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="username" placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div><Label htmlFor="password">Password</Label><div className="login-password"><Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div></div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? 'Signing in...' : 'Sign in securely'}</Button>
          </form>
          <p className="login-help">Account access is managed by your platform administrator.</p>
        </div>
      </section>
    </main>
  );
}
