import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { OrderResponse, OrderItemResponse, CreateOrderRequest, OrderStatus, NewTicketEvent, TicketUpdateEvent } from '../types';
import * as orderApi from '../services/orderApi';
import { normalizeOrderStatus } from '../utils/orderStatus';
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

  const normalizeOrderNote = useCallback((order: OrderResponse): OrderResponse => {
    const normalizedNote = order.note?.trim()
      ? order.note
      : order.orderNote?.trim()
        ? order.orderNote
        : order.notes?.length
          ? order.notes.join(', ')
          : undefined;

    return {
      ...order,
      note: normalizedNote,
    };
  }, []);

  const normalizeItemNotes = useCallback((item: OrderItemResponse): OrderItemResponse => ({
    ...item,
    notes: item.notes?.length
      ? item.notes
      : item.note
        ? [item.note]
        : [],
  }), []);

  const normalizeOrderResponse = useCallback((order: OrderResponse): OrderResponse => ({
    ...normalizeOrderNote(order),
    items: order.items.map(normalizeItemNotes),
  }), [normalizeItemNotes, normalizeOrderNote]);

  const mapTicketToOrder = useCallback((ticket: NewTicketEvent | TicketUpdateEvent): OrderResponse => {
    const orderNote = ticket.note ?? ticket.orderNote ?? (ticket.notes?.length ? ticket.notes.join(', ') : undefined);
    return {
      id: Number(ticket.id),
      tableNumber: String(ticket.tableNumber),
      staffName: ticket.waiterId || 'Server',
      status: normalizeOrderStatus(ticket.status),
      timestamp: ticket.receivedAt,
      note: orderNote,
      items: ticket.items.map((item, index) => ({
        id: index + 1,
        menuItemId: item.menuItemId,
        name: item.itemName,
        quantity: item.quantity,
        customizations: item.customizations ?? [],
        notes: item.notes?.length ? item.notes : item.note ? [item.note] : [],
        note: item.note,
      })),
    };
  }, []);

  const preserveOrderNotes = useCallback((existingOrder: OrderResponse, incomingOrder: OrderResponse): OrderResponse => {
    const orderNote = incomingOrder.note?.trim() ? incomingOrder.note : existingOrder.note;

    const items = incomingOrder.items.map((incomingItem) => {
      const existingItem = existingOrder.items.find(
        (item) => item.id === incomingItem.id || (item.menuItemId === incomingItem.menuItemId && item.name === incomingItem.name)
      );
      return {
        ...incomingItem,
        customizations: incomingItem.customizations?.length
          ? incomingItem.customizations
          : existingItem?.customizations ?? [],
        notes: incomingItem.notes?.length ? incomingItem.notes : existingItem?.notes ?? [],
      };
    });

    return {
      ...incomingOrder,
      note: orderNote,
      items,
    };
  }, []);

  const createOrder = useCallback(async (request: CreateOrderRequest): Promise<OrderResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const rawOrder = await orderApi.createOrder(request);
      const order = normalizeOrderResponse({
        ...rawOrder,
        status: normalizeOrderStatus(rawOrder.status),
      });
      const trimmedRequestNote = request.note?.trim();
      const merged: OrderResponse = {
        ...order,
        status: normalizeOrderStatus(order.status),
        note: order.note ?? (trimmedRequestNote ? trimmedRequestNote : undefined),
      };
      setOrders((prev) => new Map(prev).set(merged.id, merged));
      return merged;
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
      const normalized = fetchedOrders.map((o) => normalizeOrderResponse({
        ...o,
        status: normalizeOrderStatus(o.status),
      }));
      setOrders((prev) => {
        const next = new Map<number, OrderResponse>();
        normalized.forEach((order) => {
          const existing = prev.get(order.id);
          next.set(order.id, existing ? preserveOrderNotes(existing, order) : order);
        });
        return next;
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch orders';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [preserveOrderNotes]);

  const fetchOrderById = useCallback(async (orderId: number): Promise<OrderResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const rawOrder = await orderApi.getOrderById(orderId);
      const order = normalizeOrderResponse({
        ...rawOrder,
        status: normalizeOrderStatus(rawOrder.status),
      });
      let merged: OrderResponse = order;
      setOrders((prev) => {
        const existing = prev.get(order.id);
        merged = existing ? preserveOrderNotes(existing, order) : order;
        return new Map(prev).set(merged.id, merged);
      });
      return merged;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, [preserveOrderNotes]);

  const updateKitchenTicketStatus = useCallback(async (ticketId: string | number, status: OrderStatus) => {
    setError(null);
    const idNum = Number(ticketId);
    let snapshot: OrderResponse | undefined;
    if (!Number.isNaN(idNum)) {
      setOrders((prev) => {
        snapshot = prev.get(idNum);
        if (!snapshot) return prev;
        const next = new Map(prev);
        next.set(idNum, { ...snapshot, status });
        return next;
      });
    }
    try {
      await orderApi.updateKitchenTicketStatus(ticketId, status);
    } catch (err) {
      if (!Number.isNaN(idNum) && snapshot) {
        setOrders((prev) => new Map(prev).set(idNum, snapshot));
      }
      const message = err instanceof Error ? err.message : 'Failed to update kitchen ticket';
      setError(message);
      throw err;
    }
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
              setOrders((prev) => {
                const cur = prev.get(mapped.id);
                const withNote =
                  mapped.note || !cur?.note ? mapped : { ...mapped, note: cur.note };
                return new Map(prev).set(mapped.id, withNote);
              });
            }
          },
          onTicketUpdate: (ticket) => {
            setLiveTickets((prev) => new Map(prev).set(String(ticket.id), ticket));
            const mapped = mapTicketToOrder(ticket);
            if (!Number.isNaN(mapped.id)) {
              setOrders((prev) => {
                const cur = prev.get(mapped.id);
                const withNote =
                  mapped.note || !cur?.note ? mapped : { ...mapped, note: cur.note };
                return new Map(prev).set(mapped.id, withNote);
              });
            }
          },
          onCompletedTicket: (ticketId) => {
            const id = Number(ticketId);
            if (!Number.isNaN(id)) {
              void fetchOrderById(id).catch(() => {
                /* đơn có thể đã xong khỏi KDS; đồng bộ từ ordering */
              });
            }
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
            const status = normalizeOrderStatus(message.status);
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
  }, [fetchAllOrders, fetchOrderById, mapTicketToOrder]);

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
