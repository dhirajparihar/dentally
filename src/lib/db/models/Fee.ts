import mongoose, { Schema } from "mongoose";
import { FeeItem } from "@/lib/mockData";

const FeeSchema = new Schema<FeeItem>(
  {
    _id: { type: String, required: true },
    dentistEmail: { type: String, required: true, index: true },
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true },
    date: { type: String, required: true, index: true },
    procedureName: { type: String, required: true },
    tooth: { type: String },
    amount: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    netAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["unpaid", "partial", "paid"],
      default: "unpaid",
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true, _id: false }
);

// High-speed compound indexes for multi-tenant billing
FeeSchema.index({ dentistEmail: 1, patientId: 1 });
FeeSchema.index({ dentistEmail: 1, date: 1 });

export default mongoose.models.Fee || mongoose.model<FeeItem>("Fee", FeeSchema);
