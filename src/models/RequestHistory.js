const mongoose = require('mongoose')

const requestHistorySchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PurchaseRequest',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['created', 'approved', 'rejected'],
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    snapshot: {
      status: String,
      qty: Number,
      itemName: String,
      itemId: mongoose.Schema.Types.ObjectId,
    },
    at: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    collection: 'request_history',
  }
)

module.exports = mongoose.model('RequestHistory', requestHistorySchema)
