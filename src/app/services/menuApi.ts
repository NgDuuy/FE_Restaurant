import { RestaurantCategory, MenuCategory, MenuItem } from '../types';
import { config, getApiUrl } from '../config/config';

const AUTH_TOKEN_KEY = config.auth.tokenKey;

export interface CustomizationDTO {
  name: string;
  price: number;
}

export interface MenuItemRequestDTO {
  categoryId: string;
  name: string;
  description?: string;
  basePrice: number;
  isAvailable?: boolean;
  imageUrl?: string;
  customizations?: CustomizationDTO[];
}

export interface MenuItemResponseDTO {
  id: string;
  categoryId: string;
  name: string;
  description?: string;
  originalPrice: number;
  finalCalculatedPrice: number;
  imageUrl?: string;
  customizations?: CustomizationDTO[];
  activePromotions?: string[];
  available: boolean;
}

export interface CategoryRequestDTO {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface CategoryResponseDTO {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

function getAuthHeaders() {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(getApiUrl(path), {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }

  return response.text() as T;
}

export function listMenuItems() {
  return request<MenuItemResponseDTO[]>('/api/menu');
}

export function createMenuItem(body: MenuItemRequestDTO) {
  return request<MenuItemResponseDTO>('/api/menu', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateMenuItem(itemId: string, body: MenuItemRequestDTO) {
  return request<MenuItemResponseDTO>(`/api/menu/${itemId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteMenuItem(itemId: string) {
  return request<void>(`/api/menu/${itemId}`, {
    method: 'DELETE',
  });
}

export function listCategories() {
  return request<CategoryResponseDTO[]>('/api/categories');
}

export function createCategory(body: CategoryRequestDTO) {
  return request<CategoryResponseDTO>('/api/categories', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateCategory(categoryId: string, body: CategoryRequestDTO) {
  return request<CategoryResponseDTO>(`/api/menu/categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteCategory(categoryId: string) {
  return request<void>(`/api/menu/categories/${categoryId}`, {
    method: 'DELETE',
  });
}

export function toMenuCategory(name?: string): MenuCategory {
  const normalized = (name ?? '').trim().toLowerCase();

  if (normalized.includes('appetizer') || normalized.includes('khai vị') || normalized.includes('khai vi')) {
    return 'appetizer';
  }

  if (normalized.includes('beverage') || normalized.includes('drink') || normalized.includes('đồ uống') || normalized.includes('do uong')) {
    return 'beverage';
  }

  if (normalized.includes('dessert') || normalized.includes('tráng miệng') || normalized.includes('trang mieng')) {
    return 'dessert';
  }

  return 'main';
}

export function fromMenuItemResponse(item: MenuItemResponseDTO, categoryName?: string): MenuItem {
  return {
    id: item.id,
    name: item.name,
    nameVi: item.name,
    categoryId: item.categoryId,
    category: toMenuCategory(categoryName),
    price: item.originalPrice,
    available: item.available,
    preparationTime: 10,
    description: item.description,
    image: item.imageUrl,
  };
}

export function toMenuItemRequest(item: Partial<MenuItem> & { categoryId?: string }, fallbackAvailable?: boolean): MenuItemRequestDTO {
  return {
    categoryId: item.categoryId ?? '',
    name: item.name?.trim() || item.nameVi?.trim() || '',
    description: item.description?.trim() || undefined,
    basePrice: item.price ?? 0,
    isAvailable: item.available ?? fallbackAvailable ?? true,
    imageUrl: item.image?.trim() || undefined,
  };
}

export function getMenuBaseUrl() {
  return config.api.baseURL;
}

export function getStoredMenuToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}
