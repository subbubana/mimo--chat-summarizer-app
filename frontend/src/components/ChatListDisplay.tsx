// frontend/src/components/ChatListDisplay.tsx
import React from 'react';
import { Box, Typography, List } from '@mui/material';
import ChatListItem from './ChatListItem.tsx'; // Will create this in next step

// Define type for Chat objects (re-using from DashboardPage for clarity)
interface ChatResponse {
  id: string;
  name: string;
  creator_id: string;
  creator_username: string;
  created_at: string;
  status: string;
  start_time: string | null;
  end_time: string;
  participants_count: number;
}

interface ChatListDisplayProps {
  chats: ChatResponse[];
  categoryTitle: string;
  onChatClick: (chatId: string) => void;
}

const ChatListDisplay: React.FC<ChatListDisplayProps> = ({ chats, categoryTitle, onChatClick }) => {
  return (
    <React.Fragment>
      {chats.length > 0 ? (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 2 }}>
          <Typography variant="h5" sx={{ mb: 2, color: '#3f51b5', textAlign: 'center' }}>{categoryTitle}</Typography>
          <List sx={{ width: '100%', maxWidth: 900 }}>
            {chats.map(chat => (
              <ChatListItem 
                key={chat.id} 
                chat={chat} 
                onChatClick={onChatClick} 
              />
            ))}
          </List>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              color: '#264de4',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: 1,
              fontSize: '1.3rem',
              textAlign: 'center',
            }}
          >
            {categoryTitle}
          </Typography>
          <Typography
            variant="body1"
            color="text.primary"
            sx={{
              fontSize: '1.1rem',
              textAlign: 'center',
            }}
          >
            No {categoryTitle.toLowerCase()} to display
          </Typography>
        </Box>
      )}
    </React.Fragment>
  );
};

export default ChatListDisplay;