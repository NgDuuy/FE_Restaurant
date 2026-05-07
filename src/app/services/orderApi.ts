import { CreateOrderRequest, OrderResponse } from '../types';
import { config, getApiUrl } from '../config/config';

const AUTH_TOKEN_KEY = config.auth.tokenKey;

function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
}

/**
 * Create a new order
 * @param request - Order creation request with table number, staff name and items
 * @returns Created OrderResponse with id and status CREATED
 * @throws Error if validation fails (422) or unauthorized (401/403)
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
            const error = await response.json();
            throw new Error(
                `Order creation failed: ${response.status} - ${error.error || error.message || 'Unknown error'}`
            );
        }

        return await response.json();
    } catch (error) {
        console.error('Create order error:', error);
        throw error;
    }
}

/**
 * Get all orders
 * @returns Array of all orders
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
 * @param orderId - The numeric order ID
 * @returns OrderResponse with all details
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
