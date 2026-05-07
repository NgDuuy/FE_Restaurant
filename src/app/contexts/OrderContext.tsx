import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { OrderResponse, CreateOrderRequest, OrderStatus, NewTicketEvent, TicketUpdateEvent } from '../types';
import * as orderApi from '../services/orderApi';
import { websocketService } from '../services/websocketService';
import { getWebSocketUrl } from '../config/config';

interface OrderContextType {
  // State
  orders: Map<number, OrderResponse>;
  liveTickets: Map<string, NewTicketEvent | TicketUpdateEvent>;
  isLoading: boolean;
  error: string | null;
  wsConnected: boolean;

  // Actions
  createOrder: (request: CreateOrderRequest) => Promise<OrderResponse>;
  fetchAllOrders: () => Promise<void>;
  fetchOrderById: (orderId: number) => Promise<OrderResponse>;
  getOrdersByStatus: (status: OrderStatus) => OrderResponse[];
  getOrdersByTable: (tableNumber: string) => OrderResponse[];
  clearError: () => void;

  // WebSocket connection
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Map<number, OrderResponse>>(new Map());
  const [liveTickets, setLiveTickets] = useState<Map<string, NewTicketEvent | TicketUpdateEvent>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  /**
   * Create a new order
   */
  const createOrder = useCallback(
    async (request: CreateOrderRequest): Promise<OrderResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const order = await orderApi.createOrder(request);

        // Add to local state
        setOrders((prev) => {
          const updated = new Map(prev);
          updated.set(order.id, order);
          return updated;
        });

        return order;
      }
      catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
          throw err;
        }

        setError('Unknown error');
        throw new Error('Unknown error');

      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Fetch all orders from server
   */
  const fetchAllOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetchedOrders = await orderApi.getAllOrders();

      // Convert array to Map for easier lookup
      const ordersMap = new Map(fetchedOrders.map((order) => [order.id, order]));
      setOrders(ordersMap);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch single order by ID
   */
  const fetchOrderById = useCallback(
    async (orderId: number): Promise<OrderResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const order = await orderApi.getOrderById(orderId);

        // Update in local state
        setOrders((prev) => {
          const updated = new Map(prev);
          updated.set(order.id, order);
          return updated;
        });

        return order;
      }
      catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Unknown error';

        setError(message);

        throw new Error(message);
      }
      finally {
        setIsLoading(false);
      }
    },
    []
  );

  /**
   * Get all orders with specific status
   */
  const getOrdersByStatus = useCallback(
    (status: OrderStatus): OrderResponse[] => {
      return Array.from(orders.values()).filter((order) => order.status === status);
    },
    [orders]
  );

  /**
   * Get all orders for specific table
   */
  const getOrdersByTable = useCallback(
    (tableNumber: string): OrderResponse[] => {
      return Array.from(orders.values()).filter((order) => order.tableNumber === tableNumber);
    },
    [orders]
  );

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Connect to WebSocket for real-time updates
   */
  const connectWebSocket = useCallback(async () => {
    try {
      await websocketService.connect({
        url: getWebSocketUrl(),
        onNewTicket: (ticket: NewTicketEvent) => {
          console.log('New ticket from WebSocket:', ticket);

          // Update orders based on ticket status
          setOrders((prev) => {
            const updated = new Map(prev);
            const orderId = parseInt(ticket.id);

            if (updated.has(orderId)) {
              const order = updated.get(orderId)!;
              updated.set(orderId, {
                ...order,
                status: ticket.status,
              });
            }

            return updated;
          });

          // Also store ticket for kitchen display
          setLiveTickets((prev) => {
            const updated = new Map(prev);
            updated.set(ticket.id, ticket);
            return updated;
          });
        },

        onTicketUpdate: (ticket: TicketUpdateEvent) => {
          console.log('Ticket update from WebSocket:', ticket);

          // Update orders
          setOrders((prev) => {
            const updated = new Map(prev);
            const orderId = parseInt(ticket.id);

            if (updated.has(orderId)) {
              const order = updated.get(orderId)!;
              updated.set(orderId, {
                ...order,
                status: ticket.status,
              });
            }

            return updated;
          });

          // Update ticket
          setLiveTickets((prev) => {
            const updated = new Map(prev);
            updated.set(ticket.id, ticket);
            return updated;
          });
        },

        onCompletedTicket: (ticketId: string) => {
          console.log('Ticket completed:', ticketId);

          // Update ticket status to READY/SERVED
          setLiveTickets((prev) => {
            const updated = new Map(prev);
            const ticket = updated.get(ticketId);

            if (ticket) {
              updated.set(ticketId, {
                ...ticket,
                status: 'READY' as OrderStatus,
                completedAt: new Date().toISOString(),
              });
            }

            return updated;
          });

          // Update order status
          setOrders((prev) => {
            const updated = new Map(prev);
            const orderId = parseInt(ticketId);

            if (updated.has(orderId)) {
              const order = updated.get(orderId)!;
              updated.set(orderId, {
                ...order,
                status: 'READY',
              });
            }

            return updated;
          });
        },

        onConnectionChange: (isConnected: boolean) => {
          console.log('WebSocket connection status:', isConnected);
          setWsConnected(isConnected);
        },
      });
    }
    catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unknown error';

      setError(message);

      throw new Error(message);
    }
  }, []);

  /**
   * Disconnect from WebSocket
   */
  const disconnectWebSocket = useCallback(() => {
    websocketService.disconnect();
    setWsConnected(false);
  }, []);

  // Auto-disconnect on unmount
  useEffect(() => {
    return () => {
      websocketService.disconnect();
    };
  }, []);

  const value: OrderContextType = {
    orders,
    liveTickets,
    isLoading,
    error,
    wsConnected,
    createOrder,
    fetchAllOrders,
    fetchOrderById,
    getOrdersByStatus,
    getOrdersByTable,
    clearError,
    connectWebSocket,
    disconnectWebSocket,
  };

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

/**
 * Hook to use OrderContext
 */
export function useOrder() {
  const context = useContext(OrderContext);

  if (context === undefined) {
    throw new Error('useOrder must be used within OrderProvider');
  }

  return context;
}

/**
 * Backwards compatibility hook - adapts new context to old interface
 * Used by existing components (ChefDashboard, ManagerDashboard, ServerDashboard)
 */
export function useOrders() {
  const context = useContext(OrderContext);

  if (context === undefined) {
    throw new Error('useOrders must be used within OrderProvider');
  }

  // Convert Map to array for backwards compatibility
  const ordersArray = Array.from(context.orders.values());

  return {
    orders: ordersArray,
    addOrder: async (orderData: any) => {
      // Stub - new system uses API
      console.warn('useOrders.addOrder() is deprecated, use useOrder().createOrder()');
    },
    updateOrderStatus: (orderId: string | number, status: string) => {
      // Stub - new system updates via WebSocket from backend
      console.warn(
        'useOrders.updateOrderStatus() is deprecated and no longer needed. Status updates come from backend via WebSocket.'
      );
    },
    getOrdersByStatus: (status: string) => {
      return ordersArray.filter((order) => order.status === status);
    },
    cancelOrder: (orderId: string) => {
      console.warn('useOrders.cancelOrder() is not supported in new API');
    },
  };
}
