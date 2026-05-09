# 🎯 Real-time Order System - Setup Summary

## ✅ What Was Created

### 📁 New Files Created

| File | Purpose |
|------|---------|
| `src/app/services/orderApi.ts` | REST API calls for orders (create, fetch) |
| `src/app/services/websocketService.ts` | STOMP WebSocket client with auto-reconnect |
| `src/app/services/INTEGRATION_GUIDE.ts` | Code examples and documentation |
| `src/app/config/config.ts` | Centralized configuration for endpoints |
| `src/app/contexts/OrderContext.tsx` | **UPDATED** - Real-time order state management |
| `src/app/types/index.ts` | **UPDATED** - Order & WebSocket type definitions |
| `src/app/hooks/useOrderForm.ts` | Custom hook for order form state |
| `src/app/hooks/useWebSocket.ts` | Custom hook for WebSocket lifecycle |
| `src/app/hooks/index.ts` | Export all custom hooks |
| `src/app/components/OrderManagementExample.tsx` | Full working example component |
| `package.json` | **UPDATED** - Added `stomp-js` and `sockjs-client` |
| `README_ORDERS.md` | Comprehensive setup & usage guide |

## 🔧 Installation

```bash
npm install
# or
pnpm install
```

This installs:
- `stomp-js` - STOMP protocol client
- `sockjs-client` - WebSocket fallback support

## 🚀 Quick Integration Steps

### Step 1: Wrap your app with OrderProvider

```tsx
// main.tsx or App.tsx
import { OrderProvider } from './app/contexts/OrderContext';
import { AuthProvider } from './app/contexts/AuthContext';

export function App() {
  return (
    <AuthProvider>
      <OrderProvider>
        <Routes>
          {/* Your routes */}
        </Routes>
      </OrderProvider>
    </AuthProvider>
  );
}
```

### Step 2: Create order in your component

```tsx
import { useOrderForm } from './app/hooks';

export function OrderForm() {
  const {
    tableNumber,
    setTableNumber,
    staffName,
    setStaffName,
    items,
    addItem,
    submitOrder,
    isSubmitting,
  } = useOrderForm();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitOrder();
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Placing...' : 'Place Order'}
      </button>
    </form>
  );
}
```

### Step 3: Monitor orders in real-time

```tsx
import { useOrder } from './app/contexts/OrderContext';
import { useWebSocket } from './app/hooks';

export function OrderDashboard() {
  const { orders, wsConnected } = useOrder();
  
  // Auto-connect WebSocket
  useWebSocket({ autoConnect: true });

  return (
    <div>
      <div>
        Status: {wsConnected ? '🟢 Live' : '🔴 Offline'}
      </div>

      {Array.from(orders.values()).map(order => (
        <div key={order.id}>
          Order #{order.id} - {order.status}
        </div>
      ))}
    </div>
  );
}
```

## 📊 Real-time Data Flow

```
1. Staff creates order
   ↓
2. submitOrder() → POST /api/orders
   ↓
3. Backend publishes order.created → RabbitMQ
   ↓
4. KDS service creates kitchen ticket
   ↓
5. WebSocket publishes /topic/kitchen/new-tickets
   ↓
6. useOrder() hook updates state via OrderContext
   ↓
7. Component re-renders with new ticket (✨ NO REFRESH)
   ↓
8. Chef updates ticket status
   ↓
9. WebSocket publishes /topic/kitchen/ticket-updates
   ↓
10. Staff screen updates instantly with new status
```

## 🎨 Available Hooks

### useOrder()
Main hook for order management:
```tsx
const {
  orders,              // Map<number, OrderResponse>
  liveTickets,         // Map<string, TicketEvent>
  wsConnected,         // boolean
  isLoading,           // boolean
  error,               // string | null
  createOrder,         // (request) => Promise<OrderResponse>
  fetchAllOrders,      // () => Promise<void>
  fetchOrderById,      // (id) => Promise<OrderResponse>
  getOrdersByStatus,   // (status) => OrderResponse[]
  getOrdersByTable,    // (table) => OrderResponse[]
  connectWebSocket,    // () => Promise<void>
  disconnectWebSocket, // () => void
  clearError,          // () => void
} = useOrder();
```

### useOrderForm()
Form state management:
```tsx
const {
  tableNumber,
  setTableNumber,
  staffName,
  setStaffName,
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
  onError: (err) => console.error('Error', err),
});
```

## 📡 WebSocket Topics

Automatically subscribed and handled:

| Topic | Event | Payload |
|-------|-------|---------|
| `/topic/kitchen/new-tickets` | Order received in kitchen | `NewTicketEvent` |
| `/topic/kitchen/ticket-updates` | Order status changed | `TicketUpdateEvent` |
| `/topic/kitchen/completed-tickets` | Order ready for pickup | `CompletedTicketEvent` |

## ⚙️ Configuration

Edit `src/app/config/config.ts`:

```tsx
export const config = {
  api: {
    // baseURL: 'https://api-gateway-606057767170.asia-southeast1.run.app',
    baseURL: 'http://localhost:8080',
    // or local: 'http://localhost:8080'
  },
  websocket: {
    url: 'wss://api-gateway.dungne.io.vn/ws/kds',
    // or local: 'ws://localhost:8080/ws/kds'
  },
};
```

## 🔐 Authentication

- JWT token automatically included in all requests
- Token stored in localStorage as `irms_auth_token`
- Get token via `POST /api/auth/login`

## 📝 Example Component

See `src/app/components/OrderManagementExample.tsx` for a complete working example with:
- ✅ Order creation form
- ✅ Real-time order monitoring
- ✅ Item management
- ✅ Error handling
- ✅ WebSocket status display
- ✅ CSS styling

## 🐛 Debugging

### Browser Console Logs
All WebSocket events are logged:
```
✓ WebSocket connected
✓ New ticket received: {...}
✓ Ticket update received: {...}
✗ WebSocket error: ...
```

### Troubleshooting

**WebSocket won't connect:**
- Check browser DevTools → Network → WebSocket
- Verify `WS_URL` in config
- Check CORS headers from backend
- Ensure JWT token is valid

**Orders not updating:**
- Check OrderContext is wrapping your component
- Verify useOrder() hook is called in right component
- Check WebSocket connection status (wsConnected)

**Type errors:**
- Run `npm install` to get all dependencies
- Check `src/app/types/index.ts` for type definitions

## 📚 Full Documentation

- See `README_ORDERS.md` for complete setup guide
- See `INTEGRATION_GUIDE.ts` for code examples
- See `OrderManagementExample.tsx` for working component

## 🎯 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Wrap app with `OrderProvider`
3. ✅ Create order form using `useOrderForm()`
4. ✅ Add dashboard with `useOrder()` and `useWebSocket()`
5. ✅ Customize CSS styling as needed
6. ✅ Test with actual backend

## 📦 Project Structure

```
src/app/
├── services/
│   ├── orderApi.ts
│   ├── websocketService.ts
│   └── INTEGRATION_GUIDE.ts
├── config/
│   └── config.ts
├── contexts/
│   └── OrderContext.tsx (updated)
├── hooks/
│   ├── useOrderForm.ts
│   ├── useWebSocket.ts
│   └── index.ts
├── types/
│   └── index.ts (updated)
└── components/
    └── OrderManagementExample.tsx
```

---

**🎉 You now have a complete real-time order system with WebSocket integration!**

For questions or issues, check the inline code comments and examples in the files above.
