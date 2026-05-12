import type { OrderStatus } from '../types';

const KNOWN: ReadonlySet<string> = new Set([
  'PENDING',
  'CONFIRM',
  'CREATED',
  'KITCHEN_PENDING',
  'WAIT_FOR_MENU_CONFIRM',
  'COOKING',
  'READY',
  'SERVED',
  'REJECT',
]);

/** Chuẩn hoá chuỗi trạng thái từ REST, KDS WebSocket hoặc STOMP ordering. */
export function normalizeOrderStatus(raw: unknown): OrderStatus {
  const s = String(raw ?? '').toUpperCase();
  if (s === 'CONFIRMED') return 'CONFIRM';
  if (KNOWN.has(s)) return s as OrderStatus;
  return 'PENDING';
}

/** Trạng thái mà KDS chấp nhận ở PUT /api/kds/tickets/{id}/status (theo backend hiện tại). */
export const KDS_PUT_ALLOWED: ReadonlySet<OrderStatus> = new Set(['COOKING', 'READY', 'SERVED']);
