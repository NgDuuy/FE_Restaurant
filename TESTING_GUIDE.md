/**
 * TESTING GUIDE: How to Test the Order System
 *
 * Run these commands in your browser console or terminal
 */

// ============================================
// Manual Testing in Browser Console
// ============================================

/*
1. Test Endpoints Directly with Fetch

// Get JWT Token
fetch('https://api-gateway-606057767170.asia-southeast1.run.app/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'your-username',
    password: 'your-password'
  })
})
.then(r => r.json())
.then(d => {
  localStorage.setItem('irms_auth_token', d.token);
  console.log('Token saved:', d.token);
});

// Create Order
fetch('https://api-gateway-606057767170.asia-southeast1.run.app/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('irms_auth_token')}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tableNumber: '5',
    staffName: 'Test Staff',
    items: [
      {
        menuItemId: 'your-menu-item-uuid',
        name: 'Burger',
        quantity: 2,
        customizations: ['no onions']
      }
    ]
  })
})
.then(r => r.json())
.then(d => console.log('Order created:', d));

// Get All Orders
fetch('https://api-gateway-606057767170.asia-southeast1.run.app/api/orders', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('irms_auth_token')}`
  }
})
.then(r => r.json())
.then(d => console.log('Orders:', d));

// Get Order by ID
fetch('https://api-gateway-606057767170.asia-southeast1.run.app/api/orders/1', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('irms_auth_token')}`
  }
})
.then(r => r.json())
.then(d => console.log('Order #1:', d));
*/

// ============================================
// React Component Testing
// ============================================

/*
Add this to a test component:

import { useOrder } from './app/contexts/OrderContext';
import { useOrderForm } from './app/hooks';

export function OrderSystemTest() {
  const {
    orders,
    liveTickets,
    wsConnected,
    createOrder,
    fetchAllOrders,
  } = useOrder();

  const {
    tableNumber,
    setTableNumber,
    staffName,
    setStaffName,
    items,
    addItem,
    removeItem,
    submitOrder,
  } = useOrderForm();

  return (
    <div>
      <h2>Order System Test</h2>

      {/* 1. WebSocket Status */}
      <div>
        WebSocket: {wsConnected ? '✅ Connected' : '❌ Disconnected'}
      </div>

      {/* 2. Current State */}
      <div>
        <h3>Current State</h3>
        <p>Orders: {orders.size}</p>
        <p>Tickets: {liveTickets.size}</p>
      </div>

      {/* 3. Test Create Order */}
      <div>
        <h3>Create Order</h3>
        <input
          value={tableNumber}
          onChange={e => setTableNumber(e.target.value)}
          placeholder="Table"
        />
        <input
          value={staffName}
          onChange={e => setStaffName(e.target.value)}
          placeholder="Staff Name"
        />
        <button onClick={submitOrder}>Test Create Order</button>
      </div>

      {/* 4. Test Fetch All */}
      <div>
        <h3>Fetch All Orders</h3>
        <button onClick={fetchAllOrders}>Refresh Orders</button>
      </div>

      {/* 5. Display Orders */}
      <div>
        <h3>Orders</h3>
        <ul>
          {Array.from(orders.values()).map(order => (
            <li key={order.id}>
              #{order.id} - Table {order.tableNumber} ({order.status})
            </li>
          ))}
        </ul>
      </div>

      {/* 6. Display Tickets */}
      <div>
        <h3>Live Tickets</h3>
        <ul>
          {Array.from(liveTickets.values()).map(ticket => (
            <li key={ticket.id}>
              #{ticket.id} - {ticket.status}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
*/

// ============================================
// Unit Test Examples (Jest)
// ============================================

/*
// __tests__/orderApi.test.ts
import * as orderApi from '../app/services/orderApi';
import { CreateOrderRequest } from '../app/types';

describe('orderApi', () => {
  // Mock fetch
  global.fetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('irms_auth_token', 'mock-token');
  });

  test('createOrder should call POST /api/orders', async () => {
    const mockResponse = {
      id: 1,
      tableNumber: '5',
      staffName: 'Test',
      status: 'CREATED',
      timestamp: '2024-01-01T10:00:00',
      items: []
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const request: CreateOrderRequest = {
      tableNumber: '5',
      staffName: 'Test',
      items: []
    };

    const result = await orderApi.createOrder(request);
    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('getAllOrders should call GET /api/orders', async () => {
    const mockOrders = [
      { id: 1, tableNumber: '5', status: 'CREATED' },
      { id: 2, tableNumber: '3', status: 'READY' }
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockOrders
    });

    const result = await orderApi.getAllOrders();
    expect(result).toEqual(mockOrders);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/orders'),
      expect.objectContaining({ method: 'GET' })
    );
  });
});

// __tests__/OrderContext.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { OrderProvider, useOrder } from '../app/contexts/OrderContext';

function TestComponent() {
  const { orders, wsConnected } = useOrder();
  return <div>Orders: {orders.size}</div>;
}

describe('OrderContext', () => {
  test('should provide orders context', () => {
    render(
      <OrderProvider>
        <TestComponent />
      </OrderProvider>
    );

    expect(screen.getByText(/Orders:/)).toBeInTheDocument();
  });
});
*/

// ============================================
// Integration Test Scenarios
// ============================================

/*
Scenario 1: Complete Order Workflow
1. Staff creates order for table 5
2. Kitchen receives ticket via WebSocket
3. Chef marks as COOKING
4. Chef marks as READY
5. Staff sees status update in real-time

Steps:
1. Login and get JWT token
2. Create order via createOrder()
3. Monitor WebSocket for /topic/kitchen/new-tickets
4. In another browser/tab, update ticket status
5. Verify WebSocket updates order status in first tab
   └─ No page refresh needed ✓

Scenario 2: Multiple Tables
1. Create 3 orders for different tables
2. Monitor all in real-time
3. Each table gets own WebSocket updates
4. Staff can filter by table number

Scenario 3: WebSocket Disconnection
1. Create order (WebSocket connected)
2. Disconnect WebSocket (dev tools or network)
3. Verify automatic reconnect (5 attempts)
4. New updates received after reconnect

Scenario 4: Error Handling
1. Try to create order with invalid menuItemId
2. Should return 422 with error message
3. useOrderForm().submitError should show error
4. Order should NOT be added to state

Scenario 5: Authentication
1. Create order without token
   └─ Should get 401 Unauthorized
2. Create order with expired token
   └─ Should get 401 Unauthorized
3. Create order with valid token
   └─ Should succeed 201 Created
*/

// ============================================
// Monitoring Checklist
// ============================================

/*
Browser DevTools Console Logs to Watch:

✅ Connection Phase
  □ "WebSocket connected"
  □ No connection errors

✅ Order Creation
  □ "Create order error: ..." (if failed)
  □ Order added to state
  □ createdOrder shows in UI

✅ WebSocket Events
  □ "New ticket received: {...}"
  □ "Ticket update received: {...}"
  □ "Ticket completed: ticketId"

✅ Errors
  □ No CORS errors
  □ No "Cannot read property" errors
  □ No type mismatches

Network Tab:
  □ POST /api/orders (status 201)
  □ WebSocket connection (wss://)
  □ WebSocket messages (binary)

LocalStorage:
  □ irms_auth_token present
  □ Token not expired
*/

// ============================================
// Performance Metrics
// ============================================

/*
Measure Real-time Performance:

// Add to console
window.orderMetrics = {
  createOrderTime: Date.now(),
  wsMessageTime: null,
  updateTime: null,
};

// In OrderContext, when receiving WebSocket message:
if (window.orderMetrics) {
  window.orderMetrics.wsMessageTime = Date.now();
  console.log(
    'Order-to-WebSocket time:',
    window.orderMetrics.wsMessageTime - window.orderMetrics.createOrderTime,
    'ms'
  );
}

// Expected times:
// Order creation: 100-300ms (REST)
// Order to WebSocket: 100-500ms (includes RabbitMQ)
// WebSocket to UI: <100ms (local state update)
// Total: ~200-600ms end-to-end
*/

// ============================================
// Debug WebSocket Messages
// ============================================

/*
// Add to websocketService.ts for debugging
private _subscribeToTopics(): void {
  const newTicketsSub = this.client.subscribe(
    '/topic/kitchen/new-tickets',
    (message: any) => {
      try {
        const ticket = JSON.parse(message.body);
        console.log('[STOMP] New ticket:', ticket);
        console.log('[STOMP] Message body:', message.body);
        console.log('[STOMP] Timestamp:', new Date().toISOString());
        this.onNewTicket?.(ticket);
      } catch (error) {
        console.error('[STOMP] Parse error:', error);
      }
    }
  );
  // ... rest of subscriptions
}

// View in browser console under "WebSocket" filter
// Shows all incoming messages with timestamps
*/

export {};
