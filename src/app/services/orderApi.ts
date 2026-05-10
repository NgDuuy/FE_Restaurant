import { CreateOrderRequest, OrderResponse, OrderStatus } from '../types';
import { config, getApiUrl } from '../config/config';

const AUTH_TOKEN_KEY = config.auth.tokenKey;

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/**
 * Create a new order
 */
export async function createOrder(request: CreateOrderRequest): Promise<OrderResponse> {
    try {
        const url = getApiUrl(config.endpoints.orders.create);
        const response = await fetch(url, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Order creation failed: ${response.status} - ${errorText || 'Unknown error'}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Create order error:', error);
        throw error;
    }
}

/**
 * Get all orders
 */
export async function getAllOrders(): Promise<OrderResponse[]> {
    try {
        const url = getApiUrl(config.endpoints.orders.getAll);
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch orders: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Get all orders error:', error);
        throw error;
    }
}

/**
 * Get order by ID
 */
export async function getOrderById(orderId: number): Promise<OrderResponse> {
    try {
        const url = getApiUrl(config.endpoints.orders.getById(orderId));
        const response = await fetch(url, {
            method: 'GET',
            headers: getAuthHeaders(),
        });

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(`Order ${orderId} not found`);
            }
            throw new Error(`Failed to fetch order: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Get order ${orderId} error:`, error);
        throw error;
    }
}

/**
 * Update kitchen ticket status
 */
export async function updateKitchenTicketStatus(ticketId: string | number, status: OrderStatus): Promise<void> {
    const id = String(ticketId);
    const url = getApiUrl(config.endpoints.kds.updateStatus(id));
    const response = await fetch(url, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update ticket ${id}: ${response.status} - ${errorText || 'Unknown error'}`);
    }
}
