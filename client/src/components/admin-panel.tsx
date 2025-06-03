import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMenuItemSchema } from "@shared/schema";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  menuItems: any[];
}

const menuItemFormSchema = insertMenuItemSchema.extend({
  available: z.number().min(0).max(1),
});

type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

export default function AdminPanel({ isOpen, onClose, menuItems }: AdminPanelProps) {
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      category: "",
      imageUrl: "",
      available: 1,
    },
  });

  // Add menu item mutation
  const addItemMutation = useMutation({
    mutationFn: async (data: MenuItemFormData) => {
      const response = await apiRequest("POST", "/api/menu-items", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setShowAddForm(false);
      form.reset();
      toast({
        title: "Thành công",
        description: "Đã thêm món mới vào thực đơn",
      });
    },
  });

  // Update menu item mutation
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MenuItemFormData> }) => {
      const response = await apiRequest("PUT", `/api/menu-items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      setEditingItem(null);
      form.reset();
      toast({
        title: "Thành công",
        description: "Đã cập nhật món ăn",
      });
    },
  });

  // Delete menu item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/menu-items/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
      toast({
        title: "Thành công",
        description: "Đã xóa món ăn khỏi thực đơn",
      });
    },
  });

  const handleSubmit = async (data: MenuItemFormData) => {
    if (editingItem) {
      await updateItemMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await addItemMutation.mutateAsync(data);
    }
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setShowAddForm(true);
    form.reset({
      name: item.name,
      price: item.price,
      category: item.category,
      imageUrl: item.imageUrl || "",
      available: item.available,
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("Bạn có chắc muốn xóa món này?")) {
      await deleteItemMutation.mutateAsync(id);
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
            <DialogTitle className="text-lg font-semibold">Quản lý Admin</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] p-2">
          {/* Add New Item Button */}
          <div className="mb-6">
            <Button
              onClick={() => {
                setShowAddForm(true);
                setEditingItem(null);
                form.reset();
              }}
              className="bg-green-500 hover:bg-green-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm món mới
            </Button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingItem ? "Chỉnh sửa món ăn" : "Thêm món mới"}
              </h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                            defaultValue={field.value.toString()}
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
                      disabled={addItemMutation.isPending || updateItemMutation.isPending}
                    >
                      {editingItem ? "Cập nhật" : "Thêm món"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
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
              <h3 className="text-lg font-semibold">Danh sách thực đơn</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên món
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Loại
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Giá
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">
                        {new Intl.NumberFormat('vi-VN').format(item.price)} VND
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.available
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.available ? "Có sẵn" : "Hết hàng"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}