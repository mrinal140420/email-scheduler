'use client';

import React from 'react';
import { User } from '../types';
import { Clock, Send, Plus, ChevronDown, Activity, Bell, LogOut } from 'lucide-react';

interface SidebarProps {
  user: User | null;
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  onOpenCompose: () => void;
  scheduledCount: number;
  sentCount: number;
  slackConnected: boolean;
  onOpenSlackModal: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  user,
  activeTab,
  onTabChange,
  onOpenCompose,
  scheduledCount,
  sentCount,
  slackConnected,
  onOpenSlackModal,
  onLogout,
}) => {
  return (
    <aside className="w-64 border-r border-gray-200 bg-white min-h-screen p-5 flex flex-col justify-between flex-shrink-0">
      <div className="space-y-5">
        {/* Logo: ONB matching Figma */}
        <div className="flex items-center justify-between">
          <div className="font-mono text-2xl font-black tracking-tighter text-gray-900 select-none">
            ONB
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="text-gray-400 hover:text-rose-500 p-1 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* User Card matching Figma */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100/70 transition-colors cursor-pointer">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <img
              src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces'}
              alt={user?.name || 'Oliver Brown'}
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
            />
            <div className="text-left overflow-hidden">
              <p className="text-xs font-semibold text-gray-900 truncate">{user?.name || 'Oliver Brown'}</p>
              <p className="text-[11px] text-gray-400 truncate">{user?.email || 'oliver.brown@domain.io'}</p>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
        </div>

        {/* Compose Button matching Figma */}
        <button
          onClick={onOpenCompose}
          className="w-full border border-[#00A343] hover:bg-[#EAF7EE] text-[#00A343] font-medium text-xs py-2 px-4 rounded-full flex items-center justify-center gap-1.5 transition-all shadow-sm"
        >
          <span>Compose</span>
        </button>

        {/* Nav Items */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 tracking-wider uppercase px-2 mb-2">
            CORE
          </p>

          {/* Scheduled Tab */}
          <button
            onClick={() => onTabChange('scheduled')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs font-medium transition-all ${
              activeTab === 'scheduled'
                ? 'bg-[#E6F5EA] text-[#008738]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className={`w-3.5 h-3.5 ${activeTab === 'scheduled' ? 'text-[#008738]' : 'text-gray-400'}`} />
              <span>Scheduled</span>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                activeTab === 'scheduled'
                  ? 'bg-emerald-100 text-[#008738]'
                  : 'text-gray-400'
              }`}
            >
              {scheduledCount}
            </span>
          </button>

          {/* Sent Tab */}
          <button
            onClick={() => onTabChange('sent')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-xs font-medium transition-all ${
              activeTab === 'sent'
                ? 'bg-[#E6F5EA] text-[#008738]'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Send className={`w-3.5 h-3.5 ${activeTab === 'sent' ? 'text-[#008738]' : 'text-gray-400'}`} />
              <span>Sent</span>
            </div>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                activeTab === 'sent'
                  ? 'bg-emerald-100 text-[#008738]'
                  : 'text-gray-400'
              }`}
            >
              {sentCount}
            </span>
          </button>
        </div>
      </div>

      {/* Footer controls: Slack Alert & Bull-Board */}
      <div className="space-y-2 pt-4 border-t border-gray-100">
        <a
          href="http://localhost:5000/admin/queues"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 text-[11px] text-gray-500 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-600" />
          <span>BullMQ Dashboard</span>
        </a>

        <button
          onClick={onOpenSlackModal}
          className={`w-full flex items-center justify-between text-[11px] p-2 rounded-lg transition-colors border ${
            slackConnected
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-3.5 h-3.5 text-amber-500" />
            <span>Slack Alerts</span>
          </div>
          <span className={`w-2 h-2 rounded-full ${slackConnected ? 'bg-emerald-500' : 'bg-gray-300'}`}></span>
        </button>
      </div>
    </aside>
  );
};
