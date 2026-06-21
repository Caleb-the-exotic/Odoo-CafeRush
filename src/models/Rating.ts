import mongoose, { Schema } from "mongoose";

const RatingSchema = new Schema({
  id: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  orderNumber: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String },
  itemId: { type: String },
  createdAt: { type: Number, required: true },
});

export const Rating = mongoose.models.Rating || mongoose.model("Rating", RatingSchema);
