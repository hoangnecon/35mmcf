import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TableGrid from "@/components/table-grid";
import OrderPanel from "@/components/order-panel";
import RevenueModal from "@/components/revenue-modal";
import AdminPanel from "@/components/admin-panel";
import { Button } from "@/components/ui/button";
import { formatVND, getUtcIsoStringForLocalDayStart } from "@/lib/utils";
import {
  Utensils,
  ShoppingCart,
  Settings,
  Phone,
  MessageCircle,
  TrendingUp,
  Table as TableIcon,
  Filter,
  Search,
  List,
  Plus,
  Edit,
  Trash2,
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
import { apiRequest } from "@/lib/queryClient";

const menuItemFormSchemaClient = insertMenuItemSchema.extend({
  available: z.number().min(0).max(1),
  menuCollectionId: z.number().nullable(),
});

type MenuItemFormData = z.infer<typeof menuItemFormSchemaClient>;

interface DailyRevenueData {
  revenue: number;
}

const ALL_COLLECTIONS_VALUE = "_all_collections_";
const UNASSIGNED_COLLECTION_VALUE = "unassigned-collection"; // Đổi giá trị cho "Không chọn (Chung)"
const SELECTED_TABLE_STORAGE_KEY = "selectedTableId";

export default function PosPage() {
  const [selectedTableId, setSelectedTableId] = useState<number | null>(() => {
    const storedTableId = localStorage.getItem(SELECTED_TABLE_STORAGE_KEY);
    return storedTableId ? parseInt(storedTableId) : null;
  });
  const [activeOrder, setActiveOrder] = useState<(OrderType & { items: OrderItemType[] }) | null>(null);
  const [isRevenueOpen, setIsRevenueOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tables' | 'menu'>('tables');
  const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState<MenuItemType | null>(null);
  const [showMenuItemForm, setShowMenuItemForm] = useState(false);
  const [selectedDateForRevenue, setSelectedDateForRevenue] = useState<Date | undefined>(new Date());

  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedTableId !== null) {
      localStorage.setItem(SELECTED_TABLE_STORAGE_KEY, selectedTableId.toString());
    } else {
      localStorage.removeItem(SELECTED_TABLE_STORAGE_KEY);
    }
  }, [selectedTableId]);

  const { data: tables = [] } = useQuery<Table[]>({
    queryKey: ["/api/tables"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/tables");
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || "Failed to fetch tables");
      }
      return response.json();
    },
  });

  const { data: dailyRevenueData, isLoading: isLoadingDailyRevenue } = useQuery<DailyRevenueData>({
    queryKey: ["/api/revenue/daily", getUtcIsoStringForLocalDayStart(selectedDateForRevenue)],
    queryFn: async ({ queryKey }) => {
      const [_key, dateParam] = queryKey as [string, string | undefined];
      const url = dateParam ? `/api/revenue/daily?date=${dateParam}` : '/api/revenue/daily';
      const response = await apiRequest("GET", url);
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || "Failed to fetch daily revenue");
      }
      return response.json();
    },
  });

  const {
    data: currentOrderWithItems,
    isLoading: isLoadingCurrentOrder,
    isFetching: isFetchingCurrentOrder,
    refetch: refetchCurrentOrder
  } = useQuery<(OrderType & { items: OrderItemType[] }) | null>({
    queryKey: ["/api/tables", selectedTableId, "active-order"],
    enabled: selectedTableId !== null,
    staleTime: 0,
    cacheTime: 5 * 60 * 1000,
    queryFn: async ({ queryKey }) => {
      const [_key, tableId] = queryKey as [string, number, string];
      console.log(`Fetching active order for table ${tableId}`);
      const response = await apiRequest("GET", `/api/tables/${tableId}/active-order`);
      if (response.status === 404) {
        console.log(`No active order found for table ${tableId}`);
        return null;
      }
      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Failed to fetch active order for table ${tableId}:`, errorBody);
        throw new Error(errorBody || "Failed to fetch active order");
      }
      const data = await response.json();
      console.log(`Active order for table ${tableId}:`, JSON.stringify(data, null, 2));
      return data;
    },
    onError: (error: any) => {
      console.error("PosPage: active-order query error:", error);
      setActiveOrder(null);
      toast({
        title: "Lỗi",
        description: "Không thể tải đơn hàng hiện tại.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (currentOrderWithItems !== undefined) {
      console.log(`Syncing activeOrder with currentOrderWithItems:`, JSON.stringify(currentOrderWithItems, null, 2));
      setActiveOrder(currentOrderWithItems);
    }
  }, [currentOrderWithItems]);

  useEffect(() => {
    if (selectedTableId !== null) {
      console.log(`Selected table changed to ${selectedTableId}, preparing to refetch`);
      refetchCurrentOrder().then(() => {
        console.log("Refetch completed for table", selectedTableId);
      });
    } else {
      console.log("No table selected, clearing activeOrder");
      setActiveOrder(null);
    }
  }, [selectedTableId, refetchCurrentOrder]);

  const { data: menuCollections = [], isLoading: isLoadingCollections } = useQuery<MenuCollection[]>({
    queryKey: ["/api/menu-collections"],
    enabled: activeTab === 'menu' || isAdminOpen,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/menu-collections");
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(errorBody || "Failed to fetch menu collections");
      }
      return response.json();
    },
    onSuccess: (data) => {
      if (selectedCollectionId === null && data.length > 0) {
        const defaultCollection = data.find(col => col.isActive === 1) || data[0];
        if (defaultCollection) {
          setSelectedCollectionId(defaultCollection.id);
        }
      }
    },
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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    },
    enabled: activeTab === 'menu',
  });

  const createOrderMutation = useMutation<OrderType, Error, { tableId: number; tableName: string; status: string; total: number }>({
    mutationFn: async (orderData) => {
      console.log("Creating new order:", orderData);
      const response = await apiRequest("POST", "/api/orders", orderData);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Order creation failed");
      }
      const newOrder = await response.json();
      console.log("New order created:", newOrder);
      return newOrder;
    },
    onSuccess: (newOrderData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables", newOrderData.tableId, "active-order"] });
      setActiveOrder({ ...newOrderData, items: [] });
      toast({
        title: "Đơn hàng mới",
        description: `Đã tạo đơn hàng mới cho bàn ${newOrderData.tableName}.`,
      });
    },
    onError: (error: any) => {
      console.error("Order creation error:", error);
      toast({
        title: "Lỗi tạo đơn",
        description: error.message || "Không thể tạo đơn hàng mới.",
        variant: "destructive",
      });
    },
  });

  const completeOrderMutation = useMutation<OrderType, Error, { orderId: number; paymentMethod: string; discountAmount: number }>({
    mutationFn: async ({ orderId, paymentMethod, discountAmount }) => {
      console.log(`[Frontend] Sending paymentMethod for order ${orderId}: '${paymentMethod}', discount: ${discountAmount}`);
      const response = await apiRequest("PUT", `/api/orders/${orderId}/complete`, { paymentMethod, discountAmount });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to complete order ${orderId}`);
      }
      const completedOrder = await response.json();
      console.log(`Order ${orderId} completed:`, completedOrder);
      return completedOrder;
    },
    onSuccess: (completedOrderData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revenue/daily"] });
      queryClient.invalidateQueries({ queryKey: ["/api/revenue/by-table"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bills"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tables", completedOrderData.tableId, "active-order"] });
      if (selectedTableId === completedOrderData.tableId) {
        setSelectedTableId(null);
        setActiveOrder(null);
      }
      toast({
        title: "Thanh toán thành công",
        description: `Đã hoàn tất đơn hàng cho bàn ${completedOrderData.tableName}.`,
      });
    },
    onError: (error: any) => {
      console.error("Order completion error:", error);
      toast({
        title: "Lỗi thanh toán",
        description: error.message || "Không thể hoàn tất đơn hàng.",
        variant: "destructive",
      });
    },
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ orderId, item }: { orderId: number; item: Partial<OrderItemType> }) => {
      console.log(`Adding item to order ${orderId}:`, item);
      const response = await apiRequest("POST", `/api/orders/${orderId}/items`, item);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to add item to order");
      }
      const updatedOrder = await response.json();
      console.log(`Updated order ${orderId}:`, updatedOrder);
      return updatedOrder;
    },
    onSuccess: (updatedOrderData) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", selectedTableId, "active-order"] });
      setActiveOrder(updatedOrderData);
      toast({
        title: "Thêm món thành công",
        description: "Món ăn đã được thêm vào đơn hàng.",
      });
    },
    onError: (error: any) => {
      console.error("Add item error:", error);
      toast({
        title: "Lỗi thêm món",
        description: error.message || "Không thể thêm món.",
        variant: "destructive",
      });
    },
  });

  const handleTableSelect = useCallback((tableId: number) => {
    console.log(`Selecting table ${tableId}`);
    setSelectedTableId(tableId);
  }, []);

  const handleGoToTablesTab = useCallback(() => {
    setActiveTab('tables');
    queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
    if (selectedTableId) {
      queryClient.invalidateQueries({ queryKey: ["/api/tables", selectedTableId, "active-order"] });
    }
  }, [queryClient, selectedTableId]);

  const handleGoToMenuTab = useCallback(() => {
    if (!selectedTableId) {
      toast({
        title: "Chưa chọn bàn",
        description: "Vui lòng chọn bàn từ tab 'Phòng bàn' để xem thực đơn và thêm món.",
        variant: "destructive",
      });
      return;
    }
    setActiveTab('menu');
  }, [selectedTableId, toast]);

  const handleCheckout = async (paymentMethod: string, discountAmount: number) => {
    if (!activeOrder || !activeOrder.id) {
      toast({
        title: "Lỗi",
        description: "Không có đơn hàng nào để thanh toán.",
        variant: "destructive",
      });
      return;
    }
    await completeOrderMutation.mutateAsync({ orderId: activeOrder.id, paymentMethod, discountAmount });
  };

  const handleAddMenuItemToOrder = async (menuItem: MenuItemType) => {
    if (!selectedTableId) {
      toast({
        title: "Chưa chọn bàn",
        description: "Vui lòng chọn bàn từ tab 'Phòng bàn' trước khi thêm món.",
        variant: "destructive",
      });
      return;
    }

    let currentOrderId = activeOrder?.id;
    let currentTableName = activeOrder?.tableName;

    if (!currentOrderId) {
      const table = tables.find((t) => t.id === selectedTableId);
      if (!table) {
        toast({
          title: "Lỗi",
          description: "Không tìm thấy thông tin bàn.",
          variant: "destructive",
        });
        return;
      }

      try {
        const newOrder = await createOrderMutation.mutateAsync({
          tableId: table.id,
          tableName: table.name,
          status: "active",
          total: 0,
        });
        currentOrderId = newOrder.id;
        currentTableName = newOrder.tableName;
      } catch (error) {
        console.error("Error creating order:", error);
        toast({
          title: "Lỗi tạo đơn",
          description: "Không thể tạo đơn hàng mới.",
          variant: "destructive",
        });
        return;
      }
    }

    const existingItem = activeOrder?.items.find(
      (item) => item.menuItemId === menuItem.id && !item.note
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + 1;
      try {
        await apiRequest("PUT", `/api/order-items/${existingItem.id}`, {
          quantity: newQuantity,
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/tables", selectedTableId, "active-order"],
        });
        toast({
          title: "Cập nhật món thành công",
          description: `Đã tăng số lượng món ${menuItem.name} lên ${newQuantity}.`,
        });
      } catch (error) {
        console.error("Error updating item quantity:", error);
        toast({
          title: "Lỗi cập nhật món",
          description: "Không thể cập nhật số lượng món.",
          variant: "destructive",
        });
      }
    } else {
      const orderItem: Partial<OrderItemType> = {
        orderId: currentOrderId,
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: 1,
        unitPrice: menuItem.price,
        totalPrice: menuItem.price,
        note: "",
      };

      await addItemMutation.mutateAsync({
        orderId: currentOrderId,
        item: orderItem,
      });
    }
  };

  const categories = ["Đồ uống", "Đồ ăn", "Đồ ăn vặt", "Tráng miệng", "Món chính", "Khai vị"];
  const selectedTableInfo = selectedTableId ? tables.find(t => t.id === selectedTableId) : null;

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
      const payload = { ...data, available: data.available };
      const response = await apiRequest("POST", "/api/menu-items", payload);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to add menu item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", { collectionId: selectedCollectionId, searchTerm }] });
      setShowMenuItemForm(false);
      form.reset({ name: "", price: 0, category: "", imageUrl: "", available: 1, menuCollectionId: selectedCollectionId });
      toast({ title: "Thành công", description: "Đã thêm món mới vào thực đơn" });
    },
    onError: (error: any) => {
      console.error("Add menu item error:", error);
      toast({ title: "Lỗi", description: error.message || "Không thể thêm món mới.", variant: "destructive" });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<MenuItemFormData> }) => {
      const payload = { ...data, available: data.available };
      const response = await apiRequest("PUT", `/api/menu-items/${id}`, payload);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to update menu item ${id}`);
      }
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
      console.error("Update menu item error:", error);
      toast({ title: "Lỗi", description: error.message || "Không thể cập nhật món ăn.", variant: "destructive" });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/menu-items/${id}`);
      if (!response.ok && response.status !== 204) {
        const errorText = await response.text();
        throw new Error(errorText || `Failed to delete menu item ${id}`);
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu-items", { collectionId: selectedCollectionId, searchTerm }] });
      toast({ title: "Thành công", description: "Đã xóa món ăn khỏi thực đơn" });
    },
    onError: (error: any) => {
      console.error("Delete menu item error:", error);
      toast({ title: "Lỗi", description: error.message || "Không thể xóa món ăn.", variant: "destructive" });
    },
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
    if (window.confirm("Bạn có chắc muốn xóa món này?")) {
      await deleteMenuItemMutation.mutateAsync(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Utensils className="h-6 w-6" />
              <h1 className="text-xl font-bold">35mm Cà Phê</h1>
            </div>
            <nav className="hidden md:flex space-x-6">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'tables' | 'menu')} className="header-tabs">
                <TabsList className="bg-white bg-opacity-0">
                  <TabsTrigger value="tables" onClick={handleGoToTablesTab} className="bg-white bg-opacity-0 text-white hover:bg-opacity-30">
                    <TableIcon className="h-4 w-4 mr-2" /> Phòng bàn
                  </TabsTrigger>
                  <TabsTrigger value="menu" onClick={handleGoToMenuTab} className="bg-white bg-opacity-0 text-white hover:bg-opacity-30">
                    <ShoppingCart className="h-4 w-4 mr-2" /> Thực đơn
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right text-sm">
              <div className="opacity-90">Quản lý</div>
              <div className="opacity-75 text-xs">Ver 1.0</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="bg-white bg-opacity-0 hover:bg-opacity-50"
              onClick={() => setIsAdminOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'tables' ? (
          <>
            <div className="flex-1 p-6 overflow-y-auto">
              <TableGrid
                tables={tables}
                selectedTableId={selectedTableId}
                onTableSelect={handleTableSelect}
              />
            </div>
            <div className="w-[35rem] bg-white border-l border-gray-200 shrink-0 h-[calc(100vh-150px)] overflow-y-auto">
              {isLoadingCurrentOrder || isFetchingCurrentOrder ? (
                <div className="p-4 text-center text-gray-500">Đang tải đơn hàng</div>
              ) : (
                <>
                  {console.log("Passing activeOrder to OrderPanel:", activeOrder)}
                  <OrderPanel
                    key={selectedTableId}
                    selectedTable={selectedTableInfo}
                    activeOrder={activeOrder}
                    onOpenMenu={() => handleGoToMenuTab()}
                    onCheckout={handleCheckout}
                    isCheckingOut={completeOrderMutation.isPending}
                  />
                </>
              )}
            </div>
          </>
        ) : (
          <>
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
              {selectedTableId && activeOrder?.id && selectedTableInfo ? (
                <div className="flex items-center mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <TableIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-blue-800 text-sm font-medium">
                    Đang gọi món cho: <span className="font-bold">{selectedTableInfo.name}</span>
                    <span className="ml-2 text-gray-600">(Đơn hàng ID: {activeOrder.id})</span>
                  </span>
                </div>
              ) : (
                <div className="flex items-center mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800">
                  <TableIcon className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium"> Chỉ xem thực đơn. Chọn bàn từ tab "Phòng bàn" để bắt đầu gọi món. </span>
                </div>
              )}
              <Tabs defaultValue="view-items" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="view-items">Xem thực đơn</TabsTrigger>
                  <TabsTrigger value="manage-items">Quản lý món ăn</TabsTrigger>
                </TabsList>
                <TabsContent value="view-items" className="h-[calc(100vh-350px)] overflow-y-auto p-2">
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
                          className={`menu-item-card border rounded-lg p-4 hover:shadow-md transition-all group flex flex-col ${(!selectedTableId || !item.available) ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
                          onClick={() => (selectedTableId && item.available) ? handleAddMenuItemToOrder(item) : null}
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
                <TabsContent value="manage-items" className="h-[calc(100vh-150px)] overflow-y-auto p-2">
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
                            <FormField
                              control={form.control}
                              name="menuCollectionId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Thuộc bảng thực đơn</FormLabel>
                                  <Select
                                    onValueChange={(value) => field.onChange(value === UNASSIGNED_COLLECTION_VALUE ? null : parseInt(value))}
                                    value={field.value != null ? field.value.toString() : UNASSIGNED_COLLECTION_VALUE}
                                    disabled={isLoadingCollections}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Chọn bảng thực đơn (Mặc định nếu không chọn)" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value={UNASSIGNED_COLLECTION_VALUE}>-- Không chọn (Chung) --</SelectItem>
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
                        <div className="p-4 text-center text-gray-500">Đang tải món ăn...</div>
                      ) : menuItems.length === 0 ? (
                        <div className="text-center p-8 text-gray-500">
                          {selectedCollectionId ? "Không có món ăn nào trong bảng này." : "Không có món ăn nào để hiển thị."}
                        </div>
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
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-primary">{formatVND(item.price)}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${item.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                                    {item.available ? "Có sẵn" : "Hết hàng"}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {menuCollections.find(col => col.id === item.menuCollectionId)?.name || 'Chung'}
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
            <div className="w-[40rem] bg-white border-l border-gray-200 shrink-0 h-[calc(100vh-150px)] overflow-y-auto">
              {isLoadingCurrentOrder || isFetchingCurrentOrder ? (
                <div className="p-4 text-center text-gray-500">Đang tải đơn hàng...</div>
              ) : (
                <OrderPanel
                  selectedTable={selectedTableInfo}
                  activeOrder={activeOrder}
                  onOpenMenu={() => handleGoToMenuTab()}
                  onCheckout={handleCheckout}
                  isCheckingOut={completeOrderMutation.isPending}
                />
              )}
            </div>
          </>
        )}
      </div>

       <div className="bg-primary text-primary-foreground px-4 py-2 flex items-center justify-between text-sm">
         <div className="flex items-center space-x-4">
         </div>
         <div className="flex items-center space-x-4">
           <span>Doanh thu: <strong>{formatVND(dailyRevenueData?.revenue ?? 0)}</strong> {isLoadingDailyRevenue && <span className="text-xs opacity-75 ml-1">(Đang tải...)</span>}</span>
           <Button
             variant="ghost"
             size="sm"
             className="bg-white bg-opacity-20 hover:bg-opacity-30"
             onClick={() => setIsRevenueOpen(true)}
           >
             <TrendingUp className="h-4 w-4 mr-1" /> Báo cáo
           </Button>
         </div>
       </div>

       <RevenueModal isOpen={isRevenueOpen} onClose={() => setIsRevenueOpen(false)} initialDate={selectedDateForRevenue} />
       <AdminPanel isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
     </div>
   );
 }