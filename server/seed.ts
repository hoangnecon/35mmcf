// server/seed.ts
import { db } from "./db";
import { tables, menuItems, menuCollections } from "@shared/schema"; // Thêm menuCollections vào import

async function seedDatabase() {
  console.log("Seeding database...");

  // Check if tables already exist
  const existingTables = await db.select().from(tables);
  
  if (existingTables.length === 0) {
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
      { name: 'Mang về', type: 'special' as const, status: 'available' as const },
      { name: 'Giao đi', type: 'special' as const, status: 'available' as const },
    ];
    const allTables = [...regularTables, ...vipTables, ...specialTables];
    await db.insert(tables).values(allTables);
    console.log(`Inserted ${allTables.length} tables`);
  }

  // *** THÊM LOGIC SEED CHO MENU COLLECTIONS ***
  // Check if menu collections already exist
  const existingMenuCollections = await db.select().from(menuCollections);
  let defaultCollectionId = 1; // Giả sử ID đầu tiên sẽ là 1

  if (existingMenuCollections.length === 0) {
    console.log("Seeding menu collections...");
    const defaultCollectionData = {
      name: "Thực đơn chính",
      description: "Các món ăn và đồ uống thông thường",
      isActive: 1,
      // createdAt sẽ tự động được tạo bởi default(sql`CURRENT_TIMESTAMP`)
    };
    // Khi insert, id sẽ tự động tăng. Bản ghi đầu tiên thường sẽ có id = 1.
    const insertedCollections = await db.insert(menuCollections).values(defaultCollectionData).returning({ insertedId: menuCollections.id });
    if (insertedCollections.length > 0 && insertedCollections[0].insertedId) {
        defaultCollectionId = insertedCollections[0].insertedId;
        console.log(`Inserted default menu collection with ID: ${defaultCollectionId}`);
    } else {
        console.error("Failed to insert default menu collection or retrieve its ID.");
        // Bạn có thể quyết định dừng ở đây hoặc tiếp tục với defaultCollectionId = 1 và hy vọng nó đúng
    }
  } else {
    // Nếu đã có collection, tìm một collection active hoặc collection đầu tiên để dùng làm default
    const firstActiveCollection = existingMenuCollections.find(col => col.isActive === 1);
    if (firstActiveCollection) {
        defaultCollectionId = firstActiveCollection.id;
    } else if (existingMenuCollections.length > 0) {
        defaultCollectionId = existingMenuCollections[0].id;
    }
    console.log(`Using existing menu collection with ID: ${defaultCollectionId} for menu items.`);
  }

  // Check if menu items already exist
  const existingMenuItems = await db.select().from(menuItems);
  
  if (existingMenuItems.length === 0) {
    console.log("Seeding menu items...");
    // Cập nhật menuItemsData để sử dụng defaultCollectionId
    const menuItemsData = [
      { 
        name: 'Thạch trái cây', price: 6400, category: 'Đồ uống', 
        imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1, menuCollectionId: defaultCollectionId // Sử dụng ID collection đã được xác định
      },
      { 
        name: 'Bánh tráng trộn', price: 20000, category: 'Đồ ăn vặt', 
        imageUrl: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1, menuCollectionId: defaultCollectionId
      },
      { 
        name: 'Cà phê sữa đá', price: 15000, category: 'Đồ uống', 
        imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1, menuCollectionId: defaultCollectionId
      },
      // ... (thêm menuCollectionId cho các món còn lại) ...
      { 
        name: 'Trà sữa trân châu', price: 25000, category: 'Đồ uống', 
        imageUrl: 'https://images.unsplash.com/photo-1525385133512-2f3bdd039054?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1, menuCollectionId: defaultCollectionId
      },
      { 
        name: 'Nem cuốn', price: 18000, category: 'Đồ ăn', 
        imageUrl: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1, menuCollectionId: defaultCollectionId
      },
      { 
        name: 'Nước dừa tươi', price: 12000, category: 'Đồ uống', 
        imageUrl: 'https://images.unsplash.com/photo-1571863533956-01c88e79957e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1, menuCollectionId: defaultCollectionId
      },
    ];

    await db.insert(menuItems).values(menuItemsData);
    console.log(`Inserted ${menuItemsData.length} menu items`);
  }

  console.log("Database seeding completed!");
}

// Run seeding if this file is executed directly
seedDatabase().catch(error => {
  console.error("Seeding failed:", error);
  process.exit(1); // Thoát với mã lỗi nếu seeding thất bại
});

export { seedDatabase };