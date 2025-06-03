// client/src/pages/pos.tsx
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import TableGrid from "@/components/table-grid";
import OrderPanel from "@/components/order-panel";
import RevenueModal from "@/components/revenue-modal";
import AdminPanel from "@/components/admin-panel";
import MenuPage from "@/pages/menu-page"; // Import MenuPage as a component
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import {
  Utensils,
  ShoppingCart,
  BarChart3,
  Settings,
  Phone,
  MessageCircle,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast"; // Import useToast

export default function PosPage() {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isRevenueOpen, setIsRevenueOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'tables' | 'menu'>('tables'); // State to control view mode
  const [orderToPassToMenuPage, setOrderToPassToMenuPage] = useState<any>(null); // State to pass order to MenuPage
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch tables
  const { data: tables = [], isLoading: isLoadingTables } = useQuery({ // Added isLoadingTables
    queryKey: ["/api/tables"],
  });

  // Fetch active order for selected table (used by OrderPanel)
  const { data: activeOrderForPanel, isLoading: isLoadingActiveOrderForPanel } = useQuery({
    queryKey: ["/api/tables", selectedTableId, "active-order"],
    enabled: selectedTableId !== null && viewMode === 'tables', // Only fetch if viewing tables
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds
  });

  // Fetch daily revenue
  const { data: dailyRevenueData } = useQuery({
    queryKey: ["/api/revenue/daily"],
  });

  // Create order mutation (used when a table needs an order to go to menu)
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: (newOrderData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] }); // Update table status
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); // Update all orders
      // Set the order data directly into cache for the current selected table
      queryClient.setQueryData(["/api/tables", selectedTableId, "active-order"], newOrderData);

      setOrderToPassToMenuPage(newOrderData); // Pass the newly created order
      setViewMode('menu'); // Switch to menu view after order is created
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

  // Complete order mutation
  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("PUT", `/api/orders/${orderId}/complete`);
      return response.json();
    },
    onSuccess: (completedOrderData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] }); // Update table status (e.g., from occupied to available)
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] }); // Update orders list
      queryClient.invalidateQueries({ queryKey: ["/api/revenue/daily"] }); // Update revenue
      // Remove the completed order from cache
      queryClient.setQueryData(["/api/tables", selectedTableId, "active-order"], undefined);
      
      setSelectedTableId(null); // Deselect table after checkout
      setOrderToPassToMenuPage(null); // Clear order data for menu page
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

  const selectedTable = tables.find((table: any) => table.id === selectedTableId);

  // handleTableSelect: Only selects table, updates OrderPanel. DOES NOT switch to menu.
  const handleTableSelect = async (tableId: number) => {
    setSelectedTableId(tableId);
    // Invalidate and refetch active order for OrderPanel to update immediately
    // This will cause activeOrderForPanel query to refetch if viewMode is 'tables'
    queryClient.invalidateQueries({ queryKey: ["/api/tables", tableId, "active-order"] });
  };

  // handleOpenMenuPage: Explicitly switches to menu view AFTER ensuring an active order.
  const handleOpenMenuPage = async () => {
    // If no table is selected, toast and return
    if (!selectedTableId) {
      toast({
        title: "Vui lòng chọn bàn",
        description: "Bạn cần chọn một bàn trước khi vào thực đơn.",
        variant: "default",
      });
      return;
    }

    const table = tables.find((t: any) => t.id === selectedTableId);
    if (!table) {
      toast({
        title: "Lỗi bàn",
        description: "Không tìm thấy thông tin bàn đã chọn.",
        variant: "destructive",
      });
      return;
    }

    // Try to get active order from cache first for immediate pass
    const cachedActiveOrder = queryClient.getQueryData(["/api/tables", table.id, "active-order"]);

    if (cachedActiveOrder) {
      // If active order exists in cache, use it immediately
      setOrderToPassToMenuPage(cachedActiveOrder);
      setViewMode('menu');
    } else {
      // If not in cache, fetch it. If it doesn't exist, create it.
      // This will set the order and switch viewMode in createOrderMutation.onSuccess
      // or setOrderToPassToMenuPage and setViewMode if fetched directly
      try {
        const response = await apiRequest("GET", `/api/tables/${table.id}/active-order`);
        const existingOrder = await response.json();

        if (existingOrder) {
          setOrderToPassToMenuPage(existingOrder);
          setViewMode('menu');
        } else {
          // No existing order, so create one. createOrderMutation.onSuccess will handle view switch.
          await createOrderMutation.mutateAsync({
            tableId: table.id,
            tableName: table.name,
            status: "active",
            total: 0,
          });
        }
      } catch (error) {
        console.error("Error preparing order for menu page:", error);
        toast({
          title: "Lỗi",
          description: "Không thể tải hoặc tạo đơn hàng để vào thực đơn.",
          variant: "destructive",
        });
      }
    }
  };

  // Callback from MenuPage to go back to table view
  const handleGoBackToTables = () => {
    setSelectedTableId(null); // Deselect table when going back
    setOrderToPassToMenuPage(null); // Clear order when going back
    setViewMode('tables');
  };

  const handleCheckout = async () => {
    if (!activeOrderForPanel || !activeOrderForPanel.id) {
      toast({
        title: "Lỗi",
        description: "Không có đơn hàng nào để thanh toán.",
        variant: "destructive",
      });
      return;
    };

    try {
      await completeOrderMutation.mutateAsync(activeOrderForPanel.id);
    } catch (error) {
      console.error("Error completing order:", error);
    }
  };

  const dailyRevenue = dailyRevenueData?.revenue || 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
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
                onClick={handleGoBackToTables} // Button to switch to table view
                disabled={viewMode === 'tables'}
              >
                <Utensils className="h-4 w-4 mr-2" />
                Phòng bàn
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white hover:bg-opacity-10"
                onClick={handleOpenMenuPage} // Button to switch to menu view
                disabled={viewMode === 'menu'} // Disable if already in menu view
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

      {/* Main Content Area: Conditional Rendering */}
      <div className="flex h-[calc(100vh-140px)] overflow-hidden">
        {viewMode === 'tables' ? (
          <>
            {/* Table Grid */}
            <div className="flex-1 p-6 overflow-y-auto">
              <TableGrid
                tables={tables}
                selectedTableId={selectedTableId}
                onTableSelect={handleTableSelect}
              />
            </div>

            {/* Order Panel */}
            <div className="w-96 bg-white border-l border-gray-200">
              <OrderPanel
                selectedTable={selectedTableId ? tables.find(t => t.id === selectedTableId) : null}
                activeOrder={activeOrderForPanel}
                onOpenMenu={handleOpenMenuPage} // Now a button to switch to menu view
                onCheckout={handleCheckout}
                isCheckingOut={completeOrderMutation.isPending}
              />
            </div>
          </>
        ) : (
          <MenuPage
            tableId={selectedTableId}
            initialOrder={orderToPassToMenuPage} // Pass the order object directly
            onGoBack={handleGoBackToTables} // Pass callback to go back
          />
        )}
      </div>

      {/* Footer Status Bar */}
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

      {/* Revenue Modal */}
      <RevenueModal
        isOpen={isRevenueOpen}
        onClose={() => setIsRevenueOpen(false)}
      />

      {/* Admin Panel */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
      />
    </div>
  );
}