import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const emailApi = {
  getScheduled: async (page = 1, limit = 50) => {
    const res = await api.get(`/emails/scheduled?page=${page}&limit=${limit}`);
    return res.data;
  },

  getSent: async (page = 1, limit = 50) => {
    const res = await api.get(`/emails/sent?page=${page}&limit=${limit}`);
    return res.data;
  },

  search: async (query: string) => {
    const res = await api.get(`/emails/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  schedule: async (data: {
    recipients: string[];
    subject: string;
    body: string;
    scheduledAt?: string;
    senderId?: string;
    delayBetweenSeconds?: number;
  }) => {
    const res = await api.post('/emails/schedule', data);
    return res.data;
  },

  uploadCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/emails/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  cancel: async (id: string) => {
    const res = await api.delete(`/emails/${id}`);
    return res.data;
  },

  getSenders: async () => {
    const res = await api.get('/emails/senders');
    return res.data;
  },

  getStats: async () => {
    const res = await api.get('/stats');
    return res.data;
  },
};

export const authApi = {
  getGoogleLoginUrl: async () => {
    const res = await api.get('/auth/google/url');
    return res.data;
  },

  getSlackStatus: async () => {
    const res = await api.get('/auth/slack/status');
    return res.data;
  },

  connectSlackWebhook: async (webhookUrl: string, channel?: string) => {
    const res = await api.post('/auth/slack/webhook', { webhookUrl, channel });
    return res.data;
  },

  testSlackWebhook: async (webhookUrl?: string) => {
    const res = await api.post('/auth/slack/test', { webhookUrl });
    return res.data;
  },

  disconnectSlack: async () => {
    const res = await api.post('/auth/slack/disconnect');
    return res.data;
  },
};
