'use client';

import React from 'react';
import { EmailJob } from '../types';
import { Clock, Trash2, Mail, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface ScheduledTableProps {
  emails: EmailJob[];
  loading: boolean;
  onCancel: (id: string) => void;
  onRefresh: () => void;
}

export const ScheduledTable: React.FC<ScheduledTableProps> = ({
  emails,
  loading,
  onCancel,
  onRefresh,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RATE_LIMITED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            Rate Limited (Rescheduled)
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'QUEUED':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Clock className="w-3 h-3" />
            Queued
          </span>
        );
    }
  };

  const getTimeRemaining = (scheduledAt: string) => {
    try {
      const date = new Date(scheduledAt);
      if (date.getTime() <= Date.now()) {
        return 'Sending now...';
      }
      return `in ${formatDistanceToNow(date)}`;
    } catch {
      return 'Scheduled';
    }
  };

  if (loading && emails.length === 0) {
    return (
      <div className="w-full bg-[#141517] rounded-2xl border border-[#2A2F35] p-8 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse flex items-center justify-between py-3 border-b border-[#22262B]">
            <div className="space-y-2">
              <div className="h-4 bg-[#22262B] rounded w-48"></div>
              <div className="h-3 bg-[#1A1D21] rounded w-64"></div>
            </div>
            <div className="h-6 bg-[#22262B] rounded-full w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="w-full bg-[#141517] rounded-2xl border border-[#2A2F35] p-12 text-center flex flex-col items-center justify-center">
        <div className="w-12 h-12 rounded-2xl bg-[#1A1D21] border border-[#2A2F35] flex items-center justify-center text-gray-400 mb-3">
          <Mail className="w-6 h-6" />
        </div>
        <h3 className="text-gray-200 font-semibold text-sm">No Scheduled Emails</h3>
        <p className="text-xs text-gray-500 max-w-sm mt-1">
          You don&apos;t have any upcoming email jobs in the queue. Click &quot;Compose New Email&quot; to schedule your outreach campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#141517] rounded-2xl border border-[#2A2F35] overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#2A2F35] bg-[#101113] text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              <th className="py-3.5 px-6">Recipient</th>
              <th className="py-3.5 px-6">Subject</th>
              <th className="py-3.5 px-6">Scheduled Time</th>
              <th className="py-3.5 px-6">Countdown</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F242C] text-xs">
            {emails.map((job) => (
              <tr key={job.id} className="hover:bg-[#1A1D21]/60 transition-colors group">
                <td className="py-4 px-6 font-medium text-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    <span className="truncate max-w-[200px]">{job.recipient}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-gray-300">
                  <div className="max-w-[280px]">
                    <p className="truncate font-medium">{job.subject}</p>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{job.body}</p>
                  </div>
                </td>
                <td className="py-4 px-6 text-gray-400 whitespace-nowrap">
                  {format(new Date(job.scheduledAt), 'MMM d, yyyy · HH:mm:ss')}
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  <span className="text-blue-400 font-medium">
                    {getTimeRemaining(job.scheduledAt)}
                  </span>
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  {getStatusBadge(job.status)}
                </td>
                <td className="py-4 px-6 text-right whitespace-nowrap">
                  <button
                    onClick={() => onCancel(job.id)}
                    className="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Cancel scheduled email"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
