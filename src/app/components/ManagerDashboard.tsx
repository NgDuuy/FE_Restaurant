import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../contexts/MenuContext';
import { useOrders } from '../contexts/OrderContext';
import { MenuItem } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import React from "react";
import { useEffect } from 'react';
import {
  LogOut,
  Settings,
  TrendingUp,
  ShoppingBag,
  DollarSign,
  UtensilsCrossed,
  Edit,
  Plus,
  Trash2,
  BarChart3,
  Users,
} from 'lucide-react';

export function ManagerDashboard() {
  const { user, logout } = useAuth();
  const { menuItems, categories, loading, updateMenuItem, addMenuItem, deleteMenuItem } = useMenu();
  const { orders } = useOrders();

  const [editDialog, setEditDialog] = useState<{ isOpen: boolean; item: MenuItem | null }>({
    isOpen: false,
    item: null,
  });

  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});
  const [createForm, setCreateForm] = useState({
    nameVi: '',
    name: '',
    categoryId: '',
    price: 0,
    preparationTime: 10,
    description: '',
    image: '',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  useEffect(() => {
    if (!createForm.categoryId && categories.length > 0) {
      setCreateForm(current => ({
        ...current,
        categoryId: categories[0].id,
      }));
    }
  }, [categories, createForm.categoryId]);

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const openEditDialog = (item: MenuItem) => {
    const fallbackCategoryId = item.categoryId ?? categories.find(category => category.name.toLowerCase().includes(item.category))?.id ?? categories[0]?.id ?? '';
    setEditDialog({ isOpen: true, item });
    setEditForm({
      ...item,
      categoryId: fallbackCategoryId,
    });
  };

  const closeEditDialog = () => {
    setEditDialog({ isOpen: false, item: null });
    setEditForm({});
  };

  const handleSaveEdit = async () => {
    if (!editDialog.item) return;

    await updateMenuItem(editDialog.item.id, editForm);
    closeEditDialog();
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    await updateMenuItem(itemId, { available: !currentStatus });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Bạn có chắc muốn xóa món này?')) {
      await deleteMenuItem(itemId);
    }
  };

  const handleAddMenuItem = async () => {
    if (!createForm.nameVi.trim() || !createForm.name.trim() || createForm.price <= 0 || !createForm.categoryId) {
      return;
    }

    await addMenuItem({
      nameVi: createForm.nameVi.trim(),
      name: createForm.name.trim(),
      category: 'main',
      categoryId: createForm.categoryId,
      price: createForm.price,
      preparationTime: createForm.preparationTime,
      description: createForm.description.trim() || undefined,
      image: createForm.image.trim() || undefined,
      available: true,
    });

    setCreateForm({
      nameVi: '',
      name: '',
      categoryId: categories[0]?.id ?? '',
      price: 0,
      preparationTime: 10,
      description: '',
      image: '',
    });
  };

  const getItemsByCategory = (categoryId: string) => {
    return menuItems.filter(item => item.categoryId === categoryId);
  };

  const getOrderStats = () => {
    const itemCounts: { [key: string]: number } = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        itemCounts[item.menuItemId] = (itemCounts[item.menuItemId] || 0) + item.quantity;
      });
    });

    const topItems = Object.entries(itemCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([itemId, count]) => {
        const item = menuItems.find(m => m.id === itemId);
        return { item, count };
      })
      .filter(x => x.item);

    return topItems;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-purple-500" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Manager Dashboard</h1>
                <p className="text-sm text-slate-600">Quản lý hệ thống - {user?.name}</p>
                <p className="text-xs text-slate-500">{loading ? 'Đang tải menu từ backend...' : 'Menu backend đã sẵn sàng'}</p>
              </div>
            </div>
          </div>

          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Đăng xuất
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="stats" className="h-full flex flex-col">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="stats">
                <BarChart3 className="h-4 w-4 mr-2" />
                Thống kê
              </TabsTrigger>
              <TabsTrigger value="menu">
                <UtensilsCrossed className="h-4 w-4 mr-2" />
                Quản lý Menu
              </TabsTrigger>
              <TabsTrigger value="orders">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Đơn hàng
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Tổng đơn hàng</CardTitle>
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalOrders}</div>
                    <p className="text-xs text-muted-foreground mt-1">Tất cả đơn hàng</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Doanh thu</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Tổng doanh thu</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Trung bình đơn</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Giá trị trung bình</p>
                  </CardContent>
                </Card>
              </div>

              {/* Top Selling Items */}
              <Card>
                <CardHeader>
                  <CardTitle>Món bán chạy</CardTitle>
                  <CardDescription>Top 5 món được gọi nhiều nhất</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOrderStats().map(({ item, count }, idx) => (
                      <div key={item?.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{idx + 1}</Badge>
                          <div>
                            <p className="font-medium">{item?.nameVi}</p>
                            <p className="text-sm text-muted-foreground">{item?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">{count}</p>
                          <p className="text-xs text-muted-foreground">lần gọi</p>
                        </div>
                      </div>
                    ))}

                    {getOrderStats().length === 0 && (
                      <p className="text-center text-muted-foreground py-8">Chưa có dữ liệu</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Menu Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Phân bổ menu</CardTitle>
                  <CardDescription>Số lượng món theo danh mục</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categories.map(cat => {
                      const count = getItemsByCategory(cat.value).length;
                      const available = getItemsByCategory(cat.value).filter(i => i.available).length;

                      return (
                        <div key={cat.value} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{cat.label}</p>
                            <p className="text-sm text-muted-foreground">{cat.labelEn}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{count} món</p>
                            <p className="text-xs text-green-600">{available} có sẵn</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Menu Management Tab */}
          <TabsContent value="menu" className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Thêm món mới</CardTitle>
                  <CardDescription>Manager thêm món trực tiếp vào menu</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tên tiếng Việt</Label>
                      <Input
                        value={createForm.nameVi}
                        onChange={(e) => setCreateForm({ ...createForm, nameVi: e.target.value })}
                        placeholder="Ví dụ: Phở bò"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tên tiếng Anh</Label>
                      <Input
                        value={createForm.name}
                        onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                        placeholder="Ví dụ: Beef Pho"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Danh mục</Label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={createForm.categoryId}
                        onChange={(e) => setCreateForm({ ...createForm, categoryId: e.target.value })}
                      >
                        <option value="">Chọn danh mục</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>Giá (VNĐ)</Label>
                      <Input
                        type="number"
                        min={1000}
                        value={createForm.price || ''}
                        onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Thời gian (phút)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={createForm.preparationTime}
                        onChange={(e) => setCreateForm({ ...createForm, preparationTime: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Ảnh món (URL)</Label>
                    <Input
                      value={createForm.image}
                      onChange={(e) => setCreateForm({ ...createForm, image: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mô tả</Label>
                    <Input
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      placeholder="Mô tả ngắn về món"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddMenuItem}
                      disabled={!createForm.nameVi.trim() || !createForm.name.trim() || createForm.price <= 0 || !createForm.categoryId}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Thêm món
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {categories.map(category => (
                <Card key={category.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{category.name}</CardTitle>
                        <CardDescription>{category.description || 'Danh mục'}</CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {getItemsByCategory(category.id).length} món
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {getItemsByCategory(category.id).map(item => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{item.nameVi}</p>
                              {!item.available && (
                                <Badge variant="destructive" className="text-xs">
                                  Hết hàng
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{item.name}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm font-bold text-primary">
                                {formatCurrency(item.price)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {item.preparationTime} phút
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 mr-4">
                              <Label htmlFor={`available-${item.id}`} className="text-xs">
                                Có sẵn
                              </Label>
                              <Switch
                                id={`available-${item.id}`}
                                checked={item.available}
                                onCheckedChange={() => handleToggleAvailability(item.id, item.available)}
                              />
                            </div>

                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {getItemsByCategory(category.id).length === 0 && (
                        <p className="text-center text-muted-foreground py-6">
                          Chưa có món nào trong danh mục này
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="flex-1 p-6 overflow-auto">
            <Card>
              <CardHeader>
                <CardTitle>Danh sách đơn hàng</CardTitle>
                <CardDescription>Tất cả đơn hàng trong hệ thống</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-3">
                    {orders.map(order => (
                      <div key={order.id} className="p-4 bg-slate-50 rounded-lg border">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold">#{order.id.split('-')[1]?.substring(0, 6).toUpperCase()}</p>
                              <Badge variant={
                                order.status === 'new' ? 'default' :
                                  order.status === 'cooking' ? 'secondary' :
                                    order.status === 'ready' ? 'outline' : 'default'
                              }>
                                {order.status === 'new' && 'Mới'}
                                {order.status === 'cooking' && 'Đang nấu'}
                                {order.status === 'ready' && 'Sẵn sàng'}
                                {order.status === 'served' && 'Đã phục vụ'}
                                {order.status === 'cancelled' && 'Đã hủy'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Bàn {order.tableNumber} • {order.serverName}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">{formatCurrency(order.total)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.createdAt).toLocaleString('vi-VN')}
                            </p>
                          </div>
                        </div>

                        <Separator className="my-2" />

                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span>
                                <Badge variant="outline" className="mr-2 text-xs">
                                  x{item.quantity}
                                </Badge>
                                {item.menuItem.nameVi}
                              </span>
                              <span className="text-muted-foreground">
                                {formatCurrency(item.menuItem.price * item.quantity)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {orders.length === 0 && (
                      <p className="text-center text-muted-foreground py-12">
                        Chưa có đơn hàng nào
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Item Dialog */}
      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa món ăn</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin món ăn trong menu
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên tiếng Việt</Label>
                <Input
                  value={editForm.nameVi || ''}
                  onChange={(e) => setEditForm({ ...editForm, nameVi: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tên tiếng Anh</Label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                  <Label>Danh mục</Label>
                  <select
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={editForm.categoryId || ''}
                    onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                <Label>Giá (VNĐ)</Label>
                <Input
                  type="number"
                  value={editForm.price || ''}
                  onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Thời gian (phút)</Label>
                <Input
                  type="number"
                  value={editForm.preparationTime || ''}
                  onChange={(e) => setEditForm({ ...editForm, preparationTime: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Trạng thái</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {editForm.available ? 'Có sẵn' : 'Hết hàng'}
                </span>
                <Switch
                  checked={editForm.available}
                  onCheckedChange={(checked) => setEditForm({ ...editForm, available: checked })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={closeEditDialog}>
                Hủy
              </Button>
              <Button onClick={handleSaveEdit}>
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
