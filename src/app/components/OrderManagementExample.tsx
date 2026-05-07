/**
 * EXAMPLE COMPONENT: Complete Order Form & Monitoring
 * 
 * This is a fully functional example showing how to:
 * 1. Create orders with real-time submission
 * 2. Monitor order status updates in real-time
 * 3. Handle WebSocket connection
 * 4. Display error states and loading states
 */

import React, { useState, useEffect } from 'react';
import { useOrder } from '../contexts/OrderContext';
import { useOrderForm, useWebSocket } from '../hooks';
import { OrderItemRequest, OrderResponse } from '../types';

/**
 * Main Order Management Component
 */
export function OrderManagementExample() {
    const [activeTab, setActiveTab] = useState<'create' | 'monitor'>('create');

    return (
        <div className="order-management-container">
            <h1>Order Management System</h1>

            {/* Tab Navigation */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    Create Order
                </button>
                <button
                    className={`tab ${activeTab === 'monitor' ? 'active' : ''}`}
                    onClick={() => setActiveTab('monitor')}
                >
                    Monitor Orders
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'create' && <CreateOrderForm />}
            {activeTab === 'monitor' && <OrderMonitor />}
        </div>
    );
}

/**
 * Create Order Form Component
 */
function CreateOrderForm() {
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

    const { wsConnected } = useOrder();
    const [currentItem, setCurrentItem] = useState<OrderItemRequest>({
        menuItemId: '',
        name: '',
        quantity: 1,
        customizations: [],
    });

    // Handle add item
    const handleAddItem = () => {
        if (!currentItem.menuItemId || !currentItem.name) {
            alert('Please fill in all fields');
            return;
        }

        addItem({
            ...currentItem,
            quantity: Math.max(1, currentItem.quantity),
        });

        // Reset form
        setCurrentItem({
            menuItemId: '',
            name: '',
            quantity: 1,
            customizations: [],
        });
    };

    // Handle submit
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await submitOrder();
    };

    return (
        <div className="create-order-section">
            {/* Status Bar */}
            <div className="status-bar">
                <span className={`ws-status ${wsConnected ? 'connected' : 'disconnected'}`}>
                    {wsConnected ? '🟢 WebSocket Connected' : '🔴 WebSocket Disconnected'}
                </span>
            </div>

            {/* Success Message */}
            {createdOrder && (
                <div className="success-message">
                    <h3>✅ Order Created Successfully!</h3>
                    <div className="order-summary">
                        <p>
                            <strong>Order ID:</strong> {createdOrder.id}
                        </p>
                        <p>
                            <strong>Table:</strong> {createdOrder.tableNumber}
                        </p>
                        <p>
                            <strong>Items:</strong> {createdOrder.items.length}
                        </p>
                        <p>
                            <strong>Status:</strong> {createdOrder.status}
                        </p>
                    </div>
                    <button onClick={reset}>Create Another Order</button>
                </div>
            )}

            {/* Error Message */}
            {submitError && (
                <div className="error-message">
                    <strong>❌ Error:</strong> {submitError}
                </div>
            )}

            {/* Form */}
            {!createdOrder && (
                <form onSubmit={handleSubmit} className="order-form">
                    {/* Table Number */}
                    <div className="form-group">
                        <label htmlFor="tableNumber">Table Number:</label>
                        <input
                            id="tableNumber"
                            type="text"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            placeholder="e.g., 5, A3, etc."
                            required
                        />
                    </div>

                    {/* Staff Name */}
                    <div className="form-group">
                        <label htmlFor="staffName">Staff Name:</label>
                        <input
                            id="staffName"
                            type="text"
                            value={staffName}
                            onChange={(e) => setStaffName(e.target.value)}
                            placeholder="Your name"
                            required
                        />
                    </div>

                    {/* Current Item Form */}
                    <fieldset>
                        <legend>Add Items</legend>

                        <div className="form-group">
                            <label htmlFor="menuItemId">Menu Item ID (UUID):</label>
                            <input
                                id="menuItemId"
                                type="text"
                                value={currentItem.menuItemId}
                                onChange={(e) =>
                                    setCurrentItem({ ...currentItem, menuItemId: e.target.value })
                                }
                                placeholder="UUID"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="itemName">Item Name:</label>
                            <input
                                id="itemName"
                                type="text"
                                value={currentItem.name}
                                onChange={(e) =>
                                    setCurrentItem({ ...currentItem, name: e.target.value })
                                }
                                placeholder="Burger"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="quantity">Quantity:</label>
                            <input
                                id="quantity"
                                type="number"
                                min="1"
                                value={currentItem.quantity}
                                onChange={(e) =>
                                    setCurrentItem({
                                        ...currentItem,
                                        quantity: parseInt(e.target.value) || 1,
                                    })
                                }
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="customizations">Customizations (comma separated):</label>
                            <input
                                id="customizations"
                                type="text"
                                value={currentItem.customizations?.join(', ') || ''}
                                onChange={(e) =>
                                    setCurrentItem({
                                        ...currentItem,
                                        customizations: e.target.value
                                            .split(',')
                                            .map((s) => s.trim())
                                            .filter((s) => s),
                                    })
                                }
                                placeholder="e.g., no onions, extra cheese"
                            />
                        </div>

                        <button type="button" onClick={handleAddItem} className="btn-secondary">
                            Add Item
                        </button>
                    </fieldset>

                    {/* Items List */}
                    {items.length > 0 && (
                        <div className="items-list">
                            <h3>Items in Order ({items.length})</h3>
                            <ul>
                                {items.map((item, idx) => (
                                    <li key={idx} className="item-row">
                                        <div>
                                            <strong>{item.name}</strong> x {item.quantity}
                                            {item.customizations && item.customizations.length > 0 && (
                                                <div className="customizations">
                                                    {item.customizations.join(', ')}
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeItem(idx)}
                                            className="btn-danger"
                                        >
                                            Remove
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting || items.length === 0 || !wsConnected}
                        className="btn-primary"
                    >
                        {isSubmitting ? 'Placing Order...' : 'Place Order'}
                    </button>
                </form>
            )}
        </div>
    );
}

/**
 * Order Monitoring Component
 */
function OrderMonitor() {
    const { orders, liveTickets, wsConnected, fetchAllOrders, getOrdersByStatus } = useOrder();
    const { isConnected } = useWebSocket({ autoConnect: true });

    // Fetch orders on mount
    useEffect(() => {
        fetchAllOrders();
    }, [fetchAllOrders]);

    const ordersArray = Array.from(orders.values());
    const ticketsArray = Array.from(liveTickets.values());

    const creatingOrders = getOrdersByStatus('CREATED');
    const cookingOrders = getOrdersByStatus('COOKING');
    const readyOrders = getOrdersByStatus('READY');

    return (
        <div className="monitor-section">
            {/* Connection Status */}
            <div className="status-bar">
                <span className={`ws-status ${wsConnected ? 'connected' : 'disconnected'}`}>
                    {wsConnected ? '🟢 Real-time Updates Active' : '🔴 No Real-time Updates'}
                </span>
                <button onClick={() => fetchAllOrders()} className="btn-refresh">
                    🔄 Refresh
                </button>
            </div>

            {/* Dashboard Grid */}
            <div className="dashboard-grid">
                {/* All Orders */}
                <section className="dashboard-section all-orders">
                    <h2>All Orders ({ordersArray.length})</h2>
                    <div className="orders-list">
                        {ordersArray.length === 0 ? (
                            <p className="empty-state">No orders yet</p>
                        ) : (
                            ordersArray.map((order) => (
                                <OrderCard key={order.id} order={order} />
                            ))
                        )}
                    </div>
                </section>

                {/* Status Breakdown */}
                <section className="dashboard-section status-breakdown">
                    <div className="status-card created">
                        <div className="count">{creatingOrders.length}</div>
                        <div className="label">Created</div>
                    </div>
                    <div className="status-card cooking">
                        <div className="count">{cookingOrders.length}</div>
                        <div className="label">Cooking</div>
                    </div>
                    <div className="status-card ready">
                        <div className="count">{readyOrders.length}</div>
                        <div className="label">Ready</div>
                    </div>
                </section>

                {/* Kitchen Tickets */}
                {ticketsArray.length > 0 && (
                    <section className="dashboard-section kitchen-tickets">
                        <h2>Live Kitchen Tickets ({ticketsArray.length})</h2>
                        <div className="tickets-list">
                            {ticketsArray.map((ticket) => (
                                <TicketCard key={ticket.id} ticket={ticket} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
}

/**
 * Order Card Component
 */
function OrderCard({ order }: { order: OrderResponse }) {
    const statusColor: Record<string, string> = {
        CREATED: '#3b82f6',
        COOKING: '#f59e0b',
        READY: '#10b981',
        SERVED: '#8b5cf6',
    };

    return (
        <div className="order-card" style={{ borderLeftColor: statusColor[order.status] }}>
            <div className="card-header">
                <span className="order-id">Order #{order.id}</span>
                <span className="status-badge" style={{ backgroundColor: statusColor[order.status] }}>
                    {order.status}
                </span>
            </div>
            <div className="card-body">
                <p>
                    <strong>Table:</strong> {order.tableNumber}
                </p>
                <p>
                    <strong>Staff:</strong> {order.staffName}
                </p>
                <p>
                    <strong>Items:</strong> {order.items.length}
                </p>
                <p className="time">{new Date(order.timestamp).toLocaleTimeString()}</p>
            </div>
        </div>
    );
}

/**
 * Kitchen Ticket Card Component
 */
function TicketCard({ ticket }: { ticket: OrderResponse | any }) {
    const statusColor: Record<string, string> = {
        PENDING: '#ef4444',
        COOKING: '#f59e0b',
        READY: '#10b981',
        SERVED: '#8b5cf6',
    };

    return (
        <div className="ticket-card" style={{ borderColor: statusColor[ticket.status] }}>
            <div className="ticket-header">
                <span className="ticket-id">Ticket #{ticket.id}</span>
                <span className="table">Table {ticket.tableNumber}</span>
            </div>
            <div className="ticket-body">
                <p>
                    <strong>Status:</strong> {ticket.status}
                </p>
                <p>
                    <strong>Items:</strong>
                </p>
                <ul>
                    {ticket.items?.map((item: any, idx: number) => (
                        <li key={idx}>
                            {item.itemName || item.name} x {item.quantity}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// Minimal CSS (add to your stylesheet)
export const exampleStyles = `
.order-management-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.tab {
  padding: 10px 20px;
  border: none;
  background: #e5e7eb;
  cursor: pointer;
  border-radius: 4px;
  font-weight: 500;
}

.tab.active {
  background: #3b82f6;
  color: white;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f3f4f6;
  border-radius: 8px;
  margin-bottom: 20px;
}

.ws-status {
  font-size: 14px;
  font-weight: 500;
}

.ws-status.connected {
  color: #10b981;
}

.ws-status.disconnected {
  color: #ef4444;
}

.success-message,
.error-message {
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.success-message {
  background: #d1fae5;
  border-left: 4px solid #10b981;
  color: #065f46;
}

.error-message {
  background: #fee2e2;
  border-left: 4px solid #ef4444;
  color: #991b1b;
}

.order-form {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

fieldset {
  border: 1px solid #d1d5db;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

legend {
  padding: 0 10px;
  font-weight: 500;
}

.items-list {
  background: #f9fafb;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: white;
  margin-bottom: 10px;
  border-radius: 4px;
}

.customizations {
  font-size: 12px;
  color: #6b7280;
  margin-top: 5px;
}

.btn-primary,
.btn-secondary,
.btn-danger,
.btn-refresh {
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  width: 100%;
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e5e7eb;
  color: #111827;
}

.btn-danger {
  background: #ef4444;
  color: white;
  padding: 5px 10px;
  font-size: 12px;
}

.btn-refresh {
  background: #6b7280;
  color: white;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.dashboard-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.orders-list,
.tickets-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.order-card,
.ticket-card {
  border-left: 4px solid #d1d5db;
  padding: 15px;
  background: #f9fafb;
  border-radius: 4px;
}

.card-header,
.ticket-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.order-id,
.ticket-id {
  font-weight: 600;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 500;
}

.status-breakdown {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.status-card {
  text-align: center;
  padding: 20px;
  border-radius: 8px;
  color: white;
}

.status-card.created {
  background: #3b82f6;
}

.status-card.cooking {
  background: #f59e0b;
}

.status-card.ready {
  background: #10b981;
}

.count {
  font-size: 32px;
  font-weight: bold;
}

.label {
  font-size: 12px;
  margin-top: 5px;
}

.empty-state {
  text-align: center;
  color: #6b7280;
  padding: 30px;
}

.time {
  font-size: 12px;
  color: #6b7280;
  margin-top: 10px;
}
`;
