import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, Paper, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import api from '../api';
import TextField from '@mui/material/TextField';
import SendIcon from '@mui/icons-material/Send';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Markdown from 'markdown-to-jsx';
import AddParticipantDialog from '../components/AddParticipantDialog';
import { useAuth } from '../contexts/AuthContext';

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
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
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
  const [addParticipantOpen, setAddParticipantOpen] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [exitLoading, setExitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [exitSuccess, setExitSuccess] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [pollingStopped, setPollingStopped] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if user is near bottom of messages
  const isNearBottom = () => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const threshold = 100; // pixels from bottom
    return scrollHeight - scrollTop - clientHeight < threshold;
  };

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
        console.error('Error fetching chat:', err);
        // Handle authentication errors specifically
        if (err.response?.status === 401 || err.response?.status === 403) {
          console.log("Authentication error in chat room, redirecting to login");
          navigate('/login');
          return;
        }
        setError(err.response?.data?.detail || 'Failed to load chat.');
      } finally {
        setLoading(false);
      }
    };
    if (chatId) fetchChatAndMessages();
    
    // Poll for new messages every 500ms for instant updates
    const interval = setInterval(() => {
      if (chatId && !pollingStopped) {
        api.get(`/chats/${chatId}/messages`)
          .then(res => {
            const newMessages = res.data;
            
            // Check if there are actually new messages
            const hasNewMessages = newMessages.length > messages.length;
            
            if (hasNewMessages) {
              // Only auto-scroll if user is near bottom
              setShouldAutoScroll(isNearBottom());
            }
            
            setMessages(newMessages);
          })
          .catch(err => {
            console.error('Polling error:', err);
            // Don't redirect on polling errors, just log them
            // If we get a 403, it means user is no longer a participant, so stop polling
            if (err.response?.status === 403) {
              console.log('User no longer a participant, stopping polling');
              setPollingStopped(true);
              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          });
      }
    }, 500);
    
    // Store the interval reference
    pollingIntervalRef.current = interval;
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [chatId]);

  useEffect(() => {
    // Only auto-scroll if shouldAutoScroll is true
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, shouldAutoScroll]);

  const handleSend = async () => {
    if (!input.trim() || !chatId || !chat || chat.status !== 'active') return;
    setSending(true);
    try {
      await api.post(`/chats/${chatId}/messages`, { content: input });
      setInput('');
      
      // Always auto-scroll when user sends a message
      setShouldAutoScroll(true);
      
      // Fetch new messages after sending
      const msgRes = await api.get(`/chats/${chatId}/messages`);
      setMessages(msgRes.data);
    } catch (err) {
      console.error('Send error:', err);
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

  const handleOpenAddParticipant = () => {
    setAddParticipantOpen(true);
  };

  const handleCloseAddParticipant = () => {
    setAddParticipantOpen(false);
  };

  const handleParticipantAdded = () => {
    // Refresh participants list and chat info
    handleShowPeople();
    // Refresh chat info to update participant count
    if (chatId) {
      api.get(`/chats/${chatId}`).then(res => setChat(res.data)).catch(console.error);
    }
  };

  const handleExitChat = async () => {
    if (!chatId) return;
    
    // Stop polling immediately to prevent 403 errors
    setPollingStopped(true);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('Polling stopped immediately for exit');
    }
    setExitLoading(true);
    try {
      // First, test if backend is reachable
      console.log('Testing backend connectivity...');
      try {
        await api.get('/');
        console.log('Backend is reachable');
      } catch (healthError) {
        console.error('Backend health check failed:', healthError);
        setError('Backend server is not reachable. Please ensure the server is running.');
        return;
      }
      
      console.log('Attempting to exit chat:', chatId);
      const response = await api.delete(`/chats/${chatId}/exit`);
      console.log('Exit chat response:', response);
      console.log('Successfully exited chat');
      setExitSuccess(true);
      
      // Get the section to redirect back to
      const fromSection = searchParams.get('from') || 'active';
      const redirectPath = `/chats?section=${fromSection}`;
      
      // Show success message briefly before navigating
      setTimeout(() => {
        navigate(redirectPath);
      }, 1500);
    } catch (err: any) {
      console.error('Exit chat error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        fullError: err
      });
      
      // Don't redirect to login, just show the error
      setError(err.response?.data?.detail || `Failed to exit chat. Status: ${err.response?.status}`);
    } finally {
      setExitLoading(false);
      setExitConfirmOpen(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!chatId) return;
    
    // Stop polling immediately to prevent 403 errors
    setPollingStopped(true);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('Polling stopped immediately for delete');
    }
    setDeleteLoading(true);
    try {
      // First, test if backend is reachable
      console.log('Testing backend connectivity...');
      try {
        await api.get('/');
        console.log('Backend is reachable');
      } catch (healthError) {
        console.error('Backend health check failed:', healthError);
        setError('Backend server is not reachable. Please ensure the server is running.');
        return;
      }
      
      console.log('Attempting to delete chat:', chatId);
      const response = await api.delete(`/chats/${chatId}/delete`);
      console.log('Delete chat response:', response);
      console.log('Successfully deleted chat');
      setDeleteSuccess(true);
      
      // Get the section to redirect back to
      const fromSection = searchParams.get('from') || 'active';
      const redirectPath = `/chats?section=${fromSection}`;
      
      // Show success message briefly before navigating
      setTimeout(() => {
        navigate(redirectPath);
      }, 1500);
    } catch (err: any) {
      console.error('Delete chat error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
        fullError: err
      });
      
      // Don't redirect to login, just show the error
      setError(err.response?.data?.detail || `Failed to delete chat. Status: ${err.response?.status}`);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmOpen(false);
    }
  };

  const handleExitClick = () => {
    setExitConfirmOpen(true);
  };

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!chat) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <Typography>Chat not found.</Typography>
      </Box>
    );
  }

  // Show success messages
  if (exitSuccess) {
    const fromSection = searchParams.get('from') || 'active';
    const sectionName = fromSection === 'active' ? 'Active Chats' : 
                       fromSection === 'scheduled' ? 'Scheduled Chats' : 
                       fromSection === 'previous' ? 'Previous Chats' : 'Chat List';
    
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column' }}>
        <Typography variant="h6" color="success.main" sx={{ mb: 2 }}>
          Successfully exited chat!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Redirecting to {sectionName}...
        </Typography>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (deleteSuccess) {
    const fromSection = searchParams.get('from') || 'active';
    const sectionName = fromSection === 'active' ? 'Active Chats' : 
                       fromSection === 'scheduled' ? 'Scheduled Chats' : 
                       fromSection === 'previous' ? 'Previous Chats' : 'Chat List';
    
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column' }}>
        <Typography variant="h6" color="success.main" sx={{ mb: 2 }}>
          Successfully deleted chat!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Redirecting to {sectionName}...
        </Typography>
        <CircularProgress size={24} />
      </Box>
    );
  }

  let chatInfoMsg = '';
  if (chat.status === 'scheduled') chatInfoMsg = "Chat hasn't started yet.";
  if (chat.status === 'completed') chatInfoMsg = "Chat has ended. You can view the summary above to see what was discussed.";

  // Get current user ID from AuthContext
  const currentUserId = currentUser?.uid;

  // Check if current user is the chat creator
  const isCreator = chat.creator_id === currentUserId;
  const canAddParticipants = isCreator && (chat.status === 'scheduled' || chat.status === 'active');
  
  // Debug logging
  console.log('Chat Room Debug:', {
    currentUserId,
    chatCreatorId: chat.creator_id,
    isCreator,
    chatStatus: chat.status,
    canAddParticipants
  });

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#ece5dd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 4 }}>
      <Box sx={{ width: '100%', maxWidth: 900, minHeight: 600, bgcolor: '#fff', borderRadius: 3, boxShadow: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #eee', bgcolor: '#075e54', color: '#fff', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>{chat.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="outlined" color="inherit" size="small" onClick={handleOpenSummary} sx={{ borderColor: '#fff', color: '#fff', '&:hover': { borderColor: '#e0f2f1', color: '#e0f2f1' } }}>
                Summary
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                size="small" 
                onClick={handleExitClick}
                disabled={exitLoading}
                sx={{ 
                  borderColor: '#fff', 
                  color: '#fff', 
                  '&:hover': { borderColor: '#ffcdd2', color: '#ffcdd2' },
                  '&:disabled': { borderColor: '#ccc', color: '#ccc' }
                }}
              >
                {exitLoading ? <CircularProgress size={16} /> : 'Exit Chat'}
              </Button>
              <Button 
                variant="outlined" 
                color="inherit" 
                size="small" 
                onClick={handleDeleteClick}
                disabled={deleteLoading}
                sx={{ 
                  borderColor: '#fff', 
                  color: '#fff', 
                  '&:hover': { borderColor: '#ffcdd2', color: '#ffcdd2' },
                  '&:disabled': { borderColor: '#ccc', color: '#ccc' }
                }}
              >
                {deleteLoading ? <CircularProgress size={16} /> : 'Delete Chat'}
              </Button>
            </Box>
          </Box>
          {chat.description && <Typography variant="body2" sx={{ mb: 0.5, color: '#e0f2f1' }}>{chat.description}</Typography>}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ color: '#b2dfdb' }}>
              Creator: {chat.creator_username} | 
              <span style={{ cursor: 'pointer', color: '#fff', textDecoration: 'underline' }} onClick={handleShowPeople}>
                Participants: {chat.participants_count}
              </span>
            </Typography>
            {canAddParticipants && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleOpenAddParticipant}
                sx={{
                  borderColor: '#fff',
                  color: '#fff',
                  fontSize: '0.75rem',
                  py: 0.5,
                  px: 1,
                  '&:hover': {
                    borderColor: '#e0f2f1',
                    color: '#e0f2f1',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                + Add Participant
              </Button>
            )}
          </Box>
        </Box>
        <Box 
          ref={messagesContainerRef}
          sx={{ flex: 1, p: 3, bgcolor: '#f7f9fa', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
          onScroll={() => {
            // Update auto-scroll preference based on user's scroll position
            setShouldAutoScroll(isNearBottom());
          }}
        >
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
      
      {/* Add Participant Dialog */}
      <AddParticipantDialog
        open={addParticipantOpen}
        onClose={handleCloseAddParticipant}
        chatId={chatId || ''}
        currentParticipants={participants}
        onParticipantAdded={handleParticipantAdded}
      />

      {/* Exit Confirmation Dialog */}
      <Dialog open={exitConfirmOpen} onClose={() => setExitConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Exit Chat</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to exit this chat? You will no longer be able to send messages or view updates.
            {isCreator && " As the creator, exiting will also end the chat for all participants."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExitConfirmOpen(false)} disabled={exitLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleExitChat} 
            variant="contained" 
            color="primary" 
            disabled={exitLoading}
            startIcon={exitLoading ? <CircularProgress size={16} /> : null}
          >
            Exit Chat
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Chat</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this chat? This action cannot be undone.
            {isCreator && " As the creator, deleting will also end the chat for all participants."}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteChat} 
            variant="contained" 
            color="error" 
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : null}
          >
            Delete Chat
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatRoomPage; 