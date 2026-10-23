'use client';

import React, { useState } from 'react';
import { authApi } from '../lib/api';
import { X, Bell, CheckCircle2, AlertCircle, Loader2, Send, Unlink } from 'lucide-react';

interface SlackModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  channelName?: string;
  onStatusChange: () => void;
}

export const SlackModal: React.FC<SlackModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  channelName,
  onStatusChange,
}) => {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState(channelName || '#email-rate-limits');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      setFeedback({ type: 'error', message: 'Please enter a valid Slack Incoming Webhook URL.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      await authApi.connectSlackWebhook(webhookUrl.trim(), channel.trim());
      setFeedback({ type: 'success', message: 'Slack connected successfully! Sending test message...' });
      await authApi.testSlackWebhook(webhookUrl.trim());
      setFeedback({ type: 'success', message: 'Slack webhook connected and verified with live test alert!' });
      onStatusChange();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to connect Slack webhook' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    setFeedback(null);
    try {
      await authApi.testSlackWebhook();
      setFeedback({ type: 'success', message: 'Live notification dispatched to Slack! Check your channel.' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.response?.data?.error || 'Failed to dispatch test notification' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      await authApi.disconnectSlack();
      setFeedback({ type: 'success', message: 'Slack disconnected successfully.' });
      onStatusChange();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#141517] border border-[#2A2F35] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2A2F35] flex items-center justify-between bg-[#111214]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Slack Rate Limit Alerts</h2>
              <p className="text-[11px] text-gray-400">Instant notifications when hourly quotas are exceeded</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {isConnected ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Active Slack Connection</span>
                </div>
                <p className="text-gray-400 text-[11px] mt-1">
                  Live webhook alerts will be posted to your configured channel whenever a sender hits its hourly sending limit.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={isTesting}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  {isTesting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>Send Test Notification</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 bg-[#1A1D21] hover:bg-rose-500/20 text-gray-300 hover:text-rose-400 border border-[#2A2F35] font-medium text-xs px-4 py-2.5 rounded-xl transition-all"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Slack Incoming Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                  className="w-full bg-[#1A1D21] border border-[#2A2F35] rounded-xl px-3.5 py-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[10px] text-gray-500 mt-1 block">
                  Generated in your Slack App &gt; Incoming Webhooks settings
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Channel Name</label>
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="#email-rate-limits"
                  className="w-full bg-[#1A1D21] border border-[#2A2F35] rounded-xl px-3.5 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Bell className="w-3.5 h-3.5" />
                  )}
                  <span>Connect &amp; Test Slack Alert</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
