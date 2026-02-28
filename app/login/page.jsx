'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Lock, Phone, AlertCircle, Eye, EyeOff, Loader2, Shield, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Update time
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Clean mobile number (remove non-digits)
      const cleanMobile = mobileNumber.replace(/\D/g, '');
      
      console.log('Login attempt:', {
        mobile: cleanMobile,
        cleanLength: cleanMobile.length
      });

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

      // Compare passwords
      if (password === admin.password_hash) {
        // Store login status with admin name
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('adminMobile', cleanMobile);
        localStorage.setItem('adminName', admin.admin_name || 'Admin');
        
        // Redirect to HOME (main dashboard)
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        body {
          font-family: 'Inter', sans-serif;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease forwards;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        .login-container {
          min-height: 100vh;
          background-image: url('https://tse3.mm.bing.net/th/id/OIP.y7vyZYXztoYn4gDqTnbnrAHaFj?pid=Api&P=0&h=180');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }
        
        /* Subtle dark overlay for better contrast - NO BLUR */
        .login-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.4);
          z-index: 1;
        }
        
        /* Decorative orbs - very subtle */
        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 2;
          opacity: 0.2;
        }
        
        .orb-1 {
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, #6366f1 0%, transparent 70%);
          top: -200px;
          left: -200px;
          animation: float 8s ease-in-out infinite;
        }
        
        .orb-2 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #ec4899 0%, transparent 70%);
          bottom: -150px;
          right: -150px;
          animation: float 10s ease-in-out infinite reverse;
        }
        
        /* Glass Card - Enhanced effect */
        .glass-card {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 32px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          position: relative;
          z-index: 10;
          overflow: hidden;
        }
        
        .glass-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
          animation: shimmer 3s infinite;
          pointer-events: none;
        }
        
        .input-field {
          width: 100%;
          padding: 14px 16px 14px 44px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 16px;
          font-size: 14px;
          color: white;
          transition: all 0.3s ease;
          backdrop-filter: blur(4px);
        }
        
        .input-field:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.5);
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
        }
        
        .input-field::placeholder {
          color: rgba(255, 255, 255, 0.6);
        }
        
        .login-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          border-radius: 16px;
          color: white;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 30px -5px rgba(102, 126, 234, 0.5);
        }
        
        .login-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 20px 40px -5px rgba(102, 126, 234, 0.6);
        }
        
        .login-button:active {
          transform: translateY(0);
        }
        
        .login-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
        
        .error-message {
          background: rgba(239, 68, 68, 0.2);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          padding: 12px 16px;
          color: #fff;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 10px;
          animation: fadeIn 0.3s ease;
        }
        
        .icon-wrapper {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.6);
          transition: color 0.3s ease;
          z-index: 1;
        }
        
        .input-field:focus + .icon-wrapper {
          color: #fff;
        }
        
        .eye-button {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          transition: color 0.3s ease;
          z-index: 1;
        }
        
        .eye-button:hover {
          color: #fff;
        }
      `}</style>

      <div className="login-container">
        {/* Background Orbs - Very subtle */}
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>

        {/* Login Card - Glass Effect */}
        <div className="glass-card animate-fade-in" style={{ 
          maxWidth: 440, 
          width: '100%',
          padding: 40
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 2 }}>
            <div style={{
              width: 80,
              height: 80,
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 10px 30px -5px rgba(102, 126, 234, 0.5)',
              animation: 'float 6s ease-in-out infinite',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Shield size={40} color="white" />
            </div>
            
            <h1 style={{
              fontSize: 32,
              fontWeight: 700,
              marginBottom: 8,
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              Admin Portal
            </h1>
            
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: 14,
              marginBottom: 8,
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}>
              Sign in to access the dashboard
            </p>
            
            <p style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: 12,
              fontFamily: 'monospace',
              background: 'rgba(0,0,0,0.3)',
              padding: '4px 12px',
              borderRadius: 20,
              display: 'inline-block',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              {currentTime}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{ marginBottom: 24, position: 'relative', zIndex: 2 }}>
            {/* Mobile Number Input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: 8,
                marginLeft: 4,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
              }}>
                Mobile Number
              </label>
              <div style={{ position: 'relative' }}>
                <div className="icon-wrapper">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  className="input-field"
                  placeholder="9876543210"
                  maxLength={10}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  required
                />
              </div>
              <p style={{
                fontSize: 11,
                color: 'rgba(255, 255, 255, 0.5)',
                marginTop: 6,
                marginLeft: 4
              }}>
                Enter 10-digit mobile number
              </p>
            </div>

            {/* Password Input */}
            <div style={{ marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: 8,
                marginLeft: 4,
                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <div className="icon-wrapper">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="eye-button"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message" style={{ marginBottom: 24 }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <LogIn size={18} />
                  <span>Sign In</span>
                </div>
              )}
            </button>
          </form>

          {/* Footer - Simplified */}
          <div style={{
            textAlign: 'center',
            marginTop: 32,
            paddingTop: 24,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 11,
            color: 'rgba(255, 255, 255, 0.5)',
            position: 'relative',
            zIndex: 2
          }}>
            © 2024 Shetty Institute of Technology. All rights reserved.
          </div>
        </div>

        {/* Decorative Text */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.1)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '10px',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          zIndex: 2
        }}>
          ADMIN ACCESS ONLY
        </div>
      </div>
    </>
  );
}