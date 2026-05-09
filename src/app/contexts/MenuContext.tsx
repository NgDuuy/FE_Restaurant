import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  return items.map(item => fromMenuItemResponse(item, categoryById.get(item.categoryId)?.name));
}

function buildCategoriesFromMenuItems(items: MenuItemResponseDTO[]): RestaurantCategory[] {
  const seen = new Map<string, RestaurantCategory>();
  const fallbackNames = ['Mon chinh', 'Khai vi', 'Do uong', 'Trang mieng', 'Mon dac biet'];

  for (const item of items) {
    if (!seen.has(item.categoryId)) {
      seen.set(item.categoryId, {
        id: item.categoryId,
        name: fallbackNames[seen.size] ?? `Danh muc ${seen.size + 1}`,
        active: true,
      });
    }
  }

  return Array.from(seen.values());
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshMenu = async () => {
    setLoading(true);

    try {
      const menuResponse = await listMenuItems();

      let mappedCategories: RestaurantCategory[] = [];
      try {
        const categoriesResponse = await listCategories();
        mappedCategories = categoriesResponse.map(mapCategoryResponse);
      } catch (categoryError) {
        console.warn('Failed to load categories, fallback to menu.categoryId:', categoryError);
      }

      if (mappedCategories.length === 0) {
        mappedCategories = buildCategoriesFromMenuItems(menuResponse);
      }

      setCategories(mappedCategories);
      setMenuItems(mapMenuItems(menuResponse, mappedCategories));
    } catch (error) {
      console.error('Failed to load menu from backend /api/menu:', error);
      // Keep current menu data if backend /api/menu returns errors (e.g. 500).
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
