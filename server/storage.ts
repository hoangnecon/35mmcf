// server/storage.ts
import {
  tables, menuItems, orders, orderItems, googleSheetsSync, menuCollections,
  type Table, type InsertTable, type MenuItem, type InsertMenuItem,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type GoogleSheetsSync, type InsertGoogleSheetsSync, type MenuCollection, type InsertMenuCollection,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm"; // Đã sửa lỗi import 'sql'

export interface IStorage {
  getTables(): Promise<Table[]>;
  getTable(id: number): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTableStatus(id: number, status: string): Promise<Table | undefined>;
  deleteTable(id: number): Promise<boolean>;
  getMenuCollections(): Promise<MenuCollection[]>;
  getMenuCollection(id: number): Promise<MenuCollection | undefined>;
  createMenuCollection(collection: InsertMenuCollection): Promise<MenuCollection>;
  updateMenuCollection(id: number, updates: Partial<MenuCollection>): Promise<MenuCollection | undefined>;
  deleteMenuCollection(id: number): Promise<boolean>;
  getMenuItems(collectionId?: number | null): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;
  getOrders(): Promise<Order[]>;
  getActiveOrderByTable(tableId: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Omit<Order, 'id' | 'createdAt' | 'tableId' | 'tableName' | 'updatedAt'>>): Promise<Order | undefined>;
  completeOrder(id: number): Promise<Order | undefined>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  addOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: number, updates: Partial<Omit<OrderItem, 'id' | 'orderId' | 'menuItemId' | 'menuItemName' | 'unitPrice'>>): Promise<OrderItem | undefined>;
  getOrderItem(id: number): Promise<OrderItem | undefined>;
  removeOrderItem(id: number): Promise<OrderItem | undefined>;
  addSyncRecord(sync: InsertGoogleSheetsSync): Promise<GoogleSheetsSync>;
  getSyncRecord(orderId: number): Promise<GoogleSheetsSync | undefined>;
  getDailyRevenue(date?: Date): Promise<number>;
  getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>>;
}

export class MemStorage implements IStorage {
  async getOrderItem(id: number): Promise<OrderItem | undefined> { throw new Error("Method not implemented."); }
  async getTables(): Promise<Table[]> { return []; }
  async getTable(id: number): Promise<Table | undefined> { return undefined; }
  async createTable(table: InsertTable): Promise<Table> { throw new Error("Not implemented"); }
  async updateTableStatus(id: number, status: string): Promise<Table | undefined> { return undefined; }
  async deleteTable(id: number): Promise<boolean> { return false; }
  async getMenuCollections(): Promise<MenuCollection[]> { return []; }
  async getMenuCollection(id: number): Promise<MenuCollection | undefined> { return undefined; }
  async createMenuCollection(collection: InsertMenuCollection): Promise<MenuCollection> { throw new Error("Not implemented"); }
  async updateMenuCollection(id: number, updates: Partial<MenuCollection>): Promise<MenuCollection | undefined> { return undefined; }
  async deleteMenuCollection(id: number): Promise<boolean> { return false; }
  async getMenuItems(collectionId?: number | null): Promise<MenuItem[]> { return []; }
  async getMenuItem(id: number): Promise<MenuItem | undefined> { return undefined; }
  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> { throw new Error("Not implemented"); }
  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | undefined> { return undefined; }
  async deleteMenuItem(id: number): Promise<boolean> { return false; }
  async getOrders(): Promise<Order[]> { return []; }
  async getActiveOrderByTable(tableId: number): Promise<Order | undefined> { return undefined; }
  async createOrder(order: InsertOrder): Promise<Order> { throw new Error("Not implemented"); }
  async updateOrder(id: number, updates: Partial<Omit<Order, 'id' | 'createdAt' | 'tableId' | 'tableName' | 'updatedAt'>>): Promise<Order | undefined> { throw new Error("Not implemented"); }
  async completeOrder(id: number): Promise<Order | undefined> { throw new Error("Not implemented"); }
  async getOrderItems(orderId: number): Promise<OrderItem[]> { return []; }
  async addOrderItem(item: InsertOrderItem): Promise<OrderItem> { throw new Error("Not implemented"); }
  async updateOrderItem(id: number, updates: Partial<Omit<OrderItem, 'id' | 'orderId' | 'menuItemId' | 'menuItemName' | 'unitPrice'>>): Promise<OrderItem | undefined> { throw new Error("Not implemented"); }
  async removeOrderItem(id: number): Promise<OrderItem | undefined> { throw new Error("Not implemented"); }
  async addSyncRecord(sync: InsertGoogleSheetsSync): Promise<GoogleSheetsSync> { throw new Error("Not implemented"); }
  async getSyncRecord(orderId: number): Promise<GoogleSheetsSync | undefined> { return undefined; }
  async getDailyRevenue(date?: Date): Promise<number> { return 0; }
  async getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>> { return []; }
}

export class DatabaseStorage implements IStorage {
  async getOrderItem(id: number): Promise<OrderItem | undefined> {
    const [item] = await db.select().from(orderItems).where(eq(orderItems.id, id));
    return item;
  }

  async updateOrder(id: number, updates: Partial<Omit<Order, 'id' | 'createdAt' | 'tableId' | 'tableName' | 'updatedAt'>>): Promise<Order | undefined> {
    const finalUpdates = { ...updates, updatedAt: sql`CURRENT_TIMESTAMP` }; // Sử dụng 'sql' đúng
    const [updatedOrder] = await db
      .update(orders)
      .set(finalUpdates)
      .where(eq(orders.id, id))
      .returning();
    console.log(`DatabaseStorage: Updated order ${id}, new updatedAt: ${updatedOrder?.updatedAt}`);
    return updatedOrder;
  }

  async addOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    // 1. Lấy thông tin MenuItem để có unitPrice và menuItemName
    if (!item.menuItemId) {
      throw new Error("menuItemId is required to add an order item.");
    }
    const menuItemDetails = await this.getMenuItem(item.menuItemId);
    if (!menuItemDetails) {
      throw new Error(`MenuItem with ID ${item.menuItemId} not found.`);
    }

    // 2. Tính totalPrice dựa trên quantity và unitPrice từ MenuItem
    const newItemData: InsertOrderItem = {
      ...item,
      menuItemName: menuItemDetails.name,
      unitPrice: menuItemDetails.price,
      totalPrice: item.quantity * menuItemDetails.price, // Tính toán totalPrice
    };

    const [newItem] = await db.insert(orderItems).values(newItemData).returning();
    if (newItem) {
      // Sau khi thêm item, cập nhật total và updatedAt của Order cha
      const itemsOfOrder = await this.getOrderItems(newItem.orderId);
      const newTotal = itemsOfOrder.reduce((sum, current) => sum + current.totalPrice, 0);
      await this.updateOrder(newItem.orderId, { total: newTotal });
    }
    return newItem;
  }

  async updateOrderItem(id: number, updates: Partial<Omit<OrderItem, 'id' | 'orderId' | 'menuItemId' | 'menuItemName' | 'unitPrice'>>): Promise<OrderItem | undefined> {
    const existingItem = await this.getOrderItem(id);
    if (!existingItem) return undefined;

    const finalUpdates: Partial<OrderItem> = { ...updates };
    if (updates.quantity !== undefined) {
      finalUpdates.totalPrice = existingItem.unitPrice * updates.quantity;
    }

    const [updatedItem] = await db.update(orderItems).set(finalUpdates).where(eq(orderItems.id, id)).returning();
    if (updatedItem) {
      const itemsOfOrder = await this.getOrderItems(updatedItem.orderId);
      const newTotal = itemsOfOrder.reduce((sum, current) => sum + current.totalPrice, 0);
      await this.updateOrder(updatedItem.orderId, { total: newTotal });
    }
    return updatedItem;
  }

  async removeOrderItem(id: number): Promise<OrderItem | undefined> {
    const [deletedItem] = await db.delete(orderItems).where(eq(orderItems.id, id)).returning();
    if (deletedItem && deletedItem.orderId) {
      const itemsOfOrder = await this.getOrderItems(deletedItem.orderId);
      const newTotal = itemsOfOrder.reduce((sum, current) => sum + current.totalPrice, 0);
      await this.updateOrder(deletedItem.orderId, { total: newTotal });
    }
    return deletedItem;
  }

  async completeOrder(id: number): Promise<Order | undefined> {
    const [completedOrder] = await db
      .update(orders)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(orders.id, id))
      .returning();
    return completedOrder;
  }
  async getTables(): Promise<Table[]> { return await db.select().from(tables); }
  async getTable(id: number): Promise<Table | undefined> { const [table] = await db.select().from(tables).where(eq(tables.id, id)); return table; }
  async createTable(table: InsertTable): Promise<Table> { const [newTable] = await db.insert(tables).values(table).returning(); return newTable; }
  async updateTableStatus(id: number, status: string): Promise<Table | undefined> { const [updatedTable] = await db.update(tables).set({ status }).where(eq(tables.id, id)).returning(); return updatedTable; }
  async deleteTable(id: number): Promise<boolean> { const result = await db.delete(tables).where(eq(tables.id, id)).returning({ id: tables.id }); return result.length > 0; }
  async getMenuCollections(): Promise<MenuCollection[]> { return await db.select().from(menuCollections); }
  async getMenuCollection(id: number): Promise<MenuCollection | undefined> { const [collection] = await db.select().from(menuCollections).where(eq(menuCollections.id, id)); return collection; }
  async createMenuCollection(collection: InsertMenuCollection): Promise<MenuCollection> { const [newCollection] = await db.insert(menuCollections).values(collection).returning(); return newCollection; }
  async updateMenuCollection(id: number, updates: Partial<MenuCollection>): Promise<MenuCollection | undefined> { const [updatedCollection] = await db.update(menuCollections).set(updates).where(eq(menuCollections.id, id)).returning(); return updatedCollection; }
  async deleteMenuCollection(id: number): Promise<boolean> { const linkedItems = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.menuCollectionId, id)).limit(1); if (linkedItems.length > 0) { return false; } const result = await db.delete(menuCollections).where(eq(menuCollections.id, id)).returning({ id: menuCollections.id }); return result.length > 0; }
  async getMenuItems(collectionId?: number | null): Promise<MenuItem[]> { if (collectionId !== undefined && collectionId !== null) { return await db.select().from(menuItems).where(eq(menuItems.menuCollectionId, collectionId)); } return await db.select().from(menuItems); }
  async getMenuItem(id: number): Promise<MenuItem | undefined> { const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id)); return item; }
  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> { const [newItem] = await db.insert(menuItems).values(item).returning(); return newItem; }
  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | undefined> { const [updatedItem] = await db.update(menuItems).set(updates).where(eq(menuItems.id, id)).returning(); return updatedItem; }
  async deleteMenuItem(id: number): Promise<boolean> { const result = await db.delete(menuItems).where(eq(menuItems.id, id)).returning({ id: menuItems.id }); return result.length > 0; }
  async getOrders(): Promise<Order[]> { return await db.select().from(orders); }
  async getActiveOrderByTable(tableId: number): Promise<Order | undefined> { const [order] = await db.select().from(orders).where(and(eq(orders.tableId, tableId), eq(orders.status, 'active'))); return order; }
  async createOrder(order: InsertOrder): Promise<Order> { const [newOrder] = await db.insert(orders).values({ ...order, updatedAt: sql`CURRENT_TIMESTAMP` }).returning(); return newOrder; } // Ensure updatedAt on create
  async getOrderItems(orderId: number): Promise<OrderItem[]> { return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId)); }
  async addSyncRecord(sync: InsertGoogleSheetsSync): Promise<GoogleSheetsSync> { const [newSync] = await db.insert(googleSheetsSync).values(sync).returning(); return newSync; }
  async getSyncRecord(orderId: number): Promise<GoogleSheetsSync | undefined> { const [record] = await db.select().from(googleSheetsSync).where(eq(googleSheetsSync.orderId, orderId)); return record; }
  async getDailyRevenue(date?: Date): Promise<number> {
    const startOfDay = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();
    const endOfDay = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1).toISOString();

    const result = await db
      .select({ totalRevenue: sql<number>`sum(${orders.total})` })
      .from(orders)
      .where(and(
        eq(orders.status, 'completed'),
        sql`${orders.completedAt} >= ${startOfDay}`,
        sql`${orders.completedAt} < ${endOfDay}`
      ));
    return result[0]?.totalRevenue || 0;
  }
  async getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>> {
    const startOfDay = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();
    const endOfDay = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1).toISOString();

    const result = await db
      .select({
        tableName: tables.name,
        orderCount: sql<number>`count(${orders.id})`,
        revenue: sql<number>`sum(${orders.total})`
      })
      .from(orders)
      .innerJoin(tables, eq(orders.tableId, tables.id))
      .where(and(
        eq(orders.status, 'completed'),
        sql`${orders.completedAt} >= ${startOfDay}`,
        sql`${orders.completedAt} < ${endOfDay}`
      ))
      .groupBy(tables.name)
      .orderBy(tables.name);
    return result;
  }
}

export const storage = new DatabaseStorage();