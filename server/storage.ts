// server/storage.ts
import {
  tables,
  menuItems,
  orders,
  orderItems,
  googleSheetsSync,
  menuCollections, // Import menuCollections
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
  type MenuCollection, // Import MenuCollection type
  type InsertMenuCollection, // Import InsertMenuCollection type
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Tables
  getTables(): Promise<Table[]>;
  getTable(id: number): Promise<Table | undefined>;
  createTable(table: InsertTable): Promise<Table>;
  updateTableStatus(id: number, status: string): Promise<Table | undefined>;
  deleteTable(id: number): Promise<boolean>;

  // Menu Collections (NEW)
  getMenuCollections(): Promise<MenuCollection[]>;
  getMenuCollection(id: number): Promise<MenuCollection | undefined>;
  createMenuCollection(collection: InsertMenuCollection): Promise<MenuCollection>;
  updateMenuCollection(id: number, updates: Partial<MenuCollection>): Promise<MenuCollection | undefined>;
  deleteMenuCollection(id: number): Promise<boolean>;

  // Menu Items
  getMenuItems(collectionId?: number): Promise<MenuItem[]>; // Added optional collectionId
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
  removeOrderItem(id: number): Promise<boolean>;

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
  private menuCollections: Map<number, MenuCollection> = new Map(); // Added for in-memory

  private tableIdCounter = 1;
  private menuItemIdCounter = 1;
  private orderIdCounter = 1;
  private orderItemIdCounter = 1;
  private syncIdCounter = 1;
  private menuCollectionIdCounter = 1; // Added for in-memory

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Initialize default menu collection
    const mainCollection: MenuCollection = {
      id: this.menuCollectionIdCounter++,
      name: 'Main Menu',
      description: 'Default menu for daily use',
      isActive: 1,
      createdAt: new Date().toISOString(), // SQLite stores as text
    };
    this.menuCollections.set(mainCollection.id, mainCollection);


    // Initialize tables (Bàn 1-22, Phòng VIP 1-10, Special tables)
    const regularTables = Array.from({ length: 22 }, (_, i) => ({
      id: this.tableIdCounter++,
      name: `Bàn ${i + 1}`,
      type: 'regular' as const,
      status: 'available' as const,
    }));

    const vipTables = Array.from({ length: 10 }, (_, i) => ({
      id: this.tableIdCounter++,
      name: `Phòng VIP ${i + 1}`,
      type: 'vip' as const,
      status: 'available' as const,
    }));

    const specialTables = [
      {
        id: this.tableIdCounter++,
        name: 'Mang về',
        type: 'special' as const,
        status: 'available' as const,
      },
      {
        id: this.tableIdCounter++,
        name: 'Giao đi',
        type: 'special' as const,
        status: 'available' as const,
      },
    ];

    [...regularTables, ...vipTables, ...specialTables].forEach(table => {
      this.tables.set(table.id, table);
    });

    // Initialize menu items, linking to the main collection
    const menuItemsData = [
      { name: 'Thạch trái cây', price: 6400, category: 'Đồ uống', imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200' },
      { name: 'Bánh tráng trộn', price: 20000, category: 'Đồ ăn vặt', imageUrl: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200' },
      { name: 'Cà phê sữa đá', price: 15000, category: 'Đồ uống', imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200' },
      { name: 'Trà sữa trân châu', price: 25000, category: 'Đồ uống', imageUrl: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200' },
      { name: 'Nem cuốn', price: 18000, category: 'Đồ ăn', imageUrl: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200' },
      { name: 'Nước dừa tươi', price: 12000, category: 'Đồ uống', imageUrl: 'https://images.unsplash.com/photo-1571863533956-01c88e79957e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200' },
    ];

    menuItemsData.forEach(item => {
      const menuItem: MenuItem = {
        id: this.menuItemIdCounter++,
        ...item,
        available: 1,
        menuCollectionId: mainCollection.id, // Assign to the main collection
      };
      this.menuItems.set(menuItem.id, menuItem);
    });
  }

  async getTables(): Promise<Table[]> {
    return Array.from(this.tables.values());
  }

  async getTable(id: number): Promise<Table | undefined> {
    return this.tables.get(id);
  }

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

  async getMenuCollections(): Promise<MenuCollection[]> { // NEW
    return Array.from(this.menuCollections.values());
  }

  async getMenuCollection(id: number): Promise<MenuCollection | undefined> { // NEW
    return this.menuCollections.get(id);
  }

  async createMenuCollection(collection: InsertMenuCollection): Promise<MenuCollection> { // NEW
    const newCollection: MenuCollection = {
      ...collection,
      id: this.menuCollectionIdCounter++,
      createdAt: new Date().toISOString(),
    };
    this.menuCollections.set(newCollection.id, newCollection);
    return newCollection;
  }

  async updateMenuCollection(id: number, updates: Partial<MenuCollection>): Promise<MenuCollection | undefined> { // NEW
    const existing = this.menuCollections.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates };
    this.menuCollections.set(id, updated);
    return updated;
  }

  async deleteMenuCollection(id: number): Promise<boolean> { // NEW
    // In a real app, you'd also need to handle or prevent deletion if items are linked
    return this.menuCollections.delete(id);
  }

  async getMenuItems(collectionId?: number): Promise<MenuItem[]> { // Updated
    let items = Array.from(this.menuItems.values());
    if (collectionId !== undefined) {
      items = items.filter(item => item.menuCollectionId === collectionId);
    }
    return items;
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const newItem: MenuItem = { ...item, id: this.menuItemIdCounter++ };
    this.menuItems.set(newItem.id, newItem);
    return newItem;
  }

  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getActiveOrderByTable(tableId: number): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      order => order.tableId === tableId && order.status === 'active'
    );
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const newOrder: Order = {
      ...order,
      id: this.orderIdCounter++,
      createdAt: new Date().toISOString(), // SQLite stores as text
      completedAt: null,
    };
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
      const updatedOrder = { ...order, status: 'completed', completedAt: new Date().toISOString() }; // SQLite stores as text
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

  async removeOrderItem(id: number): Promise<boolean> {
    return this.orderItems.delete(id);
  }

  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const existing = this.menuItems.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.menuItems.set(id, updated);
    return updated;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    return this.menuItems.delete(id);
  }

  async deleteTable(id: number): Promise<boolean> {
    return this.tables.delete(id);
  }

  async addSyncRecord(sync: InsertGoogleSheetsSync): Promise<GoogleSheetsSync> {
    const newSync: GoogleSheetsSync = {
      ...sync,
      id: this.syncIdCounter++,
      syncedAt: new Date().toISOString(), // SQLite stores as text
    };
    this.googleSheetsSync.set(newSync.id, newSync);
    return newSync;
  }

  async getSyncRecord(orderId: number): Promise<GoogleSheetsSync | undefined> {
    return Array.from(this.googleSheetsSync.values()).find(sync => sync.orderId === orderId);
  }

  async getDailyRevenue(date?: Date): Promise<number> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.orders.values())
      .filter(order =>
        order.status === 'completed' &&
        order.completedAt && // ensure completedAt exists
        new Date(order.completedAt) >= startOfDay && // Convert text to Date for comparison
        new Date(order.completedAt) <= endOfDay // Convert text to Date for comparison
      )
      .reduce((total, order) => total + order.total, 0);
  }

  async getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const completedOrders = Array.from(this.orders.values())
      .filter(order =>
        order.status === 'completed' &&
        order.completedAt && // ensure completedAt exists
        new Date(order.completedAt) >= startOfDay && // Convert text to Date for comparison
        new Date(order.completedAt) <= endOfDay // Convert text to Date for comparison
      );

    const revenueByTable = new Map<string, { orderCount: number; revenue: number }>();

    completedOrders.forEach(order => {
      const existing = revenueByTable.get(order.tableName) || { orderCount: 0, revenue: 0 };
      revenueByTable.set(order.tableName, {
        orderCount: existing.orderCount + 1,
        revenue: existing.revenue + order.total,
      });
    });

    return Array.from(revenueByTable.entries()).map(([tableName, data]) => ({
      tableName,
      ...data,
    }));
  }
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

  // --- NEW: Menu Collections methods ---
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
    // Check for menu items linked to this collection before deleting
    const linkedItems = await db.select().from(menuItems).where(eq(menuItems.menuCollectionId, id));
    if (linkedItems.length > 0) {
      console.warn(`Cannot delete menu collection ${id}: ${linkedItems.length} menu items are linked.`);
      return false; // Prevent deletion if items are linked
    }

    const result = await db
      .delete(menuCollections)
      .where(eq(menuCollections.id, id))
      .returning(); // Use returning to get affected rows
    return result.length > 0; // Check if any row was returned (deleted)
  }
  // --- END NEW: Menu Collections methods ---

  async getMenuItems(collectionId?: number): Promise<MenuItem[]> { // Updated to filter by collectionId
    if (collectionId !== undefined) {
      return await db.select().from(menuItems).where(eq(menuItems.menuCollectionId, collectionId));
    }
    return await db.select().from(menuItems);
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item || undefined;
  }

  async createMenuItem(item: InsertMenuItem): Promise<MenuItem> {
    const [newItem] = await db
      .insert(menuItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateMenuItem(id: number, updates: Partial<MenuItem>): Promise<MenuItem | undefined> {
    const [updatedItem] = await db
      .update(menuItems)
      .set(updates)
      .where(eq(menuItems.id, id))
      .returning();
    return updatedItem || undefined;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const result = await db
      .delete(menuItems)
      .where(eq(menuItems.id, id))
      .returning(); // Use returning to get affected rows
    return result.length > 0; // Check if any row was returned (deleted)
  }

  async deleteTable(id: number): Promise<boolean> {
    const result = await db
      .delete(tables)
      .where(eq(tables.id, id))
      .returning(); // Use returning to get affected rows
    return result.length > 0; // Check if any row was returned (deleted)
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async getActiveOrderByTable(tableId: number): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.tableId, tableId), eq(orders.status, 'active')));
    return order || undefined;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    // For SQLite, CURRENT_TIMESTAMP is handled by Drizzle with `default(sql`CURRENT_TIMESTAMP`)` in schema.
    // So we don't manually set createdAt here, but let the DB do it.
    const [newOrder] = await db
      .insert(orders)
      .values(order)
      .returning();
    return newOrder;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder || undefined;
  }

  async completeOrder(id: number): Promise<Order | undefined> {
    const [completedOrder] = await db
      .update(orders)
      .set({ status: 'completed', completedAt: new Date().toISOString() }) // Store as ISO string for TEXT column
      .where(eq(orders.id, id))
      .returning();
    return completedOrder || undefined;
  }

  async getOrderItems(orderId: number): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async addOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db
      .insert(orderItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateOrderItem(id: number, updates: Partial<OrderItem>): Promise<OrderItem | undefined> {
    const [updatedItem] = await db
      .update(orderItems)
      .set(updates)
      .where(eq(orderItems.id, id))
      .returning();
    return updatedItem || undefined;
  }

  async removeOrderItem(id: number): Promise<boolean> {
    const result = await db
      .delete(orderItems)
      .where(eq(orderItems.id, id))
      .returning();
    return result.length > 0;
  }

  async addSyncRecord(sync: InsertGoogleSheetsSync): Promise<GoogleSheetsSync> {
    // For SQLite, CURRENT_TIMESTAMP is handled by Drizzle with `default(sql`CURRENT_TIMESTAMP`)` in schema.
    // So we don't manually set syncedAt here, but let the DB do it.
    const [newSync] = await db
      .insert(googleSheetsSync)
      .values(sync)
      .returning();
    return newSync;
  }

  async getSyncRecord(orderId: number): Promise<GoogleSheetsSync | undefined> {
    const [sync] = await db
      .select()
      .from(googleSheetsSync)
      .where(eq(googleSheetsSync.orderId, orderId));
    return sync || undefined;
  }

  async getDailyRevenue(date?: Date): Promise<number> {
    const targetDate = date || new Date();
    // Convert to ISO string for comparison as SQLite stores dates as TEXT
    const startOfDayIso = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
    const endOfDayIso = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();

    const completedOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          // Use Drizzle's `sql` for SQLite-specific date comparisons on TEXT fields if needed,
          // but for now, filtering in memory after fetching all completed orders.
          // For accurate filtering directly in SQLite, you might need:
          // and(sql`${orders.completedAt} >= ${startOfDayIso}`, sql`${orders.completedAt} <= ${endOfDayIso}`)
        )
      );

    // Filter in memory for simplicity with TEXT dates.
    // For large datasets, a raw SQL query with date functions would be more efficient.
    return completedOrders
      .filter(order =>
        order.completedAt &&
        order.completedAt >= startOfDayIso && // Compare ISO strings
        order.completedAt <= endOfDayIso // Compare ISO strings
      )
      .reduce((total, order) => total + order.total, 0);
  }

  async getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>> {
    const targetDate = date || new Date();
    const startOfDayIso = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
    const endOfDayIso = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();

    const completedOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'completed'));

    const filteredOrders = completedOrders.filter(order =>
      order.completedAt &&
      order.completedAt >= startOfDayIso &&
      order.completedAt <= endOfDayIso
    );

    const revenueByTable = new Map<string, { orderCount: number; revenue: number }>();

    filteredOrders.forEach(order => {
      const existing = revenueByTable.get(order.tableName) || { orderCount: 0, revenue: 0 };
      revenueByTable.set(order.tableName, {
        orderCount: existing.orderCount + 1,
        revenue: existing.revenue + order.total,
      });
    });

    return Array.from(revenueByTable.entries()).map(([tableName, data]) => ({
      tableName,
      ...data,
    }));
  }
}

export const storage = new DatabaseStorage();