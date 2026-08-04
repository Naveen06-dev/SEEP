import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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

      if (data.user.role === 'TEACHER' || data.user.role === 'ADMIN') {
        navigate('/teacher/exams/new');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="page" style={{ maxWidth: '440px', margin: '2rem auto' }}>
      <div className="card">
        <h2>Sign In to SEEP</h2>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>Smart Examination & Evaluation Platform</p>
        
        {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Email / Username</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              placeholder="user@seep.platform"
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem' }}>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              placeholder="••••••••"
              style={{ width: '100%', padding: '0.5rem' }}
            />
          </div>
          <button type="submit" style={{ padding: '0.75rem', cursor: 'pointer' }}>Sign In</button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>Quick Access Demo Accounts:</p>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="button" onClick={() => fillDemo('teacher@seep.platform')}>Teacher</button>
            <button type="button" onClick={() => fillDemo('student@seep.platform')}>Student</button>
            <button type="button" onClick={() => fillDemo('admin@seep.platform')}>Admin</button>
          </div>
        </div>
      </div>
    </div>
  );
}
