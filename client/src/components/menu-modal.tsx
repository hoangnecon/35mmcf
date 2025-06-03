import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import { X } from "lucide-react";

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: any[];
  onAddItem: (item: any) => void;
}

export default function MenuModal({ isOpen, onClose, menuItems, onAddItem }: MenuModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="bg-primary text-primary-foreground p-4 -m-6 mb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Thực đơn</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[70vh] p-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => onAddItem(item)}
              >
                <img
                  src={item.imageUrl || "https://images.unsplash.com/photo-1544787219-7f47ccb76574?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200"}
                  alt={item.name}
                  className="w-full h-32 object-cover rounded mb-3 group-hover:scale-105 transition-transform"
                />
                <h4 className="font-medium text-gray-800 mb-1">{item.name}</h4>
                <p className="text-primary font-semibold">{formatVND(item.price)}</p>
                <p className="text-xs text-gray-500 mt-1">{item.category}</p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
