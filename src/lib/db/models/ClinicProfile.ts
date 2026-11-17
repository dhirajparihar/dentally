import mongoose, { Schema, Document } from "mongoose";

export interface IClinicProfile extends Document {
  dentistEmail: string;
  name: string;
  dentistName: string;
  qualification: string;
  regNo: string;
  phone: string;
  email: string;
  address: string;
  upiId: string;
  slotDuration: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  receiptFooter: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ClinicProfileSchema = new Schema<IClinicProfile>(
  {
    dentistEmail: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "Dentally Clinic" },
    dentistName: { type: String, default: "Doctor" },
    qualification: { type: String, default: "BDS, MDS" },
    regNo: { type: String, default: "DCI-ONLINE" },
    phone: { type: String, default: "+91 98200 11223" },
    email: { type: String, default: "" },
    address: { type: String, default: "Dental Operatory" },
    upiId: { type: String, default: "dentally@upi" },
    slotDuration: { type: Number, default: 30 },
    workingHoursStart: { type: String, default: "09:30 AM" },
    workingHoursEnd: { type: String, default: "08:00 PM" },
    receiptFooter: {
      type: String,
      default: "Thank you for visiting! For dental emergencies, contact our clinic.",
    },
  },
  { timestamps: true }
);

export const ClinicProfileModel =
  mongoose.models.ClinicProfile ||
  mongoose.model<IClinicProfile>("ClinicProfile", ClinicProfileSchema);

