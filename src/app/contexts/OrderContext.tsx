import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { OrderResponse, CreateOrderRequest, OrderStatus, NewTicketEvent, TicketUpdateEvent } from '../types';
import * as orderApi from '../services/orderApi';

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
  const [liveTickets] = useState<Map<string, NewTicketEvent | TicketUpdateEvent>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    void fetchAllOrders();
  }, [fetchAllOrders]);

  const getOrdersByStatus = useCallback((status: OrderStatus): OrderResponse[] => {
    return Array.from(orders.values()).filter((order) => order.status === status);
  }, [orders]);

  const getOrdersByTable = useCallback((tableNumber: string): OrderResponse[] => {
    return Array.from(orders.values()).filter((order) => order.tableNumber === tableNumber);
  }, [orders]);

  const clearError = useCallback(() => setError(null), []);

  // Kept for backward compatibility; websocket removed by request.
  const connectWebSocket = useCallback(async () => Promise.resolve(), []);
  const disconnectWebSocket = useCallback(() => {}, []);

  useEffect(() => {
    void fetchAllOrders();
  }, [fetchAllOrders]);

  return (
    <OrderContext.Provider
      value={{
        orders,
        liveTickets,
        isLoading,
        error,
        wsConnected: false,
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
