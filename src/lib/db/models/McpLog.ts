import mongoose, { Schema, Document } from "mongoose";

export interface IMcpLog extends Document {
  dentistEmail: string;
  toolName: string;
  status: "success" | "error";
  latencyMs: number;
  error?: string;
  timestamp: Date;
}

const McpLogSchema = new Schema<IMcpLog>(
  {
    dentistEmail: { type: String, required: true, index: true },
    toolName: { type: String, required: true, index: true },
    status: { type: String, enum: ["success", "error"], required: true },
    latencyMs: { type: Number, default: 0 },
    error: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// TTL index to automatically clean up logs older than 30 days
McpLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const McpLogModel =
  mongoose.models.McpLog || mongoose.model<IMcpLog>("McpLog", McpLogSchema);

export default McpLogModel;

