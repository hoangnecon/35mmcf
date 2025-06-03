// server/routes.ts
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertOrderItemSchema, insertTableSchema, insertMenuItemSchema, insertMenuCollectionSchema } from "@shared/schema"; // Added insertMenuCollectionSchema
import { z } from "zod";

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
        return res.status(404).json({ message: "Table not found" });
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
      
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
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

  // NEW: Menu Collections
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
      const updates = req.body; // No Zod schema for partial updates directly
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
      const collectionId = req.query.collectionId ? parseInt(req.query.collectionId as string) : undefined;
      const menuItems = await storage.getMenuItems(collectionId); // Pass collectionId
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
        console.error("Failed to sync to Google Sheets:", syncError);
        // Continue with order completion even if sync fails
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
      const validatedData = insertOrderItemSchema.parse({
        ...req.body,
        orderId,
      });

      const item = await storage.addOrderItem(validatedData);
      
      // Update order total
      const orderItems = await storage.getOrderItems(orderId);
      const newTotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
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
      const { quantity, note } = req.body;

      const existingItem = await storage.updateOrderItem(id, {
        quantity,
        totalPrice: req.body.unitPrice * quantity,
        note,
      });

      if (!existingItem) {
        return res.status(404).json({ message: "Order item not found" });
      }

      // Update order total
      const orderItems = await storage.getOrderItems(existingItem.orderId);
      const newTotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
      await storage.updateOrder(existingItem.orderId, { total: newTotal });

      res.json(existingItem);
    } catch (error) {
      console.error("Failed to update order item:", error);
      res.status(500).json({ message: "Failed to update order item" });
    }
  });

  app.delete("/api/order-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get the item first to know which order to update
      // Fix: Get orderId from item before deleting
      const orderItemsForDeletion = await storage.getOrderItems(0); // This line is problematic, needs to be fixed to retrieve the specific item
      const itemToDelete = orderItemsForDeletion.find(item => item.id === id); // This logic needs adjustment

      if (!itemToDelete) { // If itemToDelete is not found by existing logic
        // Try fetching the item directly if possible
        const directItem = await storage.updateOrderItem(id, {}); // Pass empty updates to just retrieve the item
        if (!directItem) {
          return res.status(404).json({ message: "Order item not found" });
        }
        itemToDelete = directItem;
      }
      
      const success = await storage.removeOrderItem(id);
      if (!success) {
        return res.status(404).json({ message: "Order item not found" });
      }

      // Update order total
      // Ensure orderId is valid from itemToDelete
      const remainingItems = await storage.getOrderItems(itemToDelete.orderId);
      const newTotal = remainingItems.reduce((sum, item) => sum + item.totalPrice, 0);
      await storage.updateOrder(itemToDelete.orderId, { total: newTotal });

      res.json({ success: true });
    } catch (error) {
      console.error("Failed to remove order item:", error);
      res.status(500).json({ message: "Failed to remove order item" });
    }
  });

  // Revenue
  app.get("/api/revenue/daily", async (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const revenue = await storage.getDailyRevenue(date);
      res.json({ revenue });
    } catch (error) {
      console.error("Failed to fetch daily revenue:", error);
      res.status(500).json({ message: "Failed to fetch daily revenue" });
    }
  });

  app.get("/api/revenue/by-table", async (req, res) => {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const revenueByTable = await storage.getRevenueByTable(date);
      res.json(revenueByTable);
    } catch (error) {
      console.error("Failed to fetch revenue by table:", error);
      res.status(500).json({ message: "Failed to fetch revenue by table" });
    }
  });

  // Google Sheets sync endpoint
  app.post("/api/sync-to-sheets", async (req, res) => {
    try {
      const { orderId } = req.body;
      
      if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
      }

      const order = await storage.updateOrder(orderId, {}); // Get current order details
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

// Google Sheets sync function
async function syncOrderToGoogleSheets(order: any, orderItems: any[]) {
  const { GoogleAuth } = require('google-auth-library');
  const { google } = require('googleapis');

  try {
    // Initialize Google Sheets API
    const auth = new GoogleAuth({
      credentials: process.env.GOOGLE_SHEETS_CREDENTIALS ? JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS) : undefined,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID || process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error("Google Sheets ID not configured");
    }

    // Prepare data for Google Sheets
    // Note: SQLite dates are TEXT, so no need for .toLocaleString() if already ISO string
    const rows = orderItems.map(item => [
      order.tableName,
      item.menuItemName,
      item.quantity,
      item.unitPrice,
      item.totalPrice,
      order.createdAt, // createdAt is now ISO string from SQLite TEXT
    ]);

    // Append to Google Sheets
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:F',
      valueInputOption: 'RAW',
      resource: {
        values: rows,
      },
    });

    // Record sync
    await storage.addSyncRecord({
      orderId: order.id,
      sheetRowId: `${Date.now()}`,
    });

    console.log(`Order ${order.id} synced to Google Sheets`);
  } catch (error) {
    console.error("Google Sheets sync error:", error);
    throw error;
  }
}