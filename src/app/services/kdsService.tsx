import { Order, OrderItem, OrderStatus, MenuItem } from "../types";
import { API_BASE_URL } from "./config";

// Map API status to app status
const mapApiStatusToApp = (apiStatus: string): OrderStatus => {
  switch (apiStatus) {
    case "PENDING":
      return "new";
    case "COOKING":
      return "cooking";
    case "READY":
      return "ready";
    case "SERVED":
      return "served";
    case "CANCELLED":
      return "cancelled";
    default:
      return "new";
  }
};

// Map app status to API status
const mapAppStatusToApi = (appStatus: OrderStatus): string => {
  switch (appStatus) {
    case "new":
      return "PENDING";
    case "cooking":
      return "COOKING";
    case "ready":
      return "READY";
    case "served":
      return "SERVED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
};

// API response interface for kitchen ticket
interface ApiKitchenTicket {
  id: string;
  tableNumber: number;
  waiterId: string;
  status: "PENDING" | "COOKING" | "READY" | "SERVED" | "CANCELLED";
  receivedAt: string;
  completedAt: string | null;
  items: Array<{
    menuItemId: string;
    itemName: string;
    quantity: number;
    status: string;
    customizations: string[];
    notes: string[];
  }>;
}

// Convert API ticket to app Order format
const convertApiTicketToOrder = (ticket: ApiKitchenTicket): Order => {
  const items: OrderItem[] = ticket.items.map((item, idx) => ({
    id: `item-${idx}`,
    menuItemId: item.menuItemId,
    menuItem: {
      id: item.menuItemId,
      name: item.itemName,
      nameVi: item.itemName,
      category: "main",
      price: 0,
      available: true,
      preparationTime: 15,
      description: "",
    },
    quantity: item.quantity,
    notes: [
      ...item.customizations.map((c) => ({
        type: "special" as const,
        content: c,
      })),
      ...item.notes.map((n) => ({ type: "special" as const, content: n })),
    ],
    customizations: item.customizations.join(", "),
  }));

  return {
    id: ticket.id,
    tableNumber: ticket.tableNumber.toString(),
    items: items,
    status: mapApiStatusToApp(ticket.status),
    serverId: ticket.waiterId,
    serverName: ticket.waiterId,
    createdAt: new Date(ticket.receivedAt),
    updatedAt: ticket.completedAt
      ? new Date(ticket.completedAt)
      : new Date(ticket.receivedAt),
    total: 0,
  };
};

// KDS Service class for handling API calls (Polling mode - no WebSocket)
class KDSService {
  private baseUrl = `${API_BASE_URL}/api/kds`;
  private pollingInterval: NodeJS.Timeout | null = null;
  private onTicketUpdateCallbacks: ((ticket: any) => void)[] = [];
  private lastFetchTime: number = 0;

  // Fetch active tickets from API
  async getActiveTickets(): Promise<Order[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tickets/active`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.status}`);
      }

      const tickets: ApiKitchenTicket[] = await response.json();
      return tickets.map(convertApiTicketToOrder);
    } catch (error) {
      console.error("Error fetching active tickets:", error);
      return [];
    }
  }

  // Update ticket status via API
  async updateTicketStatus(
    ticketId: string,
    status: OrderStatus,
  ): Promise<boolean> {
    try {
      const apiStatus = mapAppStatusToApi(status);
      // API only accepts COOKING, READY, SERVED statuses
      if (
        apiStatus !== "COOKING" &&
        apiStatus !== "READY" &&
        apiStatus !== "SERVED"
      ) {
        console.warn(`Status ${status} cannot be updated via API`);
        return false;
      }

      const response = await fetch(
        `${this.baseUrl}/tickets/${ticketId}/status`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("accessToken") || ""}`,
          },
          body: JSON.stringify({ status: apiStatus }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update ticket status: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error("Error updating ticket status:", error);
      return false;
    }
  }

  // Start polling instead of WebSocket
  startPolling(onUpdate: (ticket: any) => void, intervalMs: number = 30000): void {
    this.onTicketUpdateCallbacks.push(onUpdate);

    if (this.pollingInterval) {
      console.log("Polling already running");
      return;
    }

    console.log(`Starting polling every ${intervalMs}ms`);

    // Initial fetch
    this.pollTickets();

    // Set up interval
    this.pollingInterval = setInterval(() => {
      this.pollTickets();
    }, intervalMs);
  }

  // Poll tickets from API
  private async pollTickets(): Promise<void> {
    try {
      const tickets = await this.getActiveTickets();
      
      // Notify all callbacks about the update
      this.onTicketUpdateCallbacks.forEach((callback) => {
        callback({ type: 'polling', tickets, timestamp: new Date() });
      });
    } catch (error) {
      console.error("Error polling tickets:", error);
    }
  }

  // Stop polling
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log("Polling stopped");
    }
    this.onTicketUpdateCallbacks = [];
  }

  // Legacy method - kept for compatibility, but uses polling instead
  connectWebSocket(onUpdate: (ticket: any) => void): void {
    console.warn("⚠️ WebSocket disabled - using polling instead");
    this.startPolling(onUpdate, 30000);
  }

  // Legacy method - kept for compatibility
  disconnectWebSocket(): void {
    this.stopPolling();
  }
}

// Export singleton instance
export const kdsService = new KDSService();
