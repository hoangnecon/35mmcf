// hoangnecon/35mmcf/35mmcf-fa723ba3b9b96db36942ef1dc83a721ec6f65899/client/src/components/revenue-modal.tsx
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVND, getUtcIsoStringForLocalDayStart } from "@/lib/utils"; // Import getUtcIsoStringForLocalDayStart
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { X, Calendar, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, addDays, startOfDay, isSameDay } from "date-fns"; // Đảm bảo import isSameDay
import { vi } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
// KHÔNG CẦN IMPORT zonedTimeToUtc TỪ ĐÂY NỮA

interface RevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: Date; // Thêm prop này
}

// Cập nhật interface để bao gồm discountAmount
interface BillWithDetails extends any {
  items: {
    id: number;
    menuItemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  discountAmount?: number; // ĐÃ THÊM: discountAmount
}

// KHÔNG CẦN ĐỊNH NGHĨA TIME_ZONE NỮA NẾU KHÔNG DÙNG date-fns-tz

export default function RevenueModal({ isOpen, onClose, initialDate }: RevenueModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate || new Date()); // Sử dụng initialDate
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | 'Tiền mặt' | 'Chuyển khoản' >('all');
  const [selectedBillDetails, setSelectedBillDetails] = useState<BillWithDetails | null>(null);

  // Cập nhật selectedDate khi initialDate thay đổi hoặc khi modal mở
  useEffect(() => {
    if (isOpen && initialDate) {
      setSelectedDate(initialDate);
    }
  }, [isOpen, initialDate]);


  // Helper function: Lấy chuỗi ISO UTC đại diện cho bắt đầu ngày cục bộ TIẾP THEO
  const getUtcIsoStringForNextLocalDayStart = (date: Date | undefined) => {
    if (!date) return undefined;
    const nextLocalDayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1); // Ngày tiếp theo, 00:00:00 local
    return nextLocalDayStart.toISOString(); // Ví dụ: 00:00:00 14/06 local sẽ là 17:00:00 13/06 UTC
  }

  const { data: revenueByTable = [] } = useQuery({
    queryKey: ["/api/revenue/by-table", getUtcIsoStringForLocalDayStart(selectedDate)], // Truyền chuỗi ISO đầy đủ
    enabled: isOpen,
    queryFn: async ({ queryKey }) => {
      const dateParam = queryKey[1] ? `?date=${queryKey[1]}` : ''; // Server sẽ nhận chuỗi ISO đầy đủ
      const response = await fetch(`/api/revenue/by-table${dateParam}`);
      if (!response.ok) {
        throw new Error("Failed to fetch revenue by table");
      }
      return response.json();
    }
  });

  const { data: dailyRevenueData } = useQuery({
    queryKey: ["/api/revenue/daily", getUtcIsoStringForLocalDayStart(selectedDate)], // Truyền chuỗi ISO đầy đủ
    enabled: isOpen,
    queryFn: async ({ queryKey }) => {
      const [_key, dateParam] = queryKey as [string, string | undefined];
      const url = dateParam ? `/api/revenue/daily?date=${dateParam}` : '/api/revenue/daily';
      const response = await fetch("http://localhost:5000" + url); // Đảm bảo gọi đúng cổng
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || "Failed to fetch daily revenue");
      }
      return response.json();
    },
  });

  const { data: bills = [] } = useQuery({
    queryKey: ["/api/bills", getUtcIsoStringForLocalDayStart(selectedDate)], // Truyền chuỗi ISO đầy đủ cho start
    enabled: isOpen,
    queryFn: async ({ queryKey }) => {
      const startDateIso = queryKey[1]; // Đây là chuỗi ISO UTC cho bắt đầu ngày cục bộ
      const endDateIso = getUtcIsoStringForNextLocalDayStart(selectedDate); // Lấy chuỗi ISO UTC cho bắt đầu ngày cục bộ tiếp theo

      if (!startDateIso) {
        return [];
      }

      const dateParams = `?startDate=${startDateIso}&endDate=${endDateIso}`; // Gửi chuỗi ISO đầy đủ làm tham số
      const response = await fetch(`/api/bills${dateParams}`);
      if (!response.ok) {
        console.error(`Frontend: Failed to fetch bills with status ${response.status}: ${await response.text()}`);
        throw new Error("Failed to fetch bills");
      }
      const billsData = await response.json();

      const billsWithDetails = await Promise.all(billsData.map(async (bill: any) => {
        const itemsResponse = await fetch(`/api/bills/${bill.id}/items`);
        if (!itemsResponse.ok) {
          console.error(`Frontend: Failed to fetch items for bill ${bill.id}`);
          return { ...bill, items: [] };
        }
        return { ...bill, items: await itemsResponse.json() };
      }));
      return billsWithDetails;
    },
  });

  const chartData = revenueByTable.map((item: any) => ({
    table: item.tableName,
    revenue: item.revenue,
    orders: item.orderCount,
  }));

  const billsToDisplay = [...bills]
    .filter((bill: any) => bill.totalAmount > 0)
    .filter((bill: any) => {
      if (filterPaymentMethod === 'all') {
        return true;
      }
      return bill.paymentMethod === filterPaymentMethod;
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setIsCalendarOpen(false);
  };

  const formattedSelectedDate = selectedDate
    ? format(selectedDate, "dd/MM/yyyy", { locale: vi })
    : "Chọn ngày";

  const isToday = selectedDate?.toDateString() === new Date().toDateString();

  // HÀM XỬ LÝ XUẤT EXCEL
  const handleExportExcel = () => {
    const startDateIso = getUtcIsoStringForLocalDayStart(selectedDate);
    const endDateIso = getUtcIsoStringForNextLocalDayStart(selectedDate);

    // Xây dựng URL tải xuống với các tham số ngày tháng
    const downloadUrl = `/api/reports/export-bills?startDate=${startDateIso}&endDate=${endDateIso}`;
    
    // Mở trong một cửa sổ/tab mới để kích hoạt tải xuống
    window.open(downloadUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="bg-primary text-primary-foreground p-4 -m-6 mb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Báo cáo doanh thu</DialogTitle>
            <div className="flex items-center space-x-2">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white hover:bg-opacity-20">
                    <Calendar className="h-4 w-4 mr-2" />
                    {isToday ? "Hôm nay" : formattedSelectedDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    initialFocus
                    locale={vi}
                  />
                </PopoverContent>
              </Popover>

              <Button 
                variant="ghost" 
                size="sm" 
                className="text-white hover:bg-white hover:bg-opacity-20"
                onClick={handleExportExcel} // GÁN HÀM ONCLICK TẠI ĐÂY
              >
                <Download className="h-4 w-4 mr-2" />
                Xuất Excel
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] p-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
              <h3 className="text-sm font-medium opacity-90">Tổng doanh thu</h3>
              <p className="text-2xl font-bold">{formatVND(dailyRevenueData?.revenue || 0)}</p>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
              <h3 className="text-sm font-medium opacity-90">Số đơn hàng đã hoàn thành</h3>
              <p className="text-2xl font-bold">{billsToDisplay.length}</p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
              <h3 className="text-sm font-medium opacity-90">Trung bình/bill</h3>
              <p className="text-2xl font-bold">
                {billsToDisplay.length > 0
                  ? formatVND(Math.round((dailyRevenueData?.revenue || 0) / billsToDisplay.length))
                  : formatVND(0)
                }
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Chi tiết đơn hàng đã thanh toán</h3>
              <div className="flex items-center space-x-2">
                <Label htmlFor="filter-payment-method" className="text-sm">Phương thức:</Label>
                <Select
                  value={filterPaymentMethod}
                  onValueChange={(value: 'all' | 'Tiền mặt' | 'Chuyển khoản' ) => setFilterPaymentMethod(value)}
                >
                  <SelectTrigger id="filter-payment-method" className="w-[150px] h-8">
                    <SelectValue placeholder="Tất cả" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="Tiền mặt">Tiền mặt</SelectItem>
                    <SelectItem value="Chuyển khoản">Chuyển khoản</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bàn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phương thức TT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chiết khấu {/* ĐÃ THÊM */}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tổng tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chi tiết
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {billsToDisplay.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-500"> {/* ĐÃ SỬA: colSpan */}
                        Chưa có bill nào trong ngày
                      </td>
                    </tr>
                  ) : (
                    billsToDisplay.map((bill: BillWithDetails) => {
                      const isBillToday = isSameDay(new Date(bill.createdAt), selectedDate || new Date());
                      return (
                        <tr key={bill.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {bill.tableName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bill.paymentMethod === 'Tiền mặt' ? 'bg-blue-100 text-blue-800' : bill.paymentMethod === 'Chuyển khoản' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                              {bill.paymentMethod}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold"> {/* ĐÃ THÊM */}
                            {formatVND(bill.discountAmount || 0)} {/* ĐÃ THÊM */}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-semibold">
                            {formatVND(bill.totalAmount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(bill.createdAt).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <Button
                              size="sm"
                              onClick={() => setSelectedBillDetails(bill)} // Truyền toàn bộ bill object
                              disabled={!isBillToday} // Vô hiệu hóa nút nếu bill không phải của ngày hôm nay
                            >
                              {isBillToday ? "Xem chi tiết" : "Không có chi tiết (Ngày trước)"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>

      <Dialog open={selectedBillDetails !== null} onOpenChange={() => setSelectedBillDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết đơn hàng</DialogTitle>
          </DialogHeader>
          {selectedBillDetails && (
            <ScrollArea className="max-h-[60vh]">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Món
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Số lượng
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Đơn giá
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tổng tiền
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedBillDetails.items.map((item: any) => ( 
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.menuItemName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatVND(item.unitPrice)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatVND(item.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}