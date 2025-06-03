// client/src/pages/menu-page.tsx
import { useState, useEffect } from "react";
// Removed useLocation and useSearch from wouter as props are passed directly
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import {
  X,
  ShoppingCart,
  Utensils,
  Table,
  ArrowLeft,
  ChevronRight,
  Filter,
  Search,
  List,
  Phone,
  MessageCircle,
  Plus, // Imported Plus
  Edit, // Imported Edit
  Trash2 // Imported Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMenuItemSchema } from "@shared/schema";
import { z } from "zod";

// Define props for MenuPage when used as a component
interface MenuPageProps {
  tableId: number | null;
  initialOrder: any; // The active order object to pass
  onGoBack: () => void; // Callback to go back to tables view
}

// Extend MenuItemFormData to include menuCollectionId for client-side form
const menuItemFormSchema = insertMenuItemSchema.extend({
  available: z.number().min(0).max(1),
  menuCollectionId: z.number().nullable(),
});

type MenuItemFormData = z.infer<typeof menuItemFormSchema>;

// Changed from default export function MenuPage() to named export for component use
export default function MenuPage({ tableId, initialOrder, onGoBack }: MenuPageProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [currentOrderId, setCurrentOrderId] = useState<number | null>(initialOrder?.id || null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("view");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showMenuItemForm, setShowMenuItemForm] = useState(false);


  // Fetch active order for the selected table (if any)
  const { data: activeOrder, isLoading: isLoadingActiveOrder } = useQuery({
    queryKey: ["/api/tables", tableId, "active-order"],
    enabled: tableId !== null, // Only enabled if tableId is present
    onSuccess: (data) => {
      if (data) {
        setCurrentOrderId(data.id);
      }
    },
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000,
  });

  // Fetch menu collections
  const { data: menuCollections = [], isLoading: isLoadingCollections } = useQuery({
    queryKey: ["/api/menu-collections"],
    onSuccess: (data) => {
      if (selectedCollectionId === null && data.length > 0) {
        const defaultCollection = data.find(col => col.isActive === 1) || data[0];
        setSelectedCollectionId(defaultCollection?.id || null);
      }
    }
  });

  // Fetch menu items based on selected collection and search term
  const { data: menuItems = [], isLoading: isLoadingMenuItems } = useQuery({
    queryKey: ["/api/menu-items", { collectionId: selectedCollectionId, searchTerm }],
    enabled: selectedCollectionId !== null,
    queryFn: async ({ queryKey }) => {
      const [_key, { collectionId, searchTerm }] = queryKey as [string, { collectionId: number | null, searchTerm: string }];
      let url = `/api/menu-items`;
      const params = new URLSearchParams();
      if (collectionId !== null) {
        params.append("collectionId", collectionId.toString());
      }
      if (searchTerm) {
        params.append("searchTerm", searchTerm);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      const response = await apiRequest("GET", url);
      return await response.json();
    },
  });

  // Create order mutation (only called if tableId is present and no initialOrder)
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await apiRequest("POST", "/api/orders", orderData);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentOrderId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.setQueryData(["/api/tables", tableId, "active-order"], data);
      toast({
        title: "Đơn hàng mới",
        description: `Đã tạo đơn hàng mới cho bàn ${tableId}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi tạo đơn",
        description: error.message || "Không thể tạo đơn hàng mới.",
        variant: "destructive",
      });
    }
  });

  // Add item to order mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ orderId, item }: { orderId: number; item: any }) => {
      const response = await apiRequest("POST", `/api/orders/${orderId}/items`, item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", tableId, "active-order"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revenue/daily"] });
      toast({
        title: "Thêm món thành công",
        description: "Món ăn đã được thêm vào đơn hàng.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Lỗi thêm món",
        description: error.message || "Không thể thêm món ăn vào đơn hàng. Vui lòng kiểm tra lại.",
        variant: "destructive",
      });
    }
  });

  // Initialize form for adding/editing menu items
  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      category: "",
      imageUrl: "",
      available: 1,
      menuCollectionId: selectedCollectionId || null,
    },
  });

  // Update default menuCollectionId in form when selectedCollectionId changes
  useEffect(() => {
    if (selectedCollectionId !== null) {
      form.setValue("menuCollectionId", selectedCollectionId);
    }
  }, [selectedCollectionId]);

  // Add menu item mutation
  const addMenuItemMutation = useMutation({
    mutationFn: async (data: MenuItemFormData) => {
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

  // Effect to manage currentOrderId and potentially create order
  useEffect(() => {
    // If initialOrder is provided from PosPage, prioritize it
    if (initialOrder && initialOrder.id !== currentOrderId) {
      setCurrentOrderId(initialOrder.id);
    }

    // Only attempt to create an order if a tableId is present AND there's no currentOrderId
    // and no order is already being actively fetched/created.
    // This logic ensures order is created ONLY when a table is selected AND there's no order yet.
    if (tableId !== null && !currentOrderId && !isLoadingActiveOrder && !createOrderMutation.isPending) {
        // Double-check if activeOrder query has results
        const activeOrderDataFromCache = queryClient.getQueryData(["/api/tables", tableId, "active-order"]);

        // Create order only if no existing active order is found in cache/from query
        if (!activeOrderDataFromCache) {
            const table = queryClient.getQueryData(["/api/tables"])?.find((t: any) => t.id === tableId);
            if (table) {
                createOrderMutation.mutate({
                    tableId: table.id,
                    tableName: table.name,
                    status: "active",
                    total: 0,
                });
            }
        } else if (activeOrderDataFromCache && activeOrderDataFromCache.id !== currentOrderId) {
            // If active order is in cache but not set as currentOrderId, set it
            setCurrentOrderId(activeOrderDataFromCache.id);
        }
    }
    // Always update currentOrderId from activeOrder (which is refetched regularly)
    if (activeOrder && activeOrder.id !== currentOrderId) {
      setCurrentOrderId(activeOrder.id);
    }
  }, [tableId, initialOrder, currentOrderId, activeOrder, isLoadingActiveOrder, createOrderMutation, queryClient]);


  const handleAddMenuItem = async (menuItem: any) => {
    // FIX: Only check for currentOrderId if tableId is present.
    // If no tableId, prevent adding items.
    if (tableId === null) { // NEW: Check if tableId is null directly
      toast({
        title: "Lỗi",
        description: "Vui lòng chọn bàn trước khi thêm món.",
        variant: "destructive",
      });
      return;
    }
    
    // If tableId is present but currentOrderId is null, it means order hasn't been created/fetched yet.
    if (!currentOrderId) {
      toast({
        title: "Lỗi",
        description: "Đơn hàng chưa sẵn sàng. Vui lòng thử lại sau giây lát hoặc chọn lại bàn.",
        variant: "destructive",
      });
      return;
    }


    const orderItem = {
      orderId: currentOrderId,
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity: 1,
      unitPrice: menuItem.price,
      totalPrice: menuItem.price,
      note: "",
    };

    try {
      await addItemMutation.mutateAsync({
        orderId: currentOrderId,
        item: orderItem,
      });
    } catch (error) {
      console.error("Error adding menu item:", error);
    }
  };

  const handleGoBackFunc = () => {
    onGoBack();
  };

  const selectedTable = queryClient.getQueryData(["/api/tables"])?.find((t: any) => t.id === tableId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      {/* Header for Menu Page */}
      <header className="bg-primary text-primary-foreground p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={handleGoBackFunc} className="text-white hover:bg-white hover:bg-opacity-20">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại
          </Button>
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-6 w-6" />
            <h1 className="text-xl font-bold">Thực đơn</h1>
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="opacity-90">Admin</div>
          <div className="opacity-75 text-xs">Phiên bản 2.6.1</div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Filters and Search */}
        <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Lọc thực đơn
          </h3>

          <div className="mb-4">
            <label htmlFor="search-menu" className="block text-sm font-medium text-gray-700 mb-2">
              Tìm kiếm món
            </label>
            <div className="relative">
              <Input
                id="search-menu"
                placeholder="Tìm kiếm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <Separator className="my-4" />

          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <List className="h-4 w-4 mr-1 text-gray-500" />
              Bảng thực đơn
            </h4>
            <Select
              value={selectedCollectionId?.toString() || ""}
              onValueChange={(value) => setSelectedCollectionId(parseInt(value))}
              disabled={isLoadingCollections}
            >
              <SelectTrigger>
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
        </div>

        {/* Right Panel - Menu Items Grid or Management Tabs */}
        <div className="flex-1 p-6 overflow-y-auto">
          {tableId && ( // Show "Đang gọi món cho" if table is selected
            <div className="flex items-center mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <Table className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-blue-800 text-sm font-medium">
                Đang gọi món cho: <span className="font-bold">{selectedTable?.name || `Bàn ${tableId}`}</span>
                {currentOrderId && <span className="ml-2 text-gray-600"> (Đơn hàng ID: {currentOrderId})</span>}
              </span>
            </div>
          )}
          {!tableId && ( // Show warning if no table selected
            <div className="flex items-center mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
              <Table className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">
                Vui lòng chọn một bàn để bắt đầu gọi món. Bạn chỉ có thể xem thực đơn lúc này.
              </span>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="view">Xem thực đơn</TabsTrigger>
              <TabsTrigger value="manage">Quản lý món ăn</TabsTrigger>
            </TabsList>

            <TabsContent value="view" className="overflow-y-auto max-h-[calc(100vh-350px)] p-2">
              {isLoadingMenuItems ? (
                <div className="text-center p-8 text-gray-500">Đang tải món ăn...</div>
              ) : menuItems.length === 0 ? (
                <div className="text-center p-8 text-gray-500">Không có món ăn nào trong bảng này hoặc không tìm thấy.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer group flex flex-col"
                      onClick={() => handleAddMenuItem(item)}
                    >
                      <img
                        src={item.imageUrl || "https://via.placeholder.com/300x200?text=No+Image"}
                        alt={item.name}
                        className="w-full h-32 object-cover rounded mb-3 group-hover:scale-105 transition-transform"
                      />
                      <h4 className="font-medium text-gray-800 mb-1 flex-1">{item.name}</h4>
                      <p className="text-primary font-semibold text-lg">{formatVND(item.price)}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                      {!item.available && (
                        <span className="text-red-500 text-xs font-medium mt-1">Hết hàng</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manage" className="overflow-y-auto max-h-[calc(100vh-350px)] p-2">
              {/* Add New Menu Item Button */}
              <div className="mb-6">
                <Button
                  onClick={() => {
                    setShowMenuItemForm(true);
                    setEditingItem(null);
                    form.reset({ menuCollectionId: selectedCollectionId || null });
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

                        {/* Menu Collection Selector for adding/editing items */}
                        <FormField
                          control={form.control}
                          name="menuCollectionId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Thuộc bảng thực đơn</FormLabel>
                              <Select
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  value={field.value?.toString() || ""}
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
                                  Thuộc bảng
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
                                    {formatVND(item.price)} VND
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {menuCollections.find(col => col.id === item.menuCollectionId)?.name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
                                </td>
                              </tr>
                          ))}
                        </tbody>
                    </table>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}