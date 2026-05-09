// ChefDashboard.tsx
import { useAuth } from "../contexts/AuthContext";
import { OrderStatus, KitchenTicket, KitchenTicketStatus } from "../types";
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
import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { kdsApi } from "../services/kdsApi";
import { kdsWebSocketService } from "../services/kdsWebSocket";
import { getWebSocketUrl } from "../config/config";

export function ChefDashboard() {
  const { user, logout } = useAuth();

  // State cho KDS
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [wsError, setWsError] = useState<string | null>(null);

  // Fetch active tickets từ API
  const fetchActiveTickets = async () => {
    setIsLoading(true);
    try {
      const data = await kdsApi.getActiveTickets();
      if (data.length > 0) {
      }
      setTickets(data);
    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  // Update ticket status
  // Trong updateTicketStatus
  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      await kdsApi.updateTicketStatus(ticketId, newStatus);
      console.log(`Ticket ${ticketId} updated to ${newStatus}`);

      // Fetch lại danh sách
      await fetchActiveTickets();
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  // Connect WebSocket
  const connectWebSocket = () => {
    kdsWebSocketService.connect({
      url: getWebSocketUrl(),
      onNewTicket: (ticket: KitchenTicket) => {
        console.log("New ticket received:", ticket);
        setTickets((prev) => [...prev, ticket]);
      },
      onTicketUpdate: (ticket: KitchenTicket) => {
        console.log("Ticket update received:", ticket);
        setTickets((prev) => {
          const exists = prev.some((t) => t.id === ticket.id);
          if (exists) {
            return prev.map((t) => (t.id === ticket.id ? ticket : t));
          } else {
            return [...prev, ticket];
          }
        });
      },
      onCompletedTicket: (ticketId: string) => {
        console.log("Ticket completed:", ticketId);
        setTickets((prev) =>
          prev.map((ticket) =>
            ticket.id === ticketId
              ? {
                  ...ticket,
                  status: "READY" as KitchenTicketStatus,
                  completedAt: new Date().toISOString(),
                }
              : ticket,
          ),
        );
      },
      onConnectionChange: (connected: boolean) => {
        console.log("WebSocket connection changed:", connected);
        setWsConnected(connected);
      },
    });
  };

  // Disconnect WebSocket
  const disconnectWebSocket = () => {
    kdsWebSocketService.disconnect();
    setWsConnected(false);
  };

  // Load data on component mount
  useEffect(() => {
    fetchActiveTickets();
    connectWebSocket();

    return () => {
      disconnectWebSocket();
    };
  }, []);

  // Filter tickets by status
  const newTickets = tickets.filter(
    (t) => t.status === "PENDING" || t.status === "KITCHEN_PENDING",
  );
  const cookingTickets = tickets.filter(
    (t) => t.status === "COOKING" || t.status === "KITCHEN_COOKING",
  );
  const readyTickets = tickets.filter(
    (t) => t.status === "READY" || t.status === "KITCHEN_READY",
  );

  console.log("Dashboard stats:", {
    total: tickets.length,
    new: newTickets.length,
    cooking: cookingTickets.length,
    ready: readyTickets.length,
    tickets: tickets,
  });

  const isOverdue = (ticket: KitchenTicket) => {
    const ticketDate = new Date(ticket.receivedAt);
    const minutesElapsed = (Date.now() - ticketDate.getTime()) / 1000 / 60;
    return minutesElapsed > 20;
  };

  const getTimeElapsed = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      locale: vi,
      addSuffix: true,
    });
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "KITCHEN_PENDING":
      case "PENDING":
        return "Mới";

      case "COOKING":
        return "Đang nấu";
      case "READY":
        return "Sẵn sàng";
      case "SERVED":
        return "Đã phục vụ";
      default:
        return status;
    }
  };

  const TicketCard = ({ ticket }: { ticket: KitchenTicket }) => {
    const overdue = isOverdue(ticket);
    const totalItems = ticket.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const orderIdDisplay = `#${ticket.id}`;

    return (
      <Card className={overdue ? "border-red-500 border-2" : ""}>
        <CardHeader className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-4 w-4" />
                {orderIdDisplay}
                {overdue && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Bàn {ticket.tableNumber} • {totalItems} món •{" "}
                {getStatusDisplay(ticket.status)}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {ticket.waiterId}
              </div>
              <div
                className={`flex items-center gap-1 text-xs mt-1 ${overdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}
              >
                <Clock className="h-3 w-3" />
                {getTimeElapsed(ticket.receivedAt)}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-0 space-y-3">
          {/* Order Items */}
          <div className="space-y-2">
            {ticket.items.map((item, idx) => (
              <div key={idx} className="bg-slate-50 rounded p-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        x{item.quantity}
                      </Badge>
                      <span className="font-medium text-sm">
                        {item.itemName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customizations/Notes */}
                {item.customizations && item.customizations.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {item.customizations.map((note, noteIdx) => (
                      <div
                        key={noteIdx}
                        className="text-xs p-1.5 rounded bg-blue-100 text-blue-800"
                      >
                        {note}
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
            {(ticket.status === "PENDING" ||
              ticket.status === "KITCHEN_PENDING") && (
              <Button
                className="w-full"
                onClick={() => updateTicketStatus(ticket.id, "COOKING")}
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Bắt đầu nấu
              </Button>
            )}

            {(ticket.status === "COOKING" ||
              ticket.status === "KITCHEN_COOKING") && (
              <Button
                className="w-full"
                variant="default"
                onClick={() => updateTicketStatus(ticket.id, "READY")}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Hoàn thành
              </Button>
            )}

            {(ticket.status === "READY" ||
              ticket.status === "KITCHEN_READY") && (
              <Button className="w-full" variant="outline" disabled>
                <CheckCircle className="h-4 w-4 mr-2" />
                Đang chờ phục vụ
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
    tickets,
    color,
  }: {
    title: string;
    icon: any;
    count: number;
    tickets: KitchenTicket[];
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
          {tickets.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Icon className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Không có đơn hàng</p>
            </div>
          ) : (
            tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))
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
          <div>
            <div className="flex items-center gap-3">
              <ChefHat className="h-8 w-8 text-orange-500" />
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Màn hình nhà bếp
                </h1>
                <p className="text-sm text-slate-600">
                  Màn hình bếp - {user?.name}
                  {wsConnected ? (
                    <span className="ml-2 text-green-600 text-xs">
                      ● Đã kết nối
                    </span>
                  ) : (
                    <span className="ml-2 text-red-600 text-xs">
                      ● Mất kết nối
                    </span>
                  )}
                </p>
                {wsError && (
                  <p className="text-xs text-red-600 mt-1">{wsError}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="flex items-center gap-6 bg-slate-50 px-6 py-3 rounded-lg border">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {newTickets.length}
                </div>
                <div className="text-xs text-muted-foreground">Đơn mới</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {cookingTickets.length}
                </div>
                <div className="text-xs text-muted-foreground">Đang nấu</div>
              </div>
              <Separator orientation="vertical" className="h-10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {readyTickets.length}
                </div>
                <div className="text-xs text-muted-foreground">Sẵn sàng</div>
              </div>
            </div>

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
          count={newTickets.length}
          tickets={newTickets}
          color="text-blue-600"
        />

        <KanbanColumn
          title="Đang nấu"
          icon={Flame}
          count={cookingTickets.length}
          tickets={cookingTickets}
          color="text-orange-600"
        />

        <KanbanColumn
          title="Sẵn sàng"
          icon={CheckCircle}
          count={readyTickets.length}
          tickets={readyTickets}
          color="text-green-600"
        />
      </div>
    </div>
  );
}
