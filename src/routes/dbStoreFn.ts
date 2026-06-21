import { createServerFn } from "@tanstack/react-start";
import { connectToDatabase } from "../lib/db";
import { seedDatabaseIfNeeded } from "../lib/dbSeed";
import { User } from "../models/User";
import { MenuItem } from "../models/MenuItem";
import { Order } from "../models/Order";
import { Rating } from "../models/Rating";

// Helper validator to allow any data payload
const defaultValidator = (d: any) => d;

// 0. Lightweight poll: fetch only orders (no seed, no users/menu churn)
export const dbFetchOrdersFn = createServerFn({ method: "POST" })
  .inputValidator(defaultValidator)
  .handler(async () => {
    try {
      await connectToDatabase();
      const orders = await Order.find({}).lean();
      return { ok: true, orders: JSON.parse(JSON.stringify(orders)) };
    } catch (err) {
      console.error("Failed to poll orders from MongoDB:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

// 1. Fetch all data and run seeding if necessary
export const getInitialDataFn = createServerFn({ method: "POST" })
  .inputValidator(defaultValidator)
  .handler(async () => {
    try {
      await connectToDatabase();
      await seedDatabaseIfNeeded();

      const [users, menuItems, orders, ratings] = await Promise.all([
        User.find({}).lean(),
        MenuItem.find({}).lean(),
        Order.find({}).lean(),
        Rating.find({}).lean(),
      ]);

      return {
        ok: true,
        users: JSON.parse(JSON.stringify(users)),
        menuItems: JSON.parse(JSON.stringify(menuItems)),
        orders: JSON.parse(JSON.stringify(orders)),
        ratings: JSON.parse(JSON.stringify(ratings)),
      };
    } catch (err) {
      console.error("Failed to load initial MongoDB data:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

// 2. Save or Update User in MongoDB
export const dbSaveUserFn = createServerFn({ method: "POST" })
  .inputValidator((d: { user: any }) => d)
  .handler(async ({ data }) => {
    const { user } = data;
    try {
      await connectToDatabase();
      const updatedUser = await User.findOneAndUpdate(
        { id: user.id },
        { $set: user },
        { upsert: true, new: true, lean: true }
      );
      return { ok: true, user: JSON.parse(JSON.stringify(updatedUser)) };
    } catch (err) {
      console.error("Failed to save user in MongoDB:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

// 3. Save or Update Order in MongoDB
export const dbSaveOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: { order: any }) => d)
  .handler(async ({ data }) => {
    const { order } = data;
    try {
      await connectToDatabase();
      const updatedOrder = await Order.findOneAndUpdate(
        { id: order.id },
        { $set: order },
        { upsert: true, new: true, lean: true }
      );
      return { ok: true, order: JSON.parse(JSON.stringify(updatedOrder)) };
    } catch (err) {
      console.error("Failed to save order in MongoDB:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

// 4. Save/Submit customer rating feedback in MongoDB
export const dbSubmitRatingFn = createServerFn({ method: "POST" })
  .inputValidator((d: { rating: any }) => d)
  .handler(async ({ data }) => {
    const { rating } = data;
    try {
      await connectToDatabase();
      const newRating = await Rating.findOneAndUpdate(
        { id: rating.id },
        { $set: rating },
        { upsert: true, new: true, lean: true }
      );
      return { ok: true, rating: JSON.parse(JSON.stringify(newRating)) };
    } catch (err) {
      console.error("Failed to save rating in MongoDB:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

// 5. Delete User from MongoDB (admin employee management)
export const dbDeleteUserFn = createServerFn({ method: "POST" })
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const { userId } = data;
    try {
      await connectToDatabase();
      await User.deleteOne({ id: userId });
      return { ok: true };
    } catch (err) {
      console.error("Failed to delete user from MongoDB:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

// 6. Save or Update Menu Item in MongoDB (e.g. toggling availability)
export const dbSaveMenuItemFn = createServerFn({ method: "POST" })
  .inputValidator((d: { menuItem: any }) => d)
  .handler(async ({ data }) => {
    const { menuItem } = data;
    try {
      await connectToDatabase();
      const updatedItem = await MenuItem.findOneAndUpdate(
        { id: menuItem.id },
        { $set: menuItem },
        { upsert: true, new: true, lean: true }
      );
      return { ok: true, menuItem: JSON.parse(JSON.stringify(updatedItem)) };
    } catch (err) {
      console.error("Failed to save menu item in MongoDB:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

// 7. Delete Order from MongoDB (employee removes a completed order)
export const dbDeleteOrderFn = createServerFn({ method: "POST" })
  .inputValidator((d: { orderId: string }) => d)
  .handler(async ({ data }) => {
    const { orderId } = data;
    try {
      await connectToDatabase();
      await Order.deleteOne({ id: orderId });
      return { ok: true };
    } catch (err) {
      console.error("Failed to delete order from MongoDB:", err);
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
