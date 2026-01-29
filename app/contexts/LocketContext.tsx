'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import type {
  Locket,
  CreateLocket,
  UpdateLocket,
  LocketInvite,
  CreateLocketInvite,
  LocketRole,
  LocketContextType
} from '@/lib/types';

const LocketContext = createContext<LocketContextType | undefined>(undefined);

interface LocketProviderProps {
  children: React.ReactNode;
}

export function LocketProvider({ children }: LocketProviderProps) {
  const { user } = useAuth();
  const [currentLocket, setCurrentLocket] = useState<Locket | null>(null);
  const [userLockets, setUserLockets] = useState<Locket[]>([]);
  const [pendingInvites, setPendingInvites] = useState<LocketInvite[]>([]);
  const [userRole, setUserRole] = useState<LocketRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's lockets when user changes
  useEffect(() => {
    if (user) {
      loadUserLockets();
      loadPendingInvites();
    } else {
      setUserLockets([]);
      setPendingInvites([]);
      setCurrentLocket(null);
      setUserRole(null);
      setLoading(false);
      // Clear saved locket from localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedLocketId');
      }
    }
  }, [user]);

  const loadUserLockets = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/lockets', {
        headers: {
          'Authorization': `Bearer ${await getCurrentUserToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load lockets (${response.status})`);
      }

      const { data } = await response.json();
      setUserLockets(data);

      // Try to restore previously selected locket from localStorage
      let selectedLocket = null;
      if (typeof window !== 'undefined') {
        const savedLocketId = localStorage.getItem('selectedLocketId');
        if (savedLocketId) {
          selectedLocket = data.find((l: Locket) => l.id === savedLocketId);
          // If saved locket is not found, clear it from localStorage
          if (!selectedLocket) {
            localStorage.removeItem('selectedLocketId');
          }
        }
      }

      // Set current locket: saved locket, or if none selected/available use first locket
      if (!selectedLocket && !currentLocket || (currentLocket && !data.find((l: Locket) => l.id === currentLocket.id))) {
        selectedLocket = data[0] || null;
      }

      if (selectedLocket) {
        setCurrentLocket(selectedLocket);
        setUserRole(selectedLocket.user_role || null);
        // Save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedLocketId', selectedLocket.id);
        }
      } else {
        // Clear current locket if no valid locket is available
        setCurrentLocket(null);
        setUserRole(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('selectedLocketId');
        }
      }
    } catch (error) {
      console.error('Error loading user lockets:', error);
      setError(error instanceof Error ? error.message : 'Failed to load lockets');
      // Clear locket state on error
      setUserLockets([]);
      setCurrentLocket(null);
      setUserRole(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selectedLocketId');
      }
    } finally {
      setLoading(false);
    }
  };

  const createLocket = async (data: CreateLocket): Promise<Locket> => {
    if (!user) throw new Error('Authentication required');

    const response = await fetch('/api/lockets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getCurrentUserToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create locket');
    }

    const { data: locket } = await response.json();

    // Add to user lockets and set as current
    setUserLockets(prev => [...prev, locket]);
    setCurrentLocket(locket);
    setUserRole('admin');

    return locket;
  };

  const switchLocket = async (locketId: string): Promise<void> => {
    setError(null);
    try {
      const locket = userLockets.find(l => l.id === locketId);
      if (!locket) {
        throw new Error('Locket not found in your available lockets');
      }

      // Verify locket access by making a test API call
      const response = await fetch(`/api/lockets/${locketId}`, {
        headers: {
          'Authorization': `Bearer ${await getCurrentUserToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Access denied to this locket');
      }

      setCurrentLocket(locket);
      setUserRole(locket.user_role || null);

      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('selectedLocketId', locket.id);
      }
    } catch (error) {
      console.error('Error switching locket:', error);
      setError(error instanceof Error ? error.message : 'Failed to switch locket');
      throw error; // Re-throw so calling code can handle it
    }
  };

  const updateLocket = async (locketId: string, data: UpdateLocket): Promise<Locket> => {
    if (!user) throw new Error('Authentication required');

    const response = await fetch(`/api/lockets/${locketId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getCurrentUserToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update locket');
    }

    const { data: updatedLocket } = await response.json();

    // Update in user lockets
    setUserLockets(prev => prev.map(l => l.id === locketId ? updatedLocket : l));

    // Update current locket if it's the one being updated
    if (currentLocket?.id === locketId) {
      setCurrentLocket(updatedLocket);
    }

    return updatedLocket;
  };

  const inviteUser = async (data: CreateLocketInvite): Promise<LocketInvite> => {
    if (!user) throw new Error('Authentication required');

    const response = await fetch('/api/locket-invites', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getCurrentUserToken()}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send invite');
    }

    const { data: invite } = await response.json();
    return invite;
  };

  const removeUser = async (locketId: string, userId: string): Promise<void> => {
    if (!user) throw new Error('Authentication required');

    const response = await fetch(`/api/lockets/${locketId}/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${await getCurrentUserToken()}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to remove user');
    }
  };

  const loadPendingInvites = async () => {
    if (!user || !user.email) return;

    try {
      const response = await fetch('/api/user/pending-invites', {
        headers: {
          'Authorization': `Bearer ${await getCurrentUserToken()}`,
        },
      });

      if (response.ok) {
        const { invites } = await response.json();
        setPendingInvites(invites || []);
      } else {
        console.warn('Failed to load pending invites:', response.status);
        setPendingInvites([]);
      }
    } catch (error) {
      console.error('Error loading pending invites:', error);
      setPendingInvites([]);
    }
  };

  const refreshLockets = async (): Promise<void> => {
    setError(null);
    await loadUserLockets();
    await loadPendingInvites();
  };

  const clearError = () => {
    setError(null);
  };

  const value: LocketContextType = {
    currentLocket,
    userLockets,
    pendingInvites,
    userRole,
    loading,
    error,
    createLocket,
    switchLocket,
    updateLocket,
    inviteUser,
    removeUser,
    refreshLockets,
    clearError,
  };

  return (
    <LocketContext.Provider value={value}>
      {children}
    </LocketContext.Provider>
  );
}

// Backwards compatibility alias
export const CornerProvider = LocketProvider;

export function useLocket(): LocketContextType {
  const context = useContext(LocketContext);
  if (context === undefined) {
    throw new Error('useLocket must be used within a LocketProvider');
  }
  return context;
}

// Backwards compatibility alias
export const useCorner = useLocket;

// Helper function to get current user token
async function getCurrentUserToken(): Promise<string> {
  const { getCurrentUserToken } = await import('@/lib/firebase/auth');
  const token = await getCurrentUserToken();
  if (!token) throw new Error('No authentication token');
  return token;
}
