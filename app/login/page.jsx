'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

import {
  Lock,
  Phone,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Shield,
  LogIn,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  // =========================
  // STATES
  // =========================
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] =
    useState(false);

  const [currentTime, setCurrentTime] =
    useState('');

  // =========================
  // AUTO REDIRECT IF LOGGED IN
  // =========================
  useEffect(() => {
    const isLoggedIn =
      localStorage.getItem('isLoggedIn');

    const institutionId =
      localStorage.getItem('institutionId');

    if (isLoggedIn && institutionId) {
      router.replace('/home');
    }
  }, [router]);

  // =========================
  // CLOCK
  // =========================
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };

    updateTime();

    const timer = setInterval(updateTime, 1000);

    return () => clearInterval(timer);
  }, []);

  // =========================
  // MOBILE INPUT
  // =========================
  const handleMobileChange = (e) => {
    const cleaned = e.target.value
      .replace(/\D/g, '')
      .slice(0, 10);

    setMobileNumber(cleaned);
  };

  // =========================
  // LOGIN FUNCTION
  // =========================
  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError('');

      const cleanMobile = mobileNumber.trim();

      // VALIDATION
      if (cleanMobile.length !== 10) {
        setError(
          'Please enter valid 10 digit mobile number'
        );
        return;
      }

      if (!password) {
        setError('Please enter password');
        return;
      }

      // =========================
      // FETCH ADMIN
      // =========================
      const { data: admin, error: adminError } =
        await supabase
          .from('admins')
          .select('*')
          .eq('mobile_number', cleanMobile)
          .single();

      if (adminError || !admin) {
        console.error(adminError);

        setError(
          'Invalid mobile number or password'
        );

        return;
      }

      // =========================
      // PASSWORD CHECK
      // =========================
      if (admin.password_hash !== password) {
        setError('Invalid password');
        return;
      }

      // =========================
      // INSTITUTION CHECK
      // =========================
      if (!admin.institution_id) {
        setError('Institution not found');
        return;
      }

      // =========================
      // CLEAR OLD STORAGE
      // =========================
      localStorage.clear();

      // =========================
      // SAVE LOGIN DATA
      // =========================
      localStorage.setItem(
        'isLoggedIn',
        'true'
      );

      localStorage.setItem(
        'institutionId',
        String(admin.institution_id)
      );

      localStorage.setItem(
        'institution_id',
        String(admin.institution_id)
      );

      localStorage.setItem(
        'admin_id',
        String(admin.id)
      );

      localStorage.setItem(
        'adminName',
        admin.admin_name || 'Admin'
      );

      localStorage.setItem(
        'adminMobile',
        cleanMobile
      );

      console.log(
        '✅ Login Successful'
      );

      console.log({
        institutionId:
          localStorage.getItem('institutionId'),

        admin_id:
          localStorage.getItem('admin_id'),

        adminName:
          localStorage.getItem('adminName'),
      });

      // =========================
      // REDIRECT
      // =========================
      router.replace('/home');

    } catch (err) {
      console.error(
        '❌ Login Error:',
        err
      );

      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

        *{
          box-sizing:border-box;
          margin:0;
          padding:0;
        }

        body{
          font-family:'Inter',sans-serif;
        }

        .login-container{
          min-height:100vh;
          background-image:url('https://tse3.mm.bing.net/th/id/OIP.y7vyZYXztoYn4gDqTnbnrAHaFj?pid=Api&P=0&h=180');
          background-size:cover;
          background-position:center;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          position:relative;
        }

        .login-container::before{
          content:'';
          position:absolute;
          inset:0;
          background:rgba(0,0,0,0.55);
        }

        .glass-card{
          width:100%;
          max-width:440px;
          padding:40px;
          border-radius:28px;
          background:rgba(255,255,255,0.1);
          backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.2);
          position:relative;
          z-index:2;
        }

        .input-field{
          width:100%;
          padding:14px 16px 14px 44px;
          border-radius:16px;
          border:1px solid rgba(255,255,255,0.2);
          background:rgba(255,255,255,0.1);
          color:white;
          font-size:14px;
          outline:none;
        }

        .input-field::placeholder{
          color:rgba(255,255,255,0.6);
        }

        .input-field:focus{
          border-color:white;
        }

        .icon-wrapper{
          position:absolute;
          left:14px;
          top:50%;
          transform:translateY(-50%);
          color:rgba(255,255,255,0.7);
        }

        .eye-button{
          position:absolute;
          right:14px;
          top:50%;
          transform:translateY(-50%);
          background:none;
          border:none;
          color:white;
          cursor:pointer;
        }

        .login-button{
          width:100%;
          padding:14px;
          border:none;
          border-radius:16px;
          background:linear-gradient(135deg,#667eea,#764ba2);
          color:white;
          font-weight:600;
          cursor:pointer;
          transition:0.3s;
        }

        .login-button:hover{
          transform:translateY(-2px);
        }

        .login-button:disabled{
          opacity:0.7;
          cursor:not-allowed;
        }

        .error-message{
          background:rgba(239,68,68,0.2);
          border:1px solid rgba(239,68,68,0.3);
          padding:12px;
          border-radius:14px;
          color:white;
          display:flex;
          align-items:center;
          gap:8px;
          margin-bottom:20px;
        }
      `}</style>

      <div className="login-container">
        <div className="glass-card">

          {/* HEADER */}
          <div
            style={{
              textAlign: 'center',
              marginBottom: 35,
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                background:
                  'linear-gradient(135deg,#667eea,#764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <Shield
                size={38}
                color="white"
              />
            </div>

            <h1
              style={{
                color: 'white',
                fontSize: 30,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Admin Portal
            </h1>

            <p
              style={{
                color:
                  'rgba(255,255,255,0.8)',
              }}
            >
              Sign in to continue
            </p>

            <p
              style={{
                marginTop: 10,
                color:
                  'rgba(255,255,255,0.7)',
                fontSize: 12,
              }}
            >
              {currentTime}
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleLogin}>

            {/* MOBILE */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  color: 'white',
                  marginBottom: 8,
                }}
              >
                Mobile Number
              </label>

              <div
                style={{ position: 'relative' }}
              >
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
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: 'block',
                  color: 'white',
                  marginBottom: 8,
                }}
              >
                Password
              </label>

              <div
                style={{ position: 'relative' }}
              >
                <div className="icon-wrapper">
                  <Lock size={18} />
                </div>

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  className="input-field"
                  placeholder="Enter password"
                  required
                />

                <button
                  type="button"
                  className="eye-button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="error-message">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* BUTTON */}
            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'center',
                    gap: 8,
                  }}
                >
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />

                  Signing In...
                </div>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent:
                      'center',
                    gap: 8,
                  }}
                >
                  <LogIn size={18} />
                  Sign In
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}