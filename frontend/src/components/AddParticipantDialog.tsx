import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import api from '../api';

interface AddParticipantDialogProps {
  open: boolean;
  onClose: () => void;
  chatId: string;
  currentParticipants: string[];
  onParticipantAdded: () => void;
}

const AddParticipantDialog: React.FC<AddParticipantDialogProps> = ({
  open,
  onClose,
  chatId,
  currentParticipants,
  onParticipantAdded
}) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!username.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      console.log('Adding participant:', { chatId, username: username.trim() });
      const response = await api.post(`/chats/${chatId}/participants`, { username: username.trim() });
      console.log('Add participant success:', response.data);
      setUsername('');
      onParticipantAdded();
      onClose();
    } catch (err: any) {
      console.error('Add participant error:', err);
      console.error('Error response:', err.response?.data);
      
      // Handle different error response formats
      let errorMessage = 'Failed to add participant.';
      
      if (err.response?.data) {
        const errorData = err.response.data;
        
        // Handle Pydantic validation errors
        if (errorData.detail && Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((item: any) => item.msg).join(', ');
        }
        // Handle simple string error
        else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        }
        // Handle object with message
        else if (errorData.message) {
          errorMessage = errorData.message;
        }
        // Handle other object formats
        else if (typeof errorData === 'object') {
          errorMessage = JSON.stringify(errorData);
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUsername('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add Participant</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter the username of the person you want to add to this chat.
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Username"
          type="text"
          fullWidth
          variant="outlined"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            }
          }}
          disabled={loading}
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {currentParticipants.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Current participants:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {currentParticipants.map((participant, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem'
                  }}
                >
                  {participant}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !username.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          Add Participant
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddParticipantDialog; 