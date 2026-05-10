import { config } from '../config/config';

export interface OrderStatusRealtimeMessage {
  orderId: string;
  status: string;
}

type OrderStatusCallback = (message: OrderStatusRealtimeMessage) => void;
type ConnectionStatusCallback = (isConnected: boolean) => void;

interface OrderWsConfig {
  url: string;
  onOrderStatus?: OrderStatusCallback;
  onConnectionChange?: ConnectionStatusCallback;
}

class OrderWebSocketService {
  private client: any = null;
  private connected = false;
  private url = '';
  private onOrderStatus?: OrderStatusCallback;
  private onConnectionChange?: ConnectionStatusCallback;

  async connect(wsConfig: OrderWsConfig): Promise<void> {
    if (this.connected) return;

    this.url = wsConfig.url;
    this.onOrderStatus = wsConfig.onOrderStatus;
    this.onConnectionChange = wsConfig.onConnectionChange;

    const { Client } = await import('@stomp/stompjs');
    const token = localStorage.getItem(config.auth.tokenKey);

    this.client = new Client({
      brokerURL: this.url,
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: config.websocket.reconnectDelay,
      onConnect: () => {
        this.connected = true;
        this.onConnectionChange?.(true);
        this.client.subscribe(config.endpoints.orders.topics.statusAll, (message: any) => {
          try {
            const payload: OrderStatusRealtimeMessage = JSON.parse(message.body);
            this.onOrderStatus?.(payload);
          } catch {
            // Ignore malformed messages
          }
        });
      },
      onStompError: () => {
        this.connected = false;
        this.onConnectionChange?.(false);
      },
      onWebSocketClose: () => {
        this.connected = false;
        this.onConnectionChange?.(false);
      },
    });

    this.client.activate();
  }

  disconnect(): void {
    if (this.client) {
      this.client.deactivate();
    }
    this.connected = false;
    this.onConnectionChange?.(false);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const orderWebsocketService = new OrderWebSocketService();
