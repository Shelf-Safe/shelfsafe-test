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
      enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Expiring Soon', 'Expired', 'Recalled', 'Removed', ''],
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

function normalizeToStartOfDay(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

medicationSchema.pre('save', function (next) {
  const today = normalizeToStartOfDay(new Date());
  const thirtyDaysOut = new Date(today);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  if (this.expiryDate) {
    const exp = normalizeToStartOfDay(this.expiryDate);
    if (exp < today) {
      this.status = 'Expired';
      return next();
    }
    if (exp <= thirtyDaysOut) {
      this.status = 'Expiring Soon';
      return next();
    }
  }

  if (this.currentStock === 0) {
    this.status = 'Out of Stock';
  } else if (this.currentStock <= 10) {
    this.status = 'Low Stock';
  } else if (!this.status || this.status === '' || ['Expiring Soon', 'Expired'].includes(this.status)) {
    this.status = 'In Stock';
  }

  next();
});

export default mongoose.model('Medication', medicationSchema);
