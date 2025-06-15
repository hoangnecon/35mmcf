import React, { useState, useEffect } from 'react';
    import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
      DialogFooter,
    } from "@/components/ui/dialog";
    import { Button } from "@/components/ui/button";
    import { Input } from "@/components/ui/input";
    import { Label } from "@/components/ui/label";
    import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
    import { ScrollArea } from "@/components/ui/scroll-area";
    import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
    import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
    import { formatVND, formatDate, formatTime } from "@/lib/utils"; // Import các hàm mới
    import { X, CheckCircle, Printer, CalendarDays, ClockIcon } from "lucide-react";
    import { OrderType, OrderItem as OrderItemType } from "@shared/schema";
    import { useMutation, useQueryClient } from "@tanstack/react-query";
    import { apiRequest } from "@/lib/queryClient";
    import { useToast } from "@/hooks/use-toast";

    interface PartialPaymentModalProps {
      isOpen: boolean;
      onClose: () => void;
      activeOrder: (OrderType & { items: OrderItemType[] }) | null;
      selectedTable: { id: number; name: string; type: string } | null;
      onPartialPaymentSuccess: () => void; // Callback để thông báo PosPage làm mới dữ liệu
    }

    export default function PartialPaymentModal({
      isOpen,
      onClose,
      activeOrder,
      selectedTable,
      onPartialPaymentSuccess,
    }: PartialPaymentModalProps) {
      const queryClient = useQueryClient();
      const { toast } = useToast();

      const [selectedItems, setSelectedItems] = useState<{ [key: number]: number }>({}); // { orderItemId: quantity }
      const [discountValue, setDiscountValue] = useState<string>("0");
      const [discountType, setDiscountType] = useState<"percentage" | "amount">("amount");
      const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("Tiền mặt");

      useEffect(() => {
        if (isOpen) {
          // Reset state khi modal mở
          setSelectedItems({});
          setDiscountValue("0");
          setDiscountType("amount");
          setSelectedPaymentMethod("Tiền mặt");
        }
      }, [isOpen]);

      const handleItemQuantityChange = (orderItemId: number, unitPrice: number, newQuantity: number) => {
        const currentItem = activeOrder?.items.find(item => item.id === orderItemId);
        if (!currentItem) return;

        // Đảm bảo số lượng mới không vượt quá số lượng còn lại của món
        const maxQuantity = currentItem.quantity;
        const quantityToSet = Math.max(0, Math.min(newQuantity, maxQuantity));

        setSelectedItems(prev => {
          const newSelectedItems = { ...prev };
          if (quantityToSet > 0) {
            newSelectedItems[orderItemId] = quantityToSet;
          } else {
            delete newSelectedItems[orderItemId];
          }
          return newSelectedItems;
        });
      };

      const calculateSubtotalForSelectedItems = (): number => {
        let subtotal = 0;
        for (const orderItemId in selectedItems) {
          const quantity = selectedItems[orderItemId];
          const item = activeOrder?.items.find(i => i.id === parseInt(orderItemId));
          if (item) {
            subtotal += item.unitPrice * quantity;
          }
        }
        return subtotal;
      };

      const calculateDiscountAmount = (subtotal: number, value: string, type: "percentage" | "amount"): number => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) || numValue < 0) return 0;

        if (type === "percentage") {
          return Math.round(subtotal * (numValue / 100));
        } else {
          return numValue;
        }
      };

      const subtotalSelected = calculateSubtotalForSelectedItems();
      const discountAmount = calculateDiscountAmount(subtotalSelected, discountValue, discountType);
      const totalAfterDiscount = Math.max(0, subtotalSelected - discountAmount);

      const processPartialPaymentMutation = useMutation({
        mutationFn: async (payload: { orderId: number; itemsToPay: { orderItemId: number; quantity: number }[]; paymentMethod: string; partialDiscountAmount: number }) => {
          const response = await apiRequest("POST", `/api/orders/${payload.orderId}/partial-payment`, payload);
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to process partial payment");
          }
          return response.json();
        },
        onSuccess: () => {
          toast({ title: "Thành công", description: "Đã thanh toán một phần đơn hàng." });
          onPartialPaymentSuccess(); // Kích hoạt callback để PosPage làm mới dữ liệu
          onClose(); // Đóng modal
        },
        onError: (error: any) => {
          console.error("Partial payment error:", error);
          toast({ title: "Lỗi", description: error.message || "Không thể xử lý thanh toán một phần.", variant: "destructive" });
        },
      });

      const handleConfirmPartialPayment = async () => {
        if (!activeOrder) return;
        if (Object.keys(selectedItems).length === 0) {
          toast({ title: "Lỗi", description: "Vui lòng chọn ít nhất một món để thanh toán.", variant: "destructive" });
          return;
        }

        const itemsToPay = Object.entries(selectedItems).map(([orderItemId, quantity]) => ({
          orderItemId: parseInt(orderItemId),
          quantity: quantity,
        }));

        await processPartialPaymentMutation.mutateAsync({
          orderId: activeOrder.id,
          itemsToPay: itemsToPay,
          paymentMethod: selectedPaymentMethod,
          partialDiscountAmount: discountAmount,
        });
      };

      const currentDateTime = new Date(); // Lấy thời gian cục bộ của máy client
      const formattedDate = formatDate(currentDateTime); // Định dạng theo giờ VN
      const formattedTime = formatTime(currentDateTime); // Định dạng theo giờ VN


      return (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden">
            {/* Wrapper div as the single direct child of DialogContent */}
            <div>
              <DialogHeader className="bg-primary text-primary-foreground p-4">
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-lg font-semibold">
                    Thanh toán một phần - {selectedTable?.name} / {selectedTable?.type === 'vip' ? 'Phòng VIP' : 'Bàn thường'}
                  </DialogTitle>
                  <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </DialogHeader>

              <div className="flex flex-col md:flex-row max-h-[80vh]">
                {/* Left Section: Order Details */}
                <div className="flex-1 border-r p-4 overflow-y-auto">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center space-x-2">
                      <span>Lê Thị A</span>
                      <span className="text-xs text-blue-500">(9 điểm)</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CalendarDays className="h-4 w-4 text-gray-500" />
                      <span>{formattedDate}</span>
                      <ClockIcon className="h-4 w-4 text-gray-500" />
                      <span>{formattedTime}</span>
                    </div>
                  </div>
                  <h4 className="font-semibold text-gray-700 mb-2">Chọn món để thanh toán:</h4>
                  <ScrollArea className="h-48 pr-4">
                    {activeOrder?.items.length === 0 ? (
                      <p className="text-gray-500 text-sm italic">Đơn hàng này không có món nào để thanh toán.</p>
                    ) : (
                      <Table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="py-2 pr-2">STT</th>
                            <th className="py-2 pr-2">Tên món</th>
                            <th className="py-2 pr-2 text-center">SL Gốc</th>
                            <th className="py-2 pr-2 text-center">SL TT</th>
                            <th className="py-2 pr-2 text-right">Đơn giá</th>
                            <th className="py-2 text-right">Tổng TT</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeOrder?.items.map((item, index) => (
                            <tr key={item.id} className="border-b border-gray-100 last:border-b-0">
                              <td className="py-2 pr-2">{index + 1}</td>
                              <td className="py-2 pr-2">{item.menuItemName}</td>
                              <td className="py-2 pr-2 text-center">{item.quantity}</td>
                              <td className="py-2 pr-2 text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.quantity.toString()}
                                  value={selectedItems[item.id] || 0}
                                  onChange={(e) => handleItemQuantityChange(item.id, item.unitPrice, parseInt(e.target.value))}
                                  className="w-16 h-8 text-center text-sm"
                                />
                              </td>
                              <td className="py-2 pr-2 text-right">{formatVND(item.unitPrice)}</td>
                              <td className="py-2 text-right">{formatVND(item.unitPrice * (selectedItems[item.id] || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </ScrollArea>
                </div>

                {/* Right Section: Payment Summary */}
                <div className="w-full md:w-96 p-4 flex flex-col justify-between">
                  {/* This div wraps payment details and payment method sections */}
                  <div>
                    <div className="bg-gray-50 p-3 rounded-lg border mb-4">
                      <div className="flex justify-between items-center text-sm font-medium text-gray-700">
                        <span>Tổng tiền món được chọn</span>
                        <span>{formatVND(subtotalSelected)}</span>
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
                          <RadioGroupItem value="Tiền mặt" id="partial-payment-cash" className="mr-0" />
                          <Label htmlFor="partial-payment-cash" className="font-medium cursor-pointer">Tiền mặt</Label>
                        </div>
                        <div
                          className="flex flex-col items-center justify-center space-y-1 border rounded-md p-2 cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedPaymentMethod("Chuyển khoản")}
                        >
                          <RadioGroupItem value="Chuyển khoản" id="partial-payment-transfer" className="mr-0" />
                          <Label htmlFor="partial-payment-transfer" className="font-medium cursor-pointer">Chuyển khoản</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div> {/* Closing div for the wrapper of payment details and payment method sections */}

                  <DialogFooter className="flex-row justify-between items-center pt-4 bg-white">
                    <Button
                      onClick={handleConfirmPartialPayment}
                      disabled={processPartialPaymentMutation.isPending || subtotalSelected <= 0 || totalAfterDiscount < 0}
                      className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 text-base"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Thanh toán phần này
                    </Button>
                  </DialogFooter>
                </div>
              </div>
            </div> {/* Closing div for the main wrapper div inside DialogContent */}
          </DialogContent>
        </Dialog>
      );
    }