'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function withAuth(WrappedComponent) {
  return function AuthenticatedComponent(props) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // Check authentication
      const checkAuth = () => {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const adminMobile = localStorage.getItem('adminMobile');
        
        console.log('🔐 Auth Check:', { isLoggedIn, adminMobile });
        
        if (!isLoggedIn || !adminMobile) {
          // Not authenticated, redirect to login
          console.log('❌ Not authenticated, redirecting to login');
          router.replace('/login'); // Use replace instead of push
        } else {
          // Authenticated
          console.log('✅ Authenticated');
          setIsAuthenticated(true);
        }
        setIsLoading(false);
      };

      checkAuth();
    }, [router]);

    // Show loading spinner while checking
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Checking authentication...</p>
          </div>
        </div>
      );
    }

    // If not authenticated, return null (redirect will happen)
    if (!isAuthenticated) {
      return null;
    }

    // Render the wrapped component
    return <WrappedComponent {...props} />;
  };
}