import mongoose, { Schema } from "mongoose";

const MenuItemSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  image: { type: String },
  available: { type: Boolean, default: true },
  recipe: { type: Schema.Types.Mixed },
});

export const MenuItem = mongoose.models.MenuItem || mongoose.model("MenuItem", MenuItemSchema);
