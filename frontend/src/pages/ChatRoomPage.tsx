import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Button } from '@mui/material';
import api from '../api';
import TextField from '@mui/material/TextField';
import SendIcon from '@mui/icons-material/Send';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Markdown from 'markdown-to-jsx';

interface ChatResponse {
  id: string;
  name: string;
  description?: string;
  creator_id: string;
  creator_username: string;
  created_at: string;
  status: string;
  start_time: string | null;
  end_time: string;
  participants_count: number;
}

interface Message {
  id: string;
  sender_id: string;
  sender_username: string;
  content: string;
  timestamp: string;
}

const ChatRoomPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();
  const [chat, setChat] = useState<ChatResponse | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  useEffect(() => {
    const fetchChatAndMessages = async () => {
      setLoading(true);
      setError('');
      try {
        const chatRes = await api.get(`/chats/${chatId}`);
        setChat(chatRes.data);
        const msgRes = await api.get(`/chats/${chatId}/messages`);
        setMessages(msgRes.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load chat.');
      } finally {
        setLoading(false);
      }
    };
    if (chatId) fetchChatAndMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(() => {
      if (chatId) {
        api.get(`/chats/${chatId}/messages`).then(res => setMessages(res.data)).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatId || !chat || chat.status !== 'active') return;
    setSending(true);
    try {
      await api.post(`/chats/${chatId}/messages`, { content: input });
      setInput('');
      // Fetch new messages after sending
      const msgRes = await api.get(`/chats/${chatId}/messages`);
      setMessages(msgRes.data);
    } catch (err) {
      // Optionally show error
    } finally {
      setSending(false);
    }
  };

  const handleOpenSummary = async () => {
    if (!chatId) return;
    setSummaryOpen(true);
    setSummary('');
    setSummaryError('');
    setSummaryLoading(true);
    try {
      const res = await api.get(`/chats/${chatId}/summary`);
      setSummary(res.data);
    } catch (err: any) {
      setSummaryError(err.response?.data?.detail || 'Failed to fetch summary.');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCloseSummary = () => {
    setSummaryOpen(false);
  };

  const handleShowPeople = async () => {
    setPeopleOpen(true);
    setPeopleLoading(true);
    try {
      const res = await api.get(`/chats/${chatId}/participants`);
      setParticipants(res.data);
    } catch {
      setParticipants([]);
    } finally {
      setPeopleLoading(false);
    }
  };

  const handleClosePeople = () => {
    setPeopleOpen(false);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><CircularProgress /></Box>;
  }
  if (error) {
    return <Box sx={{ p: 4 }}><Typography color="error">{error}</Typography><Button onClick={() => navigate(-1)}>Back</Button></Box>;
  }
  if (!chat) return null;

  let chatInfoMsg = '';
  if (chat.status === 'scheduled') chatInfoMsg = "Chat hasn't started yet.";
  if (chat.status === 'completed') chatInfoMsg = "Chat has ended. You can view the summary above to see what was discussed.";

  let currentUserId = null;
  try {
    const user = JSON.parse(localStorage.getItem('firebaseUser') || '{}');
    currentUserId = user.uid;
  } catch {}

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#ece5dd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 900, minHeight: 600, bgcolor: '#fff', borderRadius: 3, boxShadow: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #eee', bgcolor: '#075e54', color: '#fff', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>{chat.name}</Typography>
            <Button variant="outlined" color="inherit" size="small" onClick={handleOpenSummary} sx={{ ml: 2, borderColor: '#fff', color: '#fff', '&:hover': { borderColor: '#e0f2f1', color: '#e0f2f1' } }}>
              Summary
            </Button>
          </Box>
          {chat.description && <Typography variant="body2" sx={{ mb: 0.5, color: '#e0f2f1' }}>{chat.description}</Typography>}
          <Typography variant="body2" sx={{ color: '#b2dfdb' }}>
            Creator: {chat.creator_username} | 
            <span style={{ cursor: 'pointer', color: '#fff', textDecoration: 'underline' }} onClick={handleShowPeople}>
              Participants: {chat.participants_count}
            </span>
          </Typography>
        </Box>
        <Box sx={{ flex: 1, p: 3, bgcolor: '#f7f9fa', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {messages.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>No messages yet.</Typography>
          ) : (
            messages.map(msg => (
              <Box key={msg.id} sx={{ mb: 2, display: 'flex', justifyContent: msg.sender_id === currentUserId ? 'flex-end' : 'flex-start' }}>
                <Box sx={{ bgcolor: msg.sender_id === currentUserId ? '#dcf8c6' : '#fff', borderRadius: 2, p: 1.5, boxShadow: 1, maxWidth: '70%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#075e54' }}>{msg.sender_username}</Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-word' }}>{msg.content}</Typography>
                  <Typography variant="caption" sx={{ color: '#888', display: 'block', textAlign: 'right', mt: 0.5 }}>{new Date(msg.timestamp).toLocaleString()}</Typography>
                </Box>
              </Box>
            ))
          )}
          <div ref={messagesEndRef} />
        </Box>
        {chat.status === 'active' ? (
          <Box sx={{ p: 2, borderTop: '1px solid #eee', bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center' }}>
            <TextField
              fullWidth
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              disabled={sending || chat.status !== 'active'}
              sx={{ mr: 2, bgcolor: '#fff', borderRadius: 2 }}
            />
            <Button variant="contained" color="primary" endIcon={<SendIcon />} onClick={handleSend} disabled={sending || !input.trim() || chat.status !== 'active'}>
              Send
            </Button>
          </Box>
        ) : (
          <Box sx={{ p: 2, borderTop: '1px solid #eee', bgcolor: '#f0f0f0', textAlign: 'center' }}>
            <Typography color="text.secondary">{chatInfoMsg}</Typography>
          </Box>
        )}
      </Box>
      {/* Summary Dialog */}
      <Dialog open={summaryOpen} onClose={handleCloseSummary} fullWidth maxWidth="sm">
        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Chat Summary
          <IconButton aria-label="close" onClick={handleCloseSummary} sx={{ color: (theme) => theme.palette.grey[500] }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {summaryLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
              <CircularProgress />
            </Box>
          ) : summaryError ? (
            <Typography color="error">{summaryError}</Typography>
          ) : (
            <Box sx={{ fontSize: '1.1rem', color: '#333' }}>
              <Markdown>{summary}</Markdown>
            </Box>
          )}
        </DialogContent>
      </Dialog>
      {/* Participants Dialog */}
      <Dialog open={peopleOpen} onClose={handleClosePeople} fullWidth maxWidth="xs">
        <DialogTitle>
          People in Chat
          <IconButton aria-label="close" onClick={handleClosePeople} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {peopleLoading ? (
            <Typography>Loading...</Typography>
          ) : participants.length === 0 ? (
            <Typography>No participants found.</Typography>
          ) : (
            participants.map((username, idx) => (
              <Typography key={idx} sx={{ mb: 1 }}>{username}</Typography>
            ))
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ChatRoomPage; 