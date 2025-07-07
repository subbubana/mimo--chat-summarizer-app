// frontend/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import api from '../api';
import { useNavigate } from 'react-router-dom';

// Define types for AuthContext
interface AuthContextType {
  currentUser: FirebaseUser | null;
  loading: boolean;
  signup: (email: string, password: string, username: string) => Promise<FirebaseUser>;
  login: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);
      // Remove automatic redirect to login - let individual pages handle authentication
    });
    return unsubscribe;
  }, [navigate]);

  const signup = async (email: string, password: string, username: string) => {
    console.log("AuthContext signup: Attempting to create user with:", { email, password, username });
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Set displayName to username in Firebase profile
      await updateProfile(user, { displayName: username });

      // ADD THIS DEBUG PRINT:
      console.log("AuthContext signup: Preparing to send to backend:", { uid: user.uid, email: user.email, username: username });
      // Call backend to store user details in PostgreSQL (with Firebase UID)
      await api.post('/auth/signup', {
        uid: user.uid,
        email: user.email,
        username: username
      });
      console.log("User signed up and registered in backend:", user.uid);
      return user;
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log("User logged in:", user.uid);
      // If displayName is missing, fetch username from backend and set it
      if (!user.displayName) {
        try {
          const res = await api.get(`/users/${user.uid}`); // Assumes backend returns { username: ... }
          const username = res.data.username;
          if (username) {
            await updateProfile(user, { displayName: username });
            // Force reload user to update displayName in context
            await user.reload();
            setCurrentUser(auth.currentUser);
          }
        } catch (err) {
          console.error("Failed to fetch/set username after login", err);
        }
      }
      return user;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out.");
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const getIdToken = async () => {
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true);
        return token;
      } catch (error) {
        console.error("Error getting ID token:", error);
        return null;
      }
    }
    return null;
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    signup,
    login,
    logout,
    getIdToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};