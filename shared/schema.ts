// shared/schema.ts
import { sqliteTable, text, integer, primaryKey } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const tables = sqliteTable("tables", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'regular', 'vip', 'special'
  status: text("status").notNull().default("available"), // 'available', 'occupied', 'reserved'
});

export const menuCollections = sqliteTable("menu_collections", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(), // e.g., "Main Menu", "Tet Holiday Menu"
  description: text("description"),
  isActive: integer("is_active").notNull().default(1), // 1 = active, 0 = inactive
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: integer("price").notNull(), // in VND
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  available: integer("available").notNull().default(1), // 1 = true, 0 = false
  menuCollectionId: integer("menu_collection_id").references(() => menuCollections.id).notNull().default(1),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableId: integer("table_id").notNull(),
  tableName: text("table_name").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'completed', 'cancelled'
  total: integer("total").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  note: text("note"),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  menuItemId: integer("menu_item_id").notNull().references(() => menuItems.id),
  menuItemName: text("menu_item_name").notNull(),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  note: text("note"),
});

// Bảng mới để lưu trữ các bill đã hoàn thành
export const bills = sqliteTable("bills", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").references(() => orders.id, { onDelete: 'cascade' }).notNull(), // CẬP NHẬT: Bỏ .unique() ở đây
  tableId: integer("table_id").notNull(),
  tableName: text("table_name").notNull(),
  totalAmount: integer("total_amount").notNull(),
  paymentMethod: text("payment_method").notNull().default("Tiền mặt"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`), // Thời điểm bill được tạo
});

// Zod Schemas
export const insertTableSchema = createInsertSchema(tables).omit({ id: true });
export const insertMenuCollectionSchema = createInsertSchema(menuCollections).omit({ id: true, createdAt: true });
export const insertMenuItemSchema = createInsertSchema(menuItems).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  updatedAt: true,
});
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertBillSchema = createInsertSchema(bills).omit({ id: true, createdAt: true });


// Types
export type Table = typeof tables.$inferSelect;
export type InsertTable = z.infer<typeof insertTableSchema>;
export type MenuCollection = typeof menuCollections.$inferSelect;
export type InsertMenuCollection = z.infer<typeof insertMenuCollectionSchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type Bill = typeof bills.$inferSelect;
export type InsertBill = z.infer<typeof insertBillSchema>;
