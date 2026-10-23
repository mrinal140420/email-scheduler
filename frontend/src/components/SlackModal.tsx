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
      setFeedback({ type: 'success', message: 'Slack connected! Sending test notification...' });
      await authApi.testSlackWebhook(webhookUrl.trim());
      setFeedback({ type: 'success', message: 'Slack webhook connected and verified!' });
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
      setFeedback({ type: 'success', message: 'Live alert posted to your Slack channel!' });
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
      setFeedback({ type: 'success', message: 'Slack disconnected.' });
      onStatusChange();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#00A343] flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-gray-900">Slack Quota Alerts</h2>
              <p className="text-[10px] text-gray-400">Instant notification when a sender hits the hourly limit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {isConnected ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <p className="font-semibold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Slack Webhook Active
                </p>
                <p className="text-[11px] text-emerald-600 mt-1">
                  Alerts will trigger automatically when sender rate limits are reached.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTestAlert}
                  disabled={isTesting}
                  className="flex-1 border border-[#00A343] hover:bg-[#EAF7EE] text-[#00A343] font-medium text-xs py-2 px-3 rounded-full flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Send Test Alert</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={isSubmitting}
                  className="border border-gray-200 hover:bg-rose-50 text-gray-600 hover:text-rose-600 text-xs py-2 px-3 rounded-full flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Unlink className="w-3 h-3" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Slack Webhook URL
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full bg-[#F4F6F5] border-0 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Channel Name</label>
                <input
                  type="text"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                  placeholder="#email-rate-limits"
                  className="w-full bg-[#F4F6F5] border-0 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#00A343] hover:bg-[#008F3A] text-white font-medium text-xs py-2.5 rounded-full flex items-center justify-center gap-1.5 transition-colors shadow-sm mt-2"
              >
                {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                <span>Connect &amp; Verify Slack</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
