// client/src/components/order-panel.tsx
import { useState, useEffect } from "react"; // Thêm useEffect
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import { 
  Table, 
  Plus, 
  Minus, 
  Trash2, 
  Crown,
  ArrowUp10,
  Clock,
  CheckCircle,
  Printer,
  Bell,
  X 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OrderType, OrderItem as OrderItemType } from "@shared/schema";

interface OrderPanelProps {
  selectedTable: { id: number; name: string } | null;
  activeOrder: (OrderType & { items: OrderItemType[] }) | null;
  onOpenMenu: () => void;
  onCheckout: () => void;
  isCheckingOut: boolean;
}

export default function OrderPanel({ 
  selectedTable, 
  activeOrder, 
  onOpenMenu, 
  onCheckout,
  isCheckingOut 
}: OrderPanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Update order item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity, note }: { itemId: number; quantity: number; note?: string }) => {
      const response = await apiRequest("PUT", `/api/order-items/${itemId}`, { quantity, note });
      if (!response.ok) throw new Error("Failed to update item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", selectedTable?.id, "active-order"] });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message || "Không thể cập nhật số lượng món.", variant: "destructive" });
    },
  });

  // Remove order item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const response = await apiRequest("DELETE", `/api/order-items/${itemId}`);
      if (!response.ok) throw new Error("Failed to remove item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", selectedTable?.id, "active-order"] });
      toast({ title: "Thành công", description: "Đã xóa món khỏi đơn hàng.", variant: "default" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message || "Không thể xóa món.", variant: "destructive" });
    },
  });

  const handleQuantityChange = async (item: OrderItemType, newQuantity: number) => {
    if (updateItemMutation.isPending || removeItemMutation.isPending) return;
    if (newQuantity <= 0) {
      if (confirm(`Bạn có chắc muốn xóa "${item.menuItemName}" khỏi đơn hàng?`)) {
        await removeItemMutation.mutateAsync(item.id);
      }
    } else {
      await updateItemMutation.mutateAsync({ itemId: item.id, quantity: newQuantity });
    }
  };

  const handleRemoveItem = async (itemId: number, itemName: string) => {
    if (removeItemMutation.isPending) return;
    if (confirm(`Bạn có chắc muốn xóa "${itemName}" khỏi đơn hàng?`)) {
      await removeItemMutation.mutateAsync(itemId);
    }
  };

  // Đảm bảo orderItems luôn lấy từ activeOrder mới nhất
  const [orderItems, setOrderItems] = useState<OrderItemType[]>([]);
  useEffect(() => {
    console.log("OrderPanel useEffect - activeOrder:", activeOrder);
    if (activeOrder) {
      setOrderItems(activeOrder.items || []);
    } else {
      setOrderItems([]);
    }
  }, [activeOrder]);

  console.log("OrderPanel render - orderItems:", orderItems);

  const subtotal = orderItems.reduce((sum: number, item: OrderItemType) => sum + item.totalPrice, 0);
  const discount = 0;
  const total = subtotal - discount;

  if (!selectedTable) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div>
          <Table className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn bàn để bắt đầu</h3>
          <p className="text-gray-500">Nhấn vào một bàn để tạo đơn hàng mới</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-accent p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-accent-foreground flex items-center">
            <Table className="h-4 w-4 mr-2" />
            <span>{selectedTable.name} / Lầu 3</span>
          </h2>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" className="text-accent-foreground hover:bg-blue-100 p-1">
              <ArrowUp10 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-accent-foreground hover:bg-blue-100 p-1">
              <Crown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-accent-foreground hover:bg-blue-100 p-1">
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-accent-foreground hover:bg-blue-100 p-1">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-xs text-gray-600">
          <Clock className="h-3 w-3 inline mr-1" />
          <span>{activeOrder ? `Đơn hàng: ${activeOrder.id} - ${new Date(activeOrder.createdAt).toLocaleTimeString('vi-VN')}` : "Chưa có đơn hàng"}</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {orderItems.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-gray-400 mb-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
                <Plus className="h-8 w-8" />
              </div>
            </div>
            <p className="text-gray-500 mb-4">Chưa có món nào</p>
            <Button onClick={onOpenMenu} variant="outline" className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Thêm món đầu tiên
            </Button>
          </div>
        ) : (
          orderItems.map((item: OrderItemType, index: number) => (
            <div key={item.id} className="p-2 border-b">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    {index + 1}. {item.menuItemName}
                  </div>
                  {item.note && <div className="text-xs text-gray-500">{item.note}</div>}
                </div>
                <div className="text-right flex items-center gap-2">
                  <div className="font-semibold text-gray-800">{formatVND(item.totalPrice)}</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-red-500 p-1"
                    onClick={() => handleRemoveItem(item.id, item.menuItemName)}
                    disabled={removeItemMutation.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="quantity-btn decrease"
                    onClick={() => handleQuantityChange(item, item.quantity - 1)}
                    disabled={updateItemMutation.isPending || removeItemMutation.isPending}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="quantity-btn increase"
                    onClick={() => handleQuantityChange(item, item.quantity + 1)}
                    disabled={updateItemMutation.isPending}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                <div className="text-right text-sm text-gray-500">
                  {formatVND(item.unitPrice)}/món
                </div>
              </div>
            </div>
          ))
        )}
        {orderItems.length > 0 && (
          <div className="p-4">
            <Button 
              variant="outline" 
              className="w-full border-2 border-dashed border-gray-300 hover:border-primary hover:text-primary"
              onClick={onOpenMenu}
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm món
            </Button>
          </div>
        )}
      </div>
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span>Tạm tính:</span>
            <span>{formatVND(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Giảm giá:</span>
            <span className="text-red-600">{formatVND(discount)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Tổng tiền:</span>
            <span className="text-primary">{formatVND(total)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Button 
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3"
            onClick={onCheckout}
            disabled={orderItems.length === 0 || isCheckingOut}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isCheckingOut ? "Đang thanh toán..." : "Thanh toán (F9)"}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="default" size="sm">
              <Printer className="h-3 w-3 mr-1" />
              In tạm tính
            </Button>
            <Button variant="secondary" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              <Bell className="h-3 w-3 mr-1" />
              Thông báo (F10)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}