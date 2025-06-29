// frontend/src/components/CreateChatDialog.tsx
import React, { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Button, Box, Typography, IconButton, 
  CircularProgress // For loading indicators
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { addMinutes } from 'date-fns'; // Helper for setting default end time
import api from '../api'; // Our API client
import { useAuth } from '../contexts/AuthContext.tsx'; // For current user context
import Alert from '@mui/material/Alert'; // For displaying errors
import CloseIcon from '@mui/icons-material/Close'; // For closing search result chips

// Define props for the dialog
interface CreateChatDialogProps {
  open: boolean;
  onClose: () => void;
  onChatCreated: () => void; // Callback after successful chat creation
}

interface UserSearchResult {
  id: string; // This is the Firebase UID, named 'id' from backend
  username: string;
  email: string;
}

const CreateChatDialog: React.FC<CreateChatDialogProps> = ({ open, onClose, onChatCreated }) => {
  const { currentUser, getIdToken } = useAuth();
  const [chatName, setChatName] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null); // Optional start time
  const [endTime, setEndTime] = useState<Date | null>(addMinutes(new Date(), 30)); // Default to 30 mins from now
  const [invitedUsers, setInvitedUsers] = useState<UserSearchResult[]>([]); // Users selected to invite
  const [searchQuery, setSearchQuery] = useState(''); // For user search input
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]); // Results from user search
  
  const [loading, setLoading] = useState(false); // General loading for form submission
  const [searchLoading, setSearchLoading] = useState(false); // Specific loading for search API call
  const [error, setError] = useState('');

  const handleSearchUsers = async () => {
    setError('');
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true); // Set search specific loading
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Authentication token missing.");
        setSearchLoading(false);
        return;
      }
      
      const response = await api.get(`/users/search?query=${searchQuery}`);
      // Ensure backend returns 'id' for UID as per UserSearchResponse model
      setSearchResults(response.data); 
    } catch (err: any) {
      console.error("User search error:", err);
      setError(err.response?.data?.detail || "Failed to search users.");
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddUserToInviteList = (user: UserSearchResult) => {
    // Prevent adding self
    if (currentUser && user.id === currentUser.uid) {
        setError("You are the creator and already a participant.");
        return;
    }
    if (!invitedUsers.some(u => u.id === user.id)) { // Check against user.id (Firebase UID)
      setInvitedUsers([...invitedUsers, user]);
      setError(''); // Clear error if successfully added
    }
    setSearchQuery(''); // Clear search query after adding
    setSearchResults([]); // Clear search results
  };

  const handleRemoveUserFromInviteList = (id: string) => { // Use 'id' for Firebase UID
    setInvitedUsers(invitedUsers.filter(user => user.id !== id));
  };

  // Handles the main form submission for creating a chat
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // CRUCIAL: Prevents default page refresh on form submission

    setError(''); // Clear previous errors
    if (!chatName.trim()) {
      setError("Chat name is required.");
      return;
    }
    if (!endTime) {
      setError("End time is required.");
      return;
    }

    // Basic time validation
    const now = new Date();
    // Normalize dates to ensure consistent comparison (remove milliseconds for robustness if needed, or stick to ISO)
    const normalizedStartTime = startTime ? new Date(startTime.getTime()) : null;
    const normalizedEndTime = new Date(endTime.getTime());
    
    if (normalizedStartTime && normalizedStartTime.getTime() >= normalizedEndTime.getTime()) {
        setError("Start time cannot be after or same as end time.");
        return;
    }
    if (normalizedEndTime.getTime() <= now.getTime()) { // End time cannot be in the past
        setError("End time cannot be in the past.");
        return;
    }
    if (normalizedStartTime && normalizedStartTime.getTime() < now.getTime()) { // Explicitly set start time cannot be in the past
         setError("Scheduled start time cannot be in the past.");
         return;
    }


    setLoading(true); // General form submission loading
    try {
      const token = await getIdToken();
      if (!token) {
        setError("Authentication token missing.");
        setLoading(false);
        return;
      }

      // Prepare invited UIDs for the backend
      const invitedUids = invitedUsers.map(user => user.id); // Map user.id (Firebase UID)

      // Convert Date objects to ISO string with 'Z' for UTC.
      // Ensure dates are valid before calling toISOString().
      // toISOString() always returns UTC ('Z' suffix).
      const apiStartTime = normalizedStartTime ? normalizedStartTime.toISOString() : null;
      const apiEndTime = normalizedEndTime ? normalizedEndTime.toISOString() : ''; // End time is mandatory

      await api.post('/chats/', {
        name: chatName,
        description,
        start_time: apiStartTime,
        end_time: apiEndTime,
        invited_uids: invitedUids,
        invited_emails: [] // Not implemented yet
      });

      onChatCreated(); // Notify parent component (Dashboard) that chat was successfully created
      onClose(); // Close the dialog
    } catch (err: any) {
      console.error("Create chat error:", err);
      setError(err.response?.data?.detail || "Failed to create chat.");
    } finally {
      setLoading(false);
    }
  };

  // Reset form state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setChatName('');
      setDescription('');
      setStartTime(null);
      setEndTime(addMinutes(new Date(), 30));
      setInvitedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      setError('');
      setLoading(false);
      setSearchLoading(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        {/* NEW: Wrap content in a <Box component="form"> for proper form submission handling */}
        <Box component="form" onSubmit={handleFormSubmit}>
          <DialogTitle>Create New Chat</DialogTitle>
          <DialogContent dividers>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            
            <TextField
              autoFocus
              margin="dense"
              id="chatName"
              label="Chat Name"
              type="text"
              fullWidth
              variant="outlined"
              value={chatName}
              onChange={(e) => setChatName(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            <TextField
              margin="dense"
              id="description"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            {/* Start Time Picker */}
            <DateTimePicker
              label="Start Time (Optional)"
              value={startTime}
              onChange={(newValue) => { setStartTime(newValue); }}
              ampm={false} // Use 24-hour format
              disablePast // Disable past dates/times
              slotProps={{ textField: { fullWidth: true, margin: 'dense', sx: { mb: 2 } } }}
            />
            
            {/* End Time Picker */}
            <DateTimePicker
              label="End Time (Required)"
              value={endTime}
              onChange={(newValue) => { setEndTime(newValue); }}
              ampm={false} // Use 24-hour format
              disablePast // Disable past dates/times
              minDateTime={startTime || addMinutes(new Date(), 1)} // End time must be after start time or just after now
              slotProps={{ textField: { fullWidth: true, margin: 'dense', sx: { mb: 2 } } }}
            />

            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Invite Participants</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                margin="dense"
                id="userSearch"
                label="Search Username or Email"
                type="text"
                fullWidth
                variant="outlined"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyUp={(e) => { if (e.key === 'Enter') handleSearchUsers(); }} // Trigger search on Enter
              />
              <Button 
                variant="contained" 
                onClick={handleSearchUsers} // Use the specific search handler
                disabled={searchLoading} 
                type="button" // CRUCIAL: Prevent this button from submitting the form
              >
                {searchLoading ? <CircularProgress size={24} /> : 'Search'}
              </Button>
            </Box>

            {searchResults.length > 0 && (
              <Box sx={{ border: '1px solid #ccc', borderRadius: '4px', p: 1, mb: 2, maxHeight: '150px', overflowY: 'auto' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Search Results:</Typography>
                {searchResults.map((user) => (
                  <Box key={user.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                    <Typography variant="body2">{user.username} ({user.email})</Typography>
                    <Button size="small" onClick={() => handleAddUserToInviteList(user)} type="button">Add</Button> {/* CRUCIAL: type="button" */}
                  </Box>
                ))}
              </Box>
            )}

            {invitedUsers.length > 0 && (
              <Box sx={{ mt: 2, border: '1px solid #ccc', borderRadius: '4px', p: 1, maxHeight: '150px', overflowY: 'auto' }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Selected for Invitation:</Typography>
                {invitedUsers.map((user) => (
                  <Box key={user.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5 }}>
                    <Typography variant="body2">{user.username} ({user.email})</Typography>
                    <IconButton 
                        size="small" 
                        color="error" 
                        onClick={() => handleRemoveUserFromInviteList(user.id)} 
                        type="button" // CRUCIAL: type="button" for IconButton
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            )}
            
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} type="button">Cancel</Button> {/* CRUCIAL: type="button" */}
            <Button onClick={handleFormSubmit} variant="contained" disabled={loading} type="submit"> {/* CRUCIAL: type="submit" */}
              {loading ? <CircularProgress size={24} /> : 'Create Chat'}
            </Button>
          </DialogActions>
        </Box> {/* Closing Box component="form" */}
      </LocalizationProvider>
    </Dialog>
  );
};

export default CreateChatDialog;