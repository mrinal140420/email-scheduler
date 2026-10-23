'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from '../components/Header';
import { Tabs } from '../components/Tabs';
import { SearchBar } from '../components/SearchBar';
import { ScheduledTable } from '../components/ScheduledTable';
import { SentTable } from '../components/SentTable';
import { ComposeModal } from '../components/ComposeModal';
import { SlackModal } from '../components/SlackModal';
import { emailApi, authApi } from '../lib/api';
import { EmailJob, SenderAccount, User, QueueStats } from '../types';
import { Activity, Clock, CheckCircle2, ShieldAlert, Cpu } from 'lucide-react';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [senders, setSenders] = useState<SenderAccount[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);

  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<EmailJob[] | null>(null);
  const [searchSource, setSearchSource] = useState<string>('');

  // Modals
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isSlackConnected, setIsSlackConnected] = useState(false);

  // Load user from URL token or localStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      try {
        const decoded = JSON.parse(atob(token));
        setUser(decoded);
        localStorage.setItem('reachinbox_user', JSON.stringify(decoded));
        window.history.replaceState({}, document.title, '/');
      } catch (e) {
        console.error('Invalid token payload', e);
      }
    } else {
      const stored = localStorage.getItem('reachinbox_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch {
          // Ignore
        }
      } else {
        // Provide default guest/candidate demo session
        setUser({
          id: 'demo-user-1',
          email: 'candidate@outboxlabs.com',
          name: 'ReachInbox Candidate',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
        });
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_user');
    setUser(null);
    window.location.href = '/login';
  };

  // Fetch Scheduled Emails
  const fetchScheduled = useCallback(async () => {
    try {
      const data = await emailApi.getScheduled(1, 100);
      setScheduledEmails(data.emails || []);
    } catch (err) {
      console.error('Failed to fetch scheduled emails', err);
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  // Fetch Sent Emails
  const fetchSent = useCallback(async () => {
    try {
      const data = await emailApi.getSent(1, 100);
      setSentEmails(data.emails || []);
    } catch (err) {
      console.error('Failed to fetch sent emails', err);
    } finally {
      setLoadingSent(false);
    }
  }, []);

  // Fetch Senders & Stats
  const fetchMeta = useCallback(async () => {
    try {
      const [senderData, statsData, slackData] = await Promise.all([
        emailApi.getSenders(),
        emailApi.getStats(),
        authApi.getSlackStatus(),
      ]);
      setSenders(senderData || []);
      setStats(statsData || null);
      setIsSlackConnected(slackData.connected);
    } catch (err) {
      console.warn('Metadata fetch warning:', err);
    }
  }, []);

  // Polling loop (every 3s for live reactive queue updates)
  useEffect(() => {
    fetchScheduled();
    fetchSent();
    fetchMeta();

    const interval = setInterval(() => {
      fetchScheduled();
      fetchSent();
      fetchMeta();
    }, 3000);

    return () => clearInterval(interval);
  }, [fetchScheduled, fetchSent, fetchMeta]);

  // Handle Search Query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await emailApi.search(searchQuery.trim());
        setSearchResults(res.results || []);
        setSearchSource(res.source || '');
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCancelScheduled = async (id: string) => {
    try {
      await emailApi.cancel(id);
      fetchScheduled();
    } catch (err) {
      console.error('Cancel failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] flex flex-col">
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSlackModal={() => setIsSlackOpen(true)}
        slackConnected={isSlackConnected}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Status & Metrics Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#141517] border border-[#2A2F35] rounded-2xl p-4 flex items-center space-x-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Scheduled Queue</p>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {stats?.database.scheduled ?? scheduledEmails.length}
              </h3>
            </div>
          </div>

          <div className="bg-[#141517] border border-[#2A2F35] rounded-2xl p-4 flex items-center space-x-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Delivered Emails</p>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {stats?.database.sent ?? sentEmails.length}
              </h3>
            </div>
          </div>

          <div className="bg-[#141517] border border-[#2A2F35] rounded-2xl p-4 flex items-center space-x-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Worker Concurrency</p>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {stats?.config.concurrency ?? 5} parallel
              </h3>
            </div>
          </div>

          <div className="bg-[#141517] border border-[#2A2F35] rounded-2xl p-4 flex items-center space-x-3 shadow-lg">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-gray-400 font-medium">Hourly Rate Limit</p>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {stats?.config.maxEmailsPerHour ?? 200}/hr
              </h3>
            </div>
          </div>
        </div>

        {/* Tabs & Compose Action */}
        <Tabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          scheduledCount={scheduledEmails.length}
          sentCount={sentEmails.length}
          onOpenCompose={() => setIsComposeOpen(true)}
        />

        {/* Search Bar */}
        <div className="flex items-center justify-between pb-2">
          <SearchBar
            query={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            isSearching={isSearching}
            totalHits={searchResults ? searchResults.length : undefined}
            source={searchSource}
          />
        </div>

        {/* Dynamic Content Views */}
        {searchResults ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Search Results ({searchResults.length})
              </h3>
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-blue-400 hover:underline"
              >
                Clear search
              </button>
            </div>
            <ScheduledTable
              emails={searchResults}
              loading={isSearching}
              onCancel={handleCancelScheduled}
              onRefresh={fetchScheduled}
            />
          </div>
        ) : activeTab === 'scheduled' ? (
          <ScheduledTable
            emails={scheduledEmails}
            loading={loadingScheduled}
            onCancel={handleCancelScheduled}
            onRefresh={fetchScheduled}
          />
        ) : (
          <SentTable emails={sentEmails} loading={loadingSent} />
        )}
      </main>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => {
          fetchScheduled();
          fetchMeta();
        }}
        senders={senders}
      />

      {/* Slack Modal */}
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        isConnected={isSlackConnected}
        onStatusChange={fetchMeta}
      />
    </div>
  );
}
