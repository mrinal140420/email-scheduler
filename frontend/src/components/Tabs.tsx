'use client';

import React from 'react';
import { Calendar, CheckCircle2, Plus } from 'lucide-react';

interface TabsProps {
  activeTab: 'scheduled' | 'sent';
  onTabChange: (tab: 'scheduled' | 'sent') => void;
  scheduledCount: number;
  sentCount: number;
  onOpenCompose: () => void;
}

export const Tabs: React.FC<TabsProps> = ({
  activeTab,
  onTabChange,
  scheduledCount,
  sentCount,
  onOpenCompose,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#2A2F35] pb-4">
      <div className="flex items-center space-x-2 bg-[#141517] p-1 rounded-xl border border-[#2A2F35]">
        <button
          onClick={() => onTabChange('scheduled')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'scheduled'
              ? 'bg-[#1E293B] text-blue-400 shadow-sm border border-blue-500/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1D21]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Scheduled Emails</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              activeTab === 'scheduled'
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {scheduledCount}
          </span>
        </button>

        <button
          onClick={() => onTabChange('sent')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
            activeTab === 'sent'
              ? 'bg-[#1E293B] text-blue-400 shadow-sm border border-blue-500/20'
              : 'text-gray-400 hover:text-gray-200 hover:bg-[#1A1D21]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Sent Emails</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
              activeTab === 'sent'
                ? 'bg-blue-500/20 text-blue-300'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {sentCount}
          </span>
        </button>
      </div>

      <button
        onClick={onOpenCompose}
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
      >
        <Plus className="w-4 h-4" />
        <span>Compose New Email</span>
      </button>
    </div>
  );
};
