// services/kdsApi.ts
import { KitchenTicket } from '../types';

const API_BASE_URL = 'http://localhost:8080/api/kds';

const getAuthToken = () => {
  const token = localStorage.getItem('irms_auth_token');
  return token ? `Bearer ${token}` : '';
};

export const kdsApi = {
  async getActiveTickets(): Promise<KitchenTicket[]> {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/tickets/active`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch active tickets: ${response.status}`);
    }

    return response.json();
  },

  async updateTicketStatus(ticketId: string, status: string): Promise<void> {
    const token = getAuthToken();
    
    const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token,
      },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update ticket status: ${response.status}`);
    }
  },
};
