'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = () => {
      // Check if user is logged in
      const loggedIn = localStorage.getItem('isLoggedIn');
      
      if (!loggedIn) {
        // Not logged in, redirect to login
        router.push('/login');
      } else {
        // Logged in, show content
        setIsAuthenticated(true);
        setLoading(false);
      }
    };

    // Wait for router to be ready
    const timer = setTimeout(checkAuth, 100);
    
    return () => clearTimeout(timer);
  }, [router]);

  // Show loading while checking
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Only render children if authenticated
  return isAuthenticated ? children : null;
}