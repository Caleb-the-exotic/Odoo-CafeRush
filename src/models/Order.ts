import mongoose, { Schema } from "mongoose";

const OrderLineSchema = new Schema({
  id: { type: String, required: true },
  itemId: { type: String, required: true },
  name: { type: String, required: true },
  unitPrice: { type: Number, required: true },
  qty: { type: Number, required: true },
  notes: { type: String },
  discountPct: { type: Number },
  prepared: { type: Boolean, default: false },
});

const PaymentSchema = new Schema({
  method: { type: String, required: true },
  amount: { type: Number, required: true },
  ref: { type: String },
  at: { type: Number, required: true },
});

const OrderSchema = new Schema({
  id: { type: String, required: true, unique: true },
  number: { type: Number, required: true },
  channel: { type: String, required: true },
  tableId: { type: String },
  guests: { type: Number },
  serverId: { type: String },
  lines: [OrderLineSchema],
  status: { type: String, required: true },
  prepStatus: { type: String, default: "to_cook" },
  discountPct: { type: Number },
  tipAmount: { type: Number },
  payments: [PaymentSchema],
  createdAt: { type: Number, required: true },
  updatedAt: { type: Number, required: true },
  closedAt: { type: Number },
  customerName: { type: String },
  deliveryStatus: { type: String },
  paidAt: { type: Number },
  cookEndAt: { type: Number },
});

export const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
