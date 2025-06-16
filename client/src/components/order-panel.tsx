import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatVND, formatDateTime, formatDate, formatTime } from "@/lib/utils"; // Import các hàm mới
import {
  Table as TableIcon,
  Plus,
  Minus,
  Trash2,
  Clock,
  CheckCircle,
  Printer,
  Bell,
  X,
  Edit,
  NotebookPen,
  CalendarDays,
  ClockIcon,
  Wallet, // Thêm icon cho thanh toán một phần
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { OrderType, OrderItem as OrderItemType } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import PartialPaymentModal from "./partial-payment-modal"; // Import PartialPaymentModal

interface OrderPanelProps {
  selectedTable: { id: number; name: string; type: string } | null;
  activeOrder: (OrderType & { items: OrderItemType[] }) | null;
  onOpenMenu: () => void;
  onCheckout: (paymentMethod: string, discountAmount: number) => void;
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
  const [editingNoteItemId, setEditingNoteItemId] = useState<number | null>(null);
  const [noteInput, setNoteInput] = useState<string>("");
  const [showTableNoteModal, setShowTableNoteModal] = useState(false);
  const [tableNoteInput, setTableNoteInput] = useState<string>("");
  const [showCancelOrderConfirm, setShowCancelOrderConfirm] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("Tiền mặt");
  const [discountValue, setDiscountValue] = useState<string>("0");
  const [discountType, setDiscountType] = useState<"percentage" | "amount">("amount");
  const [showPartialPaymentModal, setShowPartialPaymentModal] = useState(false); // State cho modal thanh toán một phần

  // Đồng bộ noteInput với ghi chú của từng món khi mở chỉnh sửa
  useEffect(() => {
    if (editingNoteItemId !== null) {
      const item = activeOrder?.items.find(i => i.id === editingNoteItemId);
      setNoteInput(item?.note || "");
    }
  }, [editingNoteItemId, activeOrder?.items]);

  // Đồng bộ tableNoteInput với ghi chú của đơn hàng khi activeOrder thay đổi
  useEffect(() => {
    setTableNoteInput(activeOrder?.note || "");
  }, [activeOrder?.note]);

  // Reset discountValue và discountType khi modal thanh toán đóng hoặc mở với đơn hàng mới
  useEffect(() => {
    if (!showPaymentMethodModal) {
      setDiscountValue("0");
      setDiscountType("amount");
    }
  }, [showPaymentMethodModal]);

  // Tính toán số tiền chiết khấu thực tế
  const calculateDiscountAmount = (subtotal: number, value: string, type: "percentage" | "amount"): number => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) return 0;

    if (type === "percentage") {
      return Math.round(subtotal * (numValue / 100));
    } else {
      return numValue;
    }
  };


  // Update order item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, quantity, note }: { itemId: number; quantity?: number; note?: string | null }) => {
      const response = await apiRequest("PUT", `/api/order-items/${itemId}`, { quantity, note });
      if (!response.ok) throw new Error("Failed to update item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", selectedTable?.id, "active-order"] });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message || "Không thể cập nhật món.", variant: "destructive" });
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

  // Mutation để cập nhật ghi chú của bàn (note cho order)
  const updateTableNoteMutation = useMutation({
    mutationFn: async ({ orderId, note }: { orderId: number; note: string | null }) => {
      const response = await apiRequest("PUT", `/api/orders/${orderId}/note`, { note });
      if (!response.ok) throw new Error("Failed to update table note");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", selectedTable?.id, "active-order"] });
      toast({ title: "Thành công", description: "Đã cập nhật ghi chú bàn.", variant: "default" });
      setShowTableNoteModal(false);
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message || "Không thể cập nhật ghi chú bàn.", variant: "destructive" });
    },
  });

  // Mutation để hủy đơn hàng
  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, tableId }: { orderId: number; tableId: number }) => {
      const response = await apiRequest("PUT", `/api/orders/${orderId}/cancel`, { tableId });
      if (!response.ok) throw new Error("Failed to cancel order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables", selectedTable?.id, "active-order"] });
      toast({ title: "Thành công", description: "Đã hủy đơn hàng và giải phóng bàn.", variant: "default" });
      setShowCancelOrderConfirm(false);
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message || "Không thể hủy đơn hàng.", variant: "destructive" });
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

  const handleEditNote = (item: OrderItemType) => {
    setEditingNoteItemId(item.id);
    setNoteInput(item.note || "");
  };

  const handleSaveNote = async (itemId: number) => {
    if (updateItemMutation.isPending) return;
    await updateItemMutation.mutateAsync({ itemId, note: noteInput });
    setEditingNoteItemId(null);
    setNoteInput("");
  };

  const handleCancelNote = () => {
    setEditingNoteItemId(null);
    setNoteInput("");
  };

  const handleOpenTableNoteModal = () => {
    if (activeOrder) {
      setTableNoteInput(activeOrder.note || "");
      setShowTableNoteModal(true);
    } else {
      toast({
        title: "Lỗi",
        description: "Không có đơn hàng hoạt động để thêm ghi chú.",
        variant: "destructive",
      });
    }
  };

  const handleSaveTableNote = async () => {
    if (activeOrder) {
      await updateTableNoteMutation.mutateAsync({ orderId: activeOrder.id, note: tableNoteInput });
    }
  };

  const handleCancelOrder = async () => {
    if (!activeOrder || !selectedTable) {
      toast({
        title: "Lỗi",
        description: "Không có đơn hàng hoặc bàn được chọn để hủy.",
        variant: "destructive",
      });
      return;
    }
    setShowCancelOrderConfirm(true);
  };

  const confirmCancelOrder = async () => {
    if (activeOrder && selectedTable) {
      await cancelOrderMutation.mutateAsync({ orderId: activeOrder.id, tableId: selectedTable.id });
    }
  };

  // Mở modal chọn phương thức thanh toán (cho toàn bộ đơn hàng)
  const handleInitiateCheckout = () => {
    if (orderItems.length === 0) {
      toast({
        title: "Lỗi",
        description: "Không có món nào trong đơn hàng để thanh toán.",
        variant: "destructive",
      });
      return;
    }
    setShowPaymentMethodModal(true);
  };

  // Xử lý thanh toán sau khi chọn phương thức
  const handleConfirmCheckout = () => {
    const discountAmount = calculateDiscountAmount(subtotal, discountValue, discountType);
    setShowPaymentMethodModal(false);
    onCheckout(selectedPaymentMethod, discountAmount); // Truyền phương thức thanh toán và chiết khấu lên PosPage
  };

  const handlePartialPayment = () => {
    if (!activeOrder || !selectedTable || activeOrder.items.length === 0) {
      toast({
        title: "Lỗi",
        description: "Không có đơn hàng hoặc không có món nào để thanh toán một phần.",
        variant: "destructive",
      });
      return;
    }
    setShowPartialPaymentModal(true);
  };

  const onPartialPaymentSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
    queryClient.invalidateQueries({ queryKey: ["/api/revenue/daily"] });
    queryClient.invalidateQueries({ queryKey: ["/api/revenue/by-table"] });
    queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tables", selectedTable?.id, "active-order"] });
    // Nếu order gốc được chuyển sang completed do thanh toán hết, PosPage sẽ tự xử lý setSelectedTableId(null)
  };


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
  const discountAmount = calculateDiscountAmount(subtotal, discountValue, discountType);
  const totalAfterDiscount = Math.max(0, subtotal - discountAmount); // Tính tổng tiền sau chiết khấu, không âm

  const currentDateTime = new Date(); // Lấy thời gian cục bộ của máy client
  const formattedDate = formatDate(currentDateTime); // Định dạng theo giờ VN
  const formattedTime = formatTime(currentDateTime); // Định dạng theo giờ VN

  if (!selectedTable) {
    return (
      <div className="h-full flex items-center justify-center p-6 text-center">
        <div>
          <TableIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chọn bàn để bắt đầu</h3>
          <p className="text-gray-500">Nhấn vào một bàn để tạo đơn hàng mới</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-screen">
      <div className="bg-accent p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-accent-foreground flex items-center">
            <TableIcon className="h-4 w-4 mr-2" />
            <span>{selectedTable.name}</span>
          </h2>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-accent-foreground hover:bg-blue-100 p-1"
              onClick={handleOpenTableNoteModal}
            >
              <NotebookPen className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-accent-foreground hover:bg-blue-100 p-1"
              onClick={handleCancelOrder}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-s text-gray-600">
          <Clock className="h-3 w-3 inline mr-1" />
          <span>
            {activeOrder
              ? `Đơn hàng: ${activeOrder.id} - ${formatDateTime(activeOrder.createdAt)}`
              : "Chưa có đơn hàng"}
          </span>
          {activeOrder?.note && (
            <div className="text-s text-gray-700 mt-1 flex items-center">
              <NotebookPen className="h-3 w-3 inline mr-1" />
              Ghi chú bàn: {activeOrder.note}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-350px)]">
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
            <div key={item.id} className="p-2 border-b relative">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <div className="font-medium text-gray-800">
                    {index + 1}. {item.menuItemName}
                  </div>
                  {item.note && editingNoteItemId !== item.id && (
                    <div className="text-xs text-gray-500">Ghi chú: {item.note}</div>
                  )}
                </div>
                <div className="text-right flex items-center gap-2">
                  <div className="font-semibold text-gray-800">{formatVND(item.totalPrice)}</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-gray-400 hover:text-blue-500 p-1"
                    onClick={() => handleEditNote(item)}
                    disabled={updateItemMutation.isPending}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
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
              {editingNoteItemId === item.id && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    placeholder="Nhập ghi chú (ví dụ: Không đá, Nóng...)"
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSaveNote(item.id)}
                    disabled={updateItemMutation.isPending}
                  >
                    Lưu
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelNote}
                    disabled={updateItemMutation.isPending}
                  >
                    Hủy
                  </Button>
                </div>
              )}
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
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Tổng tiền:</span>
            <span className="text-primary">{formatVND(totalAfterDiscount)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <Button
            className="w-full bg-green-500 hover:bg-green-600 text-white py-3"
            onClick={handleInitiateCheckout}
            disabled={orderItems.length === 0 || isCheckingOut}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {isCheckingOut ? "Đang thanh toán..." : "Thanh toán"}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="default" size="sm">
              <Printer className="h-3 w-3 mr-1" />
              In tạm tính
            </Button>
            <Button variant="secondary" size="sm" className="bg-orange-500 hover:bg-orange-600 text-white">
              <Bell className="h-3 w-3 mr-1" />
              Thông báo
            </Button>
          </div>
        </div>
      </div>

      {/* Modal ghi chú bàn */}
      <Dialog open={showTableNoteModal} onOpenChange={setShowTableNoteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader className="bg-primary text-primary-foreground p-4 -m-6 mb-6">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">Ghi chú cho bàn {selectedTable?.name}</DialogTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowTableNoteModal(false)} className="text-white hover:bg-white hover:bg-opacity-20">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Nhập ghi chú cho bàn (ví dụ: Đã thanh toán tiền mặt, Chờ chuyển khoản...)"
              value={tableNoteInput}
              onChange={(e) => setTableNoteInput(e.target.value)}
              rows={5}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSaveTableNote}
                disabled={updateTableNoteMutation.isPending || !activeOrder}
                className="flex-1"
              >
                {updateTableNoteMutation.isPending ? "Đang lưu..." : "Lưu ghi chú"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowTableNoteModal(false)}
                className="flex-1"
              >
                Hủy
              </Button>
            </div>
          </div >
        </DialogContent>
      </Dialog>

      {/* AlertDialog xác nhận hủy đơn hàng */}
      <AlertDialog open={showCancelOrderConfirm} onOpenChange={setShowCancelOrderConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bạn có chắc chắn muốn hủy đơn hàng này?</AlertDialogTitle>
            <AlertDialogDescription>
              Thao tác này sẽ xóa tất cả các món trong đơn hàng và đưa bàn về trạng thái trống. Bạn không thể hoàn tác hành động này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelOrderMutation.isPending}>Hủy bỏ</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelOrder} disabled={cancelOrderMutation.isPending}>
              {cancelOrderMutation.isPending ? "Đang hủy..." : "Hủy đơn hàng"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal chọn phương thức thanh toán toàn bộ đơn hàng */}
      <Dialog open={showPaymentMethodModal} onOpenChange={setShowPaymentMethodModal}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="bg-primary text-primary-foreground p-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold">
                Phiếu thanh toán - {selectedTable?.name} / {selectedTable?.type === 'vip' ? 'Phòng VIP' : 'Bàn thường'}
              </DialogTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowPaymentMethodModal(false)} className="text-white hover:bg-white hover:bg-opacity-20">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <div className="flex flex-col md:flex-row max-h-[80vh]">
            {/* Left Section: Order Details */}
            <div className="flex-1 border-r p-4 overflow-y-auto">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                <div className="flex items-center space-x-2">
                  <CalendarDays className="h-4 w-4 text-gray-500" />
                  <span>{formattedDate}</span>
                  <ClockIcon className="h-4 w-4 text-gray-500" />
                  <span>{formattedTime}</span>
                </div>
              </div>
              {/* CẬP NHẬT: Header cho danh sách món cùng hàng với nút "Thanh toán một phần" */}
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-gray-700">Danh sách món:</h4>
                {activeOrder && activeOrder.items.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-primary border-primary hover:bg-primary/5 text-xs h-7"
                    onClick={handlePartialPayment}
                  >
                    <Wallet className="h-3 w-3 mr-1" />
                    Thanh toán một phần
                  </Button>
                )}
              </div>
              <ScrollArea className="h-48 pr-4">
                {orderItems.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">Chưa có món nào trong đơn hàng này.</p>
                ) : (
                  <Table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-2">STT</th>
                        <th className="py-2 pr-2">Tên món</th>
                        <th className="py-2 pr-2 text-center">SL</th>
                        <th className="py-2 pr-2 text-right">Đơn giá</th>
                        <th className="py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                          <td className="py-2 pr-2">{index + 1}</td>
                          <td className="py-2 pr-2">{item.menuItemName}</td>
                          <td className="py-2 pr-2 text-center">{item.quantity}</td>
                          <td className="py-2 pr-2 text-right">{formatVND(item.unitPrice)}</td>
                          <td className="py-2 text-right">{formatVND(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </ScrollArea>
            </div>

            {/* Right Section: Payment Summary */}
            <div className="w-full md:w-96 p-4 flex flex-col justify-between">
              <div>
                <div className="bg-gray-50 p-3 rounded-lg border mb-4">
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                    <span>Tổng tiền hàng trả</span>
                    <span>{formatVND(subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-medium text-gray-700 mt-2">
                    <span>Chiết khấu</span>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        className="w-24 h-8 text-right text-sm border-gray-300"
                      />
                      <ToggleGroup type="single" value={discountType} onValueChange={(value: "percentage" | "amount") => setDiscountType(value)} className="h-8">
                        <ToggleGroupItem value="amount" aria-label="Chiết khấu theo số tiền" className="px-2 py-1 h-8 text-xs">
                          VND
                        </ToggleGroupItem>
                        <ToggleGroupItem value="percentage" aria-label="Chiết khấu theo phần trăm" className="px-2 py-1 h-8 text-xs">
                          %
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                  </div>
                  {/* Gợi ý chiết khấu */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {setDiscountValue("5000"); setDiscountType("amount");}}>5k</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {setDiscountValue("10000"); setDiscountType("amount");}}>10k</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {setDiscountValue("15000"); setDiscountType("amount");}}>15k</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {setDiscountValue("5"); setDiscountType("percentage");}}>5%</Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {setDiscountValue("10"); setDiscountType("percentage");}}>10%</Button>
                  </div>

                  <div className="flex justify-between items-center text-lg font-bold text-primary mt-2 pt-2 border-t border-gray-200">
                    <span>Cần trả khách</span>
                    <span>{formatVND(totalAfterDiscount)}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Chọn phương thức thanh toán:</h4>
                  <RadioGroup
                    value={selectedPaymentMethod}
                    onValueChange={setSelectedPaymentMethod}
                    className="grid grid-cols-2 gap-2 text-sm"
                  >
                    <div
                      className="flex flex-col items-center justify-center space-y-1 border rounded-md p-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedPaymentMethod("Tiền mặt")}
                    >
                      <RadioGroupItem value="Tiền mặt" id="payment-cash" className="mr-0" />
                      <Label htmlFor="payment-cash" className="font-medium cursor-pointer">Tiền mặt</Label>
                    </div>
                    <div
                      className="flex flex-col items-center justify-center space-y-1 border rounded-md p-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedPaymentMethod("Chuyển khoản")}
                    >
                      <RadioGroupItem value="Chuyển khoản" id="payment-transfer" className="mr-0" />
                      <Label htmlFor="payment-transfer" className="font-medium cursor-pointer">Chuyển khoản</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <DialogFooter className="flex-row justify-between items-center pt-4 bg-white">
                <Button
                  onClick={handleConfirmCheckout}
                  disabled={isCheckingOut || totalAfterDiscount < 0}
                  className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 text-base"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Thanh toán
                </Button>
              </DialogFooter>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Partial Payment Modal */}
      {activeOrder && selectedTable && (
        <PartialPaymentModal
          isOpen={showPartialPaymentModal}
          onClose={() => setShowPartialPaymentModal(false)}
          activeOrder={activeOrder}
          selectedTable={selectedTable}
          onPartialPaymentSuccess={onPartialPaymentSuccess}
        />
      )}
    </div>
  );
}