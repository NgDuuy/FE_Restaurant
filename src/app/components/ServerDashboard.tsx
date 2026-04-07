import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../contexts/MenuContext';
import { useOrders } from '../contexts/OrderContext';
import { MenuItem, OrderItem, OrderNote, MenuCategory } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Textarea } from './ui/textarea';
import {
  LogOut,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Send,
  AlertTriangle,
  StickyNote,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

export function ServerDashboard() {
  const { user, logout } = useAuth();
  const { menuItems } = useMenu();
  const { addOrder, orders } = useOrders();

  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [tableNumber, setTableNumber] = useState('');
  const [noteDialog, setNoteDialog] = useState<{ isOpen: boolean; itemId: string | null }>({
    isOpen: false,
    itemId: null,
  });
  const [noteType, setNoteType] = useState<'special' | 'allergy'>('special');
  const [noteContent, setNoteContent] = useState('');

  const categories = [
    { value: 'all' as const, label: 'Tất cả', labelEn: 'All' },
    { value: 'main' as MenuCategory, label: 'Món chính', labelEn: 'Main' },
    { value: 'appetizer' as MenuCategory, label: 'Khai vị', labelEn: 'Appetizer' },
    { value: 'beverage' as MenuCategory, label: 'Đồ uống', labelEn: 'Beverage' },
    { value: 'dessert' as MenuCategory, label: 'Tráng miệng', labelEn: 'Dessert' },
  ];

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.nameVi.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch && item.available;
  });

  const addToCart = (menuItem: MenuItem) => {
    const existingItem = cart.find(item => item.menuItemId === menuItem.id);

    if (existingItem) {
      setCart(cart.map(item =>
        item.menuItemId === menuItem.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const newItem: OrderItem = {
        id: `cart-${Date.now()}-${Math.random()}`,
        menuItemId: menuItem.id,
        menuItem,
        quantity: 1,
        notes: [],
      };
      setCart([...cart, newItem]);
    }
    toast.success(`Đã thêm ${menuItem.nameVi}`);
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        const newQuantity = item.quantity + delta;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
    toast.info('Đã xóa món khỏi đơn hàng');
  };

  const openNoteDialog = (itemId: string) => {
    setNoteDialog({ isOpen: true, itemId });
    setNoteContent('');
    setNoteType('special');
  };

  const addNote = () => {
    if (!noteDialog.itemId || !noteContent.trim()) return;

    const newNote: OrderNote = {
      type: noteType,
      content: noteContent.trim(),
    };

    setCart(cart.map(item =>
      item.id === noteDialog.itemId
        ? { ...item, notes: [...item.notes, newNote] }
        : item
    ));

    setNoteDialog({ isOpen: false, itemId: null });
    setNoteContent('');
    toast.success('Đã thêm ghi chú');
  };

  const removeNote = (itemId: string, noteIndex: number) => {
    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, notes: item.notes.filter((_, i) => i !== noteIndex) }
        : item
    ));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleSubmitOrder = () => {
    if (cart.length === 0) {
      toast.error('Giỏ hàng trống');
      return;
    }

    if (!tableNumber.trim()) {
      toast.error('Vui lòng nhập số bàn');
      return;
    }

    addOrder({
      tableNumber: tableNumber.trim(),
      items: cart,
      status: 'new',
      serverId: user?.id || '',
      serverName: user?.name || '',
      total: calculateTotal(),
    });

    setCart([]);
    setTableNumber('');
    toast.success(`Đã gửi đơn hàng bàn ${tableNumber} xuống bếp!`);
  };

  const clearCart = () => {
    setCart([]);
    toast.info('Đã xóa toàn bộ giỏ hàng');
  };

  const formatOrderStatus = (status: 'new' | 'cooking' | 'ready' | 'served' | 'cancelled') => {
    if (status === 'new') return 'Mới gọi';
    if (status === 'cooking') return 'Đang thực hiện';
    if (status === 'ready') return 'Sẵn sàng phục vụ';
    if (status === 'served') return 'Đã phục vụ';
    return 'Đã hủy';
  };

  const myOrders = orders.filter(
    (order) =>
      order.serverId === (user?.id || '') ||
      order.serverName.toLowerCase() === (user?.name || '').toLowerCase()
  );
  const activeOrders = myOrders.filter((order) => ['new', 'cooking', 'ready'].includes(order.status));
  const servedOrders = myOrders.filter((order) => order.status === 'served');

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Order Management</h1>
          <p className="text-sm text-slate-600">Quản lý đơn hàng - {user?.name}</p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />
          Đăng xuất
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Menu */}
        <div className="flex-1 flex flex-col border-r bg-white">
          {/* Search and Filter */}
          <div className="p-4 border-b space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm kiếm món ăn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {categories.map(cat => (
                <Button
                  key={cat.value}
                  variant={selectedCategory === cat.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.value)}
                >
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Menu Items */}
          <ScrollArea className="flex-1">
            <div className="p-4 grid grid-cols-2 gap-4">
              {filteredMenuItems.map(item => (
                <Card
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => addToCart(item)}
                >
                  <CardHeader className="p-4">
                    {item.image && (
                      <div className="mb-3 h-28 w-full overflow-hidden rounded-md border">
                        <img
                          src={item.image}
                          alt={item.nameVi}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <CardTitle className="text-base line-clamp-1">{item.nameVi}</CardTitle>
                    <CardDescription className="text-xs">{item.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{formatCurrency(item.price)}</span>
                      <Badge variant="secondary" className="text-xs">
                        {item.preparationTime}m
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right: Order Cart */}
        <div className="w-[28rem] bg-white border-l">
          <ScrollArea className="h-[calc(100vh-80px)]">
            <div className="p-4 space-y-5">
              <div className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="h-5 w-5" />
                  <h2 className="text-lg font-bold">Đơn hàng</h2>
                  <Badge variant="secondary">{cart.length}</Badge>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tableNumber">Số bàn</Label>
                  <Input
                    id="tableNumber"
                    placeholder="Nhập số bàn..."
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>
              </div>

              <div>
                {cart.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-20" />
                    <p>Chưa có món nào</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <Card key={item.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{item.menuItem.nameVi}</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(item.menuItem.price)}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => removeFromCart(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateQuantity(item.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openNoteDialog(item.id)}
                            >
                              <StickyNote className="h-3 w-3 mr-1" />
                              Ghi chú
                            </Button>
                          </div>

                          {item.notes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {item.notes.map((note, idx) => (
                                <div
                                  key={idx}
                                  className={`text-xs p-2 rounded flex items-start justify-between ${
                                    note.type === 'allergy'
                                      ? 'bg-red-50 text-red-700 border border-red-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-1 flex-1">
                                    {note.type === 'allergy' && <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />}
                                    <span className="flex-1">{note.content}</span>
                                  </div>
                                  <button
                                    onClick={() => removeNote(item.id, idx)}
                                    className="ml-1 hover:opacity-70"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="mt-2 pt-2 border-t text-right">
                            <span className="text-sm font-bold">
                              {formatCurrency(item.menuItem.price * item.quantity)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Theo dõi đơn đã gọi</h3>
                  <Badge variant="secondary">{myOrders.length}</Badge>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Đang thực hiện</p>
                  <div className="space-y-2">
                    {activeOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Bàn {order.tableNumber}</p>
                            <Badge>{formatOrderStatus(order.status)}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.createdAt).toLocaleTimeString('vi-VN')}
                          </p>
                          <div className="space-y-1">
                            {order.items.map((orderItem) => (
                              <div key={orderItem.id} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  {orderItem.menuItem.image && (
                                    <img
                                      src={orderItem.menuItem.image}
                                      alt={orderItem.menuItem.nameVi}
                                      className="h-6 w-6 rounded object-cover border"
                                      loading="lazy"
                                    />
                                  )}
                                  <span>x{orderItem.quantity} {orderItem.menuItem.nameVi}</span>
                                </div>
                                <span>{formatCurrency(orderItem.menuItem.price * orderItem.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {activeOrders.length === 0 && (
                      <p className="text-xs text-muted-foreground">Chưa có đơn đang thực hiện.</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Đã phục vụ</p>
                  <div className="space-y-2">
                    {servedOrders.map((order) => (
                      <Card key={order.id}>
                        <CardContent className="p-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Bàn {order.tableNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.updatedAt).toLocaleTimeString('vi-VN')}
                            </p>
                          </div>
                          <Badge variant="outline">{formatCurrency(order.total)}</Badge>
                        </CardContent>
                      </Card>
                    ))}
                    {servedOrders.length === 0 && (
                      <p className="text-xs text-muted-foreground">Chưa có đơn đã phục vụ.</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />
              <div className="space-y-3 pb-6">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Tổng cộng:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={clearCart} disabled={cart.length === 0}>
                    Xóa hết
                  </Button>
                  <Button onClick={handleSubmitOrder} disabled={cart.length === 0}>
                    <Send className="h-4 w-4 mr-2" />
                    Gửi đơn
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Note Dialog */}
      <Dialog open={noteDialog.isOpen} onOpenChange={(open) => setNoteDialog({ isOpen: open, itemId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thêm ghi chú</DialogTitle>
            <DialogDescription>
              Thêm yêu cầu đặc biệt hoặc thông tin dị ứng cho món ăn
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={noteType === 'special' ? 'default' : 'outline'}
                onClick={() => setNoteType('special')}
                className="flex-1"
              >
                Yêu cầu đặc biệt
              </Button>
              <Button
                variant={noteType === 'allergy' ? 'default' : 'outline'}
                onClick={() => setNoteType('allergy')}
                className="flex-1"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Dị ứng
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Nội dung</Label>
              <Textarea
                placeholder={
                  noteType === 'allergy'
                    ? 'Ví dụ: Dị ứng hải sản, không ăn được tôm'
                    : 'Ví dụ: Không cay, ít dầu'
                }
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setNoteDialog({ isOpen: false, itemId: null })}>
                Hủy
              </Button>
              <Button onClick={addNote} disabled={!noteContent.trim()}>
                Thêm
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
