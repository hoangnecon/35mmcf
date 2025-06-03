import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import TableGrid from "@/components/table-grid";
import OrderPanel from "@/components/order-panel";
import MenuModal from "@/components/menu-modal";
import RevenueModal from "@/components/revenue-modal";
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

export default function PosPage() {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRevenueOpen, setIsRevenueOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch tables
  const { data: tables = [] } = useQuery({
    queryKey: ["/api/tables"],
  });

  // Fetch menu items
  const { data: menuItems = [] } = useQuery({
    queryKey: ["/api/menu-items"],
  });

  // Fetch active order for selected table
  const { data: activeOrder } = useQuery({
    queryKey: ["/api/tables", selectedTableId, "active-order"],
    enabled: selectedTableId !== null,
  });

  // Fetch daily revenue
  const { data: dailyRevenueData } = useQuery({
    queryKey: ["/api/revenue/daily"],
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    },
  });

  // Add item to order mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ orderId, item }: { orderId: number; item: any }) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/items`, item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", selectedTableId, "active-order"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revenue/daily"] });
    },
  });

  // Complete order mutation
  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest("PUT", `/api/orders/${orderId}/complete`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revenue/daily"] });
      setSelectedTableId(null);
    },
  });

  const selectedTable = tables.find((table: any) => table.id === selectedTableId);

  const handleTableSelect = async (tableId: number) => {
    setSelectedTableId(tableId);
    
    // Check if table has an active order, if not create one
    const table = tables.find((t: any) => t.id === tableId);
    if (table) {
      try {
        const response = await fetch(`/api/tables/${tableId}/active-order`);
        const existingOrder = await response.json();
        
        if (!existingOrder) {
          // Create new order for this table
          await createOrderMutation.mutateAsync({
            tableId: table.id,
            tableName: table.name,
            status: "active",
            total: 0,
          });
        }
      } catch (error) {
        console.error("Error handling table selection:", error);
      }
    }
  };

  const handleAddMenuItem = async (menuItem: any) => {
    if (!activeOrder || !activeOrder.id) {
      console.error("No active order available");
      return;
    }

    const orderItem = {
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity: 1,
      unitPrice: menuItem.price,
      totalPrice: menuItem.price,
      note: "",
    };

    try {
      await addItemMutation.mutateAsync({
        orderId: activeOrder.id,
        item: orderItem,
      });
      setIsMenuOpen(false);
    } catch (error) {
      console.error("Error adding menu item:", error);
    }
  };

  const handleCheckout = async () => {
    if (!activeOrder) return;

    try {
      await completeOrderMutation.mutateAsync(activeOrder.id);
    } catch (error) {
      console.error("Error completing order:", error);
    }
  };

  const dailyRevenue = dailyRevenueData?.revenue || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Utensils className="h-6 w-6" />
              <h1 className="text-xl font-bold">KiotViet Bar</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Button variant="secondary" size="sm" className="bg-white bg-opacity-20 hover:bg-opacity-30">
                <Utensils className="h-4 w-4 mr-2" />
                Phòng bàn
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white hover:bg-opacity-10">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Thực đơn
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white hover:bg-opacity-10">
                <BarChart3 className="h-4 w-4 mr-2" />
                Tín miền (93)
              </Button>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right text-sm">
              <div className="opacity-90">Admin</div>
              <div className="opacity-75 text-xs">Phiên bàn 2.6.1</div>
            </div>
            <Button variant="ghost" size="sm" className="bg-white bg-opacity-20 hover:bg-opacity-30">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-140px)] overflow-hidden">
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
            selectedTable={selectedTable}
            activeOrder={activeOrder}
            onOpenMenu={() => setIsMenuOpen(true)}
            onCheckout={handleCheckout}
            isCheckingOut={completeOrderMutation.isPending}
          />
        </div>
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

      {/* Menu Modal */}
      <MenuModal
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        menuItems={menuItems}
        onAddItem={handleAddMenuItem}
      />

      {/* Revenue Modal */}
      <RevenueModal
        isOpen={isRevenueOpen}
        onClose={() => setIsRevenueOpen(false)}
      />
    </div>
  );
}
