import mongoose, { Schema } from "mongoose";

export interface IOAuthClient {
  clientId: string;
  clientSecret?: string;
  clientName?: string;
  redirectUris: string[];
  createdAt: Date;
}

const OAuthClientSchema = new Schema<IOAuthClient>(
  {
    clientId: { type: String, required: true, unique: true, index: true },
    clientSecret: { type: String },
    clientName: { type: String, default: "ChatGPT" },
    redirectUris: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.OAuthClient || mongoose.model<IOAuthClient>("OAuthClient", OAuthClientSchema);
