'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({ children }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // GET VALUES FROM LOCAL STORAGE
        const isLoggedIn =
          localStorage.getItem('isLoggedIn');

        const institutionId =
          localStorage.getItem('institutionId');

        const adminId =
          localStorage.getItem('admin_id');

        // CHECK AUTH
        if (
          !isLoggedIn ||
          !institutionId ||
          !adminId
        ) {
          console.log('❌ User not authenticated');

          // CLEAR OLD DATA
          localStorage.clear();

          // REDIRECT TO LOGIN
          router.replace('/login');

          return;
        }

        console.log('✅ User authenticated');

        setAuthenticated(true);

      } catch (error) {
        console.error(
          '❌ Authentication Error:',
          error
        );

        localStorage.clear();

        router.replace('/login');

      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // LOADING SCREEN
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>

          <p className="text-gray-700 font-medium">
            Checking Authentication...
          </p>
        </div>
      </div>
    );
  }

  // SHOW PAGE
  return authenticated ? children : null;
}