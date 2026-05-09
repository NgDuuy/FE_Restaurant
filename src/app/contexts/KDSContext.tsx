// contexts/KDSContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { KitchenTicket, OrderStatus } from '../types';
import { kdsApi } from '../services/kdsApi';
import { kdsWebSocketService } from '../services/kdsWebSocket';
import { getWebSocketUrl } from '../config/config';

interface KDSContextType {
  tickets: KitchenTicket[];
  isLoading: boolean;
  error: string | null;
  wsConnected: boolean;
  fetchActiveTickets: () => Promise<void>;
  updateTicketStatus: (ticketId: string, status: OrderStatus) => Promise<void>;
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
}

const KDSContext = createContext<KDSContextType | undefined>(undefined);

export function KDSProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const fetchActiveTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await kdsApi.getActiveTickets();
      console.log('Fetched tickets:', data);
      setTickets(data);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTicketStatus = useCallback(async (ticketId: string, status: OrderStatus) => {
    try {
      await kdsApi.updateTicketStatus(ticketId, status);
      // Optimistically update UI
      setTickets(prev => prev.map(ticket => 
        ticket.id === ticketId 
          ? { ...ticket, status: status === 'CREATED' ? 'PENDING' : status }
          : ticket
      ));
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
      throw err;
    }
  }, []);

  const connectWebSocket = useCallback(async () => {
    kdsWebSocketService.connect({
      url: getWebSocketUrl(),
      onNewTicket: (ticket: KitchenTicket) => {
        console.log('WebSocket - New ticket:', ticket);
        setTickets(prev => [...prev, ticket]);
      },
      onTicketUpdate: (ticket: KitchenTicket) => {
        console.log('WebSocket - Ticket update:', ticket);
        setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
      },
      onCompletedTicket: (ticketId: string) => {
        console.log('WebSocket - Ticket completed:', ticketId);
        setTickets(prev => prev.map(ticket => 
          ticket.id === ticketId 
            ? { ...ticket, status: 'READY', completedAt: new Date().toISOString() }
            : ticket
        ));
      },
      onConnectionChange: (connected: boolean) => {
        console.log('WebSocket connection:', connected);
        setWsConnected(connected);
      },
    });
  }, []);

  const disconnectWebSocket = useCallback(() => {
    kdsWebSocketService.disconnect();
    setWsConnected(false);
  }, []);

  return (
    <KDSContext.Provider value={{
      tickets,
      isLoading,
      error,
      wsConnected,
      fetchActiveTickets,
      updateTicketStatus,
      connectWebSocket,
      disconnectWebSocket,
    }}>
      {children}
    </KDSContext.Provider>
  );
}

export function useKDS() {
  const context = useContext(KDSContext);
  if (!context) {
    throw new Error('useKDS must be used within KDSProvider');
  }
  return context;
}
