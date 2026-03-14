import mongoose from 'mongoose';

const posConnectionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  orgId: { type: String, index: true, default: '' },
  providerKey: { type: String, required: true },
  providerName: { type: String, required: true },
  username: { type: String, default: '' },
  password: { type: String, default: '' },
  posCursor: { type: Number, default: 0 },
  connectedAt: { type: Date, default: Date.now },
  lastSyncedAt: { type: Date, default: null },
  isConnected: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model('PosConnection', posConnectionSchema);
