'use client';

import React, { useState, useRef, useEffect } from 'react';
import { emailApi } from '../lib/api';
import { SenderAccount } from '../types';
import { X, Upload, FileText, Calendar, Clock, Gauge, Send, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  senders: SenderAccount[];
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  senders,
}) => {
  const [recipientInput, setRecipientInput] = useState('');
  const [parsedRecipients, setParsedRecipients] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [startTime, setStartTime] = useState('');
  const [delayBetweenSeconds, setDelayBetweenSeconds] = useState(2);
  const [hourlyLimit, setHourlyLimit] = useState(200);
  const [selectedSenderId, setSelectedSenderId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (senders.length > 0 && !selectedSenderId) {
      setSelectedSenderId(senders[0].id);
      setHourlyLimit(senders[0].hourlyLimit || 200);
    }
  }, [senders, selectedSenderId]);

  if (!isOpen) return null;

  // Handle manual recipient input
  const handleRecipientBlur = () => {
    if (!recipientInput.trim()) return;
    const emails = recipientInput
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 3 && e.includes('@'));

    const combined = Array.from(new Set([...parsedRecipients, ...emails]));
    setParsedRecipients(combined);
    setRecipientInput('');
  };

  // Handle CSV/TXT file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const res = await emailApi.uploadCsv(file);
      setUploadedFileName(res.filename);
      const combined = Array.from(new Set([...parsedRecipients, ...res.emails]));
      setParsedRecipients(combined);
      setSuccessMsg(`Parsed ${res.count} email address(es) from ${res.filename}`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to parse CSV file');
    } finally {
      setIsUploading(false);
    }
  };

  const removeRecipient = (indexToRemove: number) => {
    setParsedRecipients(parsedRecipients.filter((_, idx) => idx !== indexToRemove));
  };

  const clearAllRecipients = () => {
    setParsedRecipients([]);
    setUploadedFileName(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // If recipient input has pending un-added email
    let allRecipients = [...parsedRecipients];
    if (recipientInput.trim()) {
      const pending = recipientInput
        .split(/[\n,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 3 && e.includes('@'));
      allRecipients = Array.from(new Set([...allRecipients, ...pending]));
    }

    if (allRecipients.length === 0) {
      setErrorMsg('Please specify at least one recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setErrorMsg('Subject line is required.');
      return;
    }

    if (!body.trim()) {
      setErrorMsg('Email message body is required.');
      return;
    }

    setIsSubmitting(true);

    try {
      await emailApi.schedule({
        recipients: allRecipients,
        subject,
        body,
        scheduledAt: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
        senderId: selectedSenderId || undefined,
        delayBetweenSeconds: Number(delayBetweenSeconds),
      });

      setSuccessMsg(`Successfully scheduled campaign to ${allRecipients.length} recipient(s)!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to schedule campaign');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#141517] border border-[#2A2F35] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2A2F35] flex items-center justify-between bg-[#111214]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Compose New Email Campaign</h2>
              <p className="text-[11px] text-gray-400">Configure scheduling parameters, recipients, and throttling</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Sender Account */}
          {senders.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Outbound Sender Account
              </label>
              <select
                value={selectedSenderId}
                onChange={(e) => {
                  setSelectedSenderId(e.target.value);
                  const s = senders.find((snd) => snd.id === e.target.value);
                  if (s) setHourlyLimit(s.hourlyLimit || 200);
                }}
                className="w-full bg-[#1A1D21] border border-[#2A2F35] rounded-xl px-3.5 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              >
                {senders.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email}) · Max {s.hourlyLimit}/hr
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lead Recipients & CSV Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-gray-300">
                Recipients ({parsedRecipients.length} detected)
              </label>
              {parsedRecipients.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllRecipients}
                  className="text-[11px] text-gray-400 hover:text-rose-400"
                >
                  Clear list
                </button>
              )}
            </div>

            {/* CSV File Upload Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-[#2A2F35] hover:border-blue-500/50 bg-[#1A1D21]/50 hover:bg-[#1A1D21] rounded-xl p-3.5 text-center cursor-pointer transition-colors mb-2.5 flex items-center justify-center gap-3"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Upload className="w-4 h-4 text-blue-400" />
              <div className="text-left">
                <p className="text-xs text-gray-200 font-medium">
                  {isUploading ? 'Parsing leads...' : 'Upload CSV / Text file of email leads'}
                </p>
                <p className="text-[10px] text-gray-500">
                  {uploadedFileName ? `Active file: ${uploadedFileName}` : 'Auto-extracts emails and removes duplicates'}
                </p>
              </div>
            </div>

            {/* Manual input */}
            <input
              type="text"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              onBlur={handleRecipientBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleRecipientBlur();
                }
              }}
              placeholder="Or type/paste emails separated by commas (Press Enter)"
              className="w-full bg-[#1A1D21] border border-[#2A2F35] rounded-xl px-3.5 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />

            {/* Tag Pills */}
            {parsedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto p-1.5 bg-[#101113] rounded-xl border border-[#22262B]">
                {parsedRecipients.slice(0, 15).map((email, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 bg-[#1A1D21] text-gray-300 text-[11px] px-2 py-0.5 rounded-md border border-[#2A2F35]"
                  >
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => removeRecipient(idx)}
                      className="text-gray-500 hover:text-rose-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {parsedRecipients.length > 15 && (
                  <span className="text-[11px] text-gray-500 px-2 py-0.5">
                    +{parsedRecipients.length - 15} more
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Partnership Opportunity with ReachInbox"
              className="w-full bg-[#1A1D21] border border-[#2A2F35] rounded-xl px-3.5 py-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">Email Body</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi there,&#10;&#10;I wanted to reach out regarding our AI-driven outreach workflow..."
              className="w-full bg-[#1A1D21] border border-[#2A2F35] rounded-xl p-3 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Scheduling & Throttling Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#101113] rounded-xl border border-[#22262B]">
            {/* Start time */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" />
                <span>Start Time</span>
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-[#1A1D21] border border-[#2A2F35] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">Leave blank to send now</span>
            </div>

            {/* Delay between emails */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-400" />
                <span>Delay Between (sec)</span>
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={delayBetweenSeconds}
                onChange={(e) => setDelayBetweenSeconds(Number(e.target.value))}
                className="w-full bg-[#1A1D21] border border-[#2A2F35] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">Provider throttling</span>
            </div>

            {/* Hourly limit */}
            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1 flex items-center gap-1">
                <Gauge className="w-3 h-3 text-blue-400" />
                <span>Max Emails / Hour</span>
              </label>
              <input
                type="number"
                min="1"
                max="10000"
                value={hourlyLimit}
                onChange={(e) => setHourlyLimit(Number(e.target.value))}
                className="w-full bg-[#1A1D21] border border-[#2A2F35] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[10px] text-gray-500 mt-0.5 block">Triggers Slack on breach</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#2A2F35] bg-[#111214] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-white px-4 py-2 rounded-lg hover:bg-[#1A1D21] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scheduling Campaign...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Schedule Campaign</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
