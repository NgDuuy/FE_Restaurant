import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { kdsWebsocketService } from "../services/kdsWebsocketService";
import { getKDSWebSocketUrl } from "../config/config";
import * as kdsApi from "../services/kdsApi";
import { KitchenTicket, OrderStatus } from "../types";

interface KDSContextType {
  tickets: Map<string, KitchenTicket>;
  isLoading: boolean;
  error: string | null;
  wsConnected: boolean;
  fetchActiveTickets: () => Promise<void>;
  updateTicketStatus: (ticketId: string, status: OrderStatus) => Promise<void>;
  clearError: () => void;
}

const KDSContext = createContext<KDSContextType | undefined>(undefined);

export function KDSProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Map<string, KitchenTicket>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const normalizeStatus = (status: string): OrderStatus => {
    if (status === "KITCHEN_PENDING") return "PENDING";
    return status as OrderStatus;
  };

  const fetchActiveTickets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const activeTickets = await kdsApi.getActiveTickets();
      const ticketMap = new Map<string, KitchenTicket>();
      activeTickets.forEach((ticket: KitchenTicket) => {
        ticketMap.set(ticket.id, ticket);
      });
      setTickets(ticketMap);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch active tickets";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateTicketStatus = useCallback(
    async (ticketId: string, status: OrderStatus) => {
      setError(null);
      // Optimistic update
      setTickets((prev) => {
        const updated = new Map(prev);
        const current = updated.get(ticketId);
        if (current) {
          updated.set(ticketId, { ...current, status });
        }
        return updated;
      });

      try {
        await kdsApi.updateTicketStatus(ticketId, status);
        // Nếu status là READY hoặc SERVED, có thể fetch lại
        if (status === "READY" || status === "SERVED") {
          await fetchActiveTickets();
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update status";
        setError(message);
        await fetchActiveTickets();
        throw err;
      }
    },
    [fetchActiveTickets],
  );

  const connectWebSocket = useCallback(async () => {
    if (!kdsWebsocketService.isConnectedToServer()) {
      await kdsWebsocketService.connect({
        url: getKDSWebSocketUrl(),
        onNewTicket: (ticket: KitchenTicket) => {
          console.log("New ticket via WS:", ticket);
          const normalizedTicket = {
            ...ticket,
            status: normalizeStatus(ticket.status),
          };
          setTickets((prev) => new Map(prev).set(ticket.id, normalizedTicket));
        },
        onTicketUpdate: (ticket: KitchenTicket) => {
          console.log("Ticket update via WS:", ticket);
          const normalizedTicket = {
            ...ticket,
            status: normalizeStatus(ticket.status),
          };
          setTickets((prev) => new Map(prev).set(ticket.id, normalizedTicket));
        },
        onCompletedTicket: (ticketId: string) => {
          console.log("Completed ticket via WS:", ticketId);
          setTickets((prev) => {
            const updated = new Map(prev);
            updated.delete(ticketId);
            return updated;
          });
        },
        onConnectionChange: (connected) => {
          setWsConnected(connected);
        },
        onError: (err) => {
          setError(err.message);
        },
      });
    }
  }, []);

  const disconnectWebSocket = useCallback(() => {
    kdsWebsocketService.disconnect();
    setWsConnected(false);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    void fetchActiveTickets();
    void connectWebSocket();
    return () => disconnectWebSocket();
  }, [connectWebSocket, disconnectWebSocket, fetchActiveTickets]);

  return (
    <KDSContext.Provider
      value={{
        tickets,
        isLoading,
        error,
        wsConnected,
        fetchActiveTickets,
        updateTicketStatus,
        clearError,
      }}
    >
      {children}
    </KDSContext.Provider>
  );
}

export function useKDS() {
  const context = useContext(KDSContext);
  if (context === undefined) {
    throw new Error("useKDS must be used within KDSProvider");
  }
  return context;
}
