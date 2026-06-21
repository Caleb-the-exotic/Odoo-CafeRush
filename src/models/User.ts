import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, required: true },
  pin: { type: String, required: true },
  twoFactorEnabled: { type: Boolean, default: false },
  username: { type: String },
  password: { type: String },
});

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
