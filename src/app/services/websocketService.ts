/**
 * WebSocket Service using STOMP protocol
 * Requires: npm install @stomp/stompjs sockjs-client
 *
 * This service handles:
 * - Connection to KDS WebSocket endpoint
 * - Subscription to real-time kitchen ticket updates
 * - Message deserialization and event handling
 */

import { NewTicketEvent, TicketUpdateEvent, CompletedTicketEvent } from '../types';
import { config } from '../config/config';

// Types for callbacks
export type NewTicketCallback = (ticket: NewTicketEvent) => void;
export type TicketUpdateCallback = (ticket: TicketUpdateEvent) => void;
export type CompletedTicketCallback = (ticketId: string) => void;
export type ConnectionStatusCallback = (isConnected: boolean) => void;

interface WebSocketConfig {
    url: string;
    onNewTicket?: NewTicketCallback;
    onTicketUpdate?: TicketUpdateCallback;
    onCompletedTicket?: CompletedTicketCallback;
    onConnectionChange?: ConnectionStatusCallback;
}

class WebSocketService {
    private client: any = null;
    private connected: boolean = false;
    private url: string = '';
    private subscriptions: Map<string, any> = new Map();
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private reconnectDelay: number = 3000;

    // Callbacks
    private onNewTicket?: NewTicketCallback;
    private onTicketUpdate?: TicketUpdateCallback;
    private onCompletedTicket?: CompletedTicketCallback;
    private onConnectionChange?: ConnectionStatusCallback;

    /**
     * Initialize WebSocket connection to KDS service
     * @param config Configuration for connection and callbacks
     */
    async connect(wsConfig: WebSocketConfig): Promise<void> {
        if (this.connected) {
            return;
        }

        this.url = wsConfig.url;
        this.onNewTicket = wsConfig.onNewTicket;
        this.onTicketUpdate = wsConfig.onTicketUpdate;
        this.onCompletedTicket = wsConfig.onCompletedTicket;
        this.onConnectionChange = wsConfig.onConnectionChange;

        try {
            const { Client } = await import('@stomp/stompjs');
            this.client = new Client({
                brokerURL: this.url,
                reconnectDelay: config.websocket.reconnectDelay,
                onConnect: () => this._onConnect(),
                onStompError: (frame: any) => this._onError(frame),
                onWebSocketClose: () => this._onError(new Error('WebSocket closed')),
            });
            this.client.activate();
        } catch (error) {
            console.error('Failed to initialize WebSocket STOMP client', error);
            throw error;
        }
    }

    /**
     * Handle successful connection
     */
    private _onConnect(): void {
        console.log('WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.onConnectionChange?.(true);

        // Subscribe to topics
        this._subscribeToTopics();
    }

    /**
     * Subscribe to all required STOMP topics
     */
    private _subscribeToTopics(): void {
        // Topic 1: New kitchen tickets
        const newTicketsSub = this.client.subscribe(config.endpoints.kds.topics.newTickets, (message: any) => {
            try {
                const ticket: NewTicketEvent = JSON.parse(message.body);
                console.log('New ticket received:', ticket);
                this.onNewTicket?.(ticket);
            } catch (error) {
                console.error('Failed to parse new ticket message:', error);
            }
        });
        this.subscriptions.set('new-tickets', newTicketsSub);

        // Topic 2: Ticket updates (status changes during cooking)
        const ticketUpdatesSub = this.client.subscribe(config.endpoints.kds.topics.ticketUpdates, (message: any) => {
            try {
                const ticket: TicketUpdateEvent = JSON.parse(message.body);
                console.log('Ticket update received:', ticket);
                this.onTicketUpdate?.(ticket);
            } catch (error) {
                console.error('Failed to parse ticket update message:', error);
            }
        });
        this.subscriptions.set('ticket-updates', ticketUpdatesSub);

        // Topic 3: Completed tickets
        const completedTicketsSub = this.client.subscribe(config.endpoints.kds.topics.completedTickets, (message: any) => {
            try {
                const payload = message.body;
                const ticketId: string = payload.startsWith('"') ? JSON.parse(payload) : payload;
                console.log('Ticket completed:', ticketId);
                this.onCompletedTicket?.(ticketId);
            } catch (error) {
                console.error('Failed to parse completed ticket message:', error);
            }
        });
        this.subscriptions.set('completed-tickets', completedTicketsSub);
    }

    /**
     * Handle connection error and attempt reconnect
     */
    private _onError(error: any): void {
        console.error('WebSocket error:', error);
        this.connected = false;
        this.onConnectionChange?.(false);

        // Attempt reconnection
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(
                `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay}ms`
            );

            setTimeout(() => {
                this.connect({
                    url: this.url,
                    onNewTicket: this.onNewTicket,
                    onTicketUpdate: this.onTicketUpdate,
                    onCompletedTicket: this.onCompletedTicket,
                    onConnectionChange: this.onConnectionChange,
                });
            }, this.reconnectDelay);
        } else {
            console.error('Max reconnection attempts reached');
        }
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect(): void {
        if (this.client) {
            // Unsubscribe from all topics
            this.subscriptions.forEach((sub) => {
                if (sub && sub.unsubscribe) {
                    sub.unsubscribe();
                }
            });
            this.subscriptions.clear();

            // Close connection
            this.client.deactivate();
            console.log('WebSocket disconnected');
            this.connected = false;
            this.onConnectionChange?.(false);
        }
    }

    /**
     * Check if WebSocket is currently connected
     */
    isConnected(): boolean {
        return this.connected;
    }
}

// Export singleton instance
export const websocketService = new WebSocketService();
