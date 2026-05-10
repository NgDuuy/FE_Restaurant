/**
 * Application Configuration
 * Centralized configuration for API endpoints and settings
 */

export const config = {
    // API Gateway
    api: {
        // baseURL: 'https://api-gateway-606057767170.asia-southeast1.run.app',
        // Local development (uncomment to use)
        baseURL: 'http://localhost:8080',
    },

    // WebSocket Configuration
    websocket: {
        // Reconnection settings
        maxReconnectAttempts: 5,
        reconnectDelay: 3000, // milliseconds
    },

    // Authentication
    auth: {
        tokenKey: 'irms_auth_token',
        userKey: 'irms_auth_user',
    },

    // API Endpoints
    endpoints: {
        auth: {
            login: '/api/auth/login',
            register: '/api/auth/register',
            jwks: '/api/auth/.well-known/jwks.json',
        },
        orders: {
            create: '/api/orders',
            getAll: '/api/orders',
            getById: (id: number) => `/api/orders/${id}`,
            websocket: '/ws/order',
            topics: {
                statusAll: '/topic/orders/status',
            },
        },
        menu: {
            getAll: '/api/menu',
            getAvailable: '/api/menu/available',
            getById: (id: string) => `/api/menu/${id}`,
            getAvailability: (id: string) => `/api/menu/${id}/availability`,
        },
        categories: {
            getAll: '/api/menu/categories',
            getById: (id: string) => `/api/menu/categories/${id}`,
        },
        promotions: {
            getAll: '/api/promotions',
            getActive: '/api/promotions/active',
            getById: (id: string) => `/api/promotions/${id}`,
        },
        kds: {
            getActiveTickets: '/api/kds/tickets/active',
            updateStatus: (ticketId: string) => `/api/kds/tickets/${ticketId}/status`,
            websocket: '/ws/kds',
            topics: {
                newTickets: '/topic/kitchen/new-tickets',
                ticketUpdates: '/topic/kitchen/ticket-updates',
                completedTickets: '/topic/kitchen/completed-tickets',
            },
        },
    },

    // Application Settings
    app: {
        name: 'IRMS - Restaurant Management System',
        version: '1.0.0',
        // Default roles
        roles: {
            MANAGER: 'MANAGER',
            CHEF: 'CHEF',
            SERVER: 'SERVER',
        },
    },

    // Order Status Mapping
    orderStatus: {
        CREATED: 'CREATED',
        COOKING: 'COOKING',
        READY: 'READY',
        SERVED: 'SERVED',
    },
};

/**
 * Get API endpoint URL
 * @param endpoint Endpoint path
 * @returns Full URL
 */
export function getApiUrl(endpoint: string): string {
    if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
        return endpoint;
    }
    return `${config.api.baseURL}${endpoint}`;
}

/**
 * Get WebSocket URL
 * @returns WebSocket URL
 */
export function getWebSocketUrl(): string {
    const wsBase = config.api.baseURL
        .replace(/^https:\/\//, 'wss://')
        .replace(/^http:\/\//, 'ws://');

    return `${wsBase}${config.endpoints.kds.websocket}`;
}

export function getOrderWebSocketUrl(): string {
    const wsBase = config.api.baseURL
        .replace(/^https:\/\//, 'wss://')
        .replace(/^http:\/\//, 'ws://');

    return `${wsBase}${config.endpoints.orders.websocket}`;
}

export function getKDSWebSocketUrl(): string {
    const wsBase = config.api.baseURL
        .replace(/^https:\/\//, 'wss://')
        .replace(/^http:\/\//, 'ws://');
    
    return `${wsBase}${config.endpoints.kds.websocket}`;
}

export default config;
