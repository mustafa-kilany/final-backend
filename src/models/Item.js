const mongoose = require('mongoose')

const itemSchema = new mongoose.Schema(
  {
    openfdaRecordKey: {
      type: String,
      trim: true,
      index: true,
      unique: true,
      sparse: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    manufacturer: {
      type: String,
      trim: true,
      default: '—',
    },
    unit: {
      type: String,
      trim: true,
      default: 'pcs',
    },
    qty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      min: 0,
      default: 10,
    },
    source: {
      type: String,
      trim: true,
      default: 'manual',
    },
    lastSyncedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model('Item', itemSchema)
