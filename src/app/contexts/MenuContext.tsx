import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MenuItem, Combo } from '../types';

interface MenuContextType {
  menuItems: MenuItem[];
  combos: Combo[];
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  deleteMenuItem: (id: string) => void;
  getMenuItemById: (id: string) => MenuItem | undefined;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

// Sample menu data
const initialMenuItems: MenuItem[] = [
  {
    id: 'item-1',
    name: 'Grilled Salmon',
    nameVi: 'Cá Hồi Nướng',
    category: 'main',
    price: 250000,
    available: true,
    preparationTime: 20,
    description: 'Fresh grilled salmon with herbs',
    image: 'https://picsum.photos/seed/salmon-irms/600/400',
  },
  {
    id: 'item-2',
    name: 'Beef Steak',
    nameVi: 'Bít Tết Bò',
    category: 'main',
    price: 350000,
    available: true,
    preparationTime: 25,
    description: 'Premium beef steak',
    image: 'https://picsum.photos/seed/beef-steak-irms/600/400',
  },
  {
    id: 'item-3',
    name: 'Chicken Pasta',
    nameVi: 'Mì Ý Gà',
    category: 'main',
    price: 180000,
    available: true,
    preparationTime: 15,
    image: 'https://picsum.photos/seed/chicken-pasta-irms/600/400',
  },
  {
    id: 'item-4',
    name: 'Caesar Salad',
    nameVi: 'Salad Caesar',
    category: 'appetizer',
    price: 120000,
    available: true,
    preparationTime: 10,
    image: 'https://picsum.photos/seed/salad-irms/600/400',
  },
  {
    id: 'item-5',
    name: 'Spring Rolls',
    nameVi: 'Chả Giò',
    category: 'appetizer',
    price: 80000,
    available: true,
    preparationTime: 12,
    image: 'https://picsum.photos/seed/spring-roll-irms/600/400',
  },
  {
    id: 'item-6',
    name: 'Garlic Bread',
    nameVi: 'Bánh Mì Tỏi',
    category: 'appetizer',
    price: 60000,
    available: true,
    preparationTime: 8,
    image: 'https://picsum.photos/seed/garlic-bread-irms/600/400',
  },
  {
    id: 'item-7',
    name: 'Coca Cola',
    nameVi: 'Coca Cola',
    category: 'beverage',
    price: 30000,
    available: true,
    preparationTime: 2,
    image: 'https://picsum.photos/seed/coca-cola-irms/600/400',
  },
  {
    id: 'item-8',
    name: 'Orange Juice',
    nameVi: 'Nước Cam',
    category: 'beverage',
    price: 50000,
    available: true,
    preparationTime: 5,
    image: 'https://picsum.photos/seed/orange-juice-irms/600/400',
  },
  {
    id: 'item-9',
    name: 'Coffee',
    nameVi: 'Cà Phê',
    category: 'beverage',
    price: 45000,
    available: true,
    preparationTime: 5,
    image: 'https://picsum.photos/seed/coffee-irms/600/400',
  },
  {
    id: 'item-10',
    name: 'Tiramisu',
    nameVi: 'Tiramisu',
    category: 'dessert',
    price: 90000,
    available: true,
    preparationTime: 5,
    image: 'https://picsum.photos/seed/tiramisu-irms/600/400',
  },
  {
    id: 'item-11',
    name: 'Ice Cream',
    nameVi: 'Kem',
    category: 'dessert',
    price: 60000,
    available: true,
    preparationTime: 3,
    image: 'https://picsum.photos/seed/ice-cream-irms/600/400',
  },
  {
    id: 'item-12',
    name: 'Chocolate Cake',
    nameVi: 'Bánh Socola',
    category: 'dessert',
    price: 85000,
    available: true,
    preparationTime: 5,
    image: 'https://picsum.photos/seed/chocolate-cake-irms/600/400',
  },
];

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [combos, setCombos] = useState<Combo[]>([]);

  const updateMenuItem = (id: string, updates: Partial<MenuItem>) => {
    setMenuItems(items =>
      items.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const addMenuItem = (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...item,
      id: `item-${Date.now()}`,
    };
    setMenuItems(items => [...items, newItem]);
  };

  const deleteMenuItem = (id: string) => {
    setMenuItems(items => items.filter(item => item.id !== id));
  };

  const getMenuItemById = (id: string) => {
    return menuItems.find(item => item.id === id);
  };

  return (
    <MenuContext.Provider
      value={{
        menuItems,
        combos,
        updateMenuItem,
        addMenuItem,
        deleteMenuItem,
        getMenuItemById,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) {
    throw new Error('useMenu must be used within MenuProvider');
  }
  return context;
}
