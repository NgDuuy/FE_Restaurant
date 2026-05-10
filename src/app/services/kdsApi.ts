import { config, getApiUrl } from "../config/config";
import { KitchenTicket, OrderStatus } from "../types";

const AUTH_TOKEN_KEY = config.auth.tokenKey;

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function getActiveTickets(): Promise<KitchenTicket[]> {
  const url = getApiUrl(config.endpoints.kds.getActiveTickets);
  const response = await fetch(url, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch active tickets: ${response.status}`);
  }

  const tickets = await response.json();

  return tickets.map((ticket: any) => ({
    ...ticket,
    status: ticket.status === "KITCHEN_PENDING" ? "PENDING" : ticket.status,
  }));
}

export async function updateTicketStatus(
  ticketId: string,
  status: OrderStatus,
): Promise<void> {
  const url = getApiUrl(config.endpoints.kds.updateStatus(ticketId));
  const response = await fetch(url, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update ticket ${ticketId}: ${response.status} - ${errorText}`,
    );
  }
}
