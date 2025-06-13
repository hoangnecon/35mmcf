import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { X, Calendar, Download } from "lucide-react";

interface RevenueModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RevenueModal({ isOpen, onClose }: RevenueModalProps) {
  // Fetch revenue by table
  const { data: revenueByTable = [] } = useQuery({
    queryKey: ["/api/revenue/by-table"],
    enabled: isOpen,
  });

  // Fetch daily revenue
  const { data: dailyRevenueData } = useQuery({
    queryKey: ["/api/revenue/daily"],
    enabled: isOpen,
  });

  // Fetch bills for detailed report
  const { data: bills = [] } = useQuery({ // CẬP NHẬT: Lấy dữ liệu từ endpoint /api/bills
    queryKey: ["/api/bills"],
    enabled: isOpen,
  });

  const chartData = revenueByTable.map((item: any) => ({
    table: item.tableName,
    revenue: item.revenue,
    orders: item.orderCount,
  }));

  // Cập nhật để sử dụng dữ liệu từ 'bills' thay vì 'orders'
  const completedBills = bills.filter((bill: any) => bill.totalAmount > 0); // Lọc các bill có doanh thu > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="bg-primary text-primary-foreground p-4 -m-6 mb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Báo cáo doanh thu</DialogTitle>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white hover:bg-opacity-20">
                <Calendar className="h-4 w-4 mr-2" />
                Hôm nay
              </Button>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white hover:bg-opacity-20">
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg">
              <h3 className="text-sm font-medium opacity-90">Tổng doanh thu</h3>
              <p className="text-2xl font-bold">{formatVND(dailyRevenueData?.revenue || 0)}</p>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg">
              <h3 className="text-sm font-medium opacity-90">Số đơn hàng đã hoàn thành</h3>
              <p className="text-2xl font-bold">{completedBills.length}</p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg">
              <h3 className="text-sm font-medium opacity-90">Trung bình/bill</h3>
              <p className="text-2xl font-bold">
                {completedBills.length > 0
                  ? formatVND(Math.round((dailyRevenueData?.revenue || 0) / completedBills.length))
                  : formatVND(0)
                }
              </p>
            </div>
          </div>

          {/* Revenue Chart */}
          {chartData.length > 0 && (
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Doanh thu theo bàn</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="table"
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    fontSize={12}
                  />
                  <YAxis
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    fontSize={12}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatVND(value), "Doanh thu"]}
                    labelFormatter={(label) => `Bàn: ${label}`}
                  />
                  <Bar dataKey="revenue" fill="hsl(207 90% 27%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold">Chi tiết đơn hàng đã thanh toán</h3>
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
                    </th> {/* THÊM CỘT NÀY */}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tổng tiền
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thời gian
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completedBills.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        Chưa có bill nào trong ngày
                      </td>
                    </tr>
                  ) : (
                    completedBills.map((bill: any) => ( // CẬP NHẬT: Duyệt qua completedBills
                      <tr key={bill.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bill.tableName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bill.paymentMethod === 'Tiền mặt' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                            {bill.paymentMethod}
                          </span>
                        </td> {/* HIỂN THỊ PHƯƠNG THỨC TT */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-semibold">
                          {formatVND(bill.totalAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(bill.createdAt).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
