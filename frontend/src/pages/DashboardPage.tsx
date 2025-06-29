// frontend/src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.tsx';
import { useNavigate } from 'react-router-dom';

// MUI Imports
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Avatar from '@mui/material/Avatar';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Badge from '@mui/material/Badge';
import ListItemIcon from '@mui/material/ListItemIcon'; 
import ChatIcon from '@mui/icons-material/Chat';
import EventNoteIcon from '@mui/icons-material/EventNote';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

// Import the CreateChatDialog
import CreateChatDialog from '../components/CreateChatDialog.tsx';
import api from '../api';

// Define type for Chat objects received from backend
interface ChatResponse {
  id: string;
  name: string;
  creator_id: string;
  creator_username: string;
  created_at: string;
  status: string; // "active", "scheduled", "completed" (from backend creation)
  start_time: string | null;
  end_time: string;
  participants_count: number;
}

interface ChatListDisplayProps {
  chats: ChatResponse[];
  categoryTitle: string;
  onChatClick: (chatId: string) => void;
}

// ChatListDisplay Component (moved here from previous inline definition)
const ChatListDisplay: React.FC<ChatListDisplayProps> = ({ chats, categoryTitle, onChatClick }) => {
  return (
    <Box sx={{ width: '100%', pt: 2, pb: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, color: '#3f51b5' }}>{categoryTitle}</Typography>
      {chats.length > 0 ? (
        <List sx={{ width: '100%' }}>
          {chats.map(chat => (
            <ListItemButton 
              key={chat.id} 
              onClick={() => onChatClick(chat.id)} 
              sx={{ 
                bgcolor: '#e8f5e9', 
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
                    <Typography variant="body1" component="div" sx={{ fontWeight: 'medium' }}>
                        {chat.name}
                    </Typography>
                } 
                secondary={`By ${chat.creator_username} • ${new Date(chat.created_at).toLocaleString()}`}
              />
            </ListItemButton>
          ))}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">No {categoryTitle.toLowerCase()} to display.</Typography>
      )}
    </Box>
  );
};


function DashboardPage() {
  const { currentUser, logout, loading } = useAuth();
  const navigate = useNavigate();

  const [allChats, setAllChats] = useState<ChatResponse[]>([]);
  const [activeChats, setActiveChats] = useState<ChatResponse[]>([]);
  const [scheduledChats, setScheduledChats] = useState<ChatResponse[]>([]);
  const [previousChats, setPreviousChats] = useState<ChatResponse[]>([]); 

  const [fetchingChats, setFetchingChats] = useState(true);
  const [chatsError, setChatsError] = useState('');

  const [openCreateChatDialog, setOpenCreateChatDialog] = useState(false); 
  const [selectedCategory, setSelectedCategory] = useState<'home' | 'active' | 'scheduled' | 'previous'>('home'); 

  const fetchChats = async () => {
    setFetchingChats(true);
    setChatsError('');
    try {
      const response = await api.get('/chats/my');
      const fetchedChats: ChatResponse[] = response.data; 

      setAllChats(fetchedChats); 

      const now = new Date(); 

      const active: ChatResponse[] = [];
      const scheduled: ChatResponse[] = [];
      const previous: ChatResponse[] = [];

      fetchedChats.forEach(chat => {
        const startTime = chat.start_time ? new Date(chat.start_time) : new Date(chat.created_at);
        const endTime = new Date(chat.end_time);

        if (now >= endTime) {
          previous.push(chat); 
        } else if (now < startTime) {
          scheduled.push(chat); 
        } else {
          active.push(chat); 
        }
      });

      setActiveChats(active);
      setScheduledChats(scheduled);
      setPreviousChats(previous); 

      console.log("DEBUG: Chats fetched and categorized successfully.");
      console.log("DEBUG: Active Chats:", active);
      console.log("DEBUG: Scheduled Chats:", scheduled);
      console.log("DEBUG: Previous Chats:", previous);

      if (fetchedChats.length > 0 && selectedCategory === 'home') {
        setSelectedCategory('active'); 
      } else if (fetchedChats.length === 0) {
        setSelectedCategory('home'); 
      }


    } catch (err: any) {
      console.error("Failed to fetch chats:", err);
      setChatsError(err.response?.data?.detail || "Could not load chats.");
    } finally {
      setFetchingChats(false); 
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchChats();
    }
  }, [currentUser]); 


  const handleOpenCreateChat = () => {
    setOpenCreateChatDialog(true);
    setSelectedCategory('home'); 
  };

  const handleCloseCreateChat = () => {
    setOpenCreateChatDialog(false);
  };

  const handleChatCreated = () => {
    console.log("Chat created successfully! Re-fetching chat list...");
    fetchChats(); 
  };

  const handleCategoryClick = (category: 'home' | 'active' | 'scheduled' | 'previous') => {
    setSelectedCategory(category);
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#e0e0e0' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>Loading...</Typography>
      </Box>
    );
  }

  if (!currentUser) {
    navigate('/login');
    return null;
  }

  const userName = currentUser?.displayName || 'Guest User'; // Display username only

  const renderRightContent = () => {
    if (fetchingChats) {
      return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <CircularProgress sx={{ mb: 2 }} />
          <Typography variant="h6">Loading your chats...</Typography>
        </Box>
      );
    } else if (chatsError) {
      return <Alert severity="error" sx={{ width: '100%' }}>{chatsError}</Alert>;
    } else if (selectedCategory === 'home') {
      return (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Typography variant="h4" component="h1" sx={{ mb: 3, fontWeight: 'bold', color: '#424242' }}>
            Welcome, {userName} To MiMo
          </Typography>
          <Button
            variant="contained"
            sx={{ px: 5, py: 1.5, fontSize: '1.1em', bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}
            onClick={handleOpenCreateChat}
            startIcon={<AddCircleOutlineIcon />}
          >
            create chat
          </Button>
        </Box>
      );
    } else {
      let chatsToDisplay: ChatResponse[] = [];
      let categoryTitle = '';
      switch (selectedCategory) {
        case 'active':
          chatsToDisplay = activeChats;
          categoryTitle = 'Active Chats';
          break;
        case 'scheduled':
          chatsToDisplay = scheduledChats;
          categoryTitle = 'Scheduled Chats';
          break;
        case 'previous':
          chatsToDisplay = previousChats;
          categoryTitle = 'Previous Chats';
          break;
        default:
          return null;
      }
      return (
        <ChatListDisplay
          chats={chatsToDisplay}
          categoryTitle={categoryTitle}
          onChatClick={handleChatClick}
        />
      );
    }
  };


  const handleChatClick = (chatId: string) => {
    navigate(`/chat/${chatId}`); 
  };


  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        width: '100vw',
        bgcolor: '#e0e0e0', 
        overflow: 'hidden' 
      }}
    >
      {/* Left Sidebar (Paper) */}
      <Paper 
        elevation={3} 
        sx={{ 
          width: '250px', 
          flexShrink: 0, 
          height: '100vh', 
          bgcolor: '#f5f5f5', 
          display: 'flex',
          flexDirection: 'column', 
          borderRadius: '0px', 
          boxShadow: '0px 0px 10px rgba(0,0,0,0.1)', 
          borderRight: '1px solid #e0e0e0' ,
        }}
      >
        {/* Top Section: Profile Picture, Username */}
        <Box sx={{ pt: 3, pb: 2, px: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}> {/* Added px */}
          <Avatar sx={{ width: 100, height: 100, bgcolor: '#9e9e9e', mb: 1.5 }}>
            <AccountCircle sx={{ fontSize: 70, color: 'white' }} />
          </Avatar>
          <Typography variant="h6" sx={{ fontWeight: 'medium', color: '#333', textAlign: 'center' }}> {/* Added textAlign */}
            {currentUser?.displayName || 'Guest User'}
          </Typography>
        </Box>

        <Divider sx={{ width: '80%', mx: 'auto', my: 2 }} />

        {/* Middle Section: Navigation Items */}
        <List sx={{ width: '100%', px: 1, flexGrow: 1, overflowY: 'auto', minHeight: 0 }}> {/* px for overall list padding */}
          <ListItemButton
            onClick={() => handleCategoryClick('home')}
            selected={selectedCategory === 'home'}
            sx={{
              py: 1, px: 2, mb: 1, borderRadius: '6px', cursor: 'pointer',
              '&:hover': { bgcolor: '#e0e0e0' },
              bgcolor: selectedCategory === 'home' ? '#e0e0e0' : 'transparent',
              display: 'flex', alignItems: 'center', boxSizing: 'border-box',
              position: 'relative',
              width: 'calc(100% - 16px)', // prevent highlight overflow
              marginLeft: '8px',
              marginRight: '8px',
              transition: 'background 0.2s',
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}><AddCircleOutlineIcon color="action" /></ListItemIcon>
            <ListItemText primary="Home" primaryTypographyProps={{ sx: { fontSize: '0.9rem' } }} />
          </ListItemButton>
          <ListItemButton
            onClick={() => handleCategoryClick('active')}
            selected={selectedCategory === 'active'}
            sx={{
              py: 1, px: 2, mb: 1, borderRadius: '6px', cursor: 'pointer',
              '&:hover': { bgcolor: '#e0e0e0' },
              bgcolor: selectedCategory === 'active' ? '#e0e0e0' : 'transparent',
              display: 'flex', alignItems: 'center', boxSizing: 'border-box',
              position: 'relative',
              width: 'calc(100% - 16px)',
              marginLeft: '8px',
              marginRight: '8px',
              transition: 'background 0.2s',
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}><ChatIcon color="primary" /></ListItemIcon>
            <ListItemText primary="Active Chats" primaryTypographyProps={{ sx: { fontSize: '0.9rem' } }} />
            <Badge badgeContent={activeChats.length} color="primary" sx={{ ml: 'auto', '& .MuiBadge-badge': { right: -5, top: '50%', transform: 'translateY(-50%)', border: '2px solid white', fontSize: '0.7rem', height: 18, width: 18, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' } }} />
          </ListItemButton>
          <ListItemButton
            onClick={() => handleCategoryClick('scheduled')}
            selected={selectedCategory === 'scheduled'}
            sx={{
              py: 1, px: 2, mb: 1, borderRadius: '6px', cursor: 'pointer',
              '&:hover': { bgcolor: '#e0e0e0' },
              bgcolor: selectedCategory === 'scheduled' ? '#e0e0e0' : 'transparent',
              display: 'flex', alignItems: 'center', boxSizing: 'border-box',
              position: 'relative',
              width: 'calc(100% - 16px)',
              marginLeft: '8px',
              marginRight: '8px',
              transition: 'background 0.2s',
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}><EventNoteIcon color="warning" /></ListItemIcon>
            <ListItemText primary="Scheduled Chats" primaryTypographyProps={{ sx: { fontSize: '0.9rem' } }} />
            <Badge badgeContent={scheduledChats.length} color="warning" sx={{ ml: 'auto', '& .MuiBadge-badge': { right: -5, top: '50%', transform: 'translateY(-50%)', border: '2px solid white', fontSize: '0.7rem', height: 18, width: 18, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' } }} />
          </ListItemButton>
          <ListItemButton
            onClick={() => handleCategoryClick('previous')}
            selected={selectedCategory === 'previous'}
            sx={{
              py: 1, px: 2, mb: 1, borderRadius: '6px', cursor: 'pointer',
              '&:hover': { bgcolor: '#e0e0e0' },
              bgcolor: selectedCategory === 'previous' ? '#e0e0e0' : 'transparent',
              display: 'flex', alignItems: 'center', boxSizing: 'border-box',
              position: 'relative',
              width: 'calc(100% - 16px)',
              marginLeft: '8px',
              marginRight: '8px',
              transition: 'background 0.2s',
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}><HistoryIcon color="action" /></ListItemIcon>
            <ListItemText primary="Previous Chats" primaryTypographyProps={{ sx: { fontSize: '0.9rem' } }} />
            <Badge badgeContent={previousChats.length} color="error" sx={{ ml: 'auto', '& .MuiBadge-badge': { right: -5, top: '50%', transform: 'translateY(-50%)', border: '2px solid white', fontSize: '0.7rem', height: 18, width: 18, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' } }} />
          </ListItemButton>
        </List>

        {/* Bottom Section: Logout Button */}
        <Box sx={{ width: '100%', pb: 2, display: 'flex', justifyContent: 'center', mt: 'auto' }}> {/* NEW: mt: auto here for pushing */}
            <Button 
            variant="contained" 
            color="error" 
            onClick={handleLogout} 
            sx={{ 
                width: '80%', 
                mx: 'auto' 
            }} 
            >
            Logout
            </Button>
        </Box>
      </Paper>

      {/* Right Content Area */}
      <Box 
        sx={{ 
          flexGrow: 1,
          height: '100vh',
          width: '100%',
          bgcolor: '#ffffff', 
          display: 'flex',
          flexDirection: 'column',
          p: 0,
          m: 0,
        }}
      >
        {renderRightContent()}
      </Box>

      {/* Create Chat Dialog Component */}
      <CreateChatDialog
        open={openCreateChatDialog}
        onClose={handleCloseCreateChat}
        onChatCreated={handleChatCreated}
      />
    </Box>
  );
}

export default DashboardPage;