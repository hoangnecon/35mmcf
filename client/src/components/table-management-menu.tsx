import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Table, Trash2 } from "lucide-react";
import AddTableModal from "@/components/add-table-modal";
import DeleteTableModal from "@/components/delete-table-modal";

interface TableManagementMenuProps {
  tables: any[];
}

export default function TableManagementMenu({ tables }: TableManagementMenuProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleAddTable = () => {
    setShowAddModal(true);
  };

  const handleDeleteTable = () => {
    setShowDeleteModal(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="bg-white border-gray-300 hover:bg-gray-50 h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleAddTable} className="cursor-pointer">
            <Table className="h-4 w-4 mr-2" />
            Thêm bàn mới
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleDeleteTable} className="cursor-pointer text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Xóa bàn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddTableModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
      
      <DeleteTableModal 
        isOpen={showDeleteModal} 
        onClose={() => setShowDeleteModal(false)}
        tables={tables}
      />
    </>
  );
}