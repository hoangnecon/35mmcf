// client/src/components/menu-modal.tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import { X, Plus, Edit, Trash2, Utensils, List } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMenuItemSchema } from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Import Table components

interface MenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: any) => void;
  // menuItems prop will now be fetched internally based on collection
}

// Extend MenuItemFormData to include menuCollectionId for client-side form
const menuItemFormSchema = insertMenuItemSchema.extend({
  available: z.number().min(0).max(1),
  menuCollectionId: z.number().nullable(), // Allow null to match database default if needed
});

type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

export default function MenuModal({ isOpen, onClose, onAddItem }: MenuModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("view"); // 'view' or 'manage'
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null); // For editing menu items
  const [showMenuItemForm, setShowMenuItemForm] = useState(false); // To show/hide add/edit menu item form

  // Fetch menu collections
  const { data: menuCollections = [], isLoading: isLoadingCollections } = useQuery({
    queryKey: ["/api/menu-collections"],
    enabled: isOpen, // Only fetch when modal is open
  });

  // Automatically select the first active collection when collections load or modal opens
  // or if selectedCollectionId becomes invalid
  useState(() => {
    if (isOpen && menuCollections.length > 0 && selectedCollectionId === null) {
      const defaultCollection = menuCollections.find(col => col.isActive === 1) || menuCollections[0];
      setSelectedCollectionId(defaultCollection?.id || null);
    }
  }, [isOpen, menuCollections, selectedCollectionId]);


  // Fetch menu items based on selected collection
  const { data: menuItems = [], isLoading: isLoadingMenuItems } = useQuery({
    queryKey: ["/api/menu-items", { collectionId: selectedCollectionId }],
    enabled: isOpen && selectedCollectionId !== null,
  });

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      category: "",
      imageUrl: "",
      available: 1,
      menuCollectionId: selectedCollectionId || null, // Set default to null or a valid ID
    },
  });

  // Update default menuCollectionId in form when selectedCollectionId changes
  useState(() => {
    if (selectedCollectionId !== null) {
      form.setValue("menuCollectionId", selectedCollectionId);
    }
  }, [selectedCollectionId]);

  // Add menu item mutation
  const addMenuItemMutation = useMutation({
    mutationFn: async (data: MenuItemFormData) => {
      // Ensure menuCollectionId is a number or null, not undefined
      const payload = {
        ...data,
        menuCollectionId: data.menuCollectionId === undefined ? null : data.menuCollectionId,
      };
      const response = await apiRequest("POST", "/api/menu-items", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", { collectionId: selectedCollectionId }] });
      setShowMenuItemForm(false);
      form.reset();
      toast({
        title: "Thành công",
        description: "Đã thêm món mới vào thực đơn",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm món mới.",
        variant: "destructive",
      });
    }
  });

  // Update menu item mutation
  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MenuItemFormData> }) => {
      // Ensure menuCollectionId is a number or null, not undefined
      const payload = {
        ...data,
        menuCollectionId: data.menuCollectionId === undefined ? null : data.menuCollectionId,
      };
      const response = await apiRequest("PUT", `/api/menu-items/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", { collectionId: selectedCollectionId }] });
      setEditingItem(null);
      setShowMenuItemForm(false);
      form.reset();
      toast({
        title: "Thành công",
        description: "Đã cập nhật món ăn",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật món ăn.",
        variant: "destructive",
      });
    }
  });

  // Delete menu item mutation
  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/menu-items/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", { collectionId: selectedCollectionId }] });
      toast({
        title: "Thành công",
        description: "Đã xóa món ăn khỏi thực đơn",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa món ăn.",
        variant: "destructive",
      });
    }
  });

  const handleSubmitMenuItem = async (data: MenuItemFormData) => {
    if (editingItem) {
      await updateMenuItemMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await addMenuItemMutation.mutateAsync(data);
    }
  };

  const handleEditMenuItem = (item: any) => {
    setEditingItem(item);
    setShowMenuItemForm(true);
    form.reset({
      name: item.name,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl || "",
      available: item.available,
      menuCollectionId: item.menuCollectionId,
    });
  };

  const handleDeleteMenuItem = async (id: number) => {
    if (confirm("Bạn có chắc muốn xóa món này?")) {
      await deleteMenuItemMutation.mutateAsync(id);
    }
  };

  const categories = [
    "Đồ uống",
    "Đồ ăn",
    "Đồ ăn vặt",
    "Tráng miệng",
    "Món chính",
    "Khai vị",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="bg-primary text-primary-foreground p-4 -m-6 mb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Thực đơn</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="view">Xem thực đơn</TabsTrigger>
            <TabsTrigger value="manage">Quản lý món ăn</TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="overflow-y-auto max-h-[70vh] p-2">
            <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-medium text-gray-700">Chọn bảng thực đơn:</h4>
                <Select
                    value={selectedCollectionId?.toString() || ""} // Safely convert to string
                    onValueChange={(value) => setSelectedCollectionId(parseInt(value))}
                    disabled={isLoadingCollections}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Chọn bảng thực đơn" />
                    </SelectTrigger>
                    <SelectContent>
                        {isLoadingCollections ? (
                            <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                        ) : menuCollections.length === 0 ? (
                            <SelectItem value="no-collections" disabled>Không có bảng thực đơn</SelectItem>
                        ) : (
                            menuCollections.filter(col => col.isActive === 1).map((collection) => (
                                <SelectItem key={collection.id} value={collection.id.toString()}>
                                    {collection.name}
                                </SelectItem>
                            ))
                        )}
                    </SelectContent>
                </Select>
            </div>

            {selectedCollectionId === null && !isLoadingCollections ? (
              <div className="text-center p-8 text-gray-500">Vui lòng chọn một bảng thực đơn để xem.</div>
            ) : isLoadingMenuItems ? (
              <div className="text-center p-8 text-gray-500">Đang tải món ăn...</div>
            ) : menuItems.length === 0 ? (
              <div className="text-center p-8 text-gray-500">Không có món ăn nào trong bảng này.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group"
                    onClick={() => onAddItem(item)}
                  >
                    <img
                      src={item.imageUrl || "https://via.placeholder.com/300x200?text=No+Image"}
                      alt={item.name}
                      className="w-full h-32 object-cover rounded mb-3 group-hover:scale-105 transition-transform"
                    />
                    <h4 className="font-medium text-gray-800 mb-1">{item.name}</h4>
                    <p className="text-primary font-semibold">{formatVND(item.price)}</p>
                    <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manage" className="overflow-y-auto max-h-[70vh] p-2">
            {/* Add New Menu Item Button */}
            <div className="mb-6">
              <Button
                onClick={() => {
                  setShowMenuItemForm(true);
                  setEditingItem(null);
                  form.reset({ menuCollectionId: selectedCollectionId || null }); // Reset and set default collection to null
                }}
                className="bg-green-500 hover:bg-green-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Thêm món mới
              </Button>
            </div>

            {/* Add/Edit Menu Item Form */}
            {showMenuItemForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingItem ? "Chỉnh sửa món ăn" : "Thêm món mới"}
                </h3>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmitMenuItem)} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tên món</FormLabel>
                            <FormControl>
                              <Input placeholder="Nhập tên món..." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Giá (VND)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Nhập giá..."
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Loại món</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Chọn loại món" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat} value={cat}>
                                    {cat}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="available"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Trạng thái</FormLabel>
                            <Select
                              onValueChange={(value) => field.onChange(parseInt(value))}
                              value={field.value?.toString() || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="1">Có sẵn</SelectItem>
                                <SelectItem value="0">Hết hàng</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Menu Collection Selector for adding/editing items */}
                      <FormField
                        control={form.control}
                        name="menuCollectionId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Thuộc bảng thực đơn</FormLabel>
                            <Select
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                value={field.value?.toString() || ""} // Safely convert to string
                                disabled={isLoadingCollections}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn bảng thực đơn" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {isLoadingCollections ? (
                                        <SelectItem value="loading" disabled>Đang tải...</SelectItem>
                                    ) : menuCollections.length === 0 ? (
                                        <SelectItem value="no-collections" disabled>Không có bảng thực đơn</SelectItem>
                                    ) : (
                                        menuCollections.filter(col => col.isActive === 1).map((collection) => (
                                            <SelectItem key={collection.id} value={collection.id.toString()}>
                                                {collection.name}
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </div>

                    <FormField
                      control={form.control}
                      name="imageUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>URL hình ảnh</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com/image.jpg" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        disabled={addMenuItemMutation.isPending || updateMenuItemMutation.isPending}
                      >
                        {editingItem ? "Cập nhật món" : "Thêm món"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowMenuItemForm(false);
                          setEditingItem(null);
                          form.reset();
                        }}
                      >
                        Hủy
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            )}

            {/* Menu Items List */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="text-lg font-semibold flex items-center">
                  <Utensils className="h-5 w-5 mr-2" />
                  Danh sách món ăn
                </h3>
              </div>
              <div className="overflow-x-auto">
                {isLoadingMenuItems ? (
                    <div className="p-4 text-center text-gray-500">Đang tải món ăn...</div>
                ) : menuItems.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">Không có món ăn nào trong bảng này.</div>
                ) : (
                    <Table className="min-w-full divide-y divide-gray-200">
                        <TableHeader className="bg-gray-50">
                            <TableRow>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tên món
                                </TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Loại
                                </TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Giá
                                </TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Trạng thái
                                </TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thuộc bảng
                                </TableHead>
                                <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Thao tác
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="bg-white divide-y divide-gray-200">
                            {menuItems.map((item) => (
                                <TableRow key={item.id} className="hover:bg-gray-50">
                                    <TableCell className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {item.imageUrl && (
                                                <img
                                                    src={item.imageUrl}
                                                    alt={item.name}
                                                    className="h-10 w-10 rounded-lg object-cover mr-3"
                                                />
                                            )}
                                            <div className="text-sm font-medium text-gray-900">{item.name}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.category}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                                        {formatVND(item.price)} VND
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                item.available
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                            }`}
                                        >
                                            {item.available ? "Có sẵn" : "Hết hàng"}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                      {menuCollections.find(col => col.id === item.menuCollectionId)?.name || 'N/A'}
                                    </TableCell>
                                    <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <div className="flex space-x-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEditMenuItem(item)}
                                            >
                                                <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteMenuItem(item.id)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}