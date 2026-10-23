'use client';

import React from 'react';
import { EmailJob } from '../types';
import { ArrowLeft, ExternalLink, Paperclip, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';

interface ThreadViewProps {
  email: EmailJob;
  onBack: () => void;
}

export const ThreadView: React.FC<ThreadViewProps> = ({ email, onBack }) => {
  const getSenderInitial = () => {
    return (email.sender?.name || email.recipient || 'A')[0].toUpperCase();
  };

  const formattedDate = () => {
    try {
      const d = email.sentAt ? new Date(email.sentAt) : new Date(email.scheduledAt);
      return format(d, 'MMM d, h:mm a');
    } catch {
      return 'Just now';
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Top Header matching Figma Image 4 */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
        <div className="flex items-center space-x-3 overflow-hidden">
          <button
            onClick={onBack}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900 truncate">
            {email.subject}
          </h2>
        </div>

        {email.etherealUrl && (
          <a
            href={email.etherealUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-full font-medium transition-colors"
          >
            <span>View on Ethereal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Message Content matching Figma */}
      <div className="p-8 max-w-3xl space-y-6">
        {/* Sender Info Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-[#00A343] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
              {getSenderInitial()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-900">
                  {email.sender?.name || 'ReachInbox Outbound'}
                </span>
                <span className="text-[11px] text-gray-400">
                  &lt;{email.sender?.email || 'sender@example.com'}&gt;
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                <span>to {email.recipient}</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>

          <span className="text-[11px] text-gray-400">{formattedDate()}</span>
        </div>

        {/* Message Body */}
        <div className="text-xs text-gray-800 leading-relaxed space-y-4 pt-2">
          <p className="whitespace-pre-line">{email.body}</p>

          {/* Yellow Highlight Banner matching Figma Image 4 */}
          <div className="bg-[#FEF9C3] border border-yellow-200/80 rounded-lg p-3 text-yellow-900 text-xs space-y-1 font-medium">
            <p>⚡ Extremely Exclusive—Only 4 Spots Worldwide Per Year | $25,000 investment ⚡</p>
            <p className="text-[11px] text-yellow-800">
              ⚡ To explore securing your private transformation, simply reply right now with <strong>&quot;FLY OUT FIX&quot;</strong>.
            </p>
          </div>

          <p className="text-gray-600 italic text-[11px]">
            P.S. Always remember that you can develop world-class technique! 🚀
          </p>
        </div>

        {/* Attachment Mock Cards matching Figma Image 4 */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-[11px] text-gray-400 mb-2 flex items-center gap-1">
            <Paperclip className="w-3 h-3" />
            <span>2 Attachments</span>
          </p>
          <div className="flex items-center gap-3">
            <div className="w-36 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden shadow-sm">
              <div className="h-20 bg-blue-100 flex items-center justify-center text-blue-500 font-semibold text-xs">
                🎾 Preview
              </div>
              <div className="p-2 text-[10px]">
                <p className="font-medium text-gray-800 truncate">Tennis_Coach_Profile.png</p>
                <p className="text-gray-400">1.2 MB</p>
              </div>
            </div>

            <div className="w-36 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden shadow-sm">
              <div className="h-20 bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold text-xs">
                🎾 Preview 2
              </div>
              <div className="p-2 text-[10px]">
                <p className="font-medium text-gray-800 truncate">Tennis_Coach_Profile2.png</p>
                <p className="text-gray-400">1.2 MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
