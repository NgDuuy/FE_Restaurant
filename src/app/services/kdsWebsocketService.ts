import { Client, Message, IMessage } from '@stomp/stompjs';
import { KitchenTicket, TicketUpdateEvent } from '../types';

interface KDSWebSocketConfig {
  url: string;
  onNewTicket?: (ticket: KitchenTicket) => void;
  onTicketUpdate?: (ticket: KitchenTicket) => void;
  onCompletedTicket?: (ticketId: string) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

class KDSWebSocketService {
  private client: Client | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private config: KDSWebSocketConfig | null = null;

  connect(config: KDSWebSocketConfig): Promise<void> {
    this.config = config;

    return new Promise((resolve, reject) => {
      this.client = new Client({
        brokerURL: config.url,
        reconnectDelay: 3000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        
        onConnect: () => {
          console.log('KDS WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Subscribe to topics
          if (this.client && this.client.connected) {
            // New tickets
            this.client.subscribe('/topic/kitchen/new-tickets', (message: IMessage) => {
              try {
                const ticket: KitchenTicket = JSON.parse(message.body);
                console.log('New ticket received:', ticket);
                this.config?.onNewTicket?.(ticket);
              } catch (error) {
                console.error('Error parsing new ticket:', error);
              }
            });

            // Ticket updates
            this.client.subscribe('/topic/kitchen/ticket-updates', (message: IMessage) => {
              try {
                const ticket: KitchenTicket = JSON.parse(message.body);
                console.log('Ticket update received:', ticket);
                this.config?.onTicketUpdate?.(ticket);
              } catch (error) {
                console.error('Error parsing ticket update:', error);
              }
            });

            // Completed tickets
            this.client.subscribe('/topic/kitchen/completed-tickets', (message: IMessage) => {
              try {
                const ticketId = JSON.parse(message.body);
                console.log('Completed ticket:', ticketId);
                this.config?.onCompletedTicket?.(ticketId);
              } catch (error) {
                console.error('Error parsing completed ticket:', error);
              }
            });
          }
          
          this.config?.onConnectionChange?.(true);
          resolve();
        },
        
        onDisconnect: () => {
          console.log('KDS WebSocket disconnected');
          this.isConnected = false;
          this.config?.onConnectionChange?.(false);
        },
        
        onStompError: (frame) => {
          console.error('KDS WebSocket STOMP error:', frame);
          const error = new Error(frame.headers?.message || 'STOMP error occurred');
          this.config?.onError?.(error);
        },
        
        onWebSocketError: (event) => {
          console.error('KDS WebSocket error:', event);
          const error = new Error('WebSocket connection error');
          this.config?.onError?.(error);
        },
      });

      // Set timeout for connection
      const timeout = setTimeout(() => {
        if (!this.isConnected) {
          reject(new Error('KDS WebSocket connection timeout'));
        }
      }, 10000);

      try {
        this.client.activate();
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
      this.isConnected = false;
      this.config?.onConnectionChange?.(false);
    }
  }

  isConnectedToServer(): boolean {
    return this.isConnected && this.client?.connected === true;
  }

  reconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.config) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect KDS WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.connect(this.config!).catch((err) => {
          console.error('KDS WebSocket reconnection failed:', err);
        });
      }, 3000);
    }
  }
}

export const kdsWebsocketService = new KDSWebSocketService();
