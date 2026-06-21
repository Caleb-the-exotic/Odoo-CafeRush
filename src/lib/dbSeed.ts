import { User } from "../models/User";
import { MenuItem } from "../models/MenuItem";
import { Rating } from "../models/Rating";
import { seedUsers, seedMenu } from "./pos/seed";

export async function seedDatabaseIfNeeded() {
  try {
    // 1. Seed Users if empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log("Seeding users into MongoDB...");
      await User.insertMany(seedUsers);
      console.log(`Successfully seeded ${seedUsers.length} users!`);
    } else {
      const dummyExists = await User.findOne({ username: "dummy" });
      if (!dummyExists) {
        const dummyUser = seedUsers.find((u) => u.username === "dummy");
        if (dummyUser) {
          await User.create(dummyUser);
          console.log("Successfully seeded dummy user into MongoDB!");
        }
      } else if (dummyExists.role !== "customer") {
        await User.updateOne({ id: dummyExists.id }, { $set: { role: "customer" } });
        console.log("Successfully updated dummy user role to customer in MongoDB!");
      }
    }

    // 2. Seed Menu Items if empty
    const menuCount = await MenuItem.countDocuments();
    if (menuCount === 0) {
      console.log("Seeding menu items into MongoDB...");
      await MenuItem.insertMany(seedMenu);
      console.log(`Successfully seeded ${seedMenu.length} menu items!`);
    }

    // 3. Seed Ratings if empty
    const ratingCount = await Rating.countDocuments();
    if (ratingCount === 0) {
      console.log("Seeding initial sample ratings into MongoDB...");
      const sampleRatings = [
        {
          id: "r1",
          customerName: "Rajesh",
          orderNumber: "2201",
          rating: 5,
          comment: "Excellent Masala Tea and prompt service!",
          createdAt: Date.now() - 3600_000 * 2,
        },
        {
          id: "r2",
          customerName: "Priya",
          orderNumber: "2205",
          rating: 4,
          comment: "Burgers were delicious, but the beverage took slightly longer.",
          createdAt: Date.now() - 3600_000 * 12,
        },
        {
          id: "r3",
          customerName: "Amit",
          orderNumber: "2210",
          rating: 5,
          comment: "Amazing self-ordering experience, very smooth!",
          createdAt: Date.now() - 3600_000 * 24,
        },
      ];
      await Rating.insertMany(sampleRatings);
      console.log(`Successfully seeded ${sampleRatings.length} customer ratings!`);
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}
