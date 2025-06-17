// server/seed.ts
import { db } from "./db";
import { tables, menuItems, menuCollections } from "@shared/schema"; // Thêm menuCollections vào import

async function seedDatabase() {
  console.log("Seeding database...");

  // Check if tables already exist
  const existingTables = await db.select().from(tables);
  
  if (existingTables.length === 0) {
    const regularTables = Array.from({ length: 16 }, (_, i) => ({
      name: `Bàn ${i + 1}`,
      type: 'regular' as const,
      status: 'available' as const,
    }));
    const specialTables = [
      { name: 'Mang về', type: 'special' as const, status: 'available' as const },
    ];
    const allTables = [...regularTables, ...specialTables];
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
    };
    const insertedCollections = await db.insert(menuCollections).values(defaultCollectionData).returning({ insertedId: menuCollections.id });
    if (insertedCollections.length > 0 && insertedCollections[0].insertedId) {
        defaultCollectionId = insertedCollections[0].insertedId;
        console.log(`Inserted default menu collection with ID: ${defaultCollectionId}`);
    } else {
        console.error("Failed to insert default menu collection or retrieve its ID.");
    }
  } else {
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
        name: 'Đen', price: 6400, category: 'Cà phê', 
        imageUrl: 'https://scontent.fhan2-3.fna.fbcdn.net/v/t39.30808-6/375828618_828983451993983_239819946826678734_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFo1tiG4vv149kwgqm2iUutW_BSviK_tY5b8FK-Ir-1jlZ6iftehLihHE-noLNgggH2vRmerGw1GZOp3u9be9a2&_nc_ohc=H7jPw5qEtSEQ7kNvwFY2oX0&_nc_oc=Adk8CQDcsqPEzIfttBsc_CeQpQfEuhA84PTazjNI9J1GeGMX-2yAXwyov8haVfES9_Xnqzch_gU4BuLA4n2atMRH&_nc_zt=23&_nc_ht=scontent.fhan2-3.fna&_nc_gid=V77vXjq4ZQXHaHNYjzqXPw&oh=00_AfO1wpu5xGkwPyzDuZ9eS6PPD_q83-mkW6TXSQEc4217VA&oe=6855905A',
        available: 1, menuCollectionId: defaultCollectionId // Sử dụng ID collection đã được xác định
      },
      { 
        name: 'Đen SG', price: 20000, category: 'Cà phê', 
        imageUrl: 'https://scontent.fhan2-3.fna.fbcdn.net/v/t39.30808-6/375828618_828983451993983_239819946826678734_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFo1tiG4vv149kwgqm2iUutW_BSviK_tY5b8FK-Ir-1jlZ6iftehLihHE-noLNgggH2vRmerGw1GZOp3u9be9a2&_nc_ohc=H7jPw5qEtSEQ7kNvwFY2oX0&_nc_oc=Adk8CQDcsqPEzIfttBsc_CeQpQfEuhA84PTazjNI9J1GeGMX-2yAXwyov8haVfES9_Xnqzch_gU4BuLA4n2atMRH&_nc_zt=23&_nc_ht=scontent.fhan2-3.fna&_nc_gid=V77vXjq4ZQXHaHNYjzqXPw&oh=00_AfO1wpu5xGkwPyzDuZ9eS6PPD_q83-mkW6TXSQEc4217VA&oe=6855905A',
        available: 1, menuCollectionId: defaultCollectionId
      },
      { 
        name: 'Sữa', price: 15000, category: 'Cà phê', 
        imageUrl: 'https://scontent.fhan2-3.fna.fbcdn.net/v/t39.30808-6/375828618_828983451993983_239819946826678734_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFo1tiG4vv149kwgqm2iUutW_BSviK_tY5b8FK-Ir-1jlZ6iftehLihHE-noLNgggH2vRmerGw1GZOp3u9be9a2&_nc_ohc=H7jPw5qEtSEQ7kNvwFY2oX0&_nc_oc=Adk8CQDcsqPEzIfttBsc_CeQpQfEuhA84PTazjNI9J1GeGMX-2yAXwyov8haVfES9_Xnqzch_gU4BuLA4n2atMRH&_nc_zt=23&_nc_ht=scontent.fhan2-3.fna&_nc_gid=V77vXjq4ZQXHaHNYjzqXPw&oh=00_AfO1wpu5xGkwPyzDuZ9eS6PPD_q83-mkW6TXSQEc4217VA&oe=6855905A',
        available: 1, menuCollectionId: defaultCollectionId
      },
      { 
        name: 'Sữa SG', price: 25000, category: 'Cà phê', 
        imageUrl: 'https://scontent.fhan2-3.fna.fbcdn.net/v/t39.30808-6/375828618_828983451993983_239819946826678734_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFo1tiG4vv149kwgqm2iUutW_BSviK_tY5b8FK-Ir-1jlZ6iftehLihHE-noLNgggH2vRmerGw1GZOp3u9be9a2&_nc_ohc=H7jPw5qEtSEQ7kNvwFY2oX0&_nc_oc=Adk8CQDcsqPEzIfttBsc_CeQpQfEuhA84PTazjNI9J1GeGMX-2yAXwyov8haVfES9_Xnqzch_gU4BuLA4n2atMRH&_nc_zt=23&_nc_ht=scontent.fhan2-3.fna&_nc_gid=V77vXjq4ZQXHaHNYjzqXPw&oh=00_AfO1wpu5xGkwPyzDuZ9eS6PPD_q83-mkW6TXSQEc4217VA&oe=6855905A',
        available: 1, menuCollectionId: defaultCollectionId
      },
      { 
        name: 'Muối', price: 18000, category: 'Cà phê', 
        imageUrl: 'https://scontent.fhan2-3.fna.fbcdn.net/v/t39.30808-6/375828618_828983451993983_239819946826678734_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFo1tiG4vv149kwgqm2iUutW_BSviK_tY5b8FK-Ir-1jlZ6iftehLihHE-noLNgggH2vRmerGw1GZOp3u9be9a2&_nc_ohc=H7jPw5qEtSEQ7kNvwFY2oX0&_nc_oc=Adk8CQDcsqPEzIfttBsc_CeQpQfEuhA84PTazjNI9J1GeGMX-2yAXwyov8haVfES9_Xnqzch_gU4BuLA4n2atMRH&_nc_zt=23&_nc_ht=scontent.fhan2-3.fna&_nc_gid=V77vXjq4ZQXHaHNYjzqXPw&oh=00_AfO1wpu5xGkwPyzDuZ9eS6PPD_q83-mkW6TXSQEc4217VA&oe=6855905A',
        available: 1, menuCollectionId: defaultCollectionId
      },
            { 
        name: 'CF Kẹo đường', price: 12000, category: 'Cà phê', 
        imageUrl: 'https://scontent.fhan2-3.fna.fbcdn.net/v/t39.30808-6/375828618_828983451993983_239819946826678734_n.jpg?_nc_cat=108&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeFo1tiG4vv149kwgqm2iUutW_BSviK_tY5b8FK-Ir-1jlZ6iftehLihHE-noLNgggH2vRmerGw1GZOp3u9be9a2&_nc_ohc=H7jPw5qEtSEQ7kNvwFY2oX0&_nc_oc=Adk8CQDcsqPEzIfttBsc_CeQpQfEuhA84PTazjNI9J1GeGMX-2yAXwyov8haVfES9_Xnqzch_gU4BuLA4n2atMRH&_nc_zt=23&_nc_ht=scontent.fhan2-3.fna&_nc_gid=V77vXjq4ZQXHaHNYjzqXPw&oh=00_AfO1wpu5xGkwPyzDuZ9eS6PPD_q83-mkW6TXSQEc4217VA&oe=6855905A',
        available: 1, menuCollectionId: defaultCollectionId
      },
      { 
        name: 'Bạc Xỉu', price: 12000, category: 'Cà phê', 
        imageUrl: 'https://images.unsplash.com/photo-1571863533956-01c88e79957e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1, menuCollectionId: defaultCollectionId
      },
      {
        name: 'Bạc Xỉu Muối', price: 12000, category: 'Cà phê', 
        imageUrl: 'https://images.unsplash.com/photo-1571863533956-01c88e79957e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1, menuCollectionId: defaultCollectionId
      },
      { 
        name: 'Bạc Xỉu Kẹo Đường', price: 12000, category: 'Cà phê', 
        imageUrl: 'https://images.unsplash.com/photo-1571863533956-01c88e79957e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200',
        available: 1, menuCollectionId: defaultCollectionId
      },
    ];

    await db.insert(menuItems).values(menuItemsData);
    console.log(`Inserted ${menuItemsData.length} menu items`);
  }

  console.log("Database seeding completed!");
}

seedDatabase().catch(error => {
  console.error("Seeding failed:", error);
  process.exit(1); // Thoát với mã lỗi nếu seeding thất bại
});

export { seedDatabase };