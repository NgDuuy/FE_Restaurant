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
  preparationTime: number; // minutes
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
  items: string[]; // MenuItem IDs
  price: number;
  available: boolean;
}

// Order Types
export type OrderStatus = 'new' | 'cooking' | 'ready' | 'served' | 'cancelled';

export interface OrderNote {
  type: 'special' | 'allergy';
  content: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  menuItem: MenuItem;
  quantity: number;
  notes: OrderNote[];
  customizations?: string;
}

export interface Order {
  id: string;
  tableNumber: string;
  items: OrderItem[];
  status: OrderStatus;
  serverId: string;
  serverName: string;
  createdAt: Date;
  updatedAt: Date;
  total: number;
}
