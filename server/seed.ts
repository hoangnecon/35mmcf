import { db } from "./db";
import { tables, menuItems } from "@shared/schema";

async function seedDatabase() {
  console.log("Seeding database...");

  // Check if tables already exist
  const existingTables = await db.select().from(tables);
  
  if (existingTables.length === 0) {
    // Initialize tables (Bàn 1-22, Phòng VIP 1-10, Special tables)
    const regularTables = Array.from({ length: 22 }, (_, i) => ({
      name: `Bàn ${i + 1}`,
      type: 'regular' as const,
      status: 'available' as const,
    }));

    const vipTables = Array.from({ length: 10 }, (_, i) => ({
      name: `Phòng VIP ${i + 1}`,
      type: 'vip' as const,
      status: 'available' as const,
    }));

    const specialTables = [
      {
        name: 'Mang về',
        type: 'special' as const,
        status: 'available' as const,
      },
      {
        name: 'Giao đi',
        type: 'special' as const,
        status: 'available' as const,
      },
    ];

    const allTables = [...regularTables, ...vipTables, ...specialTables];
    await db.insert(tables).values(allTables);
    console.log(`Inserted ${allTables.length} tables`);
  }

  // Check if menu items already exist
  const existingMenuItems = await db.select().from(menuItems);
  
  if (existingMenuItems.length === 0) {
    // Initialize menu items
    const menuItemsData = [
      { 
        name: 'Thạch trái cây', 
        price: 6400, 
        category: 'Đồ uống', 
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1
      },
      { 
        name: 'Bánh tráng trộn', 
        price: 20000, 
        category: 'Đồ ăn vặt', 
        imageUrl: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1
      },
      { 
        name: 'Cà phê sữa đá', 
        price: 15000, 
        category: 'Đồ uống', 
        imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1
      },
      { 
        name: 'Trà sữa trân châu', 
        price: 25000, 
        category: 'Đồ uống', 
        imageUrl: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1
      },
      { 
        name: 'Nem cuốn', 
        price: 18000, 
        category: 'Đồ ăn', 
        imageUrl: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1
      },
      { 
        name: 'Nước dừa tươi', 
        price: 12000, 
        category: 'Đồ uống', 
        imageUrl: 'https://images.unsplash.com/photo-1571863533956-01c88e79957e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1
      },
    ];

    await db.insert(menuItems).values(menuItemsData);
    console.log(`Inserted ${menuItemsData.length} menu items`);
  }

  console.log("Database seeding completed!");
}

// Run seeding if this file is executed directly
seedDatabase().catch(console.error);

export { seedDatabase };