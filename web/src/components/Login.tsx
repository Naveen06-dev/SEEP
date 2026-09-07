import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Code2, Shield, ChevronRight } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await api<{ status: string; token: string; user: any; message?: string }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.status === 'error') {
        setError(data.message || 'Login failed');
        return;
      }

      localStorage.setItem('seep_token', data.token);
      localStorage.setItem('seep_user', JSON.stringify(data.user));

      if (data.user.role === 'ADMIN') {
        navigate('/admin/dashboard');
      } else if (data.user.role === 'TEACHER') {
        navigate('/teacher/profile');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError('Failed to connect to server. Please ensure the API is running.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary text-white shadow-soft mb-4">
            <Code2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome to SEEP</h1>
          <p className="text-slate-400 mt-1 text-sm">Smart Examination & Evaluation Platform</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl shadow-soft p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Sign in to your account</h2>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-400/20 rounded-lg text-sm text-rose-500 flex items-center gap-2">
              <Shield className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-900" htmlFor="email">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@seep.platform"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-900" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : (
                <>
                  Sign In
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs font-medium text-slate-400 mb-3 uppercase tracking-wide">Quick Demo Access</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Teacher', email: 'teacher@seep.platform' },
                { label: 'Student', email: 'student@seep.platform' },
                { label: 'Admin', email: 'admin@seep.platform' },
              ].map((demo) => (
                <button
                  key={demo.label}
                  type="button"
                  onClick={() => fillDemo(demo.email)}
                  className="py-2 px-3 text-xs font-semibold text-slate-600 bg-slate-50 border border-border rounded-md hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  {demo.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Secured with NeoExamShield proctoring technology
        </p>
      </div>
    </div>
  );
}
