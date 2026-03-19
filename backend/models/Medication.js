import mongoose from 'mongoose';

const medicationSchema = new mongoose.Schema(
  {
    medicationName: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
    },
    brandName: {
      type: String,
      trim: true,
      default: '',
    },
    sku: {
      type: String,
      trim: true,
      default: '',
    },
    batchLotNumber: {
      type: String,
      trim: true,
      default: '',
    },
    risk: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical', ''],
      default: '',
    },
    shelfId: {
      type: String,
      trim: true,
      default: '',
    },
    expiryMonth: {
      type: String,
      default: '',
    },
    expiryYear: {
      type: String,
      default: '',
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    supplierName: {
      type: String,
      trim: true,
      default: '',
    },
    supplierContact: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Expiring Soon', 'Recalled', ''],
      default: 'In Stock',
    },
    category: {
      type: String,
      trim: true,
      default: '',
    },
    photoUrl: {
      type: String,
      default: '',
    },
    barcodeData: {
      type: String,
      default: '',
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    orgId: {
      type: String,
      default: '',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

medicationSchema.pre('save', function (next) {
  const today = new Date();
  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(today.getDate() + 30);

  if (this.currentStock === 0) {
    this.status = 'Out of Stock';
  } else if (this.currentStock <= 10) {
    this.status = 'Low Stock';
  } else if (this.expiryDate && this.expiryDate <= thirtyDaysOut) {
    this.status = 'Expiring Soon';
  } else if (!this.status || this.status === '') {
    this.status = 'In Stock';
  }

  next();
});

export default mongoose.model('Medication', medicationSchema);
