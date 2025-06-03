// client/src/pages/menu-page.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { formatVND } from "@/lib/utils";
import {
  X,
  ShoppingCart,
  Utensils,
  Table as TableIcon,
  ArrowLeft,
  Filter,
  Search,
  List,
  Plus,
  Edit,
  Trash2
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
import { insertMenuItemSchema, Table, MenuCollection, OrderItem as OrderItemType, MenuItem as MenuItemType, Order as OrderType } from "@shared/schema";
import { z } from "zod";

interface MenuPageProps {
  tableId: number | null;
  // initialOrder bây giờ là OrderType | null, đảm bảo nó có ID và các thuộc tính khác
  initialOrder: OrderType | null;
  onGoBack: () => void;
}

const menuItemFormSchemaClient = insertMenuItemSchema.extend({
  available: z.number().min(0).max(1),
  menuCollectionId: z.number().nullable(),
});

type MenuItemFormData = z.infer<typeof menuItemFormSchemaClient>;

const ALL_COLLECTIONS_VALUE = "_all_collections_";

export default function MenuPage({ tableId, initialOrder, onGoBack }: MenuPageProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [currentOrderId, setCurrentOrderId] = useState<number | null>(initialOrder?.id || null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("view");
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [showMenuItemForm, setShowMenuItemForm] = useState(false);

  // Query để lấy dữ liệu order mới nhất cho bàn này, bao gồm cả items
  // Điều này là quan trọng để MenuPage luôn có cái nhìn cập nhật về order
  const { data: currentOrderWithItems, isLoading: isLoadingCurrentOrderWithItems } = useQuery<OrderType & { items: OrderItemType[] } | null>({
    queryKey: ["/api/tables", tableId, "active-order"],
    // Chỉ chạy query khi có tableId (nghĩa là có bàn được chọn để order)
    enabled: tableId !== null,
    staleTime: 0, // Luôn kiểm tra lại ngay lập tức
    refetchInterval: 5000, // Refetch định kỳ để cập nhật tổng tiền, số lượng items
    onSuccess: (data) => {
      // Cập nhật currentOrderId nếu query trả về order mới
      if (data && data.id !== currentOrderId) {
        setCurrentOrderId(data.id);
        console.log("MenuPage: active-order query updated currentOrderId to:", data.id);
      } else if (!data && currentOrderId !== null && tableId !== null) {
        // Nếu không có active order nào được trả về (sau khi fetch lại)
        // và trước đó có currentOrderId, có thể order đã bị xóa/hoàn thành
        // Trường hợp này, currentOrderId nên được reset
        setCurrentOrderId(null);
        console.log("MenuPage: active-order query returned null, resetting currentOrderId.");
      }
    },
    onError: (error) => {
      console.error("MenuPage: active-order query error:", error);
      // Xử lý lỗi, có thể reset currentOrderId nếu lỗi là 404 (order not found)
      setCurrentOrderId(null);
    }
  });


  // Đồng bộ `currentOrderId` với `initialOrder` và `currentOrderWithItems`
  // Effect này đảm bảo `currentOrderId` luôn là ID của order active cho bàn được chọn
  useEffect(() => {
    // Ưu tiên `initialOrder` nếu nó được cung cấp và hợp lệ (khi PosPage vừa chuyển sang)
    if (initialOrder && initialOrder.id && initialOrder.tableId === tableId) {
      if (currentOrderId !== initialOrder.id) {
        setCurrentOrderId(initialOrder.id);
        console.log("MenuPage Effect: Setting currentOrderId from initialOrder:", initialOrder.id);
      }
    } else if (tableId !== null) {
      // Nếu không có initialOrder, hoặc initialOrder không khớp bàn,
      // thì dựa vào `currentOrderWithItems` (kết quả từ query)
      if (currentOrderWithItems && currentOrderWithItems.id) {
        if (currentOrderId !== currentOrderWithItems.id) {
          setCurrentOrderId(currentOrderWithItems.id);
          console.log("MenuPage Effect: Setting currentOrderId from currentOrderWithItems:", currentOrderWithItems.id);
        }
      } else {
        // Nếu không có order nào cho bàn này, đặt currentOrderId là null
        if (currentOrderId !== null) {
          setCurrentOrderId(null);
          console.log("MenuPage Effect: No active order found, setting currentOrderId to null.");
        }
      }
    } else {
      // Nếu không có tableId nào, currentOrderId phải là null
      if (currentOrderId !== null) {
        setCurrentOrderId(null);
        console.log("MenuPage Effect: No tableId, setting currentOrderId to null.");
      }
    }
  }, [tableId, initialOrder, currentOrderWithItems, currentOrderId]); // Thêm currentOrderId vào dependency array


  const { data: menuCollections = [], isLoading: isLoadingCollections } = useQuery<MenuCollection[]>({
    queryKey: ["/api/menu-collections"],
    onSuccess: (data) => {
      if (selectedCollectionId === null && data.length > 0) {
        const defaultCollection = data.find(col => col.isActive === 1) || data[0];
        if (defaultCollection) {
          setSelectedCollectionId(defaultCollection.id);
        }
      }
    }
  });

  const { data: menuItems = [], isLoading: isLoadingMenuItems } = useQuery<MenuItemType[]>({
    queryKey: ["/api/menu-items", { collectionId: selectedCollectionId, searchTerm }],
    queryFn: async ({ queryKey }) => {
      const [_key, { collectionId, searchTerm }] = queryKey as [string, { collectionId: number | null, searchTerm: string }];
      let url = `/api/menu-items`;
      const params = new URLSearchParams();
      if (collectionId !== null && collectionId !== undefined) {
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

  const addItemMutation = useMutation({
    mutationFn: async ({ orderId, item }: { orderId: number; item: Partial<OrderItemType> }) => {
      console.log(`MenuPage: addItemMutation - Adding item to order ${orderId}:`, item);
      const response = await apiRequest("POST", `/api/orders/${orderId}/items`, item);
      return response.json();
    },
    onSuccess: (data, variables) => {
      console.log(`MenuPage: addItemMutation - Success adding item. Item ID: ${data.id}, Order ID: ${variables.orderId}`);
      if (tableId) {
        // Invalidate để refetch active order và cập nhật OrderPanel (trên PosPage)
        queryClient.invalidateQueries({ queryKey: ["/api/tables", tableId, "active-order"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/revenue/daily"] });
      toast({
        title: "Thêm món thành công",
        description: "Món ăn đã được thêm vào đơn hàng.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      console.error("MenuPage: addItemMutation - Error:", error);
      toast({
        title: "Lỗi thêm món",
        description: error.message || "Không thể thêm món. Vui lòng kiểm tra lại.",
        variant: "destructive",
      });
    }
  });

  const form = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemFormSchemaClient),
    defaultValues: {
      name: "",
      price: 0,
      category: "",
      imageUrl: "",
      available: 1,
      menuCollectionId: selectedCollectionId,
    },
  });

  useEffect(() => {
    form.setValue("menuCollectionId", selectedCollectionId);
  }, [selectedCollectionId, form]);

  const addMenuItemMutation = useMutation({
    mutationFn: async (data: MenuItemFormData) => {
      const payload = { ...data };
      const response = await apiRequest("POST", "/api/menu-items", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", { collectionId: selectedCollectionId, searchTerm }] });
      setShowMenuItemForm(false);
      form.reset({ name: "", price: 0, category: "", imageUrl: "", available: 1, menuCollectionId: selectedCollectionId });
      toast({ title: "Thành công", description: "Đã thêm món mới vào thực đơn" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message || "Không thể thêm món mới.", variant: "destructive" });
    }
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MenuItemFormData> }) => {
      const payload = { ...data };
      const response = await apiRequest("PUT", `/api/menu-items/${id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", { collectionId: selectedCollectionId, searchTerm }] });
      setEditingItem(null);
      setShowMenuItemForm(false);
      form.reset({ name: "", price: 0, category: "", imageUrl: "", available: 1, menuCollectionId: selectedCollectionId });
      toast({ title: "Thành công", description: "Đã cập nhật món ăn" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message || "Không thể cập nhật món ăn.", variant: "destructive" });
    }
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/menu-items/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", { collectionId: selectedCollectionId, searchTerm }] });
      toast({ title: "Thành công", description: "Đã xóa món ăn khỏi thực đơn" });
    },
    onError: (error: any) => {
      toast({ title: "Lỗi", description: error.message || "Không thể xóa món ăn.", variant: "destructive" });
    }
  });

  const handleSubmitMenuItem = async (data: MenuItemFormData) => {
    if (editingItem) {
      await updateMenuItemMutation.mutateAsync({ id: editingItem.id, data });
    } else {
      await addMenuItemMutation.mutateAsync(data);
    }
  };

  const handleEditMenuItem = (item: MenuItemType) => {
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

  const categories = ["Đồ uống", "Đồ ăn", "Đồ ăn vặt", "Tráng miệng", "Món chính", "Khai vị"];

  const handleAddMenuItemToOrder = async (menuItem: MenuItemType) => {
    // Sử dụng `currentOrderId` được quản lý trong MenuPage, đây là ID order active hiện tại
    const orderIdForAction = currentOrderId;

    if (tableId === null) {
      toast({
        title: "Chưa chọn bàn",
        description: "Vui lòng chọn bàn từ trang 'Phòng bàn' để gọi món.",
        variant: "destructive",
      });
      return;
    }

    if (!orderIdForAction) {
      toast({
        title: "Đơn hàng chưa sẵn sàng",
        description: `Đơn hàng cho bàn này chưa được tạo hoặc không tìm thấy. Vui lòng thử lại hoặc chọn lại bàn. (Bàn ID: ${tableId})`,
        variant: "destructive",
      });
      console.log("Order ID not found for action:", { currentOrderId, tableId });
      return;
    }

    const orderItem: Partial<OrderItemType> = {
      orderId: orderIdForAction,
      menuItemId: menuItem.id,
      menuItemName: menuItem.name,
      quantity: 1,
      unitPrice: menuItem.price,
      totalPrice: menuItem.price,
      note: "",
    };

    try {
      await addItemMutation.mutateAsync({
        orderId: orderIdForAction,
        item: orderItem,
      });
    } catch (error) {
      console.error("Error adding menu item:", error);
    }
  };

  // Lấy thông tin bàn để hiển thị
  const selectedTableInfo = tableId ? queryClient.getQueryData<Table[]>(["/api/tables"])?.find(t => t.id === tableId) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col w-full">
      <header className="bg-primary text-primary-foreground p-4 shadow-lg flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onGoBack} className="text-white hover:bg-white hover:bg-opacity-20">
            <ArrowLeft className="h-4 w-4 mr-2" /> Quay lại
          </Button>
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-6 w-6" /> <h1 className="text-xl font-bold">Thực đơn</h1>
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="opacity-90">Admin</div> <div className="opacity-75 text-xs">Phiên bản 2.6.1</div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto shrink-0">
          <h3 className="text-lg font-semibold mb-4 flex items-center"> <Filter className="h-5 w-5 mr-2" /> Lọc thực đơn </h3>
          <div className="mb-4">
            <label htmlFor="search-menu" className="block text-sm font-medium text-gray-700 mb-2"> Tìm kiếm món </label>
            <div className="relative">
              <Input id="search-menu" placeholder="Tìm kiếm..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
          <Separator className="my-4" />
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center"> <List className="h-4 w-4 mr-1 text-gray-500" /> Bảng thực đơn </h4>
            <Select
              value={selectedCollectionId === null ? ALL_COLLECTIONS_VALUE : selectedCollectionId.toString()}
              onValueChange={(value) => {
                if (value === ALL_COLLECTIONS_VALUE) { setSelectedCollectionId(null); }
                else { setSelectedCollectionId(parseInt(value)); }
              }}
              disabled={isLoadingCollections}
            >
              <SelectTrigger> <SelectValue placeholder="Tất cả bảng thực đơn" /> </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_COLLECTIONS_VALUE}>Tất cả bảng</SelectItem>
                {isLoadingCollections ? (
                  <SelectItem value="loading_coll_filter" disabled>Đang tải...</SelectItem>
                ) : menuCollections.length === 0 ? (
                  <SelectItem value="no_coll_filter" disabled>Không có bảng</SelectItem>
                ) : (
                  menuCollections.filter(col => col.isActive === 1).map((collection) => (
                    <SelectItem key={collection.id} value={collection.id.toString()}> {collection.name} </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {tableId && currentOrderId && selectedTableInfo ? ( // Kiểm tra cả selectedTableInfo
            <div className="flex items-center mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <TableIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-blue-800 text-sm font-medium">
                Đang gọi món cho: <span className="font-bold">{selectedTableInfo.name}</span>
                <span className="ml-2 text-gray-600">(Đơn hàng ID: {currentOrderId})</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
              <TableIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium"> Chỉ xem thực đơn. Chọn bàn từ trang "Phòng bàn" để bắt đầu gọi món. </span>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="view">Xem thực đơn</TabsTrigger>
              <TabsTrigger value="manage">Quản lý món ăn</TabsTrigger>
            </TabsList>
            <TabsContent value="view" className="overflow-y-auto max-h-[calc(100vh-400px)] p-2">
              {isLoadingMenuItems ? (
                <div className="text-center p-8 text-gray-500">Đang tải món ăn...</div>
              ) : menuItems.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  {selectedCollectionId ? "Không có món ăn nào trong bảng này." : "Không có món ăn nào để hiển thị."}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {menuItems.map((item) => (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-all group flex flex-col ${(!tableId || !currentOrderId) ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
                      // Disabled thêm món nếu không có tableId hoặc currentOrderId
                      onClick={() => (tableId && currentOrderId) ? handleAddMenuItemToOrder(item) : null}
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
              <div className="mb-6">
                <Button
                  onClick={() => {
                    setShowMenuItemForm(true);
                    setEditingItem(null);
                    form.reset({ name: "", price: 0, category: "", imageUrl: "", available: 1, menuCollectionId: selectedCollectionId });
                  }}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Plus className="h-4 w-4 mr-2" /> Thêm món mới
                </Button>
              </div>
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
                              <Select
                                onValueChange={field.onChange}
                                value={field.value || ""}
                              >
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
                                value={field.value != null ? field.value.toString() : "1"}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn trạng thái" />
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
                        <FormField
                          control={form.control}
                          name="menuCollectionId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Thuộc bảng thực đơn</FormLabel>
                              <Select
                                onValueChange={(value) => field.onChange(value ? parseInt(value) : null)}
                                value={field.value != null ? field.value.toString() : ""}
                                disabled={isLoadingCollections}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Chọn bảng thực đơn" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {isLoadingCollections ? (
                                    <SelectItem value="loading_mc_form_placeholder" disabled>
                                      Đang tải...
                                    </SelectItem>
                                  ) : menuCollections.length === 0 ? (
                                    <SelectItem value="no_mc_form_placeholder" disabled>
                                      Không có bảng
                                    </SelectItem>
                                  ) : (
                                    menuCollections
                                      .filter((col) => col.isActive === 1)
                                      .map((collection) => (
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
                              <Input placeholder="https://example.com/image.jpg" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button type="submit" disabled={addMenuItemMutation.isPending || updateMenuItemMutation.isPending}>
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
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Utensils className="h-5 w-5 mr-2" /> Danh sách món ăn
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  {isLoadingMenuItems ? (
                    <div className="p-4 text-center text-gray-500">Đang tải...</div>
                  ) : menuItems.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">Không có món ăn.</div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên món</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thuộc bảng</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {menuItems.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {item.imageUrl && (
                                  <img src={item.imageUrl} alt={item.name} className="h-10 w-10 rounded-lg object-cover mr-3" />
                                )}
                                <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{formatVND(item.price)} VND</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                {item.available ? "Có sẵn" : "Hết hàng"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {menuCollections.find(col => col.id === item.menuCollectionId)?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline" onClick={() => handleEditMenuItem(item)}>
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDeleteMenuItem(item.id)} className="text-red-600 hover:text-red-800">
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