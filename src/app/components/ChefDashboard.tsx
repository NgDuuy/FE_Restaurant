import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { useMenu } from '../contexts/MenuContext';
import { OrderResponse, OrderStatus } from '../types';
import { KDS_PUT_ALLOWED } from '../utils/orderStatus';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { LogOut, Clock, ChefHat, PlayCircle, Flame, CheckCircle } from 'lucide-react';

const NEW_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRM',
  'CREATED',
  'KITCHEN_PENDING',
  'WAIT_FOR_MENU_CONFIRM',
];
const COOKING_STATUSES: OrderStatus[] = ['COOKING'];
const READY_STATUSES: OrderStatus[] = ['READY'];
const DONE_STATUSES: OrderStatus[] = ['SERVED', 'REJECT'];

function statusLabel(status: OrderStatus): string {
  if (status === 'PENDING') return 'Pending';
  if (status === 'CONFIRM') return 'Confirm';
  if (status === 'CREATED') return 'Created';
  if (status === 'KITCHEN_PENDING') return 'Kitchen queue';
  if (status === 'WAIT_FOR_MENU_CONFIRM') return 'Waiting menu';
  if (status === 'COOKING') return 'Cooking';
  if (status === 'READY') return 'Ready';
  if (status === 'SERVED') return 'Served';
  return 'Rejected';
}

function itemLineNote(item: OrderResponse['items'][number]): string {
  const parts: string[] = [];
  if (item.customizations?.length) parts.push(...item.customizations);
  if (item.notes?.length) parts.push(...item.notes);
  return parts.length ? parts.join(', ') : '—';
}

export function ChefDashboard() {
  const { user, logout } = useAuth();
  const { orders, fetchAllOrders, updateKitchenTicketStatus } = useOrder();
  const { menuItems } = useMenu();
  const [detailOrder, setDetailOrder] = useState<OrderResponse | null>(null);

  useEffect(() => {
    void fetchAllOrders();
  }, [fetchAllOrders]);

  useEffect(() => {
    if (!detailOrder) return;
    const latest = orders.get(detailOrder.id);
    if (latest && latest.status !== detailOrder.status) {
      setDetailOrder(latest);
    }
  }, [orders, detailOrder?.id, detailOrder?.status]);

  const allOrders = Array.from(orders.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const newOrders = allOrders.filter((o) => NEW_STATUSES.includes(o.status));
  const cookingOrders = allOrders.filter((o) => COOKING_STATUSES.includes(o.status));
  const readyOrders = allOrders.filter((o) => READY_STATUSES.includes(o.status));
  const doneOrders = allOrders.filter((o) => DONE_STATUSES.includes(o.status));

  const changeStatus = async (order: OrderResponse, status: OrderStatus) => {
    if (!KDS_PUT_ALLOWED.has(status)) {
      toast.error('KDS chỉ nhận COOKING, READY, SERVED qua API. Từ chối đơn cần luồng backend khác.');
      return;
    }
    try {
      await updateKitchenTicketStatus(order.id, status);
      toast.success('Đã cập nhật trạng thái');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Không cập nhật được trạng thái');
    }
  };

  const menuById = new Map(menuItems.map((m) => [m.id, m]));

  const OrderSummaryCard = ({ order }: { order: OrderResponse }) => (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring outline-none"
      role="button"
      tabIndex={0}
      onClick={() => setDetailOrder(order)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setDetailOrder(order);
        }
      }}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">Order #{order.id}</CardTitle>
            <CardDescription className="text-xs mt-1">
              Bàn {order.tableNumber} · {order.staffName}
            </CardDescription>
          </div>
          <Badge variant="outline" className="shrink-0">
            {statusLabel(order.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        <p className="text-[11px] text-muted-foreground">{new Date(order.timestamp).toLocaleString('vi-VN')}</p>
        {order.note ? (
          <p className="text-xs rounded bg-amber-50 border border-amber-100 text-amber-950 px-2 py-1 line-clamp-2">
            <span className="font-medium">Ghi chú: </span>
            {order.note}
          </p>
        ) : null}
        <ul className="text-xs space-y-0.5 text-slate-700">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="truncate">{item.name}</span>
              <span className="shrink-0 font-medium">×{item.quantity}</span>
            </li>
          ))}
        </ul>
        <p className="text-[11px] text-muted-foreground">Nhấn để xem chi tiết</p>
      </CardContent>
    </Card>
  );

  const OrderDetailDialog = () => (
    <Dialog open={detailOrder !== null} onOpenChange={(open) => !open && setDetailOrder(null)}>
      <DialogContent className="flex flex-col p-0 top-4 left-4 right-4 bottom-4 translate-x-0 translate-y-0 w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-none max-h-none sm:max-w-none overflow-hidden gap-0">
        {detailOrder && (
          <>
            <DialogHeader className="p-6 pb-4 border-b shrink-0 text-left space-y-1">
              <DialogTitle className="text-xl">Order #{detailOrder.id}</DialogTitle>
              <DialogDescription className="text-sm text-slate-600">
                Bàn {detailOrder.tableNumber} · Nhân viên: {detailOrder.staffName} · {new Date(detailOrder.timestamp).toLocaleString('vi-VN')}
              </DialogDescription>
              <div className="pt-2">
                <Badge variant="secondary">{statusLabel(detailOrder.status)}</Badge>
              </div>
            </DialogHeader>

            <ScrollArea className="flex-1 min-h-0 px-6">
              <div className="py-4 space-y-4 pr-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Ghi chú đơn hàng</h3>
                  {detailOrder.note ? (
                    <p className="text-sm rounded-lg border bg-amber-50/80 text-amber-950 px-3 py-2 whitespace-pre-wrap">
                      {detailOrder.note}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Không có ghi chú</p>
                  )}
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Món · Số lượng · Ghi chú</h3>
                  <div className="space-y-3">
                    {detailOrder.items.map((item) => {
                      const img = menuById.get(item.menuItemId)?.image;
                      return (
                        <div
                          key={item.id}
                          className="flex gap-3 rounded-lg border bg-slate-50/80 p-3 text-sm"
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border bg-white">
                            {img ? (
                              <img src={img} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400">—</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                              <span className="font-medium text-slate-900">{item.name}</span>
                              <span className="font-semibold tabular-nums">×{item.quantity}</span>
                            </div>
                            <p className="text-xs text-slate-600">
                              <span className="font-medium text-slate-700">Ghi chú món: </span>
                              {itemLineNote(item)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t p-4 bg-background space-y-2">
              {NEW_STATUSES.includes(detailOrder.status) && (
                <Button className="w-full" onClick={() => void changeStatus(detailOrder, 'COOKING').then(() => setDetailOrder(null))}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Bắt đầu nấu
                </Button>
              )}
              {detailOrder.status === 'COOKING' && (
                <Button className="w-full" onClick={() => void changeStatus(detailOrder, 'READY').then(() => setDetailOrder(null))}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Đánh dấu sẵn sàng
                </Button>
              )}
              {detailOrder.status === 'READY' && (
                <Button className="w-full" onClick={() => void changeStatus(detailOrder, 'SERVED').then(() => setDetailOrder(null))}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Đã phục vụ
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );

  const Column = ({
    title,
    count,
    data,
    icon: Icon,
    color,
  }: {
    title: string;
    count: number;
    data: OrderResponse[];
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }) => (
    <div className="flex-1 flex flex-col min-w-0 bg-slate-50 rounded-lg border">
      <div className={`p-4 border-b bg-white rounded-t-lg ${color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <h3 className="font-semibold">{title}</h3>
          </div>
          <Badge variant="secondary">{count}</Badge>
        </div>
      </div>
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Chưa có đơn</p>
          ) : (
            data.map((o) => <OrderSummaryCard key={o.id} order={o} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white">
      <OrderDetailDialog />
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Kitchen Orders</h1>
              <p className="text-sm text-slate-600">Chef: {user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void fetchAllOrders()} className="mr-2">
              Refresh
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 min-w-[1280px] grid grid-cols-4 gap-6">
          <Column title="New" icon={Clock} count={newOrders.length} data={newOrders} color="text-blue-600" />
          <Column title="Cooking" icon={Flame} count={cookingOrders.length} data={cookingOrders} color="text-orange-600" />
          <Column title="Ready" icon={CheckCircle} count={readyOrders.length} data={readyOrders} color="text-green-600" />
          <Column title="Done" icon={CheckCircle} count={doneOrders.length} data={doneOrders} color="text-slate-600" />
        </div>
      </ScrollArea>
    </div>
  );
}
