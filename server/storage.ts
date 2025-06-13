// server/storage.ts
import {
  tables, menuItems, orders, orderItems, menuCollections, bills,
  type Table, type InsertTable, type MenuItem, type InsertMenuItem,
  type Order, type InsertOrder, type OrderItem, type InsertOrderItem,
  type MenuCollection, type InsertMenuCollection,
  type Bill, type InsertBill,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, sum, inArray } from "drizzle-orm"; // Thêm inArray để xóa nhiều item cùng lúc

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
  getOrderById(id: number): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Omit<Order, 'id' | 'createdAt' | 'tableId' | 'tableName' | 'updatedAt'>>): Promise<Order | undefined>;
  completeOrder(id: number, paymentMethod: string, discountAmount: number): Promise<Order | undefined>;
  getOrderItems(orderId: number): Promise<OrderItem[]>;
  addOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  updateOrderItem(id: number, updates: Partial<Omit<OrderItem, 'id' | 'orderId' | 'menuItemId' | 'menuItemName' | 'unitPrice'>>): Promise<OrderItem | undefined>;
  getOrderItem(id: number): Promise<OrderItem | undefined>;
  removeOrderItem(id: number): Promise<OrderItem | undefined>;
  getDailyRevenue(date?: Date): Promise<number>;
  getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>>;
  createBill(bill: InsertBill): Promise<Bill>;
  getBills(startDate?: Date, endDate?: Date): Promise<Bill[]>;

  updateOrderNote(orderId: number, note: string | null): Promise<Order | undefined>;
  cancelOrder(orderId: number, tableId: number): Promise<boolean>;

  // THÊM PHƯƠNG THỨC MỚI CHO THANH TOÁN MỘT PHẦN
  processPartialPayment(
    orderId: number,
    itemsToPay: { orderItemId: number; quantity: number }[],
    paymentMethod: string,
    partialDiscountAmount: number
  ): Promise<Order | undefined>;
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
  async getOrderById(id: number): Promise<Order | undefined> { throw new Error("Method not implemented."); }
  async createOrder(order: InsertOrder): Promise<Order> { throw new Error("Not implemented"); }
  async updateOrder(id: number, updates: Partial<Omit<Order, 'id' | 'createdAt' | 'tableId' | 'tableName' | 'updatedAt'>>): Promise<Order | undefined> { throw new Error("Not implemented"); }
  async completeOrder(id: number, paymentMethod: string, discountAmount: number): Promise<Order | undefined> { throw new Error("Method not implemented."); }
  async getOrderItems(orderId: number): Promise<OrderItem[]> { return []; }
  async addOrderItem(item: InsertOrderItem): Promise<OrderItem> { throw new Error("Not implemented"); }
  async updateOrderItem(id: number, updates: Partial<Omit<OrderItem, 'id' | 'orderId' | 'menuItemId' | 'menuItemName' | 'unitPrice'>>): Promise<OrderItem | undefined> { throw new Error("Not implemented."); }
  async removeOrderItem(id: number): Promise<OrderItem | undefined> { throw new Error("Not implemented."); }
  async getDailyRevenue(date?: Date): Promise<number> { return 0; }
  async getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>> { return []; }
  async createBill(bill: InsertBill): Promise<Bill> { throw new Error("Method not implemented."); }
  async getBills(startDate?: Date, endDate?: Date): Promise<Bill[]> { return []; }
  async updateOrderNote(orderId: number, note: string | null): Promise<Order | undefined> { throw new Error("Method not implemented."); }
  async cancelOrder(orderId: number, tableId: number): Promise<boolean> { throw new Error("Method not implemented."); }
  // THÊM PHƯƠNG THỨC MỚI VÀO MEMSTORAGE
  async processPartialPayment(
    orderId: number,
    itemsToPay: { orderItemId: number; quantity: number }[],
    paymentMethod: string,
    partialDiscountAmount: number
  ): Promise<Order | undefined> { throw new Error("Method not implemented."); }
}

export class DatabaseStorage implements IStorage {
  async getOrderItem(id: number): Promise<OrderItem | undefined> {
    const [item] = await db.select().from(orderItems).where(eq(orderItems.id, id));
    return item;
  }

  async updateOrder(id: number, updates: Partial<Omit<Order, 'id' | 'createdAt' | 'tableId' | 'tableName' | 'updatedAt'>>): Promise<Order | undefined> {
    const finalUpdates = { ...updates, updatedAt: sql`CURRENT_TIMESTAMP` };
    const [updatedOrder] = await db
      .update(orders)
      .set(finalUpdates)
      .where(eq(orders.id, id))
      .returning();
    console.log(`DatabaseStorage: Updated order ${id}, new updatedAt: ${updatedOrder?.updatedAt}`);
    return updatedOrder;
  }

  async addOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    if (!item.menuItemId) {
      throw new Error("menuItemId is required to add an order item.");
    }
    const menuItemDetails = await this.getMenuItem(item.menuItemId);
    if (!menuItemDetails) {
      throw new Error(`MenuItem with ID ${item.menuItemId} not found.`);
    }

    const newItemData: InsertOrderItem = {
      ...item,
      menuItemName: menuItemDetails.name,
      unitPrice: menuItemDetails.price,
      quantity: item.quantity,
      totalPrice: item.quantity * menuItemDetails.price,
    };

    const [newItem] = await db.insert(orderItems).values(newItemData).returning();
    if (newItem) {
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

  async completeOrder(id: number, paymentMethod: string, discountAmount: number): Promise<Order | undefined> {
    const [completedOrder] = await db
      .update(orders)
      .set({
        status: 'completed',
        completedAt: new Date().toISOString(),
        updatedAt: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(orders.id, id))
      .returning();

    if (completedOrder) {
      // Cập nhật trạng thái bàn thành 'available'
      await this.updateTableStatus(completedOrder.tableId, 'available');
      console.log(`DatabaseStorage: Table ${completedOrder.tableId} status updated to available.`);

      // Tính toán totalAmount cuối cùng sau khi áp dụng discount
      const finalAmount = completedOrder.total - discountAmount;

      // Tạo một bản ghi trong bảng `bills` sau khi order hoàn tất
      const newBillData: InsertBill = {
        orderId: completedOrder.id,
        tableId: completedOrder.tableId,
        tableName: completedOrder.tableName,
        totalAmount: finalAmount,
        paymentMethod: paymentMethod,
      };
      await this.createBill(newBillData);
      console.log(`DatabaseStorage: Created bill for order ${completedOrder.id}`);
    }
    return completedOrder;
  }

  // THÊM PHƯƠNG THỨC updateOrderNote
  async updateOrderNote(orderId: number, note: string | null): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ note, updatedAt: sql`CURRENT_TIMESTAMP` })
      .where(eq(orders.id, orderId))
      .returning();
    return updatedOrder;
  }

  // THÊM PHƯƠNG THỨC cancelOrder
  async cancelOrder(orderId: number, tableId: number): Promise<boolean> {
    try {
      // Xóa tất cả các orderItems liên quan đến đơn hàng
      await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
      console.log(`Deleted order items for order ${orderId}`);

      // Cập nhật trạng thái đơn hàng thành 'cancelled'
      const [cancelledOrder] = await db
        .update(orders)
        .set({
          status: 'cancelled',
          total: 0, // Đặt lại tổng tiền về 0
          completedAt: new Date().toISOString(), // Ghi nhận thời gian hủy
          updatedAt: sql`CURRENT_TIMESTAMP`
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (cancelledOrder) {
        // Cập nhật trạng thái bàn thành 'available'
        await this.updateTableStatus(tableId, 'available');
        console.log(`Table ${tableId} status updated to available after order cancellation.`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to cancel order ${orderId}:`, error);
      return false;
    }
  }

  // THÊM PHƯƠNG THỨC processPartialPayment
  // Sửa lỗi: hàm transaction phải là đồng bộ. Các await bên trong sẽ được Drizzle xử lý đồng bộ.
  async processPartialPayment(
    orderId: number,
    itemsToPay: { orderItemId: number; quantity: number }[],
    paymentMethod: string,
    partialDiscountAmount: number
  ): Promise<Order | undefined> {
    // Đảm bảo hàm callback của transaction là đồng bộ (bỏ async)
    return db.transaction((tx) => {
      // 1. Lấy thông tin đơn hàng gốc
      const [originalOrder] = tx.select().from(orders).where(eq(orders.id, orderId)).all(); // .all() để lấy kết quả synchronous
      if (!originalOrder) {
        throw new Error(`Order with ID ${orderId} not found.`);
      }

      // 2. Lấy tất cả orderItems của đơn hàng gốc
      const currentOrderItems = tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all(); // .all() để lấy kết quả synchronous
      
      let totalPartialPaymentAmount = 0;
      const itemsToDeleteIds: number[] = [];

      // 3. Xử lý từng item trong itemsToPay
      for (const itemToPay of itemsToPay) {
        if (itemToPay.quantity <= 0) {
            // Bỏ qua hoặc báo lỗi nếu số lượng là 0 hoặc âm
            continue; 
        }

        const existingItem = currentOrderItems.find(item => item.id === itemToPay.orderItemId);

        if (!existingItem) {
            throw new Error(`Order item with ID ${itemToPay.orderItemId} not found in original order.`);
        }
        if (existingItem.quantity < itemToPay.quantity) {
            throw new Error(`Invalid quantity for order item ${itemToPay.orderItemId}. Requested: ${itemToPay.quantity}, Available: ${existingItem.quantity}.`);
        }

        const itemCost = existingItem.unitPrice * itemToPay.quantity;
        totalPartialPaymentAmount += itemCost;

        if (existingItem.quantity === itemToPay.quantity) {
          // Nếu số lượng thanh toán bằng số lượng hiện có, xóa item này
          itemsToDeleteIds.push(existingItem.id);
        } else {
          // Nếu số lượng thanh toán ít hơn, cập nhật số lượng và tổng tiền của item
          const newQuantity = existingItem.quantity - itemToPay.quantity;
          const newTotalPrice = existingItem.unitPrice * newQuantity;
          tx.update(orderItems).set({ quantity: newQuantity, totalPrice: newTotalPrice }).where(eq(orderItems.id, existingItem.id)).run(); // .run() để thực thi synchronous
        }
      }

      // 4. Xóa các item đã được thanh toán hết
      if (itemsToDeleteIds.length > 0) {
        tx.delete(orderItems).where(inArray(orderItems.id, itemsToDeleteIds)).run(); // .run() để thực thi synchronous
      }

      // 5. Tính toán tổng tiền thực tế của partial payment sau khi trừ chiết khấu
      const finalPartialPaymentAmount = totalPartialPaymentAmount - partialDiscountAmount;

      // 6. Tạo bill cho phần thanh toán này
      const newBillData: InsertBill = {
        orderId: originalOrder.id,
        tableId: originalOrder.tableId,
        tableName: originalOrder.tableName,
        totalAmount: finalPartialPaymentAmount,
        paymentMethod: paymentMethod,
        createdAt: new Date().toISOString(), // Đảm bảo thời gian tạo bill
      };
      tx.insert(bills).values(newBillData).run(); // .run() để thực thi synchronous

      // 7. Cập nhật tổng tiền của đơn hàng gốc
      const remainingItems = tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).all(); // .all() để lấy kết quả synchronous
      const newOrderTotal = remainingItems.reduce((sum, item) => sum + item.totalPrice, 0);

      let newOrderStatus = originalOrder.status;
      if (remainingItems.length === 0) {
        // Nếu không còn món nào, đơn hàng gốc hoàn tất
        newOrderStatus = 'completed';
      }

      const [updatedOrder] = tx
        .update(orders)
        .set({
          total: newOrderTotal,
          status: newOrderStatus,
          completedAt: newOrderStatus === 'completed' ? new Date().toISOString() : originalOrder.completedAt,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(orders.id, orderId))
        .returning()
        .all(); // .all() để lấy kết quả synchronous cho returning

      // Nếu đơn hàng gốc đã hoàn tất, cập nhật trạng thái bàn
      if (newOrderStatus === 'completed') {
        tx.update(tables).set({ status: 'available' }).where(eq(tables.id, originalOrder.tableId)).run(); // .run() để thực thi synchronous
      }

      return updatedOrder;
    });
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
  async getOrderById(id: number): Promise<Order | undefined> { const [order] = await db.select().from(orders).where(eq(orders.id, id)); return order; }
  async createOrder(order: InsertOrder): Promise<Order> { const [newOrder] = await db.insert(orders).values({ ...order, updatedAt: sql`CURRENT_TIMESTAMP` }).returning(); return newOrder; }
  async getOrderItems(orderId: number): Promise<OrderItem[]> { return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId)); }

  async getDailyRevenue(date?: Date): Promise<number> {
    const startOfDay = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();
    const endOfDay = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1).toISOString();

    const result = await db
      .select({ totalRevenue: sum(bills.totalAmount) })
      .from(bills)
      .where(and(
        sql`${bills.createdAt} >= ${startOfDay}`,
        sql`${bills.createdAt} < ${endOfDay}`
      ));
    return result[0]?.totalRevenue || 0;
  }

  async getRevenueByTable(date?: Date): Promise<Array<{ tableName: string; orderCount: number; revenue: number }>> {
    const startOfDay = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toISOString();
    const endOfDay = date ? new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString() : new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1).toISOString();

    const result = await db
      .select({
        tableName: bills.tableName,
        orderCount: sql<number>`count(${bills.orderId})`,
        revenue: sum(bills.totalAmount)
      })
      .from(bills)
      .where(and(
        sql`${bills.createdAt} >= ${startOfDay}`,
        sql`${bills.createdAt} < ${endOfDay}`
      ))
      .groupBy(bills.tableName)
      .orderBy(bills.tableName);
    return result;
  }

  async createBill(bill: InsertBill): Promise<Bill> {
    const [newBill] = await db.insert(bills).values(bill).returning();
    return newBill;
  }

  async getBills(startDate?: Date, endDate?: Date): Promise<Bill[]> {
    let query = db.select().from(bills);
    if (startDate && endDate) {
      query = query.where(and(
        sql`${bills.createdAt} >= ${startDate.toISOString()}`,
        sql`${bills.createdAt} < ${endDate.toISOString()}`
      ));
    }
    return await query;
  }
}

export const storage = new DatabaseStorage();
