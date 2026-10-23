'use client';

import React from 'react';
import { EmailJob } from '../types';
import { CheckCircle2, XCircle, ExternalLink, MailCheck, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface SentTableProps {
  emails: EmailJob[];
  loading: boolean;
}

export const SentTable: React.FC<SentTableProps> = ({ emails, loading }) => {
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
          <MailCheck className="w-6 h-6" />
        </div>
        <h3 className="text-gray-200 font-semibold text-sm">No Sent Emails Yet</h3>
        <p className="text-xs text-gray-500 max-w-sm mt-1">
          Emails processed by the BullMQ worker will appear here with delivery timestamps and Ethereal preview links.
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
              <th className="py-3.5 px-6">Sent Time</th>
              <th className="py-3.5 px-6">Status</th>
              <th className="py-3.5 px-6 text-right">Ethereal Preview</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F242C] text-xs">
            {emails.map((job) => (
              <tr key={job.id} className="hover:bg-[#1A1D21]/60 transition-colors group">
                <td className="py-4 px-6 font-medium text-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
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
                  {job.sentAt ? format(new Date(job.sentAt), 'MMM d, yyyy · HH:mm:ss') : 'Just now'}
                </td>
                <td className="py-4 px-6 whitespace-nowrap">
                  {job.status === 'SENT' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3 h-3" />
                      Delivered
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <XCircle className="w-3 h-3" />
                      Failed
                    </span>
                  )}
                </td>
                <td className="py-4 px-6 text-right whitespace-nowrap">
                  {job.etherealUrl ? (
                    <a
                      href={job.etherealUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/20 transition-all font-medium"
                    >
                      <span>View Email</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-gray-500 text-xs italic">No preview URL</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
