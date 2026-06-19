'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopNavbar from '@/components/ui/TopNavbar';
import AICopilot from '@/components/ui/AICopilot';
import AlertFeed from '@/components/ui/AlertFeed';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    if (!loggedIn) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) return null; // Or a loading spinner

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <main className="main-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <div className="top-nav-wrapper" style={{ paddingLeft: 'calc(var(--sidebar-width) + 24px)' }}>
          <TopNavbar />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 40, height: '100%' }}>
          <div className="content-wrapper">
            {children}
          </div>
        </div>
      </main>
      <AlertFeed />
      <AICopilot />
    </div>
  );
}
