import { Table, Crown, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TableGridProps {
  tables: any[];
  selectedTableId: number | null;
  onTableSelect: (tableId: number) => void;
}

export default function TableGrid({ tables, selectedTableId, onTableSelect }: TableGridProps) {
  const getTableIcon = (table: any) => {
    if (table.name === "Mang về") return <ShoppingBag className="h-6 w-6" />;
    if (table.name === "Giao đi") return <Truck className="h-6 w-6" />;
    if (table.type === "vip") return <Crown className="h-5 w-5 text-yellow-500" />;
    return <Table className="h-5 w-5" />;
  };

  const getTableClasses = (table: any) => {
    const baseClasses = "table-card";
    const selectedClasses = selectedTableId === table.id ? "selected" : "";
    const typeClasses = table.type === "vip" ? "vip" : table.type === "special" ? "special" : "";
    
    return `${baseClasses} ${selectedClasses} ${typeClasses}`.trim();
  };

  return (
    <div>
      {/* Table Categories */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          <Button className="bg-primary text-primary-foreground">
            <Table className="h-4 w-4 mr-2" />
            Tất cả (34)
          </Button>
          <Button variant="secondary" className="text-gray-700 hover:bg-gray-300">
            Sử dụng (2)
          </Button>
          <Button variant="secondary" className="text-gray-700 hover:bg-gray-300">
            Còn trống (32)
          </Button>
        </div>
      </div>

      {/* Table Grid */}
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {/* Special Tables (Mang về, Giao đi) - First Row */}
        {tables
          .filter(table => table.type === "special")
          .slice(0, 2)
          .map((table) => (
            <div key={table.id} className="col-span-2 grid grid-cols-2 gap-2">
              <div
                className={getTableClasses(table)}
                onClick={() => onTableSelect(table.id)}
              >
                {getTableIcon(table)}
                <div className="text-sm font-medium mt-2">{table.name}</div>
              </div>
            </div>
          ))}

        {/* Regular Tables - Bàn 1-6 on first row */}
        {tables
          .filter(table => table.type === "regular")
          .slice(0, 6)
          .map((table) => (
            <div
              key={table.id}
              className={getTableClasses(table)}
              onClick={() => onTableSelect(table.id)}
            >
              {getTableIcon(table)}
              <div className="text-sm font-medium mt-2">{table.name}</div>
            </div>
          ))}

        {/* Regular Tables - Bàn 7-14 */}
        {tables
          .filter(table => table.type === "regular")
          .slice(6, 14)
          .map((table) => (
            <div
              key={table.id}
              className={getTableClasses(table)}
              onClick={() => onTableSelect(table.id)}
            >
              {getTableIcon(table)}
              <div className="text-sm font-medium mt-2">{table.name}</div>
            </div>
          ))}

        {/* Regular Tables - Bàn 15-21 */}
        {tables
          .filter(table => table.type === "regular")
          .slice(14, 21)
          .map((table) => (
            <div
              key={table.id}
              className={getTableClasses(table)}
              onClick={() => onTableSelect(table.id)}
            >
              {getTableIcon(table)}
              <div className="text-sm font-medium mt-2">{table.name}</div>
            </div>
          ))}

        {/* VIP Rooms - Phòng VIP 1 */}
        {tables
          .filter(table => table.type === "vip")
          .slice(0, 1)
          .map((table) => (
            <div
              key={table.id}
              className={getTableClasses(table)}
              onClick={() => onTableSelect(table.id)}
            >
              {getTableIcon(table)}
              <div className="text-sm font-medium mt-2">{table.name}</div>
            </div>
          ))}

        {/* VIP Rooms Row */}
        {tables
          .filter(table => table.type === "vip")
          .slice(1, 9)
          .map((table) => (
            <div
              key={table.id}
              className={getTableClasses(table)}
              onClick={() => onTableSelect(table.id)}
            >
              {getTableIcon(table)}
              <div className="text-sm font-medium mt-2">{table.name}</div>
            </div>
          ))}

        {/* Last Row - VIP 9 and Bàn 22 */}
        {tables
          .filter(table => table.type === "vip")
          .slice(8, 9)
          .map((table) => (
            <div
              key={table.id}
              className={getTableClasses(table)}
              onClick={() => onTableSelect(table.id)}
            >
              {getTableIcon(table)}
              <div className="text-sm font-medium mt-2">{table.name}</div>
            </div>
          ))}

        {tables
          .filter(table => table.type === "regular")
          .slice(21, 22)
          .map((table) => (
            <div
              key={table.id}
              className={getTableClasses(table)}
              onClick={() => onTableSelect(table.id)}
            >
              {getTableIcon(table)}
              <div className="text-sm font-medium mt-2">{table.name}</div>
            </div>
          ))}
      </div>

      {/* Quick Order Section */}
      <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
        <div className="flex items-center mb-3">
          <div className="w-2 h-2 bg-primary rounded-full mr-2"></div>
          <span className="text-sm text-gray-600">Mở thực đơn khi chọn bàn</span>
        </div>
      </div>
    </div>
  );
}
