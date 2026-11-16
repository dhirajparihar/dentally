import mongoose, { Schema } from "mongoose";

export interface IOAuthCode {
  code: string;
  dentistEmail: string;
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  createdAt: Date;
  expiresAt: Date;
}

const OAuthCodeSchema = new Schema<IOAuthCode>(
  {
    code: { type: String, required: true, unique: true, index: true },
    dentistEmail: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    redirectUri: { type: String, required: true },
    codeChallenge: { type: String },
    codeChallengeMethod: { type: String },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // Auto-deletes on expiry
  },
  { timestamps: false }
);

export default mongoose.models.OAuthCode || mongoose.model<IOAuthCode>("OAuthCode", OAuthCodeSchema);

