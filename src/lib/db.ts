import mongoose from "mongoose";

const MONGODB_URI = 
  process.env.MONGODB_URI || 
  (import.meta as any).env?.MONGODB_URI || 
  "mongodb+srv://suryaprakashd22007_db_user:TJwFUajI3DPZgCit@odoo-cafe.in7m8xd.mongodb.net/Odoo-Cafe?retryWrites=true&w=majority";

let cached = (globalThis as any).mongoose;

if (!cached) {
  cached = (globalThis as any).mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    console.log("Connecting to MongoDB...");
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongooseInstance) => {
      console.log("MongoDB connected successfully!");
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
