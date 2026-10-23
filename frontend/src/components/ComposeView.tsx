'use client';

import React, { useState, useRef } from 'react';
import { emailApi } from '../lib/api';
import { SenderAccount } from '../types';
import {
  ArrowLeft,
  Paperclip,
  Clock,
  Upload,
  Calendar,
  X,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  List,
  ListOrdered,
  Quote,
  Link2,
  Undo2,
  Redo2,
  ChevronDown,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface ComposeViewProps {
  onBack: () => void;
  onSuccess: () => void;
  senders: SenderAccount[];
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  onBack,
  onSuccess,
  senders,
}) => {
  const [recipientInput, setRecipientInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [delayBetweenEmails, setDelayBetweenEmails] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [selectedSenderId, setSelectedSenderId] = useState(senders[0]?.id || '');

  // "Send Later" popover state matching Figma
  const [isSendLaterOpen, setIsSendLaterOpen] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [scheduledLabel, setScheduledLabel] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addPendingRecipient();
    }
  };

  const addPendingRecipient = () => {
    if (!recipientInput.trim()) return;
    const emails = recipientInput
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 3 && e.includes('@'));

    setRecipients(Array.from(new Set([...recipients, ...emails])));
    setRecipientInput('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const res = await emailApi.uploadCsv(file);
      setRecipients(Array.from(new Set([...recipients, ...res.emails])));
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to upload leads CSV');
    } finally {
      setIsUploading(false);
    }
  };

  const removeRecipient = (index: number) => {
    setRecipients(recipients.filter((_, idx) => idx !== index));
  };

  // Quick preset dates matching Figma (Tomorrow, Tomorrow 10 AM, etc.)
  const applyQuickPreset = (hours: number, minutes = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(hours, minutes, 0, 0);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');

    setScheduledDateTime(`${year}-${month}-${day}T${hh}:${mm}`);
    setScheduledLabel(`Tomorrow, ${hours > 12 ? hours - 12 : hours}:${minutes === 0 ? '00' : minutes} ${hours >= 12 ? 'PM' : 'AM'}`);
    setIsSendLaterOpen(false);
  };

  const handleSubmit = async () => {
    setErrorMsg(null);

    let allRecipients = [...recipients];
    if (recipientInput.trim()) {
      const pending = recipientInput
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 3 && e.includes('@'));
      allRecipients = Array.from(new Set([...allRecipients, ...pending]));
    }

    if (allRecipients.length === 0) {
      setErrorMsg('Please specify at least one recipient.');
      return;
    }

    if (!subject.trim()) {
      setErrorMsg('Subject line is required.');
      return;
    }

    if (!body.trim()) {
      setErrorMsg('Email body is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      await emailApi.schedule({
        recipients: allRecipients,
        subject,
        body,
        scheduledAt: scheduledDateTime ? new Date(scheduledDateTime).toISOString() : new Date().toISOString(),
        senderId: selectedSenderId || undefined,
        delayBetweenSeconds: delayBetweenEmails,
      });

      onSuccess();
      onBack();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to schedule email');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Top Header Bar matching Figma */}
      <div className="px-6 py-3.5 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-20">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-sm font-semibold text-gray-900">Compose New Email</h2>
        </div>

        <div className="flex items-center space-x-3 relative">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsSendLaterOpen(!isSendLaterOpen)}
            className={`p-1 rounded-md transition-colors ${
              scheduledDateTime ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 hover:text-gray-700'
            }`}
            title="Send Later"
          >
            <Clock className="w-4 h-4" />
          </button>

          {/* Green Send / Send Later button matching Figma */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="border border-[#00A343] hover:bg-[#EAF7EE] text-[#00A343] font-medium text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Scheduling...</span>
              </>
            ) : (
              <span>{scheduledDateTime ? 'Send Later' : 'Send'}</span>
            )}
          </button>

          {/* Send Later Popover matching Figma Image 2 */}
          {isSendLaterOpen && (
            <div className="absolute right-0 top-10 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50 text-left animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-xs font-bold text-gray-900 mb-3">Send Later</h3>

              <div className="mb-3">
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={scheduledDateTime}
                    onChange={(e) => {
                      setScheduledDateTime(e.target.value);
                      setScheduledLabel(null);
                    }}
                    placeholder="Pick date & time"
                    className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Presets matching Figma */}
              <div className="border-t border-gray-100 pt-2 space-y-1 text-xs">
                <button
                  type="button"
                  onClick={() => applyQuickPreset(9, 0)}
                  className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded text-gray-700 text-xs"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickPreset(10, 0)}
                  className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded text-gray-700 text-xs"
                >
                  Tomorrow, 10:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickPreset(11, 0)}
                  className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded text-gray-700 text-xs"
                >
                  Tomorrow, 11:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => applyQuickPreset(15, 0)}
                  className="w-full text-left py-1.5 px-2 hover:bg-gray-50 rounded text-gray-700 text-xs"
                >
                  Tomorrow, 3:00 PM
                </button>
              </div>

              {/* Footer buttons */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setScheduledDateTime('');
                    setScheduledLabel(null);
                    setIsSendLaterOpen(false);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setIsSendLaterOpen(false)}
                  className="border border-[#00A343] hover:bg-[#EAF7EE] text-[#00A343] text-xs font-medium px-4 py-1 rounded-full"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Form Fields matching Figma */}
      <div className="p-6 max-w-4xl space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs">
            {errorMsg}
          </div>
        )}

        {/* From field */}
        <div className="flex items-center text-xs">
          <span className="w-36 text-gray-500 flex-shrink-0">From</span>
          <div className="relative inline-block">
            <select
              value={selectedSenderId}
              onChange={(e) => setSelectedSenderId(e.target.value)}
              className="appearance-none bg-[#F4F6F5] border border-gray-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-gray-800 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {senders.length > 0 ? (
                senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.email}
                  </option>
                ))
              ) : (
                <option value="">oliver.brown@domain.io</option>
              )}
            </select>
            <ChevronDown className="w-3 h-3 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* To field with Upload List on right matching Figma */}
        <div className="flex items-center justify-between text-xs border-b border-gray-100 pb-2">
          <div className="flex items-center flex-1 mr-4 overflow-hidden">
            <span className="w-36 text-gray-500 flex-shrink-0">To</span>
            <div className="flex items-center flex-wrap gap-1.5 flex-1">
              {recipients.map((email, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 bg-[#E6F5EA] text-[#008738] text-[11px] px-2.5 py-0.5 rounded-full font-medium"
                >
                  <span>{email}</span>
                  <button
                    type="button"
                    onClick={() => removeRecipient(idx)}
                    className="hover:text-rose-600"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}

              <input
                type="text"
                value={recipientInput}
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={handleRecipientKeyDown}
                onBlur={addPendingRecipient}
                placeholder={recipients.length === 0 ? "recipient@example.com" : "Add another..."}
                className="bg-transparent border-0 text-xs text-gray-800 placeholder-gray-400 focus:outline-none flex-1 min-w-[160px]"
              />
            </div>
          </div>

          {/* Upload List CTA matching Figma */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-xs text-[#00A343] font-medium flex items-center gap-1 hover:underline flex-shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploading ? 'Parsing...' : 'Upload List'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Subject field */}
        <div className="flex items-center text-xs border-b border-gray-100 pb-2">
          <span className="w-36 text-gray-500 flex-shrink-0">Subject</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full bg-transparent border-0 text-xs text-gray-800 placeholder-gray-400 focus:outline-none"
          />
        </div>

        {/* Delay and Hourly limit inputs matching Figma */}
        <div className="flex items-center gap-6 text-xs border-b border-gray-100 pb-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Delay between 2 emails</span>
            <input
              type="number"
              min="0"
              max="60"
              value={delayBetweenEmails}
              onChange={(e) => setDelayBetweenEmails(Number(e.target.value))}
              className="w-14 bg-white border border-gray-300 rounded-lg px-2 py-1 text-center text-xs text-gray-800 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <span className="text-gray-400 text-[11px]">sec</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-600">Hourly Limit</span>
            <input
              type="number"
              min="1"
              max="5000"
              value={hourlyLimit}
              onChange={(e) => setHourlyLimit(Number(e.target.value))}
              className="w-16 bg-white border border-gray-300 rounded-lg px-2 py-1 text-center text-xs text-gray-800 focus:outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          {scheduledLabel && (
            <div className="text-[11px] text-[#E67E22] bg-[#FFF3E6] border border-orange-200 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
              <Clock className="w-3 h-3" />
              <span>{scheduledLabel}</span>
            </div>
          )}
        </div>

        {/* Rich Text Editor Frame matching Figma */}
        <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl overflow-hidden shadow-sm mt-3">
          {/* Formatting Toolbar matching Figma Image 3 */}
          <div className="bg-white border-b border-gray-200 px-3 py-2 flex items-center space-x-2 text-gray-500 text-xs overflow-x-auto">
            <button type="button" className="p-1 hover:text-gray-900"><Undo2 className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1 hover:text-gray-900"><Redo2 className="w-3.5 h-3.5" /></button>
            <div className="h-3 w-[1px] bg-gray-200 mx-1"></div>
            <button type="button" className="p-1 hover:text-gray-900 font-bold"><Bold className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1 hover:text-gray-900 italic"><Italic className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1 hover:text-gray-900 underline"><Underline className="w-3.5 h-3.5" /></button>
            <div className="h-3 w-[1px] bg-gray-200 mx-1"></div>
            <button type="button" className="p-1 hover:text-gray-900"><AlignLeft className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1 hover:text-gray-900"><List className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1 hover:text-gray-900"><ListOrdered className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1 hover:text-gray-900"><Quote className="w-3.5 h-3.5" /></button>
            <button type="button" className="p-1 hover:text-gray-900"><Link2 className="w-3.5 h-3.5" /></button>
          </div>

          {/* Text Area matching Figma */}
          <textarea
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Type Your Reply..."
            className="w-full bg-[#F8FAFC] p-4 text-xs text-gray-800 placeholder-gray-400 focus:outline-none font-sans leading-relaxed resize-none"
          />
        </div>
      </div>
    </div>
  );
};
