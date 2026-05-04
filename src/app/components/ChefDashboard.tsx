import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../contexts/OrderContext';
import { Order, OrderStatus } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import React, { useEffect } from "react";
import {
  LogOut,
  Clock,
  ChefHat,
  PlayCircle,
  Flame,
  CheckCircle,
  AlertTriangle,
  User,
  Hash,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function ChefDashboard() {
  const { user, logout } = useAuth();
  const { orders, updateOrderStatus, loading, refreshOrders } = useOrders();
  const [wsConnected, setWsConnected] = React.useState(true);

  // WebSocket connection status check (giả lập, có thể cải thiện sau)
  useEffect(() => {
    const checkConnection = setInterval(() => {
      // Kiểm tra kết nối WebSocket thực tế có thể qua service
      setWsConnected(true); // Tạm thời set true
    }, 30000);

    return () => clearInterval(checkConnection);
  }, []);

  // Refresh orders định kỳ mỗi 30 giây (fallback cho WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [refreshOrders]);

  const newOrders = orders.filter(o => o.status === 'new');
  const cookingOrders = orders.filter(o => o.status === 'cooking');
  const readyOrders = orders.filter(o => o.status === 'ready');

  const isOverdue = (order: Order) => {
    const maxPrepTime = Math.max(...order.items.map(item => item.menuItem.preparationTime));
    const minutesElapsed = (Date.now() - order.createdAt.getTime()) / 1000 / 60;
    return minutesElapsed > maxPrepTime + 5; // Add 5 minutes buffer
  };

  const getTimeElapsed = (date: Date) => {
    return formatDistanceToNow(date, { locale: vi, addSuffix: true });
  };

  const OrderCard = ({ order }: { order: Order }) => {
    const overdue = isOverdue(order);
    const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const [updating, setUpdating] = React.useState(false);

    const handleUpdateStatus = async (newStatus: OrderStatus) => {
      if (updating) return;
      setUpdating(true);
      try {
        await updateOrderStatus(order.id, newStatus);
      } catch (error) {
        console.error('Failed to update order status:', error);
      } finally {
        setUpdating(false);
      }
    };

    return (
      <Card className={overdue ? 'border-red-500 border-2' : ''}>
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-4 w-4" />
                {order.id.split('-')[1]?.substring(0, 6).toUpperCase() || order.id.substring(0, 6).toUpperCase()}
                {overdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Bàn {order.tableNumber} • {totalItems} món
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {order.serverName}
              </div>
              <div className={`flex items-center gap-1 text-xs mt-1 ${overdue ? 'text-red-600 font-semibold' : 'text-muted-foreground'}`}>
                <Clock className="h-3 w-3" />
                {getTimeElapsed(order.createdAt)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 space-y-3">
          {/* Order Items */}
          <div className="space-y-2">
            {order.items.map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded p-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        x{item.quantity}
                      </Badge>
                      <span className="font-medium text-sm">{item.menuItem.nameVi}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{item.menuItem.name}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {item.menuItem.category}
                  </Badge>
                </div>

                {/* Notes */}
                {item.notes.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {item.notes.map((note, noteIdx) => (
                      <div
                        key={noteIdx}
                        className={`text-xs p-1.5 rounded flex items-start gap-1 ${
                          note.type === 'allergy'
                            ? 'bg-red-100 text-red-800 font-semibold border border-red-300'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {note.type === 'allergy' && <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />}
                        <span>{note.content}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            {order.status === 'new' && (
              <Button
                className="w-full"
                onClick={() => handleUpdateStatus('cooking')}
                disabled={updating}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                {updating ? 'Đang xử lý...' : 'Bắt đầu nấu'}
              </Button>
            )}

            {order.status === 'cooking' && (
              <Button
                className="w-full"
                variant="default"
                onClick={() => handleUpdateStatus('ready')}
                disabled={updating}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {updating ? 'Đang xử lý...' : 'Hoàn thành'}
              </Button>
            )}

            {order.status === 'ready' && (
              <Button
                className="w-full"
                variant="outline"
                onClick={() => handleUpdateStatus('served')}
                disabled={updating}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {updating ? 'Đang xử lý...' : 'Đã phục vụ'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const KanbanColumn = ({
    title,
    icon: Icon,
    count,
    orders,
    color,
  }: {
    title: string;
    icon: any;
    count: number;
    orders: Order[];
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
          {orders.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Icon className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Không có đơn hàng</p>
            </div>
          ) : (
            orders.map(order => <OrderCard key={order.id} order={order} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-orange-500" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Kitchen Display System</h1>
                <p className="text-sm text-slate-600">Màn hình bếp - {user?.name}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">
                {wsConnected ? 'Đã kết nối' : 'Đang kết nối...'}
              </span>
            </div>

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                <span>Đang tải...</span>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 bg-slate-50 px-6 py-3 rounded-lg border">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{newOrders.length}</div>
                <div className="text-xs text-muted-foreground">Đơn mới</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{cookingOrders.length}</div>
                <div className="text-xs text-muted-foreground">Đang nấu</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{readyOrders.length}</div>
                <div className="text-xs text-muted-foreground">Sẵn sàng</div>
              </div>
            </div>

            {/* Refresh Button */}
            <Button 
              variant="outline" 
              onClick={() => refreshOrders()}
              disabled={loading}
              size="sm"
            >
              <svg 
                className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Làm mới
            </Button>

            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 p-6 flex gap-6 overflow-hidden">
        <KanbanColumn
          title="Đơn mới"
          icon={Clock}
          count={newOrders.length}
          orders={newOrders}
          color="text-blue-600"
        />

        <KanbanColumn
          title="Đang nấu"
          icon={Flame}
          count={cookingOrders.length}
          orders={cookingOrders}
          color="text-orange-600"
        />

        <KanbanColumn
          title="Sẵn sàng"
          icon={CheckCircle}
          count={readyOrders.length}
          orders={readyOrders}
          color="text-green-600"
        />
      </div>
    </div>
  );
}
