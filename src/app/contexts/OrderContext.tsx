import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { OrderResponse, CreateOrderRequest, OrderStatus, NewTicketEvent, TicketUpdateEvent } from '../types';
import * as orderApi from '../services/orderApi';
import { websocketService } from '../services/websocketService';
import { getOrderWebSocketUrl, getWebSocketUrl } from '../config/config';
import { orderWebsocketService } from '../services/orderWebsocketService';

interface OrderContextType {
  orders: Map<number, OrderResponse>;
  liveTickets: Map<string, NewTicketEvent | TicketUpdateEvent>;
  isLoading: boolean;
  error: string | null;
  wsConnected: boolean;
  createOrder: (request: CreateOrderRequest) => Promise<OrderResponse>;
  fetchAllOrders: () => Promise<void>;
  fetchOrderById: (orderId: number) => Promise<OrderResponse>;
  updateKitchenTicketStatus: (ticketId: string | number, status: OrderStatus) => Promise<void>;
  getOrdersByStatus: (status: OrderStatus) => OrderResponse[];
  getOrdersByTable: (tableNumber: string) => OrderResponse[];
  clearError: () => void;
  connectWebSocket: () => Promise<void>;
  disconnectWebSocket: () => void;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Map<number, OrderResponse>>(new Map());
  const [liveTickets, setLiveTickets] = useState<Map<string, NewTicketEvent | TicketUpdateEvent>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kdsWsConnected, setKdsWsConnected] = useState(false);
  const [orderWsConnected, setOrderWsConnected] = useState(false);

  const mapTicketToOrder = useCallback((ticket: NewTicketEvent | TicketUpdateEvent): OrderResponse => {
    return {
      id: Number(ticket.id),
      tableNumber: String(ticket.tableNumber),
      staffName: ticket.waiterId || 'Server',
      status: ticket.status,
      timestamp: ticket.receivedAt,
      items: ticket.items.map((item, index) => ({
        id: index + 1,
        menuItemId: item.menuItemId,
        name: item.itemName,
        quantity: item.quantity,
        customizations: item.customizations ?? [],
        notes: item.notes ?? [],
      })),
    };
  }, []);

  const createOrder = useCallback(async (request: CreateOrderRequest): Promise<OrderResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const order = await orderApi.createOrder(request);
      setOrders((prev) => new Map(prev).set(order.id, order));
      return order;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAllOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedOrders = await orderApi.getAllOrders();
      setOrders(new Map(fetchedOrders.map((order) => [order.id, order])));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchOrderById = useCallback(async (orderId: number): Promise<OrderResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const order = await orderApi.getOrderById(orderId);
      setOrders((prev) => new Map(prev).set(order.id, order));
      return order;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateKitchenTicketStatus = useCallback(async (ticketId: string | number, status: OrderStatus) => {
    setError(null);
    const idNum = Number(ticketId);
    if (!Number.isNaN(idNum)) {
      setOrders((prev) => {
        const updated = new Map(prev);
        const current = updated.get(idNum);
        if (current) {
          updated.set(idNum, { ...current, status });
        }
        return updated;
      });
    }
    await orderApi.updateKitchenTicketStatus(ticketId, status);
  }, []);

  const getOrdersByStatus = useCallback((status: OrderStatus): OrderResponse[] => {
    return Array.from(orders.values()).filter((order) => order.status === status);
  }, [orders]);

  const getOrdersByTable = useCallback((tableNumber: string): OrderResponse[] => {
    return Array.from(orders.values()).filter((order) => order.tableNumber === tableNumber);
  }, [orders]);

  const clearError = useCallback(() => setError(null), []);

  const connectWebSocket = useCallback(async () => {
    const tasks: Promise<void>[] = [];

    if (!websocketService.isConnected()) {
      tasks.push(
        websocketService.connect({
          url: getWebSocketUrl(),
          onNewTicket: (ticket) => {
            setLiveTickets((prev) => new Map(prev).set(String(ticket.id), ticket));
            const mapped = mapTicketToOrder(ticket);
            if (!Number.isNaN(mapped.id)) {
              setOrders((prev) => new Map(prev).set(mapped.id, mapped));
            }
          },
          onTicketUpdate: (ticket) => {
            setLiveTickets((prev) => new Map(prev).set(String(ticket.id), ticket));
            const mapped = mapTicketToOrder(ticket);
            if (!Number.isNaN(mapped.id)) {
              setOrders((prev) => new Map(prev).set(mapped.id, mapped));
            }
          },
          onCompletedTicket: () => {
            void fetchAllOrders();
          },
          onConnectionChange: (connected) => {
            setKdsWsConnected(connected);
          },
        })
      );
    } else {
      setKdsWsConnected(true);
    }

    if (!orderWebsocketService.isConnected()) {
      tasks.push(
        orderWebsocketService.connect({
          url: getOrderWebSocketUrl(),
          onOrderStatus: (message) => {
            const orderId = Number(message.orderId);
            const status = message.status as OrderStatus;
            if (Number.isNaN(orderId)) return;
            setOrders((prev) => {
              const updated = new Map(prev);
              const current = updated.get(orderId);
              if (current) {
                updated.set(orderId, { ...current, status });
              }
              return updated;
            });
          },
          onConnectionChange: (connected) => {
            setOrderWsConnected(connected);
          },
        })
      );
    } else {
      setOrderWsConnected(true);
    }

    await Promise.all(tasks);
  }, [fetchAllOrders, mapTicketToOrder]);

  const disconnectWebSocket = useCallback(() => {
    websocketService.disconnect();
    orderWebsocketService.disconnect();
    setKdsWsConnected(false);
    setOrderWsConnected(false);
  }, []);

  useEffect(() => {
    void fetchAllOrders();
    void connectWebSocket();
    return () => disconnectWebSocket();
  }, [connectWebSocket, disconnectWebSocket, fetchAllOrders]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        liveTickets,
        isLoading,
        error,
        wsConnected: kdsWsConnected || orderWsConnected,
        createOrder,
        fetchAllOrders,
        fetchOrderById,
        updateKitchenTicketStatus,
        getOrdersByStatus,
        getOrdersByTable,
        clearError,
        connectWebSocket,
        disconnectWebSocket,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) throw new Error('useOrder must be used within OrderProvider');
  return context;
}

export function useOrders() {
  const context = useOrder();
  const ordersArray = Array.from(context.orders.values());
  return {
    orders: ordersArray,
    addOrder: async (orderData: any) => context.createOrder(orderData),
    updateOrderStatus: async (orderId: string | number, status: string) =>
      context.updateKitchenTicketStatus(orderId, status.toUpperCase() as OrderStatus),
    getOrdersByStatus: (status: string) => ordersArray.filter((order) => order.status === (status.toUpperCase() as OrderStatus)),
    cancelOrder: (_orderId: string) => console.warn('Cancel order not implemented'),
  };
}
