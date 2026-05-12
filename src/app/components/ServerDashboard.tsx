import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../contexts/MenuContext';
import { useOrder } from '../contexts/OrderContext';
import { MenuCategory, MenuItem, OrderStatus } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Search, Plus, Minus, Trash2, ShoppingCart, Send, LogOut } from 'lucide-react';
import { toast } from 'sonner';

type CartItem = { id: string; menuItem: MenuItem; quantity: number };
const ACTIVE_SERVER_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRM',
  'CREATED',
  'KITCHEN_PENDING',
  'WAIT_FOR_MENU_CONFIRM',
  'COOKING',
  'READY',
];

function getStatusLabel(status: OrderStatus): string {
  if (status === 'PENDING') return 'Pending';
  if (status === 'CONFIRM') return 'Confirmed';
  if (status === 'CREATED') return 'Created';
  if (status === 'KITCHEN_PENDING') return 'Kitchen queue';
  if (status === 'WAIT_FOR_MENU_CONFIRM') return 'Waiting menu';
  if (status === 'COOKING') return 'Cooking';
  if (status === 'READY') return 'Ready';
  if (status === 'SERVED') return 'Served';
  return 'Rejected';
}

export function ServerDashboard() {
  const { user, logout } = useAuth();
  const { menuItems } = useMenu();
  const { createOrder, orders, fetchAllOrders, updateKitchenTicketStatus } = useOrder();

  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [orderNote, setOrderNote] = useState('');

  useEffect(() => {
    void fetchAllOrders();
  }, [fetchAllOrders]);

  const categories = [
    { value: 'all' as const, label: 'All' },
    { value: 'main' as MenuCategory, label: 'Main' },
    { value: 'appetizer' as MenuCategory, label: 'Appetizer' },
    { value: 'beverage' as MenuCategory, label: 'Beverage' },
    { value: 'dessert' as MenuCategory, label: 'Dessert' },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(q) || item.nameVi.toLowerCase().includes(q);
    return matchesCategory && matchesSearch && item.available;
  });

  const addToCart = (menuItem: MenuItem) => {
    const existing = cart.find((item) => item.menuItem.id === menuItem.id);
    if (existing) {
      setCart(cart.map((item) => (item.menuItem.id === menuItem.id ? { ...item, quantity: item.quantity + 1 } : item)));
    } else {
      setCart([...cart, { id: `cart-${Date.now()}-${Math.random()}`, menuItem, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map((item) => (item.id === itemId ? { ...item, quantity: item.quantity + delta } : item)).filter((item) => item.quantity > 0));
  };

  const removeFromCart = (itemId: string) => setCart(cart.filter((item) => item.id !== itemId));
  const total = cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    if (!tableNumber.trim()) return toast.error('Please enter table number');

    try {
      await createOrder({
        tableNumber: tableNumber.trim(),
        staffName: user?.name || user?.username || 'Server',
        items: cart.map((item) => ({
          menuItemId: item.menuItem.id,
          name: item.menuItem.nameVi || item.menuItem.name,
          quantity: item.quantity,
          customizations: [],
        })),
        note: orderNote.trim() || undefined,
      });
      await fetchAllOrders();
      setCart([]);
      setTableNumber('');
      setOrderNote('');
      toast.success('Order sent');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create order');
    }
  };

  const myOrders = useMemo(() => {
    const arr = Array.from(orders.values());
    const staffName = (user?.name || '').toLowerCase();
    return arr.filter((o) => o.staffName.toLowerCase() === staffName).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [orders, user?.name]);
  const menuById = useMemo(() => new Map(menuItems.map((m) => [m.id, m])), [menuItems]);

  const activeOrders = myOrders.filter((o) => ACTIVE_SERVER_STATUSES.includes(o.status));
  const doneOrders = myOrders.filter((o) => o.status === 'SERVED' || o.status === 'REJECT');
  const handleUpdateOrderStatus = async (orderId: number, status: OrderStatus) => {
    try {
      await updateKitchenTicketStatus(orderId, status);
      toast.success(`Order #${orderId} updated to ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-sm text-slate-600">Server: {user?.name}</p>
        </div>
        <Button variant="outline" onClick={logout} className="cursor-pointer hover:font-semibold"><LogOut className="h-4 w-4 mr-2" />Logout</Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-h-0 flex flex-col border-r bg-white">
          <div className="p-4 border-b space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search menu..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <Button key={cat.value} variant={selectedCategory === cat.value ? 'default' : 'outline'} size="sm" className={`cursor-pointer hover:font-semibold ${selectedCategory === cat.value ? 'font-bold' : ''}`} onClick={() => setSelectedCategory(cat.value)}>{cat.label}</Button>
              ))}
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 grid grid-cols-2 gap-4">
              {filteredMenuItems.map((item) => (
                <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => addToCart(item)}>
                  <CardHeader className="p-4">
                    {item.image && <div className="mb-2 h-24 w-full overflow-hidden rounded-md border"><img src={item.image} alt={item.nameVi} className="h-full w-full object-cover" loading="lazy" /></div>}
                    <CardTitle className="text-base line-clamp-1">{item.nameVi}</CardTitle>
                    <CardDescription className="text-xs">{item.name}</CardDescription>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description || '-'}</p>
                  </CardHeader>
                  <CardContent className="p-4 pt-0"><span className="font-bold text-primary">{formatCurrency(item.price)}</span></CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="w-[30rem] bg-white border-l">
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-4 space-y-5">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4"><ShoppingCart className="h-5 w-5" /><h2 className="text-lg font-bold">Cart</h2><Badge variant="secondary">{cart.length}</Badge></div>
                <div className="space-y-2"><Label htmlFor="tableNumber">Table Number</Label><Input id="tableNumber" placeholder="Enter table number" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} /></div>
                <div className="space-y-2 mt-3">
                  <Label htmlFor="orderNote">Ghi chú đơn hàng</Label>
                  <Textarea id="orderNote" placeholder="Ví dụ: ít đá, mang ra cùng lúc..." value={orderNote} onChange={(e) => setOrderNote(e.target.value)} rows={3} className="resize-none" />
                </div>
              </div>

              <div className="space-y-3">
                {cart.map((item) => (
                  <Card key={item.id}><CardContent className="p-3"><div className="flex items-start justify-between mb-2"><p className="font-medium text-sm">{item.menuItem.nameVi}</p><Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer" onClick={() => removeFromCart(item.id)}><Trash2 className="h-3 w-3" /></Button></div><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button><span className="w-8 text-center font-medium">{item.quantity}</span><Button variant="outline" size="icon" className="h-7 w-7 cursor-pointer" onClick={() => updateQuantity(item.id, 1)}><Plus className="h-3 w-3" /></Button></div><span className="text-sm font-bold">{formatCurrency(item.menuItem.price * item.quantity)}</span></div></CardContent></Card>
                ))}
              </div>

              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold">Active Orders</h3>
                {activeOrders.map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-semibold">Order #{order.id} - Table {order.tableNumber}</p>
                          <p className="text-xs text-muted-foreground">{order.staffName} • {new Date(order.timestamp).toLocaleString('vi-VN')}</p>
                        </div>
                        <Badge>{getStatusLabel(order.status)}</Badge>
                      </div>
                      {order.note ? (
                        <p className="text-xs rounded-md bg-amber-50 border border-amber-100 text-amber-950 px-2 py-1.5">
                          <span className="font-medium">Ghi chú: </span>
                          {order.note}
                        </p>
                      ) : null}
                      <div className="space-y-2">
                        {order.items.map((it) => {
                          const menu = menuById.get(it.menuItemId);
                          return (
                            <div key={it.id} className="flex items-center justify-between gap-2 rounded border p-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="h-10 w-10 rounded overflow-hidden border bg-slate-100">
                                  {menu?.image ? <img src={menu.image} alt={it.name} className="h-full w-full object-cover" loading="lazy" /> : null}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium truncate">{it.name}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold">x{it.quantity}</p>
                                <p className="text-[11px] text-muted-foreground">{formatCurrency((menu?.price ?? 0) * it.quantity)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {order.status === 'READY' && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" className="cursor-pointer" onClick={() => void handleUpdateOrderStatus(order.id, 'SERVED')}>
                            Mark Served
                          </Button>
                          <Button size="sm" variant="destructive" className="cursor-pointer" onClick={() => void handleUpdateOrderStatus(order.id, 'REJECT')}>
                            Reject
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {activeOrders.length === 0 && <p className="text-sm text-muted-foreground">No active orders</p>}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Done Orders</h3>
                {doneOrders.slice(0, 5).map((order) => (
                  <Card key={order.id}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="text-sm">Order #{order.id} - Table {order.tableNumber}</p>
                        <Badge variant="outline">{getStatusLabel(order.status)}</Badge>
                      </div>
                      {order.note ? (
                        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded px-2 py-1">
                          <span className="font-medium">Ghi chú: </span>
                          {order.note}
                        </p>
                      ) : null}
                      <div className="space-y-1">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex items-center justify-between text-xs">
                            <span className="truncate">{it.name}</span>
                            <span>x{it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />
              <div className="space-y-3 pb-6"><div className="flex items-center justify-between text-lg font-bold"><span>Total:</span><span className="text-primary">{formatCurrency(total)}</span></div><Button className="w-full cursor-pointer hover:font-semibold" onClick={handleSubmitOrder} disabled={cart.length === 0}><Send className="h-4 w-4 mr-2" />Send Order</Button></div>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

