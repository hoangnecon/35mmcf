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

interface TableManagementMenuProps {
  onAddTable?: () => void;
  onDeleteTable?: () => void;
}

export default function TableManagementMenu({ 
  onAddTable, 
  onDeleteTable 
}: TableManagementMenuProps) {
  const handleAddTable = () => {
    // Placeholder for add table functionality
    console.log("Add table functionality not yet implemented");
    if (onAddTable) onAddTable();
  };

  const handleDeleteTable = () => {
    // Placeholder for delete table functionality
    console.log("Delete table functionality not yet implemented");
    if (onDeleteTable) onDeleteTable();
  };

  return (
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
  );
}