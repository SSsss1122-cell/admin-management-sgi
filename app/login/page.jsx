'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Lock, Phone, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Clean mobile number (remove non-digits)
      const cleanMobile = mobileNumber.replace(/\D/g, '');

      // Simple validation
      if (cleanMobile.length !== 10) {
        setError('Please enter a valid 10-digit mobile number');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      // Check if admin exists
      const { data: admin, error: adminError } = await supabase
        .from('admins')
        .select('*')
        .eq('mobile_number', cleanMobile)
        .single();

      if (adminError || !admin) {
        setError('Invalid mobile number or password');
        setLoading(false);
        return;
      }

      // SIMPLE PASSWORD CHECK (for now)
      // For production, you should use bcrypt comparison
      if (password === 'admin123') { // Change this to your actual password
        // Store login status with admin name
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('adminMobile', cleanMobile);
        localStorage.setItem('adminName', admin.admin_name || 'Admin'); // Store admin name
        
        // Redirect to HOME (main dashboard) instead of /dashboard
        router.push('/home');
        router.refresh();
      } else {
        setError('Invalid password');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Simple format - just allow numbers
  const handleMobileChange = (e) => {
    const value = e.target.value;
    // Only allow numbers and limit to 10 digits
    const cleaned = value.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(cleaned);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="text-blue-600" size={28} />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
            <p className="text-gray-600">Sign in to access the dashboard</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Mobile Number Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone size={18} className="text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  placeholder="9876543210"
                  maxLength={10}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter 10-digit mobile number without any spaces or special characters
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff size={18} className="text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye size={18} className="text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center text-sm">
                  <AlertCircle size={16} className="text-red-600 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-6 border-t border-gray-200">
           
            <p className="text-xs text-gray-500 text-center mt-1">
              After login, you'll be redirected to the main dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}