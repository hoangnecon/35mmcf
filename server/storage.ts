// server/storage.ts
import {
  tables,
  menuItems,
  orders,
  orderItems,
  googleSheetsSync,
  menuCollections,
  type Table,
  type InsertTable,
  type MenuItem,
  type InsertMenuItem,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type GoogleSheetsSync,
  type InsertGoogleSheetsSync,
  type MenuCollection,
  type InsertMenuCollection,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql as drizzleSql } from "drizzle-orm"; // đổi tên sql thành drizzleSql để tránh xung đột

export interface IStorage {
  // Tables
  getTables(): Promise<Table[]>;
  getTable(id: number): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTableStatus(id: number, status: string): Promise<Table | undefined>;
  deleteTable(id: number): Promise<boolean>;

  // Menu Collections
  getMenuCollections(): Promise<MenuCollection[]>;
  getMenuCollection(id: number): Promise<MenuCollection | undefined>;
  createMenuCollection(collection: InsertMenuCollection): Promise<MenuCollection>;
  updateMenuCollection(id: number, updates: Partial<MenuCollection>): Promise<MenuCollection | undefined>;
  deleteMenuCollection(id: number): Promise<boolean>;

  // Menu Items
  getMenuItems(collectionId?: number | null): Promise<MenuItem[]>; // Cho phép null
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  createMenuItem(item: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;

  // Orders
  getOrders(): Promise<Order[]>;
  getActiveOrderByTable(tableId: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined>;
  completeOrder(id: number): Promise<Order | undefined>;

  // Order Items
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  addOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: number, updates: Partial<OrderItem>): Promise<OrderItem | undefined>;
  removeOrderItem(id: number): Promise<OrderItem | undefined>; // Sửa kiểu trả về

  // Google Sheets Sync
  addSyncRecord(sync: InsertGoogleSheetsSync): Promise<GoogleSheetsSync>;
  getSyncRecord(orderId: number): Promise<GoogleSheetsSync | undefined>;

  // Revenue
  getDailyRevenue(date?: Date): Promise<number>;
  getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>>;
}

export class MemStorage implements IStorage {
  private tables: Map<number, Table> = new Map();
  private menuItems: Map<number, MenuItem> = new Map();
  private orders: Map<number, Order> = new Map();
  private orderItems: Map<number, OrderItem> = new Map();
  private googleSheetsSync: Map<number, GoogleSheetsSync> = new Map();
  private menuCollections: Map<number, MenuCollection> = new Map();

  private tableIdCounter = 1;
  private menuItemIdCounter = 1;
  private orderIdCounter = 1;
  private orderItemIdCounter = 1;
  private syncIdCounter = 1;
  private menuCollectionIdCounter = 1;

  constructor() {
    // this.initializeDefaultData(); // Bỏ seed ở đây để seed từ file riêng
  }

  // Methods giữ nguyên logic, chỉ sửa removeOrderItem
  async getTables(): Promise<Table[]> { return Array.from(this.tables.values()); }
  async getTable(id: number): Promise<Table | undefined> { return this.tables.get(id); }
  async createTable(table: InsertTable): Promise<Table> {
    const newTable: Table = { ...table, id: this.tableIdCounter++ };
    this.tables.set(newTable.id, newTable);
    return newTable;
  }
  async updateTableStatus(id: number, status: string): Promise<Table | undefined> {
    const table = this.tables.get(id);
    if (table) {
      const updatedTable = { ...table, status };
      this.tables.set(id, updatedTable);
      return updatedTable;
    }
    return undefined;
  }
  async deleteTable(id: number): Promise<boolean> { return this.tables.delete(id); }

  async getMenuCollections(): Promise<MenuCollection[]> { return Array.from(this.menuCollections.values()); }
  async getMenuCollection(id: number): Promise<MenuCollection | undefined> { return this.menuCollections.get(id); }
  async createMenuCollection(collection: InsertMenuCollection): Promise<MenuCollection> {
    const newCollection: MenuCollection = { ...collection, id: this.menuCollectionIdCounter++, createdAt: new Date().toISOString(), isActive: collection.isActive ?? 1 };
    this.menuCollections.set(newCollection.id, newCollection);
    return newCollection;
  }
  async updateMenuCollection(id: number, updates: Partial<MenuCollection>): Promise<MenuCollection | undefined> {
    const existing = this.menuCollections.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.menuCollections.set(id, updated);
    return updated;
  }
  async deleteMenuCollection(id: number): Promise<boolean> {
     const linkedItems = Array.from(this.menuItems.values()).filter(item => item.menuCollectionId === id);
     if (linkedItems.length > 0) return false;
    return this.menuCollections.delete(id);
  }

  async getMenuItems(collectionId?: number | null): Promise<MenuItem[]> {
    let items = Array.from(this.menuItems.values());
    if (collectionId !== undefined && collectionId !== null) {
      items = items.filter(item => item.menuCollectionId === collectionId);
    }
    return items;
  }
  async getMenuItem(id: number): Promise<MenuItem | undefined> { return this.menuItems.get(id); }
  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const newItem: MenuItem = { ...item, id: this.menuItemIdCounter++, available: item.available ?? 1, menuCollectionId: item.menuCollectionId ?? 1 };
    this.menuItems.set(newItem.id, newItem);
    return newItem;
  }
  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const existing = this.menuItems.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.menuItems.set(id, updated);
    return updated;
  }
  async deleteMenuItem(id: number): Promise<boolean> { return this.menuItems.delete(id); }

  async getOrders(): Promise<Order[]> { return Array.from(this.orders.values()); }
  async getActiveOrderByTable(tableId: number): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(o => o.tableId === tableId && o.status === 'active');
  }
  async createOrder(order: InsertOrder): Promise<Order> {
    const newOrder: Order = { ...order, id: this.orderIdCounter++, createdAt: new Date().toISOString(), completedAt: null, status: order.status || 'active' };
    this.orders.set(newOrder.id, newOrder);
    return newOrder;
  }
  async updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      const updatedOrder = { ...order, ...updates };
      this.orders.set(id, updatedOrder);
      return updatedOrder;
    }
    return undefined;
  }
  async completeOrder(id: number): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (order) {
      const updatedOrder = { ...order, status: 'completed', completedAt: new Date().toISOString() };
      this.orders.set(id, updatedOrder);
      return updatedOrder;
    }
    return undefined;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(item => item.orderId === orderId);
  }
  async addOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const newItem: OrderItem = { ...item, id: this.orderItemIdCounter++ };
    this.orderItems.set(newItem.id, newItem);
    return newItem;
  }
  async updateOrderItem(id: number, updates: Partial<OrderItem>): Promise<OrderItem | undefined> {
    const item = this.orderItems.get(id);
    if (item) {
      const updatedItem = { ...item, ...updates };
      this.orderItems.set(id, updatedItem);
      return updatedItem;
    }
    return undefined;
  }
  
  // Sửa ở đây
  async removeOrderItem(id: number): Promise<OrderItem | undefined> {
    const item = this.orderItems.get(id);
    if (item) {
      this.orderItems.delete(id);
      return item; // Trả về item đã xóa
    }
    return undefined;
  }

  async addSyncRecord(sync: InsertGoogleSheetsSync): Promise<GoogleSheetsSync> {
    const newSync: GoogleSheetsSync = { ...sync, id: this.syncIdCounter++, syncedAt: new Date().toISOString() };
    this.googleSheetsSync.set(newSync.id, newSync);
    return newSync;
  }
  async getSyncRecord(orderId: number): Promise<GoogleSheetsSync | undefined> {
    return Array.from(this.googleSheetsSync.values()).find(sync => sync.orderId === orderId);
  }
  
  async getDailyRevenue(date?: Date): Promise<number> { /* ... giữ nguyên ... */ return 0}
  async getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>> { /* ... giữ nguyên ... */ return [] }
}


export class DatabaseStorage implements IStorage {
  async getTables(): Promise<Table[]> {
    return await db.select().from(tables);
  }

  async getTable(id: number): Promise<Table | undefined> {
    const [table] = await db.select().from(tables).where(eq(tables.id, id));
    return table || undefined;
  }

  async createTable(table: InsertTable): Promise<Table> {
    const [newTable] = await db
      .insert(tables)
      .values(table)
      .returning();
    return newTable;
  }

  async updateTableStatus(id: number, status: string): Promise<Table | undefined> {
    const [updatedTable] = await db
      .update(tables)
      .set({ status })
      .where(eq(tables.id, id))
      .returning();
    return updatedTable || undefined;
  }

  async getMenuCollections(): Promise<MenuCollection[]> {
    return await db.select().from(menuCollections);
  }

  async getMenuCollection(id: number): Promise<MenuCollection | undefined> {
    const [collection] = await db.select().from(menuCollections).where(eq(menuCollections.id, id));
    return collection || undefined;
  }

  async createMenuCollection(collection: InsertMenuCollection): Promise<MenuCollection> {
    const [newCollection] = await db
      .insert(menuCollections)
      .values(collection)
      .returning();
    return newCollection;
  }

  async updateMenuCollection(id: number, updates: Partial<MenuCollection>): Promise<MenuCollection | undefined> {
    const [updatedCollection] = await db
      .update(menuCollections)
      .set(updates)
      .where(eq(menuCollections.id, id))
      .returning();
    return updatedCollection || undefined;
  }

  async deleteMenuCollection(id: number): Promise<boolean> {
    const linkedItems = await db.select({id: menuItems.id}).from(menuItems).where(eq(menuItems.menuCollectionId, id)).limit(1);
    if (linkedItems.length > 0) {
      console.warn(`Cannot delete menu collection ${id}: menu items are linked.`);
      return false;
    }
    const result = await db.delete(menuCollections).where(eq(menuCollections.id, id)).returning({ id: menuCollections.id });
    return result.length > 0;
  }

  async getMenuItems(collectionId?: number | null): Promise<MenuItem[]> {
    if (collectionId !== undefined && collectionId !== null) { // Kiểm tra cả null
      return await db.select().from(menuItems).where(eq(menuItems.menuCollectionId, collectionId));
    }
    return await db.select().from(menuItems); // Lấy tất cả nếu không có collectionId
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item || undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db.insert(menuItems).values(item).returning();
    return newItem;
  }

  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const [updatedItem] = await db.update(menuItems).set(updates).where(eq(menuItems.id, id)).returning();
    return updatedItem || undefined;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const result = await db.delete(menuItems).where(eq(menuItems.id, id)).returning({ id: menuItems.id });
    return result.length > 0;
  }

  async deleteTable(id: number): Promise<boolean> {
    const result = await db.delete(tables).where(eq(tables.id, id)).returning({ id: tables.id });
    return result.length > 0;
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async getActiveOrderByTable(tableId: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(and(eq(orders.tableId, tableId), eq(orders.status, 'active')));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined> {
    const [updatedOrder] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return updatedOrder || undefined;
  }

  async completeOrder(id: number): Promise<Order | undefined> {
    const [completedOrder] = await db.update(orders).set({ status: 'completed', completedAt: new Date().toISOString() }).where(eq(orders.id, id)).returning();
    return completedOrder || undefined;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async addOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db.insert(orderItems).values(item).returning();
    return newItem;
  }

  async updateOrderItem(id: number, updates: Partial<OrderItem>): Promise<OrderItem | undefined> {
    const [updatedItem] = await db.update(orderItems).set(updates).where(eq(orderItems.id, id)).returning();
    return updatedItem || undefined;
  }

  // Sửa ở đây
  async removeOrderItem(id: number): Promise<OrderItem | undefined> {
    const [deletedItem] = await db
      .delete(orderItems)
      .where(eq(orderItems.id, id))
      .returning();
    return deletedItem;
  }

  async addSyncRecord(sync: InsertGoogleSheetsSync): Promise<GoogleSheetsSync> {
    const [newSync] = await db.insert(googleSheetsSync).values(sync).returning();
    return newSync;
  }

  async getSyncRecord(orderId: number): Promise<GoogleSheetsSync | undefined> {
    const [sync] = await db.select().from(googleSheetsSync).where(eq(googleSheetsSync.orderId, orderId));
    return sync || undefined;
  }

  async getDailyRevenue(date?: Date): Promise<number> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // SQLite TEXT date comparison can be tricky. For precise filtering,
    // ensure dates are stored in a comparable format (like ISO 8601)
    // or use SQLite date functions.
    const result = await db
      .select({ total: drizzleSql<number>`sum(${orders.total})`.mapWith(Number) })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          drizzleSql`${orders.completedAt} >= ${startOfDay.toISOString()}`,
          drizzleSql`${orders.completedAt} <= ${endOfDay.toISOString()}`
        )
      );
    return result[0]?.total || 0;
  }

  async getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const completedOrdersToday = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          drizzleSql`${orders.completedAt} >= ${startOfDay.toISOString()}`,
          drizzleSql`${orders.completedAt} <= ${endOfDay.toISOString()}`
        )
      );
    
    const revenueMap = new Map<string, { orderCount: number; revenue: number }>();
    for (const order of completedOrdersToday) {
      const current = revenueMap.get(order.tableName) || { orderCount: 0, revenue: 0 };
      current.orderCount += 1;
      current.revenue += order.total;
      revenueMap.set(order.tableName, current);
    }
    
    return Array.from(revenueMap.entries()).map(([tableName, data]) => ({
      tableName,
      orderCount: data.orderCount,
      revenue: data.revenue,
    }));
  }
}

export const storage = new DatabaseStorage();