# Real-time Order System Integration Guide

## 📋 Overview

This FE project now has full real-time order management with WebSocket integration. When a staff member places an order, it's sent to the kitchen in real-time via WebSocket (no page refresh needed). When the kitchen marks an order as ready, the status updates live on the staff screen.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
pnpm install
```

This will install `stomp-js` and `sockjs-client` for WebSocket support.

### 2. Setup OrderProvider in App.tsx

```tsx
import { OrderProvider } from './app/contexts/OrderContext';
import { AuthProvider } from './app/contexts/AuthContext';

export function App() {
  return (
    <AuthProvider>
      <OrderProvider>
        {/* Your routes/components */}
      </OrderProvider>
    </AuthProvider>
  );
}
```

### 3. Use in Components

```tsx
import { useOrder } from './app/contexts/OrderContext';
import { useOrderForm } from './app/hooks';
import { CreateOrderRequest } from './app/types';

export function OrderPage() {
  const {
    tableNumber,
    setTableNumber,
    staffName,
    setStaffName,
    items,
    addItem,
    isSubmitting,
    submitError,
    submitOrder,
  } = useOrderForm();

  const { orders, wsConnected } = useOrder();

  return (
    <div>
      <div className="status">
        WebSocket: {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); submitOrder(); }}>
        <input
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="Table number"
        />
        
        <input
          value={staffName}
          onChange={(e) => setStaffName(e.target.value)}
          placeholder="Staff name"
        />

        <button type="submit" disabled={isSubmitting}>
          Place Order
        </button>
      </form>

      {submitError && <div className="error">{submitError}</div>}
    </div>
  );
}
```

## 📦 Services

### orderApi.ts
REST API calls for orders:
- `createOrder(request)` - Create new order
- `getAllOrders()` - Fetch all orders
- `getOrderById(orderId)` - Fetch single order

### websocketService.ts
WebSocket (STOMP) connection management:
- `connect(config)` - Connect to KDS WebSocket
- `disconnect()` - Close connection
- Auto-reconnect with exponential backoff (max 5 attempts)

### OrderContext.tsx
State management for orders:
- `orders` - Map of orders by ID
- `liveTickets` - Kitchen tickets in real-time
- `wsConnected` - WebSocket connection status
- Action methods: `createOrder`, `fetchAllOrders`, etc.

## 🪝 Hooks

### useOrder()
Main hook for accessing order state and actions:
```tsx
const {
  orders,           // Map<number, OrderResponse>
  liveTickets,      // Map<string, TicketEvent>
  isLoading,        // boolean
  error,            // string | null
  wsConnected,      // boolean
  createOrder,      // (request) => Promise<OrderResponse>
  fetchAllOrders,   // () => Promise<void>
  getOrdersByStatus,// (status) => OrderResponse[]
  getOrdersByTable, // (table) => OrderResponse[]
  connectWebSocket, // () => Promise<void>
  disconnectWebSocket, // () => void
} = useOrder();
```

### useOrderForm()
Form state management for order creation:
```tsx
const {
  tableNumber,
  staffName,
  items,
  addItem,
  removeItem,
  updateItem,
  isSubmitting,
  submitError,
  createdOrder,
  submitOrder,
  reset,
} = useOrderForm();
```

### useWebSocket(options)
Auto-connect WebSocket:
```tsx
const { isConnected, connect, disconnect } = useWebSocket({
  autoConnect: true,
  onConnect: () => console.log('Connected'),
  onDisconnect: () => console.log('Disconnected'),
});
```

## 🔄 Real-time Data Flow

```
1. Staff creates order via form
   ↓
2. createOrder() sends POST to /api/orders
   ↓
3. Backend publishes to RabbitMQ
   ↓
4. KDS service creates kitchen ticket
   ↓
5. WebSocket publishes to /topic/kitchen/new-tickets
   ↓
6. OrderContext receives event via WebSocket
   ↓
7. Component re-renders with new ticket (NO PAGE REFRESH ✨)
   ↓
8. Chef marks order as READY
   ↓
9. WebSocket publishes to /topic/kitchen/ticket-updates
   ↓
10. Staff screen updates instantly with READY status
```

## 📝 API Contracts

### Create Order
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "tableNumber": "5",
  "staffName": "John Doe",
  "items": [
    {
      "menuItemId": "uuid",
      "name": "Burger",
      "quantity": 2,
      "customizations": ["no onions"]
    }
  ]
}

Response 201:
{
  "id": 1,
  "tableNumber": "5",
  "staffName": "John Doe",
  "status": "CREATED",
  "timestamp": "2024-01-01T10:00:00",
  "items": [...]
}
```

### WebSocket Topics
- `/topic/kitchen/new-tickets` - New order received
- `/topic/kitchen/ticket-updates` - Order status changed (COOKING)
- `/topic/kitchen/completed-tickets` - Order ready (READY)

## ⚙️ Configuration

**WS_URL** in `OrderContext.tsx`:
```tsx
const WS_URL = 'wss://api-gateway.dungne.io.vn/ws/kds';
// Update this to match your actual WebSocket endpoint
```

**API_BASE_URL** in `orderApi.ts`:
```tsx
// const API_BASE_URL = 'https://api-gateway-606057767170.asia-southeast1.run.app';

```

## 🐛 Debugging

All WebSocket events are logged to browser console:
```
✓ WebSocket connected
✓ New ticket received: {...}
✓ Ticket update received: {...}
✓ Ticket completed: ticketId
✗ WebSocket error: ...
```

Check Browser DevTools:
- Network tab → WebSocket connection
- Console → Look for log messages above
- Application → Storage → JWT token in localStorage

## 🔐 Authentication

JWT token is automatically attached to all requests:
- Stored in localStorage as `irms_auth_token`
- Added to `Authorization: Bearer <token>` header
- Required for all REST API calls
- Obtained from `POST /api/auth/login`

## 🚨 Error Handling

```tsx
const { error, clearError } = useOrder();

if (error) {
  console.error('Order error:', error);
  clearError(); // Clear error message
}
```

## 📱 Example: Order Monitoring Dashboard

```tsx
export function OrderDashboard() {
  const { orders, liveTickets, wsConnected } = useOrder();

  return (
    <div>
      <div className="status">
        {wsConnected ? '🟢 Live Updates' : '🔴 Offline'}
      </div>

      <div className="orders-grid">
        {Array.from(orders.values()).map((order) => (
          <div key={order.id} className={`order status-${order.status}`}>
            <h3>Order #{order.id}</h3>
            <p>Table: {order.tableNumber}</p>
            <p>Status: {order.status}</p>
            <p>Items: {order.items.length}</p>
          </div>
        ))}
      </div>

      <div className="tickets-grid">
        {Array.from(liveTickets.values()).map((ticket) => (
          <div key={ticket.id} className={`ticket status-${ticket.status}`}>
            <h3>Ticket #{ticket.id}</h3>
            <p>Table: {ticket.tableNumber}</p>
            <p>Status: {ticket.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 🎯 File Structure

```
src/
├── app/
│   ├── services/
│   │   ├── orderApi.ts              ← REST API calls
│   │   ├── websocketService.ts      ← WebSocket management
│   │   └── INTEGRATION_GUIDE.ts     ← Code examples
│   ├── contexts/
│   │   ├── OrderContext.tsx         ← State management
│   │   ├── AuthContext.tsx
│   │   └── MenuContext.tsx
│   ├── hooks/
│   │   ├── useOrderForm.ts          ← Form helper
│   │   ├── useWebSocket.ts          ← WebSocket helper
│   │   └── index.ts                 ← Exports
│   └── types/
│       └── index.ts                 ← Order types
```

## ⚠️ Important Notes

1. **WebSocket URL**: Update `WS_URL` in `OrderContext.tsx` to match your actual KDS service endpoint
2. **CORS**: Ensure backend has CORS enabled for WebSocket connections
3. **Dependencies**: Run `npm install` to get `stomp-js` and `sockjs-client`
4. **Token**: Make sure JWT token is valid and stored in localStorage
5. **Auto-reconnect**: WebSocket will automatically try to reconnect up to 5 times

## 📚 Next Steps

1. Wrap your app with `OrderProvider`
2. Install dependencies: `npm install`
3. Create order form component using `useOrderForm()`
4. Display orders using `useOrder()` hook
5. Monitor WebSocket status and handle errors
6. Test with actual backend

---

For detailed code examples, see `INTEGRATION_GUIDE.ts`
