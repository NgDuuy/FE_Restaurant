// services/kdsWebSocket.ts
import { Client } from '@stomp/stompjs';
import { KitchenTicket } from '../types';

class KDSWebSocketService {
  private client: Client | null = null;
  private onNewTicket?: (ticket: KitchenTicket) => void;
  private onTicketUpdate?: (ticket: KitchenTicket) => void;
  private onCompletedTicket?: (ticketId: string) => void;
  private onConnectionChange?: (connected: boolean) => void;

  connect(config: {
    url: string;
    onNewTicket?: (ticket: KitchenTicket) => void;
    onTicketUpdate?: (ticket: KitchenTicket) => void;
    onCompletedTicket?: (ticketId: string) => void;
    onConnectionChange?: (connected: boolean) => void;
  }) {
    this.onNewTicket = config.onNewTicket;
    this.onTicketUpdate = config.onTicketUpdate;
    this.onCompletedTicket = config.onCompletedTicket;
    this.onConnectionChange = config.onConnectionChange;

    this.client = new Client({
      brokerURL: config.url,
      connectHeaders: {},
      reconnectDelay: 5000,
    });

    this.client.onConnect = () => {
      console.log('✅ KDS WebSocket connected');
      this.onConnectionChange?.(true);

      this.client?.subscribe('/topic/kitchen/new-tickets', (message) => {
        try {
          const ticket: KitchenTicket = JSON.parse(message.body);
          this.onNewTicket?.(ticket);
        } catch (error) {
          console.error('Failed to parse new ticket:', error);
        }
      });

      this.client?.subscribe('/topic/kitchen/ticket-updates', (message) => {
        try {
          const ticket: KitchenTicket = JSON.parse(message.body);
          this.onTicketUpdate?.(ticket);
        } catch (error) {
          console.error('Failed to parse ticket update:', error);
        }
      });

      this.client?.subscribe('/topic/kitchen/completed-tickets', (message) => {
        const ticketId = message.body;
        this.onCompletedTicket?.(ticketId);
      });
    };

    this.client.onStompError = (frame) => {
      console.error('❌ STOMP error:', frame);
      this.onConnectionChange?.(false);
    };

    this.client.onWebSocketClose = () => {
      console.log('🔌 WebSocket closed');
      this.onConnectionChange?.(false);
    };

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }
}

export const kdsWebSocketService = new KDSWebSocketService();
