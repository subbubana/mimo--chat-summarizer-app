// frontend/src/App.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.tsx'; // Will create this file next
import DashboardPage from './pages/DashboardPage.tsx'; // Will create this later
import { AuthProvider } from './contexts/AuthContext.tsx'; // AuthProvider component
import ChatRoomPage from './pages/ChatRoomPage.tsx';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            // For now, no strict protection, just renders DashboardPage
            // We'll add a wrapper component for protection later
            <DashboardPage />
          }
        />
        <Route path="/chat/:chatId" element={<ChatRoomPage />} />
        {/* Redirect to login if path is not found or is root */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;