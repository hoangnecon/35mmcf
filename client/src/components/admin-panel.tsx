// client/src/components/admin-panel.tsx
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMenuCollectionSchema } from "@shared/schema"; // Import new schema
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
import { Textarea } from "@/components/ui/textarea"; // Keep if needed for description
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Edit, Trash2, List } from "lucide-react"; // Added List icon
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch"; // For active/inactive toggle
import { Label } from "@/components/ui/label"; // For Switch label
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table"; // For displaying collections

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  // menuItems prop will be removed from here as it's not managed in admin panel anymore
}

// Schema for Menu Collection form
const menuCollectionFormSchema = insertMenuCollectionSchema.extend({
  isActive: z.number().min(0).max(1), // Adjust for boolean-like number
});

type MenuCollectionFormData = z.infer<typeof menuCollectionFormSchema>;

export default function AdminPanel({ isOpen, onClose }: AdminPanelProps) {
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch menu collections
  const { data: menuCollections = [], isLoading: isLoadingCollections } = useQuery({
    queryKey: ["/api/menu-collections"],
    enabled: isOpen,
  });

  const form = useForm<MenuCollectionFormData>({
    resolver: zodResolver(menuCollectionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: 1, // Default to active
    },
  });

  // Add menu collection mutation
  const addCollectionMutation = useMutation({
    mutationFn: async (data: MenuCollectionFormData) => {
      const response = await apiRequest("POST", "/api/menu-collections", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-collections"] });
      setShowAddForm(false);
      form.reset();
      toast({
        title: "Thành công",
        description: "Đã thêm bảng thực đơn mới",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể thêm bảng thực đơn mới. Tên có thể đã tồn tại.",
        variant: "destructive",
      });
    }
  });

  // Update menu collection mutation
  const updateCollectionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MenuCollectionFormData> }) => {
      const response = await apiRequest("PUT", `/api/menu-collections/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-collections"] });
      setEditingCollection(null);
      setShowAddForm(false); // Hide form after update
      form.reset();
      toast({
        title: "Thành công",
        description: "Đã cập nhật bảng thực đơn",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể cập nhật bảng thực đơn.",
        variant: "destructive",
      });
    }
  });

  // Delete menu collection mutation
  const deleteCollectionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/menu-collections/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-collections"] });
      toast({
        title: "Thành công",
        description: "Đã xóa bảng thực đơn",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể xóa bảng thực đơn. Có thể có món ăn đang liên kết.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (data: MenuCollectionFormData) => {
    if (editingCollection) {
      await updateCollectionMutation.mutateAsync({ id: editingCollection.id, data });
    } else {
      await addCollectionMutation.mutateAsync(data);
    }
  };

  const handleEdit = (collection: any) => {
    setEditingCollection(collection);
    setShowAddForm(true);
    form.reset({
      name: collection.name,
      description: collection.description || "",
      isActive: collection.isActive,
    });
  };

  const handleDelete = async (id: number) => {
    if (confirm("Bạn có chắc muốn xóa bảng thực đơn này? Các món ăn trong bảng này sẽ không bị xóa nhưng sẽ không còn thuộc về bảng này nữa (có thể gây lỗi nếu không được xử lý).")) {
      await deleteCollectionMutation.mutateAsync(id);
    }
  };

  const handleToggleActive = async (collection: any, newStatus: boolean) => {
    await updateCollectionMutation.mutateAsync({
      id: collection.id,
      data: { isActive: newStatus ? 1 : 0 }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="bg-primary text-primary-foreground p-4 -m-6 mb-6">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Quản lý Admin</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[70vh] p-2">
          {/* Add New Collection Button */}
          <div className="mb-6">
            <Button
              onClick={() => {
                setShowAddForm(true);
                setEditingCollection(null);
                form.reset();
              }}
              className="bg-green-500 hover:bg-green-600"
            >
              <Plus className="h-4 w-4 mr-2" />
              Thêm bảng thực đơn mới
            </Button>
          </div>

          {/* Add/Edit Collection Form */}
          {showAddForm && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingCollection ? "Chỉnh sửa bảng thực đơn" : "Thêm bảng thực đơn mới"}
              </h3>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên bảng thực đơn</FormLabel>
                        <FormControl>
                          <Input placeholder="Ví dụ: Thực đơn chính, Thực đơn Tết..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mô tả</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Mô tả về bảng thực đơn này..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-center space-x-2">
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 space-x-3 w-full">
                          <div className="space-y-0.5">
                            <FormLabel>Kích hoạt</FormLabel>
                            <FormMessage />
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value === 1}
                              onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      disabled={addCollectionMutation.isPending || updateCollectionMutation.isPending}
                    >
                      {editingCollection ? "Cập nhật bảng" : "Thêm bảng"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingCollection(null);
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

          {/* Menu Collections List */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="text-lg font-semibold flex items-center">
                <List className="h-5 w-5 mr-2" />
                Danh sách bảng thực đơn
              </h3>
            </div>
            <div className="overflow-x-auto">
              {isLoadingCollections ? (
                <div className="p-4 text-center text-gray-500">Đang tải bảng thực đơn...</div>
              ) : menuCollections.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Chưa có bảng thực đơn nào.</div>
              ) : (
                <Table className="min-w-full divide-y divide-gray-200">
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tên bảng
                      </TableHead>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Mô tả
                      </TableHead>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </TableHead>
                      <TableHead className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="bg-white divide-y divide-gray-200">
                    {menuCollections.map((collection: any) => (
                      <TableRow key={collection.id} className="hover:bg-gray-50">
                        <TableCell className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {collection.name}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {collection.description || "Không có mô tả"}
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap">
                          <Switch
                            checked={collection.isActive === 1}
                            onCheckedChange={(checked) => handleToggleActive(collection, checked)}
                            disabled={updateCollectionMutation.isPending}
                          />
                          <Label htmlFor={`active-switch-${collection.id}`} className="ml-2">
                            {collection.isActive ? "Hoạt động" : "Không hoạt động"}
                          </Label>
                        </TableCell>
                        <TableCell className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(collection)}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(collection.id)}
                              className="text-red-600 hover:text-red-800"
                              disabled={deleteCollectionMutation.isPending}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}