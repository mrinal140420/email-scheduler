'use client';

import React from 'react';
import { EmailJob } from '../types';
import { Search, SlidersHorizontal, RefreshCw, Star, Trash2, ExternalLink, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface EmailListProps {
  emails: EmailJob[];
  loading: boolean;
  type: 'scheduled' | 'sent';
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onRefresh: () => void;
  onSelectEmail: (email: EmailJob) => void;
  onCancelScheduled: (id: string) => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  loading,
  type,
  searchQuery,
  onSearchChange,
  onRefresh,
  onSelectEmail,
  onCancelScheduled,
}) => {
  const formatScheduledTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return format(d, 'EEE h:mm:ss a');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden">
      {/* Top Search & Filter Bar matching Figma */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xl">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            className="w-full bg-[#F4F6F5] border-0 rounded-full pl-9 pr-4 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 text-gray-400">
          <button
            onClick={onRefresh}
            className="p-1.5 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
          <button
            className="p-1.5 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Filters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Email Rows List matching Figma */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {loading && emails.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-4 py-2">
                <div className="h-4 bg-gray-100 rounded w-28"></div>
                <div className="h-4 bg-gray-100 rounded w-20"></div>
                <div className="h-4 bg-gray-100 rounded flex-1"></div>
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-xs">
            {type === 'scheduled'
              ? 'No scheduled emails in queue. Click Compose to schedule outreach.'
              : 'No sent emails yet. Processed emails will appear here.'}
          </div>
        ) : (
          emails.map((job) => (
            <div
              key={job.id}
              onClick={() => onSelectEmail(job)}
              className="px-6 py-3.5 flex items-center justify-between gap-4 hover:bg-gray-50/80 transition-colors cursor-pointer group"
            >
              {/* Recipient column matching Figma */}
              <div className="w-44 flex-shrink-0">
                <span className="text-xs font-semibold text-gray-900 truncate block">
                  To: {job.recipient.split('@')[0]}
                </span>
              </div>

              {/* Status pill matching Figma */}
              <div className="flex-shrink-0">
                {type === 'scheduled' ? (
                  <span className="inline-flex items-center gap-1 bg-[#FFF3E6] text-[#E67E22] text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-orange-200/60 whitespace-nowrap">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatScheduledTime(job.scheduledAt)}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center bg-[#F3F4F6] text-gray-600 text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                    Sent
                  </span>
                )}
              </div>

              {/* Subject & snippet matching Figma */}
              <div className="flex-1 overflow-hidden text-xs text-left truncate">
                <span className="font-semibold text-gray-900 mr-2">{job.subject}</span>
                <span className="text-gray-400 truncate">{job.body}</span>
              </div>

              {/* Actions & Star icon */}
              <div className="flex items-center space-x-2.5 flex-shrink-0">
                {job.etherealUrl && (
                  <a
                    href={job.etherealUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[11px] text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                  >
                    <span>Preview</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}

                {type === 'scheduled' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCancelScheduled(job.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-rose-500 p-1 transition-opacity"
                    title="Cancel scheduled email"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                <Star className="w-3.5 h-3.5 text-gray-300 hover:text-amber-400 transition-colors" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
