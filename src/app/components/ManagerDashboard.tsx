import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../contexts/MenuContext';
import { useOrders } from '../contexts/OrderContext';
import { MenuItem, OrderStatus } from '../types';
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
import React from 'react';
import { LogOut, Settings, TrendingUp, ShoppingBag, DollarSign, UtensilsCrossed, Edit, Plus, Trash2, BarChart3 } from 'lucide-react';

function toStatusBadge(status: OrderStatus) {
  if (
    status === 'PENDING' ||
    status === 'CONFIRM' ||
    status === 'CREATED' ||
    status === 'KITCHEN_PENDING' ||
    status === 'WAIT_FOR_MENU_CONFIRM'
  )
    return { label: 'Moi', variant: 'default' as const };
  if (status === 'COOKING') return { label: 'Dang nau', variant: 'secondary' as const };
  if (status === 'READY') return { label: 'San sang', variant: 'outline' as const };
  if (status === 'SERVED') return { label: 'Da phuc vu', variant: 'default' as const };
  return { label: 'Tu choi', variant: 'destructive' as const };
}

export function ManagerDashboard() {
  const { user, logout } = useAuth();
  const { menuItems, categories, loading, updateMenuItem, addMenuItem, deleteMenuItem } = useMenu();
  const { orders } = useOrders();

  const [editDialog, setEditDialog] = useState<{ isOpen: boolean; item: MenuItem | null }>({ isOpen: false, item: null });
  const [editForm, setEditForm] = useState<Partial<MenuItem>>({});
  const [createForm, setCreateForm] = useState({ nameVi: '', name: '', categoryId: '', price: 0, preparationTime: 10, description: '', image: '' });

  const menuById = useMemo(() => new Map(menuItems.map((m) => [m.id, m])), [menuItems]);
  const formatCurrency = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  useEffect(() => {
    if (!createForm.categoryId && categories.length > 0) {
      setCreateForm((current) => ({ ...current, categoryId: categories[0].id }));
    }
  }, [categories, createForm.categoryId]);

  const orderTotal = (order: any) => order.items.reduce((sum: number, item: any) => sum + (menuById.get(item.menuItemId)?.price ?? 0) * item.quantity, 0);
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum: number, order: any) => sum + orderTotal(order), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const openEditDialog = (item: MenuItem) => {
    const fallbackCategoryId = item.categoryId ?? categories.find((category) => category.name.toLowerCase().includes(item.category))?.id ?? categories[0]?.id ?? '';
    setEditDialog({ isOpen: true, item });
    setEditForm({ ...item, categoryId: fallbackCategoryId });
  };
  const closeEditDialog = () => { setEditDialog({ isOpen: false, item: null }); setEditForm({}); };

  const handleSaveEdit = async () => {
    if (!editDialog.item) return;
    await updateMenuItem(editDialog.item.id, editForm);
    closeEditDialog();
  };

  const handleToggleAvailability = async (itemId: string, currentStatus: boolean) => {
    await updateMenuItem(itemId, { available: !currentStatus });
  };

  const handleDeleteItem = async (itemId: string) => {
    if (confirm('Ban co chac muon xoa mon nay?')) {
      await deleteMenuItem(itemId);
    }
  };

  const handleAddMenuItem = async () => {
    if (!createForm.nameVi.trim() || !createForm.name.trim() || createForm.price <= 0 || !createForm.categoryId) return;
    await addMenuItem({
      nameVi: createForm.nameVi.trim(), name: createForm.name.trim(), category: 'main', categoryId: createForm.categoryId,
      price: createForm.price, preparationTime: createForm.preparationTime,
      description: createForm.description.trim() || undefined, image: createForm.image.trim() || undefined, available: true,
    });
    setCreateForm({ nameVi: '', name: '', categoryId: categories[0]?.id ?? '', price: 0, preparationTime: 10, description: '', image: '' });
  };

  const getItemsByCategory = (categoryId: string) => menuItems.filter((item) => item.categoryId === categoryId);

  const getOrderStats = () => {
    const itemCounts: { [key: string]: number } = {};
    orders.forEach((order: any) => {
      order.items.forEach((item: any) => {
        itemCounts[item.menuItemId] = (itemCounts[item.menuItemId] || 0) + item.quantity;
      });
    });
    return Object.entries(itemCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([itemId, count]) => ({ item: menuItems.find((m) => m.id === itemId), count })).filter((x) => x.item);
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-8 w-8 text-purple-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manager Dashboard</h1>
              <p className="text-sm text-slate-600">Quan ly he thong - {user?.name}</p>
              <p className="text-xs text-slate-500">{loading ? 'Dang tai menu tu backend...' : 'Menu backend da san sang'}</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Dang xuat</Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="stats" className="h-full flex flex-col">
          <div className="px-6 pt-4">
            <TabsList>
              <TabsTrigger value="stats"><BarChart3 className="h-4 w-4 mr-2" />Thong ke</TabsTrigger>
              <TabsTrigger value="menu"><UtensilsCrossed className="h-4 w-4 mr-2" />Quan ly Menu</TabsTrigger>
              <TabsTrigger value="orders"><ShoppingBag className="h-4 w-4 mr-2" />Don hang</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="stats" className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-6">
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Tong don hang</CardTitle><ShoppingBag className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalOrders}</div><p className="text-xs text-muted-foreground mt-1">Tat ca don hang</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Doanh thu</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div><p className="text-xs text-muted-foreground mt-1">Tong doanh thu</p></CardContent></Card>
                <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Trung binh don</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</div><p className="text-xs text-muted-foreground mt-1">Gia tri trung binh</p></CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle>Mon ban chay</CardTitle><CardDescription>Top 5 mon duoc goi nhieu nhat</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getOrderStats().map(({ item, count }, idx) => (
                      <div key={item?.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3"><Badge variant="outline">{idx + 1}</Badge><div><p className="font-medium">{item?.nameVi}</p><p className="text-sm text-muted-foreground">{item?.name}</p></div></div>
                        <div className="text-right"><p className="font-bold text-lg">{count}</p><p className="text-xs text-muted-foreground">lan goi</p></div>
                      </div>
                    ))}
                    {getOrderStats().length === 0 && <p className="text-center text-muted-foreground py-8">Chua co du lieu</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Phan bo menu</CardTitle><CardDescription>So luong mon theo danh muc</CardDescription></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categories.map((cat) => {
                      const count = getItemsByCategory(cat.id).length;
                      const available = getItemsByCategory(cat.id).filter((i) => i.available).length;
                      return <div key={cat.id} className="flex items-center justify-between"><div><p className="font-medium">{cat.name}</p><p className="text-sm text-muted-foreground">{cat.description || 'Danh muc'}</p></div><div className="text-right"><p className="font-bold">{count} mon</p><p className="text-xs text-green-600">{available} co san</p></div></div>;
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="menu" className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle>Them mon moi</CardTitle><CardDescription>Manager them mon truc tiep vao menu</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Ten tieng Viet</Label><Input value={createForm.nameVi} onChange={(e) => setCreateForm({ ...createForm, nameVi: e.target.value })} placeholder="Vi du: Pho bo" /></div>
                    <div className="space-y-2"><Label>Ten tieng Anh</Label><Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Vi du: Beef Pho" /></div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2"><Label>Danh muc</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={createForm.categoryId} onChange={(e) => setCreateForm({ ...createForm, categoryId: e.target.value })}><option value="">Chon danh muc</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
                    <div className="space-y-2"><Label>Gia (VND)</Label><Input type="number" min={1000} value={createForm.price || ''} onChange={(e) => setCreateForm({ ...createForm, price: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>Thoi gian (phut)</Label><Input type="number" min={1} value={createForm.preparationTime} onChange={(e) => setCreateForm({ ...createForm, preparationTime: Number(e.target.value) })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Anh mon (URL)</Label><Input value={createForm.image} onChange={(e) => setCreateForm({ ...createForm, image: e.target.value })} placeholder="https://..." /></div>
                  <div className="space-y-2"><Label>Mo ta</Label><Input value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Mo ta ngan ve mon" /></div>
                  <div className="flex justify-end"><Button onClick={handleAddMenuItem} disabled={!createForm.nameVi.trim() || !createForm.name.trim() || createForm.price <= 0 || !createForm.categoryId}><Plus className="h-4 w-4 mr-2" />Them mon</Button></div>
                </CardContent>
              </Card>

              {categories.map((category) => (
                <Card key={category.id}>
                  <CardHeader><div className="flex items-center justify-between"><div><CardTitle>{category.name}</CardTitle><CardDescription>{category.description || 'Danh muc'}</CardDescription></div><Badge variant="secondary">{getItemsByCategory(category.id).length} mon</Badge></div></CardHeader>
                  <CardContent><div className="space-y-2">{getItemsByCategory(category.id).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        <div className="h-12 w-12 rounded overflow-hidden border bg-white">{item.image ? <img src={item.image} alt={item.nameVi} className="h-full w-full object-cover" loading="lazy" /> : null}</div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2"><p className="font-medium">{item.nameVi}</p>{!item.available && <Badge variant="destructive" className="text-xs">Het hang</Badge>}</div>
                          <p className="text-sm text-muted-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description || '-'}</p>
                          <div className="flex items-center gap-4 mt-2"><span className="text-sm font-bold text-primary">{formatCurrency(item.price)}</span><span className="text-xs text-muted-foreground">{item.preparationTime} phut</span></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 mr-4"><Label htmlFor={`available-${item.id}`} className="text-xs">Co san</Label><Switch id={`available-${item.id}`} checked={item.available} onCheckedChange={() => handleToggleAvailability(item.id, item.available)} /></div>
                        <Button variant="outline" size="icon" onClick={() => openEditDialog(item)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" onClick={() => handleDeleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}{getItemsByCategory(category.id).length === 0 && <p className="text-center text-muted-foreground py-6">Chua co mon nao trong danh muc nay</p>}</div></CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="flex-1 p-6 overflow-auto">
            <Card>
              <CardHeader><CardTitle>Danh sach don hang</CardTitle><CardDescription>Tat ca don hang trong he thong</CardDescription></CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]"><div className="space-y-3">{orders.map((order: any) => { const total = orderTotal(order); const s = toStatusBadge(order.status as OrderStatus); return (
                  <div key={order.id} className="p-4 bg-slate-50 rounded-lg border">
                    <div className="flex items-start justify-between mb-3"><div><div className="flex items-center gap-2"><p className="font-bold">#{String(order.id)}</p><Badge variant={s.variant}>{s.label}</Badge></div><p className="text-sm text-muted-foreground mt-1">Ban {order.tableNumber} • {order.staffName}</p></div><div className="text-right"><p className="font-bold text-lg text-primary">{formatCurrency(total)}</p><p className="text-xs text-muted-foreground">{new Date(order.timestamp).toLocaleString('vi-VN')}</p></div></div>
                    <Separator className="my-2" />
                    <div className="space-y-1">{order.items.map((item: any) => { const menu = menuById.get(item.menuItemId); const price = menu?.price ?? 0; return (
                      <div key={item.id} className="flex items-center justify-between text-sm gap-3">
                        <div className="flex items-center gap-2 min-w-0"><div className="h-10 w-10 rounded overflow-hidden border bg-white">{menu?.image ? <img src={menu.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" /> : null}</div><div className="min-w-0"><p className="truncate"><Badge variant="outline" className="mr-2 text-xs">x{item.quantity}</Badge>{item.name}</p><p className="text-xs text-muted-foreground truncate">{menu?.description || '-'}</p></div></div>
                        <span className="text-muted-foreground">{formatCurrency(price * item.quantity)}</span>
                      </div>
                    ); })}</div>
                  </div>
                ); })}{orders.length === 0 && <p className="text-center text-muted-foreground py-12">Chua co don hang nao</p>}</div></ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={editDialog.isOpen} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chinh sua mon an</DialogTitle><DialogDescription>Cap nhat thong tin mon an trong menu</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Ten tieng Viet</Label><Input value={editForm.nameVi || ''} onChange={(e) => setEditForm({ ...editForm, nameVi: e.target.value })} /></div>
              <div className="space-y-2"><Label>Ten tieng Anh</Label><Input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Danh muc</Label><select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={editForm.categoryId || ''} onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}><option value="">Chon danh muc</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
              <div className="space-y-2"><Label>Gia (VND)</Label><Input type="number" value={editForm.price || ''} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} /></div>
              <div className="space-y-2"><Label>Thoi gian (phut)</Label><Input type="number" value={editForm.preparationTime || ''} onChange={(e) => setEditForm({ ...editForm, preparationTime: Number(e.target.value) })} /></div>
            </div>
            <div className="space-y-2"><Label>Anh mon (URL)</Label><Input value={editForm.image || ''} onChange={(e) => setEditForm({ ...editForm, image: e.target.value })} /></div>
            <div className="space-y-2"><Label>Mo ta</Label><Input value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} /></div>
            <div className="flex items-center justify-between"><Label>Trang thai</Label><div className="flex items-center gap-2"><span className="text-sm text-muted-foreground">{editForm.available ? 'Co san' : 'Het hang'}</span><Switch checked={editForm.available} onCheckedChange={(checked) => setEditForm({ ...editForm, available: checked })} /></div></div>
            <div className="flex gap-2 justify-end"><Button variant="outline" onClick={closeEditDialog}>Huy</Button><Button onClick={handleSaveEdit}>Luu thay doi</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
