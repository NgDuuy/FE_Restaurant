import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { Order, OrderItem, OrderStatus } from "../types";
import React from "react";
import { kdsService } from "../services/kdsService";

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Omit<Order, "id" | "createdAt" | "updatedAt">) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<boolean>;
  getOrdersByStatus: (status: OrderStatus) => Order[];
  cancelOrder: (orderId: string) => Promise<boolean>;
  loading: boolean;
  refreshOrders: () => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  // Load orders from API
  const refreshOrders = async () => {
    setLoading(true);
    try {
      const activeTickets = await kdsService.getActiveTickets();
      setOrders(activeTickets);
    } catch (error) {
      console.error("Failed to refresh orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshOrders();

    // Use polling as a fallback for real-time updates (since WebSocket is not supported in this environment)
    const handleTicketUpdate = async (data: any) => {
      console.log("Polling update received:", data);
      await refreshOrders();
    };

    kdsService.startPolling(handleTicketUpdate, 2000); // Poll every 2 seconds

    return () => {
      kdsService.stopPolling();
    };
  }, []);

  const addOrder = (
    orderData: Omit<Order, "id" | "createdAt" | "updatedAt">,
  ) => {
    const newOrder: Order = {
      ...orderData,
      id: `order-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setOrders((prev) => [newOrder, ...prev]);
  };

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
  ): Promise<boolean> => {
    const success = await kdsService.updateTicketStatus(orderId, status);

    if (success) {
      // Update local state
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? { ...order, status, updatedAt: new Date() }
            : order,
        ),
      );
    }

    return success;
  };

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter((order) => order.status === status);
  };

  const cancelOrder = async (orderId: string): Promise<boolean> => {
    console.warn("Cancel order not supported via KDS API");
    return false;
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        addOrder,
        updateOrderStatus,
        getOrdersByStatus,
        cancelOrder,
        loading,
        refreshOrders,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders must be used within OrderProvider");
  }
  return context;
}
