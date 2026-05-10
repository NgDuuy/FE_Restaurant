import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useKDS } from "../contexts/KdsContext";
import { useMenu } from "../contexts/MenuContext";
import { KitchenTicket, OrderStatus } from "../types";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import {
  LogOut,
  Clock,
  ChefHat,
  PlayCircle,
  Flame,
  CheckCircle,
} from "lucide-react";

const NEW_STATUSES: OrderStatus[] = ['KITCHEN_PENDING', 'PENDING', 'CONFIRM', 'CREATED'];
const COOKING_STATUSES: OrderStatus[] = ['COOKING'];
const READY_STATUSES: OrderStatus[] = ['READY'];
const DONE_STATUSES: OrderStatus[] = ['SERVED', 'REJECT'];

function statusLabel(status: OrderStatus): string {
  if (status === 'KITCHEN_PENDING') return 'Pending';
  if (status === 'PENDING') return 'Pending';
  if (status === 'CONFIRM') return 'Confirm';
  if (status === 'CREATED') return 'Created';
  if (status === 'COOKING') return 'Cooking';
  if (status === 'READY') return 'Ready';
  if (status === 'SERVED') return 'Served';
  return 'Rejected';
}

export function ChefDashboard() {
  const { user, logout } = useAuth();
  const { tickets, fetchActiveTickets, updateTicketStatus, wsConnected } = useKDS();
  const { menuItems } = useMenu();

  // State saves tickets that have reached READY or DONE
  const [completedTickets, setCompletedTickets] = useState<KitchenTicket[]>([]);

  useEffect(() => {
    void fetchActiveTickets();
  }, [fetchActiveTickets]);

  useEffect(() => {
    const currentTickets = Array.from(tickets.values());
    
    const newCompleted = currentTickets.filter(
      (t) => READY_STATUSES.includes(t.status) || DONE_STATUSES.includes(t.status)
    );
    
    setCompletedTickets((prev) => {
      const existingIds = new Set(prev.map(t => t.id));
      const added = newCompleted.filter(t => !existingIds.has(t.id));
      return [...prev, ...added];
    });
  }, [tickets]);

  const activeTickets = Array.from(tickets.values()).filter(
    (t) => !READY_STATUSES.includes(t.status) && !DONE_STATUSES.includes(t.status)
  );
  
  const newOrders = activeTickets.filter((t) => NEW_STATUSES.includes(t.status));
  const cookingOrders = activeTickets.filter((t) => COOKING_STATUSES.includes(t.status));
  
  const readyOrders = completedTickets.filter((t) => READY_STATUSES.includes(t.status));
  const doneOrders = completedTickets.filter((t) => DONE_STATUSES.includes(t.status));

  const changeStatus = async (ticket: KitchenTicket, status: OrderStatus) => {
    if (status === 'READY' || status === 'SERVED' || status === 'REJECT') {
      setCompletedTickets((prev) => {
        const exists = prev.some(t => t.id === ticket.id);
        if (!exists) {
          return [...prev, { ...ticket, status }];
        }
        return prev.map(t => t.id === ticket.id ? { ...ticket, status } : t);
      });
    }
    
    await updateTicketStatus(ticket.id, status);
  };

  const getTimeElapsed = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      locale: vi,
      addSuffix: true,
    });
  };

  const OrderCard = ({ ticket }: { ticket: KitchenTicket }) => (
    <Card>
      <CardHeader className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">Order #{ticket.id}</CardTitle>
            <CardDescription className="text-xs mt-1">
              Table {ticket.tableNumber} - Staff: {ticket.waiterId}
            </CardDescription>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <Badge variant="outline">{statusLabel(ticket.status)}</Badge>
            <div className="mt-2">
              {new Date(ticket.receivedAt).toLocaleString("vi-VN")}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="grid grid-cols-5 text-xs font-medium text-muted-foreground border-b pb-1">
          <span>Image</span>
          <span>Item</span>
          <span>Qty</span>
          <span>Description</span>
          <span>Notes</span>
        </div>
        <ScrollArea className="h-48">
          <div className="space-y-1 pr-2">
            {ticket.items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-5 gap-2 text-sm bg-slate-50 rounded p-2 items-center"
              >
                <div className="h-12 w-12 overflow-hidden rounded border bg-white">
                  {menuById.get(item.menuItemId)?.image ? (
                    <img
                      src={menuById.get(item.menuItemId)?.image}
                      alt={item.itemName}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-[10px] text-slate-400">
                      No Img
                    </div>
                  )}
                </div>
                <span className="truncate">{item.itemName}</span>
                <span>x{item.quantity}</span>
                <span className="truncate">
                  {menuById.get(item.menuItemId)?.description || "-"}
                </span>
                <span className="truncate">
                  {item.customizations?.join(", ") ||
                    item.notes?.join(", ") ||
                    "-"}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>

        <Separator />
        {NEW_STATUSES.includes(ticket.status) && (
          <Button className="w-full" onClick={() => changeStatus(ticket, "COOKING")}>
            <PlayCircle className="h-4 w-4 mr-2" />
            Start Cooking
          </Button>
        )}
        {ticket.status === "COOKING" && (
          <Button className="w-full" onClick={() => changeStatus(ticket, "READY")}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark Ready
          </Button>
        )}
        {ticket.status === "READY" && (
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full" onClick={() => changeStatus(ticket, "SERVED")}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark Served
            </Button>
            <Button className="w-full" variant="destructive" onClick={() => changeStatus(ticket, "REJECT")}>
              Reject
            </Button>
          </div>

  const Column = ({
    title,
    count,
    data,
    icon: Icon,
    color,
  }: {
    title: string;
    count: number;
    data: KitchenTicket[];
    icon: any;
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
            <p className="text-sm text-muted-foreground text-center py-8">
              No orders
            </p>
          ) : (
            data.map((o) => <OrderCard key={o.id} ticket={o} />)
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (isLoading && tickets.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <ChefHat className="h-12 w-12 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Đang tải đơn hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChefHat className="h-8 w-8 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Kitchen Orders
              </h1>
              <p className="text-sm text-slate-600">
                Chef: {user?.name} {wsConnected ? "🟢" : "🔴"}
              </p>
            </div>

            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Đăng xuất
            </Button>
          </div>
          <Button
            variant="outline"
            onClick={() => void fetchActiveTickets()}
            className="mr-2"
          >
            Refresh
          </Button>
          <Button variant="outline" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 min-w-[1280px] grid grid-cols-4 gap-6">
          <Column
            title="New"
            icon={Clock}
            count={newOrders.length}
            data={newOrders}
            color="text-blue-600"
          />
          <Column
            title="Cooking"
            icon={Flame}
            count={cookingOrders.length}
            data={cookingOrders}
            color="text-orange-600"
          />
          <Column
            title="Ready"
            icon={CheckCircle}
            count={readyOrders.length}
            data={readyOrders}
            color="text-green-600"
          />
          <Column
            title="Done"
            icon={CheckCircle}
            count={doneOrders.length}
            data={doneOrders}
            color="text-slate-600"
          />
        </div>
      </ScrollArea>
    </div>
  );
}
