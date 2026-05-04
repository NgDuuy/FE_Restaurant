import { UserRole } from '../types';

const AUTH_BASE_URL = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.VITE_AUTH_BASE_URL ?? 'https://auth-service-606057767170.asia-southeast1.run.app';

export interface AuthRequest {
  username: string;
  password: string;
}

export interface RegisterRequest extends AuthRequest {
  role: Uppercase<UserRole>;
}

export interface AuthResponse {
  token: string;
}

async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${AUTH_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function login(authRequest: AuthRequest) {
  return request<AuthResponse>('/api/auth/login', authRequest);
}

export function register(registerRequest: RegisterRequest) {
  return request<string>('/api/auth/register', registerRequest);
}

export function getAuthBaseUrl() {
  return AUTH_BASE_URL;
}
