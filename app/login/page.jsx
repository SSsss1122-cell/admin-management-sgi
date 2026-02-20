'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { Lock, Phone, AlertCircle, Eye, EyeOff, Loader2, Shield, School, LogIn } from 'lucide-react';

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
        
        @keyframes glow {
          0%,100% { filter: blur(80px) opacity(0.5); }
          50% { filter: blur(100px) opacity(0.8); }
        }
        
        @keyframes pulse {
          0%,100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.6s ease forwards;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .gradient-text {
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 200% auto;
          animation: shimmer 4s linear infinite;
        }
        
        .login-container {
          min-height: 100vh;
          background: radial-gradient(circle at 50% 50%, #1a1a2e, #0a0a0f);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          position: relative;
          overflow: hidden;
        }
        
        .bg-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          pointer-events: none;
          z-index: 0;
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
        
        .orb-3 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #10b981 0%, transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation: pulse 4s ease-in-out infinite;
        }
        
        .glass-card {
          background: rgba(22, 22, 42, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          position: relative;
          z-index: 10;
          overflow: hidden;
        }
        
        .glass-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #6366f1, #8b5cf6, #ec4899, transparent);
          animation: shimmer 3s linear infinite;
          background-size: 200% auto;
        }
        
        .input-field {
          width: 100%;
          padding: 14px 16px 14px 44px;
          background: rgba(10, 10, 18, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          font-size: 14px;
          color: white;
          transition: all 0.3s ease;
        }
        
        .input-field:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
          background: rgba(22, 22, 42, 0.8);
        }
        
        .input-field::placeholder {
          color: rgba(160, 160, 192, 0.5);
        }
        
        .login-button {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 16px;
          color: white;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        
        .login-button::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: rotate(45deg);
          animation: shimmer 3s linear infinite;
        }
        
        .login-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -5px #6366f1;
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
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 16px;
          padding: 12px 16px;
          color: #ef4444;
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
          color: rgba(160, 160, 192, 0.5);
          transition: color 0.3s ease;
        }
        
        .input-field:focus + .icon-wrapper {
          color: #6366f1;
        }
        
        .eye-button {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(160, 160, 192, 0.5);
          cursor: pointer;
          transition: color 0.3s ease;
        }
        
        .eye-button:hover {
          color: #6366f1;
        }
        
        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.3s ease;
        }
        
        .feature-item:hover {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.2);
          transform: translateX(5px);
        }
      `}</style>

      <div className="login-container">
        {/* Background Orbs */}
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>

        {/* Login Card */}
        <div className="glass-card animate-fade-in" style={{ 
          maxWidth: 440, 
          width: '100%',
          padding: 40
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              width: 80,
              height: 80,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              borderRadius: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 10px 30px -5px #6366f1',
              animation: 'float 6s ease-in-out infinite'
            }}>
              <Shield size={40} color="white" />
            </div>
            
            <h1 style={{
              fontSize: 32,
              fontWeight: 700,
              marginBottom: 8,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Admin Portal
            </h1>
            
            <p style={{
              color: 'rgba(160, 160, 192, 0.8)',
              fontSize: 14,
              marginBottom: 8
            }}>
              Sign in to access the dashboard
            </p>
            
            <p style={{
              color: 'rgba(160, 160, 192, 0.5)',
              fontSize: 12,
              fontFamily: 'monospace'
            }}>
              {currentTime}
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{ marginBottom: 32 }}>
            {/* Mobile Number Input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(160, 160, 192, 0.9)',
                marginBottom: 8,
                marginLeft: 4
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
                color: 'rgba(160, 160, 192, 0.5)',
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
                color: 'rgba(160, 160, 192, 0.9)',
                marginBottom: 8,
                marginLeft: 4
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

          {/* Features */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginTop: 32,
            paddingTop: 32,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <div className="feature-item">
              <Shield size={16} color="#6366f1" />
              <span style={{ fontSize: 12, color: 'rgba(160, 160, 192, 0.9)' }}>Secure Access</span>
            </div>
            <div className="feature-item">
              <School size={16} color="#8b5cf6" />
              <span style={{ fontSize: 12, color: 'rgba(160, 160, 192, 0.9)' }}>SIT Portal</span>
            </div>
            <div className="feature-item">
              <Lock size={16} color="#ec4899" />
              <span style={{ fontSize: 12, color: 'rgba(160, 160, 192, 0.9)' }}>Encrypted</span>
            </div>
            <div className="feature-item">
              <Phone size={16} color="#10b981" />
              <span style={{ fontSize: 12, color: 'rgba(160, 160, 192, 0.9)' }}>2FA Ready</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            textAlign: 'center',
            marginTop: 32,
            fontSize: 11,
            color: 'rgba(160, 160, 192, 0.4)'
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
          color: 'rgba(255,255,255,0.03)',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '10px',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          zIndex: 1
        }}>
          ADMIN ACCESS ONLY
        </div>
      </div>
    </>
  );
}