import { 
  tables, 
  menuItems, 
  orders, 
  orderItems, 
  googleSheetsSync,
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

  // Menu Items
  getMenuItems(): Promise<MenuItem[]>;
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
  
  private tableIdCounter = 1;
  private menuItemIdCounter = 1;
  private orderIdCounter = 1;
  private orderItemIdCounter = 1;
  private syncIdCounter = 1;

  constructor() {
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
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

    // Initialize menu items
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

  async getMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
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
      createdAt: new Date(),
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
      const updatedOrder = { ...order, status: 'completed', completedAt: new Date() };
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

  async addSyncRecord(sync: InsertGoogleSheetsSync): Promise<GoogleSheetsSync> {
    const newSync: GoogleSheetsSync = {
      ...sync,
      id: this.syncIdCounter++,
      syncedAt: new Date(),
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
        order.completedAt &&
        order.completedAt >= startOfDay &&
        order.completedAt <= endOfDay
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
        order.completedAt &&
        order.completedAt >= startOfDay &&
        order.completedAt <= endOfDay
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

  async getMenuItems(): Promise<MenuItem[]> {
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
      .where(eq(menuItems.id, id));
    return (result.rowCount || 0) > 0;
  }

  async deleteTable(id: number): Promise<boolean> {
    const result = await db
      .delete(tables)
      .where(eq(tables.id, id));
    return (result.rowCount || 0) > 0;
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
      .set({ status: 'completed', completedAt: new Date() })
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
      .where(eq(orderItems.id, id));
    return result.rowCount > 0;
  }

  async addSyncRecord(sync: InsertGoogleSheetsSync): Promise<GoogleSheetsSync> {
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
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const completedOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          // Note: PostgreSQL date filtering would need proper SQL functions
          // For now, we'll get all completed orders and filter in memory
        )
      );

    return completedOrders
      .filter(order => 
        order.completedAt &&
        order.completedAt >= startOfDay &&
        order.completedAt <= endOfDay
      )
      .reduce((total, order) => total + order.total, 0);
  }

  async getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>> {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const completedOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, 'completed'));

    const filteredOrders = completedOrders.filter(order => 
      order.completedAt &&
      order.completedAt >= startOfDay &&
      order.completedAt <= endOfDay
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
