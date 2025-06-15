// hoangnecon/35mmcf/35mmcf-fa723ba3b9b96db36942ef1dc83a721ec6f65899/server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertOrderSchema,
  insertOrderItemSchema,
  insertTableSchema,
  insertMenuItemSchema,
  insertMenuCollectionSchema,
  type Order as OrderType,
  type OrderItem as OrderItemType,
  type Bill as BillType,
  orders,
  orderItems,
  menuItems,
} from "@shared/schema";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import ExcelJS from 'exceljs';
import { format } from 'date-fns';
import { formatVND, formatDateTime } from "@shared/utils"; // THAY ĐỔI DÒNG NÀY để import formatDateTime

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
      const collectionId = req.query.collectionId ? parseInt(req.query.collectionId as string) : null;
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
      const updates = req.body;
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
        return res.json(null);
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
      console.error("Error creating order (from /api/orders POST):", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid order data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.put("/api/orders/:id/complete", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let { paymentMethod, discountAmount } = req.body;

      console.log(`[Backend API] /api/orders/:id/complete: Received paymentMethod='${paymentMethod}', discount=${discountAmount} for order ${id}.`);

      if (typeof paymentMethod === 'string') {
        paymentMethod = paymentMethod.trim();
      }

      if (!paymentMethod || (paymentMethod !== 'Tiền mặt' && paymentMethod !== 'Chuyển khoản' && paymentMethod !== 'Thẻ')) {
        console.warn(`[Backend API] /api/orders/:id/complete: Invalid payment method after trim: '${paymentMethod}'`);
        return res.status(400).json({ message: "Invalid payment method provided. Must be 'Tiền mặt', 'Thẻ' or 'Chuyển khoản'." });
      }

      if (typeof discountAmount !== 'number' || discountAmount < 0) {
        console.warn(`[Backend API] /api/orders/:id/complete: Invalid discount amount: '${discountAmount}'`);
        return res.status(400).json({ message: "Invalid discount amount. Must be a non-negative number." });
      }

      const order = await storage.completeOrder(id, paymentMethod, discountAmount);
      if (!order) {
        console.warn(`[Backend API] /api/orders/:id/complete: Order ${id} not found for completion.`);
        return res.status(404).json({ message: "Order not found" });
      }
      console.log(`[Backend API] /api/orders/:id/complete: Order ${id} completed successfully.`);
      res.json(order);
    } catch (error) {
      console.error("Failed to complete order:", error);
      res.status(500).json({ message: "Failed to complete order" });
    }
  });

  app.put("/api/orders/:id/note", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      let { note } = req.body;

      if (typeof note === 'string') {
        note = note.trim();
      }
      if (note === '') {
          note = null;
      }

      if (typeof note !== 'string' && note !== null) {
        return res.status(400).json({ message: "Invalid note format. Must be a string or null." });
      }

      const updatedOrder = await storage.updateOrderNote(id, note);
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(updatedOrder);
    } catch (error) {
      console.error("Failed to update order note:", error);
      res.status(500).json({ message: "Failed to update order note" });
    }
  });

  app.put("/api/orders/:orderId/cancel", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { tableId } = req.body;

      if (isNaN(orderId) || isNaN(tableId)) {
        return res.status(400).json({ message: "Invalid orderId or tableId" });
      }

      const success = await storage.cancelOrder(orderId, tableId);
      if (!success) {
        return res.status(404).json({ message: "Order not found or could not be cancelled" });
      }
      res.json({ success: true, message: "Order cancelled successfully." });
    } catch (error) {
      console.error("Failed to cancel order:", error);
      res.status(500).json({ message: "Failed to cancel order" });
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

      const validatedItemData = z.object({
        menuItemId: z.number().int().positive(),
        quantity: z.number().int().min(1),
        note: z.string().optional(),
      }).parse(req.body);

      const menuItem = await storage.getMenuItem(validatedItemData.menuItemId);
      if (!menuItem) {
        return res.status(404).json({ message: "Menu item not found" });
      }

      const itemToAdd = {
        orderId: orderId,
        menuItemId: menuItem.id,
        menuItemName: menuItem.name,
        quantity: validatedItemData.quantity,
        unitPrice: menuItem.price,
        totalPrice: menuItem.price * validatedItemData.quantity,
        note: validatedItemData.note || null,
      };

      await storage.addOrderItem(itemToAdd);

      const updatedOrder = await storage.getOrderById(orderId);
      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found after adding item" });
      }
      const updatedOrderItems = await storage.getOrderItems(updatedOrder.id);

      res.status(201).json({ ...updatedOrder, items: updatedOrderItems });
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
      const updateSchema = z.object({
        quantity: z.number().min(1).optional(),
        note: z.string().nullable().optional(),
      }).partial();

      const validatedUpdates = updateSchema.parse(req.body);
      const existingItem = await storage.getOrderItem(id);

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

  app.post("/api/orders/:orderId/partial-payment", async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const { itemsToPay, paymentMethod, partialDiscountAmount } = req.body;

      if (isNaN(orderId) || !Array.isArray(itemsToPay) || !paymentMethod || typeof partialDiscountAmount !== 'number') {
        return res.status(400).json({ message: "Invalid partial payment data." });
      }

      const updatedOrder = await storage.processPartialPayment(orderId, itemsToPay, paymentMethod, partialDiscountAmount);

      if (!updatedOrder) {
        return res.status(404).json({ message: "Order not found or partial payment failed." });
      }

      res.json(updatedOrder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid items to pay data", errors: error.errors });
      }
      console.error("Failed to process partial payment:", error);
      res.status(500).json({ message: "Failed to process partial payment" });
    }
  });

  // Revenue (sẽ lấy từ bảng bills)
  app.get("/api/revenue/daily", async (req, res) => {
    try {
      const dateString = req.query.date as string | undefined;
      const date = dateString ? new Date(dateString) : new Date(); // Parse directly to Date object (will be UTC)
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      console.log(`[Backend API] /api/revenue/daily: Received dateString='${dateString}', parsedDate=${date.toISOString()}.`);
      const revenue = await storage.getDailyRevenue(date); // Pass the UTC Date object
      console.log(`[Backend API] /api/revenue/daily: Returning revenue: ${revenue}.`);
      res.json({ revenue });
    } catch (error) {
      console.error("Failed to fetch daily revenue:", error);
      res.status(500).json({ message: "Failed to fetch daily revenue" });
    }
  });

  app.get("/api/revenue/by-table", async (req, res) => {
    try {
      const dateString = req.query.date as string | undefined;
      const date = dateString ? new Date(dateString) : new Date(); // Parse directly to Date object (will be UTC)
      if (isNaN(date.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      console.log(`[Backend API] /api/revenue/by-table: Received dateString='${dateString}', parsedDate=${date.toISOString()}.`);
      const revenueByTable = await storage.getRevenueByTable(date); // Pass the UTC Date object
      console.log(`[Backend API] /api/revenue/by-table: Returning ${revenueByTable.length} entries.`);
      res.json(revenueByTable);
    } catch (error) {
      console.error("Failed to fetch revenue by table:", error);
      res.status(500).json({ message: "Failed to fetch revenue by table" });
    }
  });

  // Thêm route để lấy danh sách các bill đã hoàn thành (nếu cần cho báo cáo chi tiết hơn)
  app.get("/api/bills", async (req, res) => {
    try {
      const { startDate, endDate } = req.query; // These are now full ISO strings
      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate as string); // Parse directly to Date object (will be UTC)
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid startDate format" });
        }
      }
      if (endDate) {
        end = new Date(endDate as string); // Parse directly to Date object (will be UTC)
        if (isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid endDate format" });
        }
      }
      console.log(`[Backend API] /api/bills: Received startDate='${startDate}', endDate='${endDate}'.`);
      const bills = await storage.getBills(start, end); // Pass the UTC Date objects
      console.log(`[Backend API] /api/bills: Returning ${bills.length} bills.`);
      res.json(bills);
    } catch (error) {
      console.error("Failed to fetch bills:", error);
      res.status(500).json({ message: "Failed to fetch bills" });
    }
  });

  // THÊM ROUTE MỚI: Lấy chi tiết các món trong một bill
  app.get("/api/bills/:id/items", async (req, res) => {
    try {
      const billId = parseInt(req.params.id);
      if (isNaN(billId)) {
        console.warn(`[Backend API] /api/bills/:id/items: Invalid bill ID received: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid bill ID" });
      }

      const bill = await storage.getBillById(billId);
      if (!bill) {
        console.warn(`[Backend API] /api/bills/:id/items: Bill not found for ID: ${billId}`);
        return res.status(404).json({ message: "Bill not found" });
      }

      const orderItems = await storage.getOrderItems(bill.orderId);
      console.log(`[Backend API] /api/bills/:id/items: Found ${orderItems.length} items for bill ${billId} (orderId ${bill.orderId}).`);

      res.json(orderItems);
    } catch (error) {
      console.error("Failed to fetch items for bill:", error);
      res.status(500).json({ message: "Failed to fetch items for bill" });
    }
  });

  // THÊM ROUTE MỚI: Xuất Excel
  app.get("/api/reports/export-bills", async (req, res) => {
    try {
      const { startDate, endDate } = req.query; // Nhận các tham số ngày tháng (ISO strings)
      let start: Date | undefined;
      let end: Date | undefined;

      if (startDate) {
        start = new Date(startDate as string);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ message: "Invalid startDate format" });
        }
      }
      if (endDate) {
        end = new Date(endDate as string);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ message: "Invalid endDate format" });
        }
      }

      console.log(`[Backend API] /api/reports/export-bills: Exporting bills from ${start?.toISOString()} to ${end?.toISOString()}.`);

      const billsToExport = await storage.getBills(start, end);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Bao cao doanh thu');

      // Định nghĩa các cột cho Excel
      worksheet.columns = [
        { header: 'ID Bill', key: 'id', width: 10 },
        { header: 'ID Đơn hàng', key: 'orderId', width: 15 },
        { header: 'Tên Bàn', key: 'tableName', width: 15 },
        { header: 'Phương thức TT', key: 'paymentMethod', width: 15 },
        { header: 'Tổng tiền', key: 'totalAmount', width: 15, style: { numFmt: '#,##0' } }, // Định dạng số tiền
        { header: 'Thời gian hoàn tất', key: 'createdAt', width: 25 },
      ];

      // Thêm dữ liệu vào các hàng
      for (const bill of billsToExport) {
        worksheet.addRow({
          id: bill.id,
          orderId: bill.orderId,
          tableName: bill.tableName,
          paymentMethod: bill.paymentMethod,
          totalAmount: bill.totalAmount,
          createdAt: formatDateTime(bill.createdAt), // Định dạng thời gian bằng hàm mới
        });
      }

      // Đặt các header phản hồi để trình duyệt biết đây là file Excel
      console.log('[Backend API] Setting Content-Type and Content-Disposition headers (via writeHead).');
      res.writeHead(200, {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="BaoCaoDoanhThu_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx"`
      });

      // Ghi workbook vào stream phản hồi
      await workbook.xlsx.write(res);
      res.end(); // Kết thúc phản hồi
      console.log('[Backend API] Excel file generated and sent successfully.');
    } catch (error) {
      console.error("Failed to export bills to Excel:", error);
      // Đảm bảo gửi phản hồi lỗi phù hợp nếu có lỗi xảy ra trước khi headers được gửi
      if (!res.headersSent) {
          res.status(500).json({ message: "Failed to export bills to Excel" });
      } else {
          // Nếu headers đã được gửi (ví dụ: một phần file đã được ghi), chỉ log lỗi và kết thúc
          res.end();
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}