// client/src/pages/pos.tsx
import { useState, useEffect, useCallback } from "react"; // Thêm useCallback
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import TableGrid from "@/components/table-grid";
import OrderPanel from "@/components/order-panel";
import RevenueModal from "@/components/revenue-modal";
import AdminPanel from "@/components/admin-panel";
import MenuPage from "@/pages/menu-page";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import {
  Utensils,
  ShoppingCart,
  Settings,
  Phone,
  MessageCircle,
  TrendingUp,
  Table as TableIcon,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Table, Order as OrderType, OrderItem as OrderItemType } from "@shared/schema";

export default function PosPage() {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isRevenueOpen, setIsRevenueOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tables' | 'menu'>('tables');
  const [orderToPassToMenuPage, setOrderToPassToMenuPage] = useState<OrderType | null | undefined>(undefined);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: tables = [], isLoading: isLoadingTables } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
  });

  const {
    data: activeOrderForPanel,
    isLoading: isLoadingActiveOrderForPanel,
    refetch: refetchActiveOrderForPanel, // Lấy hàm refetch
  } = useQuery<OrderType & { items: OrderItemType[] } | null>({
    queryKey: ["/api/tables", selectedTableId, "active-order"],
    enabled: selectedTableId !== null && viewMode === 'tables',
    staleTime: 1000, // Giữ staleTime thấp để dễ dàng refetch
    // refetchOnMount: false, // Để useEffect kiểm soát việc refetch khi quay lại view
    // refetchOnWindowFocus: false,
  });

  const { data: dailyRevenueData } = useQuery<{revenue: number}>({
    queryKey: ["/api/revenue/daily"],
  });

  const createOrderMutation = useMutation<OrderType, Error, any>({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: (newOrderData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      if (selectedTableId) {
        queryClient.setQueryData(["/api/tables", selectedTableId, "active-order"], newOrderData);
      }
      toast({
        title: "Đơn hàng mới",
        description: `Đã tạo đơn hàng mới cho bàn ${newOrderData.tableName}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi tạo đơn",
        description: error.message || "Không thể tạo đơn hàng mới.",
        variant: "destructive",
      });
    }
  });

  const completeOrderMutation = useMutation<OrderType, Error, number>({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("PUT", `/api/orders/${orderId}/complete`);
      return response.json();
    },
    onSuccess: (completedOrderData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revenue/daily"] });
      if (selectedTableId) {
         queryClient.setQueryData(["/api/tables", selectedTableId, "active-order"], null);
      }
      setSelectedTableId(null);
      setOrderToPassToMenuPage(null);
      toast({
        title: "Thanh toán thành công",
        description: `Đã hoàn tất đơn hàng cho bàn ${completedOrderData.tableName}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi thanh toán",
        description: error.message || "Không thể hoàn tất đơn hàng.",
        variant: "destructive",
      });
    }
  });

  const handleTableSelect = useCallback((tableId: number) => {
    setSelectedTableId(tableId);
    // queryClient.invalidateQueries({ queryKey: ["/api/tables", tableId, "active-order"] });
    // Việc invalidate ở đây có thể không cần thiết nếu selectedTableId thay đổi sẽ trigger useQuery
  }, [queryClient]);

  useEffect(() => {
    if (viewMode === 'tables' && selectedTableId !== null) {
      console.log(`PosPage: View is 'tables' and selectedTableId is ${selectedTableId}. Refetching active order.`);
      refetchActiveOrderForPanel();
    }
  }, [viewMode, selectedTableId, refetchActiveOrderForPanel]);

  const handleOpenMenuPage = async () => {
    let orderForMenu: OrderType | null = null;

    if (!selectedTableId) {
      setOrderToPassToMenuPage(null);
      setViewMode('menu');
      return;
    }

    const table = tables.find((t) => t.id === selectedTableId);
    if (!table) {
      toast({ title: "Lỗi bàn", description: "Không tìm thấy thông tin bàn đã chọn.", variant: "destructive" });
      return;
    }

    // Luôn cố gắng fetch lại để có dữ liệu mới nhất trước khi sang MenuPage,
    // trừ khi cache được coi là rất mới.
    // Hoặc có thể luôn invalidate trước khi fetch.
    // queryClient.invalidateQueries({ queryKey: ["/api/tables", table.id, "active-order"]});
    
    try {
      const response = await apiRequest("GET", `/api/tables/${table.id}/active-order`);
      const existingOrder = await response.json();
      if (existingOrder && existingOrder.id) {
        orderForMenu = existingOrder;
        queryClient.setQueryData(["/api/tables", table.id, "active-order"], existingOrder);
      } else {
        console.log(`PosPage: No active order for table ${table.id}, creating new one.`);
        orderForMenu = await createOrderMutation.mutateAsync({
          tableId: table.id,
          tableName: table.name,
          status: "active",
          total: 0,
        });
      }
    } catch (error: any) {
      if (error.message && error.message.includes("404")) {
        try {
          console.log(`PosPage: API 404 for active order (table ${table.id}), creating new one.`);
          orderForMenu = await createOrderMutation.mutateAsync({
            tableId: table.id,
            tableName: table.name,
            status: "active",
            total: 0,
          });
        } catch (createError) {
          console.error("Error creating new order after API 404:", createError);
          toast({ title: "Lỗi tạo đơn", description: "Không thể tạo đơn hàng mới cho bàn này.", variant: "destructive" });
          return;
        }
      } else {
        console.error("Error fetching/creating active order for menu:", error);
        toast({ title: "Lỗi tải/tạo đơn hàng", description: "Không thể chuẩn bị đơn hàng để vào thực đơn.", variant: "destructive" });
        return;
      }
    }
    
    console.log("PosPage: Passing to MenuPage:", { tableId: selectedTableId, order: orderForMenu });
    setOrderToPassToMenuPage(orderForMenu);
    setViewMode('menu');
  };

  const handleGoBackToTables = useCallback(() => {
    setViewMode('tables');
    // Không reset selectedTableId để OrderPanel có thể refetch đúng bàn
    // orderToPassToMenuPage sẽ tự động không được dùng vì viewMode thay đổi
    // setOrderToPassToMenuPage(undefined); // Không cần thiết nếu MenuPage không render khi viewMode là tables
  }, [setViewMode]);

  const handleCheckout = async () => {
    if (!activeOrderForPanel || !activeOrderForPanel.id) {
      toast({ title: "Lỗi", description: "Không có đơn hàng nào để thanh toán.", variant: "destructive" });
      return;
    };
    await completeOrderMutation.mutateAsync(activeOrderForPanel.id);
  };

  const dailyRevenue = dailyRevenueData?.revenue || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Utensils className="h-6 w-6" />
              <h1 className="text-xl font-bold">KiotViet Bar</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white bg-opacity-20 hover:bg-opacity-30"
                onClick={handleGoBackToTables}
              >
                <TableIcon className="h-4 w-4 mr-2" />
                Phòng bàn
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-10"
                onClick={handleOpenMenuPage}
                disabled={viewMode === 'menu'}
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                Thực đơn
              </Button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right text-sm">
              <div className="opacity-90">Admin</div>
              <div className="opacity-75 text-xs">Phiên bản 2.6.1</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="bg-white bg-opacity-20 hover:bg-opacity-30"
              onClick={() => setIsAdminOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'tables' ? (
          <>
            <div className="flex-1 p-6 overflow-y-auto">
              <TableGrid
                tables={tables}
                selectedTableId={selectedTableId}
                onTableSelect={handleTableSelect}
              />
            </div>
            <div className="w-96 bg-white border-l border-gray-200 shrink-0">
              <OrderPanel
                selectedTable={selectedTableId ? tables.find(t => t.id === selectedTableId) : null}
                activeOrder={activeOrderForPanel}
                onOpenMenu={handleOpenMenuPage}
                onCheckout={handleCheckout}
                isCheckingOut={completeOrderMutation.isPending}
              />
            </div>
          </>
        ) : (
          orderToPassToMenuPage !== undefined && (
            <MenuPage
              tableId={selectedTableId}
              initialOrder={orderToPassToMenuPage}
              onGoBack={handleGoBackToTables}
            />
          )
        )}
      </div>

      <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-green-400" />
            <span>Lẫn bay 6929</span>
          </div>
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-4 w-4 text-blue-400" />
            <span>Ghi chân chích</span>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <span>Doanh thu: <strong>{formatVND(dailyRevenue)}</strong></span>
          <Button
            variant="ghost"
            size="sm"
            className="bg-white bg-opacity-20 hover:bg-opacity-30"
            onClick={() => setIsRevenueOpen(true)}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Báo cáo
          </Button>
        </div>
      </div>

      <RevenueModal isOpen={isRevenueOpen} onClose={() => setIsRevenueOpen(false)} />
      <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
    </div>
  );
}