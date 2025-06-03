import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface DeleteTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  tables: any[];
}

export default function DeleteTableModal({ isOpen, onClose, tables }: DeleteTableModalProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Delete table mutation
  const deleteTableMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/tables/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      onClose();
      setSelectedTableId("");
      toast({
        title: "Thành công",
        description: "Đã xóa bàn",
      });
    },
    onError: () => {
      toast({
        title: "Lỗi", 
        description: "Không thể xóa bàn. Bàn có thể đang được sử dụng.",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async () => {
    if (!selectedTableId) return;
    
    const tableId = parseInt(selectedTableId);
    const table = tables.find(t => t.id === tableId);
    
    if (confirm(`Bạn có chắc muốn xóa ${table?.name}? Hành động này không thể hoàn tác.`)) {
      await deleteTableMutation.mutateAsync(tableId);
    }
  };

  const availableTables = tables.filter(table => table.status === 'available');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="bg-red-500 text-white p-4 -m-6 mb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Xóa bàn
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Chỉ có thể xóa những bàn đang trống. Bàn đang có khách không thể xóa.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn bàn cần xóa
            </label>
            <Select value={selectedTableId} onValueChange={setSelectedTableId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn bàn..." />
              </SelectTrigger>
              <SelectContent>
                {availableTables.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">Không có bàn trống để xóa</div>
                ) : (
                  availableTables.map((table) => (
                    <SelectItem key={table.id} value={table.id.toString()}>
                      {table.name} ({table.type === 'vip' ? 'VIP' : table.type === 'special' ? 'Đặc biệt' : 'Thường'})
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleDelete}
              disabled={!selectedTableId || deleteTableMutation.isPending || availableTables.length === 0}
              variant="destructive"
              className="flex-1"
            >
              {deleteTableMutation.isPending ? "Đang xóa..." : "Xóa bàn"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Hủy
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}