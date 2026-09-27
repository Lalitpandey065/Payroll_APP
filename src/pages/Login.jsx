import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, Mail, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const navigate = useNavigate();
  const emailRef = useRef(null);

  const login = useAuthStore(state => state.login);
  const user = useAuthStore(state => state.user);
  const updatePassword = useAuthStore(state => state.updatePassword);
  const loading = useAuthStore(state => state.loading);
  const globalError = useAuthStore(state => state.error);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Password reset state
  const [showReset, setShowReset] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState('');

  // Auto-focus email input on load
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    const res = await login(email, password);
    if (res.success) {
      const activeUser = useAuthStore.getState().user;
      if (activeUser.force_password_change === 1) {
        setShowReset(true);
      } else {
        navigate('/');
      }
    } else {
      setError(res.error);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetError('');

    if (newPassword !== confirmPassword) {
      setResetError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }

    const res = await updatePassword(currentPassword, newPassword);
    if (res.success) {
      navigate('/');
    } else {
      setResetError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4 transition-colors duration-200">
      
      {!showReset ? (
        /* Standard Login Card */
        <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-xl p-8 transition-all duration-200">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2 mb-8">
            <div className="p-3 bg-[var(--accent-light)] rounded-xl">
              <ShieldCheck className="w-8 h-8 text-[var(--accent)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Welcome to PaySmart Pro
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              Offline-first Indian Statutory Payroll Engine
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {error && (
              <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-md text-xs font-semibold text-[var(--danger)] text-left">
                {error}
              </div>
            )}

            <Input
              ref={emailRef}
              label="Operator Email"
              type="email"
              placeholder="admin@paysmart.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2"
              variant="primary"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          {/* Seed hint */}
          <div className="mt-6 text-center">
            <span className="text-[10px] text-[var(--text-muted)] font-mono leading-relaxed bg-[var(--bg-surface-2)] px-2 py-1 rounded border border-[var(--border)]">
              Initial Login: admin@paysmart.com / Admin@123
            </span>
          </div>

        </div>
      ) : (
        /* Password Reset Required Card */
        <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-xl p-8 transition-all duration-200">
          
          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-2 mb-8">
            <div className="p-3 bg-[var(--warning-light)] rounded-xl animate-pulse">
              <RefreshCw className="w-8 h-8 text-[var(--warning)]" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Password Reset Required
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium">
              You are logging in with a default password. Please choose a new secure password.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handlePasswordReset} className="space-y-4">
            
            {resetError && (
              <div className="p-3 bg-[var(--danger-light)] border border-[var(--danger-light)] rounded-md text-xs font-semibold text-[var(--danger)] text-left">
                {resetError}
              </div>
            )}

            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              required
            />

            <Input
              label="New Password"
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
            />

            <Input
              label="Confirm New Password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2"
              variant="primary"
            >
              {loading ? 'Updating...' : 'Update & Continue'}
            </Button>
          </form>

        </div>
      )}

    </div>
  );
}
