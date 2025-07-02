// frontend/src/components/ChatListItem.tsx
import React, { useState } from 'react';
import { ListItemButton, ListItemText, Typography, Box, Button, Dialog, DialogTitle, DialogContent, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import api from '../api';

// Define type for Chat objects (re-using for consistency)
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

interface ChatListItemProps {
  chat: ChatResponse;
  onChatClick: (chatId: string) => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({ chat, onChatClick }) => {
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [participants, setParticipants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleShowPeople = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPeopleOpen(true);
    setLoading(true);
    try {
      const res = await api.get(`/chats/${chat.id}/participants`);
      setParticipants(res.data.map((u: any) => u.username));
    } catch {
      setParticipants([]);
    } finally {
      setLoading(false);
    }
  };
  const handleClosePeople = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPeopleOpen(false);
  };

  const getBackgroundColor = () => {
    if (chat.status === 'active') return '#e8f5e9'; // Light green
    if (chat.status === 'scheduled') return '#fff8e1'; // Light yellow
    if (chat.status === 'completed') return '#eeeeee'; // Light grey
    return '#f0f0f0'; // Default fallback
  };

  return (
    <>
      <ListItemButton 
        onClick={() => onChatClick(chat.id)} 
        sx={{ 
          bgcolor: getBackgroundColor(), 
          mb: 1, 
          borderRadius: '8px', 
          boxShadow: 1, 
          cursor: 'pointer',
          borderLeft: `5px solid ${
              chat.status === 'active' ? '#4caf50' : 
              chat.status === 'scheduled' ? '#ffc107' : 
              '#9e9e9e' 
          }`,
          py: 1.5 
        }}
      >
        <ListItemText 
          primary={
            <Box>
              <Typography variant="body1" component="div" sx={{ fontWeight: 'medium' }}>
                {chat.name}
              </Typography>
              {chat.description && <Typography variant="body2" color="text.secondary">{chat.description}</Typography>}
            </Box>
          } 
          secondary={
            <Box>
              <Typography variant="caption" color="text.secondary">
                Creator: {chat.creator_username} | 
                <span style={{ cursor: 'pointer', color: '#1976d2', textDecoration: 'underline' }} onClick={handleShowPeople}>
                  Participants: {chat.participants_count}
                </span>
              </Typography>
            </Box>
          }
        />
      </ListItemButton>
      <Dialog open={peopleOpen} onClose={handleClosePeople} fullWidth maxWidth="xs">
        <DialogTitle>
          People in Chat
          <IconButton aria-label="close" onClick={handleClosePeople} sx={{ position: 'absolute', right: 8, top: 8 }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {loading ? (
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
    </>
  );
};

export default ChatListItem;