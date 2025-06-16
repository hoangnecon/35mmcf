import { Table, Crown, ShoppingBag, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import TableManagementMenu from "@/components/table-management-menu";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
    const baseClasses = "table-card flex flex-col items-center justify-center space-y-2";
    const selectedClasses = selectedTableId === table.id ? "selected" : "";
    // Check if table has an active order to mark it as 'occupied'
    const hasActiveOrder = activeOrdersForTables.some(order => order.tableId === table.id && order.status === 'active');
    const statusClasses = hasActiveOrder ? "occupied" : "";
    const typeClasses = table.type === "vip" ? "vip" : table.type === "special" ? "special" : "";
    
    return `${baseClasses} ${selectedClasses} ${statusClasses} ${typeClasses}`.trim();
  };

  // Fetch all active orders to determine which tables are occupied
  const { data: activeOrdersForTables = [] } = useQuery({
    queryKey: ["/api/orders"],
    select: (data: any[]) => data.filter(order => order.status === 'active'),
    staleTime: 5000, // Keep data fresh for a short period
    refetchInterval: 5000, // Refetch every 5 seconds to update table status
  });


  // Filter tables by type for rendering
  const specialTables = tables.filter(table => table.type === "special");
  const regularTables = tables.filter(table => table.type === "regular");
  const vipTables = tables.filter(table => table.type === "vip");

  const occupiedTablesCount = activeOrdersForTables.filter(order => tables.some(t => t.id === order.tableId)).length;
  const availableTablesCount = tables.length - occupiedTablesCount;

  return (
    <div className="table-grid-container">
      {/* Table Categories and Management Menu */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <Button className="bg-primary text-primary-foreground">
          <Table className="h-4 w-4 mr-2" />
          Tất cả ({tables.length})
        </Button>
        <Button variant="secondary" className="text-gray-700 hover:bg-gray-300">
          Sử dụng ({occupiedTablesCount})
        </Button>
        <Button variant="secondary" className="text-gray-700 hover:bg-gray-300">
          Còn trống ({availableTablesCount})
        </Button>
        <TableManagementMenu tables={tables} />
      </div>

      {/* Special Tables (Mang về, Giao đi) */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        {specialTables.map((table) => (
          <div
            key={table.id}
            className={`${getTableClasses(table)} h-32 w-full`}
            onClick={() => onTableSelect(table.id)}
          >
            {getTableIcon(table)}
            <div className="text-sm font-medium mt-2">{table.name}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-3 gap-4">
        {/* Render regular tables (Bàn 1-22) */}
        {regularTables.map((table) => (
          <div
            key={table.id}
            className={getTableClasses(table)}
            onClick={() => onTableSelect(table.id)}
          >
            {getTableIcon(table)}
            <div className="text-sm font-medium mt-2">{table.name}</div>
          </div>
        ))}
        {/* Render VIP tables (Phòng VIP 1-10) */}
        {vipTables.map((table) => (
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
    </div>
  );
}