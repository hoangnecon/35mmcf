import { pgTable, text, serial, integer, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const tables = pgTable("tables", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'regular', 'vip', 'special'
  status: text("status").notNull().default("available"), // 'available', 'occupied', 'reserved'
});

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(), // in VND
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  available: integer("available").notNull().default(1), // 1 = true, 0 = false
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tableId: integer("table_id").notNull(),
  tableName: text("table_name").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'completed', 'cancelled'
  total: integer("total").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  menuItemId: integer("menu_item_id").notNull(),
  menuItemName: text("menu_item_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  note: text("note"),
});

export const googleSheetsSync = pgTable("google_sheets_sync", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  sheetRowId: text("sheet_row_id"),
});

export const insertTableSchema = createInsertSchema(tables).omit({
  id: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

export const insertGoogleSheetsSyncSchema = createInsertSchema(googleSheetsSync).omit({
  id: true,
  syncedAt: true,
});

export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type GoogleSheetsSync = typeof googleSheetsSync.$inferSelect;
export type InsertGoogleSheetsSync = z.infer<typeof insertGoogleSheetsSyncSchema>;
