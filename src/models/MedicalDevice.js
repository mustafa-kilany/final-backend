const mongoose = require('mongoose')

const medicalDeviceSchema = new mongoose.Schema(
  {
    recordKey: { type: String, required: true, unique: true, index: true },

    recordStatus: { type: String, default: null },
    publishDate: { type: String, default: null },
    publicVersionNumber: { type: String, default: null },
    publicVersionDate: { type: String, default: null },

    brandName: { type: String, default: null },
    companyName: { type: String, default: null },
    catalogNumber: { type: String, default: null },
    versionOrModelNumber: { type: String, default: null },
    deviceDescription: { type: String, default: null },

    medicalDeviceNames: { type: [String], default: [] },
    deviceClasses: { type: [String], default: [] },
    regulationNumbers: { type: [String], default: [] },
    medicalSpecialtyDescriptions: { type: [String], default: [] },

    gmdnTerms: {
      type: [
        {
          code: { type: String, default: null },
          name: { type: String, default: null },
          definition: { type: String, default: null },
        },
      ],
      default: [],
    },

    source: { type: String, required: true, default: 'openfda' },
    lastSyncedAt: { type: Date, required: true, default: Date.now },
  },
  {
    timestamps: true,
    collection: 'medical_devices',
  }
)

module.exports = mongoose.model('MedicalDevice', medicalDeviceSchema)
