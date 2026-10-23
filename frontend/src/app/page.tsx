'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '../components/Sidebar';
import { EmailList } from '../components/EmailList';
import { ComposeView } from '../components/ComposeView';
import { ThreadView } from '../components/ThreadView';
import { SlackModal } from '../components/SlackModal';
import { emailApi, authApi } from '../lib/api';
import { EmailJob, SenderAccount, User } from '../types';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'scheduled' | 'sent'>('scheduled');
  const [scheduledEmails, setScheduledEmails] = useState<EmailJob[]>([]);
  const [sentEmails, setSentEmails] = useState<EmailJob[]>([]);
  const [senders, setSenders] = useState<SenderAccount[]>([]);

  const [loadingScheduled, setLoadingScheduled] = useState(true);
  const [loadingSent, setLoadingSent] = useState(true);

  // View state: 'list' | 'compose' | 'thread'
  const [currentView, setCurrentView] = useState<'list' | 'compose' | 'thread'>('list');
  const [selectedEmail, setSelectedEmail] = useState<EmailJob | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EmailJob[] | null>(null);

  // Slack state
  const [isSlackOpen, setIsSlackOpen] = useState(false);
  const [isSlackConnected, setIsSlackConnected] = useState(false);

  // User auth loading
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
        // Oliver Brown default profile matching Figma exactly
        setUser({
          id: 'user-oliver-brown',
          name: 'Oliver Brown',
          email: 'oliver.brown@domain.io',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces',
        });
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('reachinbox_user');
    setUser(null);
    window.location.href = '/login';
  };

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

  const fetchMeta = useCallback(async () => {
    try {
      const [senderData, slackData] = await Promise.all([
        emailApi.getSenders(),
        authApi.getSlackStatus(),
      ]);
      setSenders(senderData || []);
      setIsSlackConnected(slackData.connected);
    } catch (err) {
      console.warn('Metadata fetch warning:', err);
    }
  }, []);

  // Reactive polling
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

  // Search effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await emailApi.search(searchQuery.trim());
        setSearchResults(res.results || []);
      } catch (err) {
        console.error('Search error:', err);
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

  const displayedEmails = searchResults !== null
    ? searchResults
    : activeTab === 'scheduled'
    ? scheduledEmails
    : sentEmails;

  return (
    <div className="flex h-screen bg-white overflow-hidden text-gray-900 font-sans">
      {/* 1. Left Sidebar matching Figma */}
      <Sidebar
        user={user}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setCurrentView('list');
        }}
        onOpenCompose={() => setCurrentView('compose')}
        scheduledCount={scheduledEmails.length}
        sentCount={sentEmails.length}
        slackConnected={isSlackConnected}
        onOpenSlackModal={() => setIsSlackOpen(true)}
        onLogout={handleLogout}
      />

      {/* 2. Main Content Area */}
      {currentView === 'compose' ? (
        <ComposeView
          onBack={() => setCurrentView('list')}
          onSuccess={() => {
            fetchScheduled();
            setActiveTab('scheduled');
          }}
          senders={senders}
        />
      ) : currentView === 'thread' && selectedEmail ? (
        <ThreadView
          email={selectedEmail}
          onBack={() => setCurrentView('list')}
        />
      ) : (
        <EmailList
          emails={displayedEmails}
          loading={activeTab === 'scheduled' ? loadingScheduled : loadingSent}
          type={activeTab}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => {
            fetchScheduled();
            fetchSent();
          }}
          onSelectEmail={(email) => {
            setSelectedEmail(email);
            setCurrentView('thread');
          }}
          onCancelScheduled={handleCancelScheduled}
        />
      )}

      {/* 3. Slack Connection Modal */}
      <SlackModal
        isOpen={isSlackOpen}
        onClose={() => setIsSlackOpen(false)}
        isConnected={isSlackConnected}
        onStatusChange={fetchMeta}
      />
    </div>
  );
}
