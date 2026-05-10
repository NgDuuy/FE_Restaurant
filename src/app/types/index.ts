// User Types
export type UserRole = 'server' | 'chef' | 'manager';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
}

// Menu Types
export type MenuCategory = 'main' | 'appetizer' | 'beverage' | 'dessert';

export interface MenuItem {
  id: string;
  name: string;
  nameVi: string;
  category: MenuCategory;
  categoryId?: string;
  price: number;
  available: boolean;
  preparationTime: number;
  description?: string;
  image?: string;
}

export interface RestaurantCategory {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface Combo {
  id: string;
  name: string;
  nameVi: string;
  items: string[];
  price: number;
  available: boolean;
}

// Order Types
export type OrderStatus = 
  | 'KITCHEN_PENDING'
  | 'PENDING'
  | 'CONFIRM'
  | 'CREATED'
  | 'COOKING'
  | 'READY'
  | 'SERVED'
  | 'REJECT';

export interface OrderItemRequest {
  menuItemId: string;
  name: string;
  quantity: number;
  customizations?: string[];
}

export interface OrderItemResponse {
  id: number;
  menuItemId: string;
  name: string;
  quantity: number;
  customizations?: string[];
  notes?: string[];
}

export interface CreateOrderRequest {
  tableNumber: string;
  staffName: string;
  items: OrderItemRequest[];
}

export interface OrderResponse {
  id: number;
  tableNumber: string;
  staffName: string;
  status: OrderStatus;
  timestamp: string;
  items: OrderItemResponse[];
}

// Kitchen Ticket Types
export interface KitchenTicketItem {
  menuItemId: string;
  itemName: string;
  quantity: number;
  status: OrderStatus;
  customizations?: string[];
  notes?: string[];
}

export interface KitchenTicket {
  id: string;
  tableNumber: number;
  waiterId: string;
  status: OrderStatus;
  receivedAt: string;
  completedAt?: string;
  items: KitchenTicketItem[];
}

export interface NewTicketEvent {
  id: string;
  tableNumber: number;
  waiterId: string;
  status: OrderStatus;
  receivedAt: string;
  items: KitchenTicketItem[];
}

export interface TicketUpdateEvent {
  id: string;
  tableNumber: number;
  waiterId: string;
  status: OrderStatus;
  receivedAt: string;
  completedAt?: string;
  items: KitchenTicketItem[];
}

export interface CompletedTicketEvent {
  ticketId: string;
}
