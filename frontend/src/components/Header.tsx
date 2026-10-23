'use client';

import React from 'react';
import { User } from '../types';
import { LogOut, ExternalLink, Activity, Bell, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  onOpenSlackModal: () => void;
  slackConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onOpenSlackModal,
  slackConnected,
}) => {
  return (
    <header className="w-full bg-[#141517] border-b border-[#2A2F35] sticky top-0 z-30 px-6 py-3 flex items-center justify-between">
      {/* Brand logo & title */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-bold text-lg">R</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-base leading-tight tracking-tight flex items-center gap-2">
              ReachInbox <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">Scheduler</span>
            </h1>
            <p className="text-xs text-gray-400">Outbox Labs High-Throughput Engine</p>
          </div>
        </div>
      </div>

      {/* Center Actions: Bull-board live queue link */}
      <div className="hidden md:flex items-center space-x-3">
        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-xs bg-[#1A1D21] hover:bg-[#22262B] text-gray-300 hover:text-white px-3.5 py-1.5 rounded-lg border border-[#2A2F35] transition-colors"
        >
          <Activity className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
          <span>BullMQ Live Dashboard</span>
          <ExternalLink className="w-3 h-3 text-gray-400" />
        </a>

        {/* Slack Connection Pill */}
        <button
          onClick={onOpenSlackModal}
          className={`flex items-center gap-2 text-xs px-3.5 py-1.5 rounded-lg border transition-colors ${
            slackConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-[#1A1D21] text-amber-400 border-amber-500/20 hover:bg-[#22262B]'
          }`}
        >
          {slackConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Slack Connected</span>
            </>
          ) : (
            <>
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Connect Slack Alert</span>
            </>
          )}
        </button>
      </div>

      {/* Right side: User profile & Logout */}
      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-3 pl-3 border-l border-[#2A2F35]">
            <div className="relative">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || user.email}
                  className="w-8 h-8 rounded-full border border-gray-700 object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white">
                  {(user.name || user.email)[0].toUpperCase()}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#141517]"></span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-medium text-gray-200">{user.name || 'Outbox Candidate'}</p>
              <p className="text-[11px] text-gray-400 truncate max-w-[150px]">{user.email}</p>
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <a
            href="/login"
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Sign In with Google
          </a>
        )}
      </div>
    </header>
  );
};
