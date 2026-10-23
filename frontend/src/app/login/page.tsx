'use client';

import React, { useState, useEffect } from 'react';
import { authApi } from '../../lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check if demo auth or fallback requested
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo_auth') === 'true') {
      const demoUser = {
        id: 'user-oliver-brown',
        name: 'Oliver Brown',
        email: 'oliver.brown@domain.io',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
      };
      const token = btoa(JSON.stringify(demoUser));
      window.location.href = `/?token=${token}`;
      return;
    }

    authApi.getGoogleLoginUrl().then((res) => {
      if (res && res.configured && res.url) {
        setGoogleUrl(res.url);
      }
    }).catch(() => {
      // Fallback
    });
  }, []);

  const handleGoogleLogin = () => {
    if (googleUrl) {
      window.location.href = googleUrl;
    } else {
      // Instant demo login fallback matching Oliver Brown from Figma
      const demoUser = {
        id: 'user-oliver-brown',
        name: 'Oliver Brown',
        email: 'oliver.brown@domain.io',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
      };
      const token = btoa(JSON.stringify(demoUser));
      window.location.href = `/?token=${token}`;
    }
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const demoUser = {
      id: 'user-oliver-brown',
      name: email.split('@')[0] || 'Oliver Brown',
      email: email || 'oliver.brown@domain.io',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
    };
    const token = btoa(JSON.stringify(demoUser));
    window.location.href = `/?token=${token}`;
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] bg-white border border-gray-200/80 rounded-2xl p-8 shadow-sm">
        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-6">Login</h1>

        {/* Login with Google Button */}
        <button
          onClick={handleGoogleLogin}
          type="button"
          className="w-full bg-[#EAF7EE] hover:bg-[#DEF2E4] active:bg-[#D4EEDC] text-gray-800 font-medium text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2.5 transition-colors mb-5"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Login with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-5">
          <div className="border-t border-gray-200 w-full"></div>
          <span className="bg-white px-3 text-[11px] text-gray-400 whitespace-nowrap">
            or sign up through email
          </span>
          <div className="border-t border-gray-200 w-full"></div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-3.5">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email ID"
              className="w-full bg-[#F4F6F5] border-0 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-[#F4F6F5] border-0 rounded-xl px-4 py-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#00A343] hover:bg-[#008F3A] active:bg-[#007D33] text-white font-medium text-xs py-3 px-4 rounded-xl shadow-sm transition-colors mt-2"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
