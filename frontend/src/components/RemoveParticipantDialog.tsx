import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '../api';

interface RemoveParticipantDialogProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
  participants: string[];
  onParticipantRemoved: () => void;
}

const RemoveParticipantDialog: React.FC<RemoveParticipantDialogProps> = ({
  open,
  onClose,
  chatId,
  participants,
  onParticipantRemoved
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removingUser, setRemovingUser] = useState<string | null>(null);

  const handleRemoveParticipant = async (username: string) => {
    setLoading(true);
    setError('');
    setRemovingUser(username);
    
    try {
      console.log('Removing participant:', { chatId, username });
      
      // First, we need to get the user's UID by username
      const userResponse = await api.get(`/users/search?query=${username}`);
      const user = userResponse.data.find((u: any) => u.username === username);
      
      if (!user) {
        throw new Error(`User ${username} not found`);
      }
      
      // Now remove the participant using their UID
      const response = await api.delete(`/chats/${chatId}/participants/${user.id}`);
      console.log('Remove participant success:', response.data);
      
      onParticipantRemoved();
    } catch (err: any) {
      console.error('Remove participant error:', err);
      console.error('Error response:', err.response?.data);
      
      let errorMessage = 'Failed to remove participant.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        if (errorData.detail && Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((item: any) => item.msg).join(', ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (typeof errorData === 'object') {
          errorMessage = JSON.stringify(errorData);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRemovingUser(null);
    }
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Remove Participants</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a participant to remove from this chat. This action cannot be undone.
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {participants.length === 0 ? (
          <Typography color="text.secondary">No participants to remove.</Typography>
        ) : (
          <List>
            {participants.map((username, index) => (
              <ListItem key={index} divider>
                <ListItemText 
                  primary={username}
                  secondary="Click to remove from chat"
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="remove"
                    onClick={() => handleRemoveParticipant(username)}
                    disabled={loading}
                    color="error"
                  >
                    {removingUser === username ? (
                      <CircularProgress size={20} />
                    ) : (
                      <DeleteIcon />
                    )}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RemoveParticipantDialog; 