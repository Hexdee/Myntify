import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['SIMPLE', 'REGULATED', 'NFT'],
    },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    description: { type: String, required: true },
    decimals: { type: Number, required: true },
    totalSupply: { type: String, required: true },
    icon: { type: String },
    creator: { type: String, required: true },
    packageName: { type: String, required: true },
    moduleName: { type: String, required: true },
    structName: { type: String, required: true },
  },
  { timestamps: true }
);

const Token = mongoose.model('Token', tokenSchema);

export default Token;
