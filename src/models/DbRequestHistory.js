const mongoose = require('mongoose')

const dbRequestHistorySchema = new mongoose.Schema(
  {
    at: { type: Date, required: true, default: Date.now, index: true },
    durationMs: { type: Number, default: null },

    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorRole: { type: String, default: null },

    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true },

    params: { type: mongoose.Schema.Types.Mixed, default: null },
    query: { type: mongoose.Schema.Types.Mixed, default: null },
    body: { type: mongoose.Schema.Types.Mixed, default: null },

    note: { type: String, default: '' },
  },
  {
    collection: 'db_request_history',
  }
)

module.exports = mongoose.model('DbRequestHistory', dbRequestHistorySchema)
