import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { Combo, MenuItem, RestaurantCategory } from '../types';
import {
  createMenuItem,
  deleteMenuItem as deleteMenuItemRequest,
  fromMenuItemResponse,
  listCategories,
  listMenuItems,
  toMenuItemRequest,
  updateMenuItem as updateMenuItemRequest,
  CategoryResponseDTO,
  MenuItemResponseDTO,
} from '../services/menuApi';

interface MenuContextType {
  menuItems: MenuItem[];
  combos: Combo[];
  categories: RestaurantCategory[];
  loading: boolean;
  refreshMenu: () => Promise<void>;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => Promise<void>;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  getMenuItemById: (id: string) => MenuItem | undefined;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

const defaultCategories: RestaurantCategory[] = [
  { id: 'main', name: 'Món chính', description: 'Main', active: true },
  { id: 'appetizer', name: 'Khai vị', description: 'Appetizer', active: true },
  { id: 'beverage', name: 'Đồ uống', description: 'Beverage', active: true },
  { id: 'dessert', name: 'Tráng miệng', description: 'Dessert', active: true },
];

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

function mapCategoryResponse(category: CategoryResponseDTO): RestaurantCategory {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    active: category.active,
  };
}

function mapMenuItems(items: MenuItemResponseDTO[], categories: RestaurantCategory[]) {
  const categoryById = new Map(categories.map(category => [category.id, category]));

  return items.map(item =>
    fromMenuItemResponse(item, categoryById.get(item.categoryId)?.name),
  );
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [categories, setCategories] = useState<RestaurantCategory[]>(defaultCategories);
  const [loading, setLoading] = useState(true);

  const fallbackData = useMemo(() => ({
    menuItems: initialMenuItems,
    categories: defaultCategories,
  }), []);

  const refreshMenu = async () => {
    setLoading(true);

    try {
      const [categoriesResponse, menuResponse] = await Promise.all([
        listCategories(),
        listMenuItems(),
      ]);

      const mappedCategories = categoriesResponse.map(mapCategoryResponse);
      setCategories(mappedCategories.length > 0 ? mappedCategories : defaultCategories);
      setMenuItems(mapMenuItems(menuResponse, mappedCategories.length > 0 ? mappedCategories : defaultCategories));
    } catch (error) {
  console.error('Failed to load menu from backend:', error);
  setCategories(fallbackData.categories);
  setMenuItems(fallbackData.menuItems);
} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshMenu();
  }, []);

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    const currentItem = menuItems.find(item => item.id === id);
    if (!currentItem) return;

    const nextItem: MenuItem = { ...currentItem, ...updates };

    await updateMenuItemRequest(id, toMenuItemRequest(nextItem, nextItem.available));
    await refreshMenu();
  };

  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    await createMenuItem(toMenuItemRequest(item, item.available));
    await refreshMenu();
  };

  const deleteMenuItem = async (id: string) => {
    await deleteMenuItemRequest(id);
    await refreshMenu();
  };

  const getMenuItemById = (id: string) => {
    return menuItems.find(item => item.id === id);
  };

  return (
    <MenuContext.Provider
      value={{
        menuItems,
        combos,
        categories,
        loading,
        refreshMenu,
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
