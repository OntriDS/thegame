'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check', {
          credentials: 'include'
        });
        
        if (response.ok) {
          // Redirect to control room if already logged in
          router.push('/admin/control-room');
          return;
        }
      } catch (error) {
        console.log('Not authenticated');
      }
      
      // Redirect to login page if not authenticated
      router.push('/admin/login');
    };

    checkAuth();
  }, [router]);

  // Show loading spinner while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
