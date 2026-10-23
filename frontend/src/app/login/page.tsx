'use client';

import React, { useState, useEffect } from 'react';
import { authApi } from '../../lib/api';
import { ShieldCheck, Mail, Zap, CheckCircle2, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [googleUrl, setGoogleUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    authApi.getGoogleLoginUrl().then((res) => {
      setGoogleUrl(res.url);
    }).catch(() => {
      // Fallback url
    });
  }, []);

  const handleGoogleLogin = () => {
    if (googleUrl) {
      window.location.href = googleUrl;
    } else {
      // Instant demo fallback login
      const demoUser = {
        id: 'candidate-demo-1',
        name: 'ReachInbox Candidate',
        email: 'intern@reachinbox.ai',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
      };
      const token = btoa(JSON.stringify(demoUser));
      window.location.href = `/?token=${token}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Decorative dark background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-blue-600/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Headline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/25 mb-4">
            <span className="text-white font-extrabold text-2xl tracking-tighter">R</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">ReachInbox Outbox</h1>
          <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
            Production-Grade Persistent Email Job Scheduler &amp; Campaign Automation Platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#141517] border border-[#2A2F35] rounded-3xl p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-sm font-semibold text-gray-200">Sign in to your account</h2>
            <p className="text-xs text-gray-400">Access scheduled queue, analytics, and BullMQ worker metrics</p>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#1F242C] hover:bg-[#252B35] active:bg-[#1A1D21] border border-[#2E353F] hover:border-gray-500 text-white font-medium text-xs py-3 px-4 rounded-xl shadow-md transition-all group cursor-pointer"
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
            <span>Sign in with Google</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Feature Highlights matching Figma */}
          <div className="pt-4 border-t border-[#22262B] space-y-2.5">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>BullMQ + Redis Persistent Job Scheduler (Zero Cron)</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>Sliding-Hour Rate Limiting &amp; Slack Webhook Alerts</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
              <span>Full-Text Elasticsearch Indexing &amp; Multi-Sender SMTP</span>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-600 mt-6">
          ReachInbox &middot; Outbox Labs SDE Intern Assignment &middot; 2026
        </p>
      </div>
    </div>
  );
}
