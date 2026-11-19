import mongoose, { Schema } from "mongoose";
import { PaymentTransaction } from "@/lib/mockData";

const PaymentSchema = new Schema<PaymentTransaction>(
  {
    _id: { type: String, required: true },
    dentistEmail: { type: String, required: true, index: true },
    feeId: { type: String },
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    date: { type: String, required: true, index: true },
    time: { type: String, required: true },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["UPI", "Cash", "Card"],
      default: "UPI",
    },
    notes: { type: String, default: "" },
    receiptNo: { type: String, required: true },
    isRefund: { type: Boolean, default: false },
  },
  { timestamps: true, _id: false }
);

// High-speed compound indexes for multi-tenant payment reconciliation
PaymentSchema.index({ dentistEmail: 1, patientId: 1 });
PaymentSchema.index({ dentistEmail: 1, date: -1 });

export default mongoose.models.Payment || mongoose.model<PaymentTransaction>("Payment", PaymentSchema);
