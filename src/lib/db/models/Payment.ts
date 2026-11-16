import mongoose, { Schema } from "mongoose";
import { PaymentTransaction } from "@/lib/mockData";

const PaymentSchema = new Schema<PaymentTransaction>(
  {
    _id: { type: String, required: true },
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

export default mongoose.models.Payment || mongoose.model<PaymentTransaction>("Payment", PaymentSchema);
