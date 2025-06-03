// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertOrderSchema, 
  insertOrderItemSchema, 
  insertTableSchema, 
  insertMenuItemSchema, 
  insertMenuCollectionSchema,
  type Order as OrderType, // Thêm type Order để sử dụng cho sync
  type OrderItem as OrderItemType // Thêm type OrderItem
} from "@shared/schema";
import { z } from "zod";

// Google Sheets sync function (đặt ở đây hoặc import từ file riêng nếu bạn muốn)
async function syncOrderToGoogleSheets(order: OrderType, orderItems: OrderItemType[]) {
  const { GoogleAuth } = require('google-auth-library');
  const { google } = require('googleapis');

  try {
    const credentialsEnv = process.env.GOOGLE_SHEETS_CREDENTIALS;
    if (!credentialsEnv) {
      console.warn("GOOGLE_SHEETS_CREDENTIALS not set. Skipping Google Sheets sync.");
      return;
    }
    
    let credentials;
    try {
      credentials = JSON.parse(credentialsEnv);
    } catch (e) {
      console.error("Failed to parse GOOGLE_SHEETS_CREDENTIALS. Skipping Google Sheets sync.", e);
      return;
    }

    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      console.warn("Google Sheets ID (GOOGLE_SHEETS_ID or GOOGLE_SPREADSHEET_ID) not configured. Skipping Google Sheets sync.");
      return;
    }

    const rows = orderItems.map(item => [
      order.tableName,
      item.menuItemName,
      item.quantity,
      item.unitPrice,
      item.totalPrice,
      order.createdAt, // Giả sử createdAt đã là ISO string hoặc định dạng phù hợp
    ]);

    if (rows.length === 0) {
      console.log(`Order ${order.id} has no items to sync.`);
      // Vẫn ghi lại sync record nếu cần, hoặc bỏ qua
      await storage.addSyncRecord({
        orderId: order.id,
        sheetRowId: `no-items-${Date.now()}`, // Đánh dấu là không có item
      });
      return;
    }
    
    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:F', // Đảm bảo Sheet1 tồn tại
      valueInputOption: 'RAW',
      resource: {
        values: rows,
      },
    });

    await storage.addSyncRecord({
      orderId: order.id,
      sheetRowId: res.data.updates?.updatedRange || `${Date.now()}`, // Lấy range hoặc timestamp
    });

    console.log(`Order ${order.id} synced to Google Sheets`);
  } catch (error) {
    console.error("Google Sheets sync error:", error);
    // Không ném lỗi ra ngoài để không ảnh hưởng đến luồng chính
  }
}


export async function registerRoutes(app: Express): Promise<Server> {
  // Tables
  app.get("/api/tables", async (req, res) => {
    try {
      const tables = await storage.getTables();
      res.json(tables);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      res.status(500).json({ message: "Failed to fetch tables" });
    }
  });

  app.post("/api/tables", async (req, res) => {
    try {
      const validatedData = insertTableSchema.parse(req.body);
      const table = await storage.createTable(validatedData);
      res.status(201).json(table);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid table data", errors: error.errors });
      }
      console.error("Failed to create table:", error);
      res.status(500).json({ message: "Failed to create table" });
    }
  });

  app.delete("/api/tables/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Kiểm tra xem bàn có order active không trước khi xóa (nếu cần)
      // const activeOrder = await storage.getActiveOrderByTable(id);
      // if (activeOrder) {
      //   return res.status(400).json({ message: "Cannot delete table with an active order." });
      // }
      const success = await storage.deleteTable(id);
      if (!success) {
        return res.status(404).json({ message: "Table not found or could not be deleted" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete table:", error);
      res.status(500).json({ message: "Failed to delete table" });
    }
  });

  app.put("/api/tables/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['available', 'occupied', 'reserved'].includes(status)) {
        return res.status(400).json({ message: "Invalid status provided" });
      }

      const table = await storage.updateTableStatus(id, status);
      if (!table) {
        return res.status(404).json({ message: "Table not found" });
      }
      res.json(table);
    } catch (error) {
      console.error("Failed to update table status:", error);
      res.status(500).json({ message: "Failed to update table status" });
    }
  });

  // Menu Collections
  app.get("/api/menu-collections", async (req, res) => {
    try {
      const collections = await storage.getMenuCollections();
      res.json(collections);
    } catch (error) {
      console.error("Failed to fetch menu collections:", error);
      res.status(500).json({ message: "Failed to fetch menu collections" });
    }
  });

  app.post("/api/menu-collections", async (req, res) => {
    try {
      const validatedData = insertMenuCollectionSchema.parse(req.body);
      const collection = await storage.createMenuCollection(validatedData);
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid menu collection data", errors: error.errors });
      }
      console.error("Failed to create menu collection:", error);
      res.status(500).json({ message: "Failed to create menu collection" });
    }
  });

  app.put("/api/menu-collections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Validate partial updates if necessary, or rely on schema for full updates
      const updates = req.body; 
      const collection = await storage.updateMenuCollection(id, updates);
      if (!collection) {
        return res.status(404).json({ message: "Menu collection not found" });
      }
      res.json(collection);
    } catch (error) {
      console.error("Failed to update menu collection:", error);
      res.status(500).json({ message: "Failed to update menu collection" });
    }
  });

  app.delete("/api/menu-collections/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMenuCollection(id);
      if (!success) {
        return res.status(404).json({ message: "Menu collection not found or linked items exist" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete menu collection:", error);
      res.status(500).json({ message: "Failed to delete menu collection" });
    }
  });

  // Menu Items
  app.get("/api/menu-items", async (req, res) => {
    try {
      const collectionId = req.query.collectionId ? parseInt(req.query.collectionId as string) : null; // Chuyển undefined thành null
      const menuItems = await storage.getMenuItems(collectionId);
      res.json(menuItems);
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
      res.status(500).json({ message: "Failed to fetch menu items" });
    }
  });

  app.post("/api/menu-items", async (req, res) => {
    try {
      const validatedData = insertMenuItemSchema.parse(req.body);
      const menuItem = await storage.createMenuItem(validatedData);
      res.status(201).json(menuItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid menu item data", errors: error.errors });
      }
      console.error("Failed to create menu item:", error);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.put("/api/menu-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body; // Cần validate nếu schema không phải là partial
      const menuItem = await storage.updateMenuItem(id, updates);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(menuItem);
    } catch (error) {
      console.error("Failed to update menu item:", error);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete("/api/menu-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMenuItem(id);
      if (!success) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Failed to delete menu item:", error);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/tables/:tableId/active-order", async (req, res) => {
    try {
      const tableId = parseInt(req.params.tableId);
      if (isNaN(tableId)) {
        return res.status(400).json({ message: "Invalid table ID" });
      }
      const order = await storage.getActiveOrderByTable(tableId);
      
      if (!order) {
        return res.json(null); // Trả về null nếu không có active order, client sẽ xử lý
      }

      const orderItems = await storage.getOrderItems(order.id);
      res.json({ ...order, items: orderItems });
    } catch (error) {
      console.error("Failed to fetch active order:", error);
      res.status(500).json({ message: "Failed to fetch active order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      console.error("Failed to create order:", error);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.completeOrder(id);
      
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Sync to Google Sheets
      try {
        const orderItems = await storage.getOrderItems(order.id);
        await syncOrderToGoogleSheets(order, orderItems);
      } catch (syncError) {
        console.error("Failed to sync to Google Sheets after order completion:", syncError);
        // Tiếp tục hoàn tất đơn hàng ngay cả khi sync lỗi
      }
      res.json(order);
    } catch (error) {
      console.error("Failed to complete order:", error);
      res.status(500).json({ message: "Failed to complete order" });
    }
  });

  // Order Items
  app.get("/api/orders/:orderId/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      const items = await storage.getOrderItems(orderId);
      res.json(items);
    } catch (error) {
      console.error("Failed to fetch order items:", error);
      res.status(500).json({ message: "Failed to fetch order items" });
    }
  });

  app.post("/api/orders/:orderId/items", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      // Validate data trước khi thêm orderId
      const validatedItemData = insertOrderItemSchema.omit({ orderId: true, id: true }).parse(req.body);
      
      const itemToAdd = {
        ...validatedItemData,
        orderId, // Gán orderId sau khi validate
      };

      const item = await storage.addOrderItem(itemToAdd);
      
      const orderItems = await storage.getOrderItems(orderId);
      const newTotal = orderItems.reduce((sum, currentItem) => sum + currentItem.totalPrice, 0);
      await storage.updateOrder(orderId, { total: newTotal });

      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order item data", errors: error.errors });
      }
      console.error("Failed to add order item:", error);
      res.status(500).json({ message: "Failed to add order item" });
    }
  });

  app.put("/api/order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order item ID" });
      }
      // Validate chỉ các field được phép update
      const updateSchema = z.object({
        quantity: z.number().min(1).optional(),
        note: z.string().optional(),
        // unitPrice không nên cho update ở đây, nó nên lấy từ menuItem gốc
      }).partial(); // Partial cho phép không phải tất cả field đều có

      const validatedUpdates = updateSchema.parse(req.body);
      const existingItem = await storage.getOrderItem(id); // Cần hàm này trong storage
      
      if (!existingItem) {
         return res.status(404).json({ message: "Order item not found" });
      }
      
      const finalUpdates: Partial<OrderItemType> = { ...validatedUpdates };
      if (validatedUpdates.quantity !== undefined) {
        finalUpdates.totalPrice = existingItem.unitPrice * validatedUpdates.quantity;
      }


      const updatedItem = await storage.updateOrderItem(id, finalUpdates);

      if (!updatedItem) {
        return res.status(404).json({ message: "Order item not found or failed to update" });
      }

      const orderItems = await storage.getOrderItems(updatedItem.orderId);
      const newTotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      await storage.updateOrder(updatedItem.orderId, { total: newTotal });

      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data for order item", errors: error.errors });
      }
      console.error("Failed to update order item:", error);
      res.status(500).json({ message: "Failed to update order item" });
    }
  });

  app.delete("/api/order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid order item ID" });
      }
      
      const deletedItem = await storage.removeOrderItem(id); 

      if (!deletedItem) {
        return res.status(404).json({ message: "Order item not found" });
      }

      const remainingItems = await storage.getOrderItems(deletedItem.orderId);
      const newTotal = remainingItems.reduce((sum, item) => sum + item.totalPrice, 0);
      await storage.updateOrder(deletedItem.orderId, { total: newTotal });

      res.json({ success: true, message: "Order item removed successfully" });
    } catch (error) {
      console.error("Failed to remove order item:", error);
      res.status(500).json({ message: "Failed to remove order item" });
    }
  });

  // Revenue
  app.get("/api/revenue/daily", async (req, res) => {
    try {
      const dateString = req.query.date as string | undefined;
      const date = dateString ? new Date(dateString) : new Date();
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      const revenue = await storage.getDailyRevenue(date);
      res.json({ revenue });
    } catch (error) {
      console.error("Failed to fetch daily revenue:", error);
      res.status(500).json({ message: "Failed to fetch daily revenue" });
    }
  });

  app.get("/api/revenue/by-table", async (req, res) => {
    try {
      const dateString = req.query.date as string | undefined;
      const date = dateString ? new Date(dateString) : new Date();
       if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      const revenueByTable = await storage.getRevenueByTable(date);
      res.json(revenueByTable);
    } catch (error) {
      console.error("Failed to fetch revenue by table:", error);
      res.status(500).json({ message: "Failed to fetch revenue by table" });
    }
  });

  app.post("/api/sync-to-sheets", async (req, res) => {
    try {
      const { orderId } = req.body;
      if (!orderId || typeof orderId !== 'number') {
        return res.status(400).json({ message: "Valid Order ID is required" });
      }

      const order = await storage.updateOrder(orderId, {}); // Chỉ để lấy order, không update gì
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const orderItems = await storage.getOrderItems(orderId);
      await syncOrderToGoogleSheets(order, orderItems);

      res.json({ success: true, message: "Order synced to Google Sheets" });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ message: "Failed to sync to Google Sheets" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}