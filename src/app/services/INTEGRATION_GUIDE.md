/**
 * INTEGRATION GUIDE: Order + Real-time Kitchen Updates
 *
 * This file demonstrates how to use the new Order API + WebSocket integration
 * to create orders and receive real-time kitchen updates without page refresh.
 */

// ============================================
// 1. SETUP IN APP.TSX
// ============================================
/*
Import the OrderProvider:

  import { OrderProvider } from './contexts/OrderContext';
  
In your App component, wrap your app with OrderProvider:

  export function App() {
    return (
      <AuthProvider>
        <OrderProvider>
          <Routes>
            ...
          </Routes>
        </OrderProvider>
      </AuthProvider>
    );
  }
*/

// ============================================
// 2. CREATE ORDER IN YOUR COMPONENT
// ============================================
/*
import { useOrder } from '../contexts/OrderContext';
import { CreateOrderRequest } from '../types';

export function OrderForm() {
  const { createOrder, isLoading, error, wsConnected } = useOrder();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const orderRequest: CreateOrderRequest = {
      tableNumber: '5',
      staffName: 'John Doe',
      items: [
        {
          menuItemId: 'menu-item-uuid-1',
          name: 'Burger',
          quantity: 2,
          customizations: ['no onions', 'extra cheese'],
        },
        {
          menuItemId: 'menu-item-uuid-2',
          name: 'Coca Cola',
          quantity: 1,
          customizations: [],
        },
      ],
    };

    try {
      const createdOrder = await createOrder(orderRequest);
      console.log('Order created:', createdOrder);
      // Order is now sent to kitchen and you'll receive real-time updates
    } catch (err) {
      console.error('Failed to create order:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* WebSocket connection status */}
<div>
  Status: {wsConnected ? '🟢 Connected' : '🔴 Disconnected'}
</div>

{ Error && <div className="error" > {error} </div> }

<button type="submit" disabled={isLoading} >
  {isLoading ? 'Placing Order...' : 'Place Order'}
</button>
    </form >
  );
}
*/

// ============================================
// 3. MONITOR ORDER STATUS IN REAL-TIME
// ============================================
/*
import { useOrder } from '../contexts/OrderContext';
import { useEffect, useState } from 'react';

export function OrderMonitor() {
  const { orders, liveTickets, wsConnected } = useOrder();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  useEffect(() => {
    // Connect WebSocket when component mounts
    // (This is also called in OrderProvider, but can be called explicitly if needed)
  }, []);

  const ordersArray = Array.from(orders.values());

  return (
    <div>
      <h2>Active Orders ({ordersArray.length})</h2>

      {/* Show connection status */}
<div className={`connection-status ${wsConnected ? 'connected' : 'disconnected'}`}>
  {wsConnected ? '🟢 Real-time updates active' : '🔴 Waiting for connection'}
</div>

{/* List all orders */ }
{
  ordersArray.map((order) => (
    <div
      key={order.id}
      className={`order-card status-${order.status}`}
      onClick={() => setSelectedOrderId(order.id)}
    >
      <div>
        <strong>Order #{order.id} </strong> - Table {order.tableNumber}
      </div>
      < div > Status: {order.status} </div>
      < div > Items: {order.items.length} </div>
      < div className="timestamp" > {new Date(order.timestamp).toLocaleTimeString()} </div>
    </div>
  ))
}

{/* Show detail for selected order */ }
{
  selectedOrderId && orders.has(selectedOrderId) && (
    <div className="order-detail" >
      <h3>Order Detail #{selectedOrderId} </h3>
      < OrderDetail order={orders.get(selectedOrderId)!} />
    </div>
  )
}

{/* Show live kitchen tickets */ }
{
  liveTickets.size > 0 && (
    <div className="kitchen-tickets" >
      <h3>Kitchen Tickets({liveTickets.size}) </h3>
      {
        Array.from(liveTickets.values()).map((ticket) => (
          <div key={ticket.id} className={`ticket status-${ticket.status}`}>
            <div>Ticket #{ticket.id} </div>
            < div > Table: {ticket.tableNumber} </div>
            < div > Status: {ticket.status} </div>
            < div > Items: {ticket.items.length} </div>
          </div>
        ))
      }
    </div>
  )
}
</div >
  );
}

function OrderDetail({ order }: { order: OrderResponse }) {
  return (
    <div>
      <div>Staff: {order.staffName} </div>
      < div > Status: {order.status} </div>
      < div > Created: {new Date(order.timestamp).toLocaleString()} </div>

      < h4 > Items: </h4>
      <ul>
        {
          order.items.map((item) => (
            <li key={item.id} >
              {item.name} x{item.quantity}
              {
                item.customizations && item.customizations.length > 0 && (
                  <div className="customizations">
                    Special: {item.customizations.join(', ')}
                  </div>
                )
              }
            </li>
          ))
        }
      </ul>
    </div>
  );
}
*/

// ============================================
// 4. GET ORDERS WITH FILTERS
// ============================================
/*
export function OrderFiltering() {
  const { getOrdersByStatus, getOrdersByTable, fetchAllOrders } = useOrder();

  // Get all READY orders
  const readyOrders = getOrdersByStatus('READY');

  // Get all orders for table 5
  const table5Orders = getOrdersByTable('5');

  // Refresh all orders from server
  const handleRefresh = async () => {
    try {
      await fetchAllOrders();
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  };

  return (
    <div>
      <button onClick={handleRefresh}>🔄 Refresh Orders</button>

      <div>
        <h3>Ready Orders: {readyOrders.length}</h3>
        {readyOrders.map((order) => (
          <div key={order.id}>
            Order #{order.id} - Table {order.tableNumber}
          </div>
        ))}
      </div>

      <div>
        <h3>Table 5 Orders: {table5Orders.length}</h3>
        {table5Orders.map((order) => (
          <div key={order.id}>
            Order #{order.id} - Status: {order.status}
          </div>
        ))}
      </div>
    </div>
  );
}
*/

// ============================================
// 5. KITCHEN DASHBOARD EXAMPLE
// ============================================
/*
export function KitchenDashboard() {
  const { liveTickets, connectWebSocket, disconnectWebSocket, wsConnected } = useOrder();
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    // Connect to WebSocket on mount
    connectWebSocket();

    return () => {
      // Optional: disconnect when leaving kitchen
      // disconnectWebSocket();
    };
  }, [connectWebSocket, disconnectWebSocket]);

  const pendingTickets = Array.from(liveTickets.values()).filter(
    (t) => t.status === 'PENDING' || t.status === 'COOKING'
  );

  const readyTickets = Array.from(liveTickets.values()).filter((t) => t.status === 'READY');

  return (
    <div className="kitchen-dashboard">
      <header>
        <h1>Kitchen Display System</h1>
        <div className={`status-indicator ${wsConnected ? 'connected' : 'disconnected'}`}>
          {wsConnected ? '🟢 Live' : '🔴 Offline'}
        </div>
      </header>

      <div className="dashboard-grid">
        {/* Pending & Cooking Section */}
<section className="section-pending" >
  <h2>In Progress({pendingTickets.length}) </h2>
  < div className="tickets-list" >
    {
      pendingTickets.map((ticket) => (
        <KitchenTicketCard key={ticket.id} ticket={ticket} />
      ))
    }
  </div>
</section>

{/* Ready Section */ }
<section className="section-ready" >
  <h2>Ready for Pickup({readyTickets.length}) </h2>
  < div className="tickets-list" >
    {
      readyTickets.map((ticket) => (
        <KitchenTicketCard key={ticket.id} ticket={ticket} />
      ))
    }
  </div>
</section>
        </div >
        </div >
  );
}

function KitchenTicketCard({ ticket }: { ticket: NewTicketEvent | TicketUpdateEvent }) {
  return (
    <div className={`ticket-card status-${ticket.status}`
    }>
      <div className="ticket-header" >
        <div className="ticket-id" > Ticket #{ticket.id} </div>
        < div className="table-number" > Table {ticket.tableNumber} </div>
      </div>

      < div className="ticket-items" >
        {
          ticket.items.map((item, idx) => (
            <div key={idx} className="item" >
              <div className="item-name" > {item.itemName} </div>
              < div className="item-quantity" > x{item.quantity} </div>
              {
                item.customizations && item.customizations.length > 0 && (
                  <div className="item-customizations">
                    {item.customizations.join(', ')}
                  </div>
                )
              }
            </div>
          ))}
      </div>

      < div className="ticket-footer" >
        <div className="time" >
          {new Date(ticket.receivedAt).toLocaleTimeString()}
        </div>
        < div className="status-badge" > {ticket.status} </div>
      </div>
    </div>
  );
}
*/

// ============================================
// 6. FLOW DIAGRAM
// ============================================
/*
┌─────────────────────────────────────────────────────────────────┐
│                       REAL-TIME ORDER FLOW                      │
└─────────────────────────────────────────────────────────────────┘

1. STAFF CREATES ORDER
   ├─ useOrder().createOrder(orderRequest)
   └─ API: POST /api/orders

2. ORDER SENT TO KITCHEN
   ├─ Backend publishes order.created event to RabbitMQ
   └─ KDS service creates KitchenTicket

3. WEBSOCKET SENDS NEW TICKET EVENT
   ├─ Topic: /topic/kitchen/new-tickets
   ├─ Payload: NewTicketEvent
   └─ OrderContext receives & updates liveTickets

4. KITCHEN STARTS COOKING
   ├─ Chef updates ticket status to COOKING
   └─ API: PUT /api/kds/tickets/{ticketId}/status

5. WEBSOCKET SENDS TICKET UPDATE
   ├─ Topic: /topic/kitchen/ticket-updates
   ├─ Payload: TicketUpdateEvent (status=COOKING)
   └─ OrderContext updates order status in real-time

6. COOKING COMPLETE
   ├─ Chef marks ticket as READY
   └─ API: PUT /api/kds/tickets/{ticketId}/status

7. WEBSOCKET SENDS COMPLETION EVENT
   ├─ Topic: /topic/kitchen/completed-tickets
   ├─ Payload: CompletedTicketEvent
   └─ OrderContext updates to READY status

8. NO PAGE REFRESH NEEDED ✨
   └─ All updates come through WebSocket in real-time
*/

// ============================================
// 7. CONFIGURATION & TROUBLESHOOTING
// ============================================
/*
CONFIG:
  - WS_URL in OrderContext.tsx: Update this to match your KDS service endpoint
  - Default: wss://api-gateway.dungne.io.vn/ws/kds

INSTALL DEPENDENCIES:
  npm install stomp-js sockjs-client

BROWSER CONSOLE LOGS:
  - All WebSocket events are logged to console for debugging
  - Look for "WebSocket connected", "New ticket received", etc.

TIMEOUT/DISCONNECTION:
  - Reconnection is automatic (max 5 attempts)
  - Check network tab in browser DevTools for WebSocket connection
  - Ensure your backend has CORS enabled for WebSocket

ERROR HANDLING:
  - useOrder().error contains error messages
  - useOrder().clearError() to clear error state
  - All errors are logged to console
*/
