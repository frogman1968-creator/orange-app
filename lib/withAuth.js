/**
 * withAuth — HOC to gate any page behind Supabase auth.
 * Unauthenticated users are redirected to /login?next=<current-path>.
 *
 * Usage:
 *   export default withAuth(DashboardPage);
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './useAuth';

export function withAuth(Component) {
  return function AuthGuard(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        router.replace(`/login?next=${router.asPath}`);
      }
    }, [user, loading, router]);

    // Show nothing while checking auth — prevents flash of protected content
    if (loading || !user) {
      return (
        <div style={{
          background: '#0a0a0a', minHeight: '100vh',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 36 }}>🟠</div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
