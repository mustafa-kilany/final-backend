const Item = require('../models/Item')

async function listItems(req, res, next) {
  try {
    req._dbTouched = true
    const items = await Item.find({}).sort({ createdAt: -1 })
    res.json(items)
  } catch (err) {
    next(err)
  }
}

async function createItem(req, res, next) {
  try {
    const { name, qty } = req.body

    if (!name) {
      res.status(400)
      throw new Error('name is required')
    }

    req._dbTouched = true
    const item = await Item.create({
      name,
      qty: typeof qty === 'number' ? qty : 0,
    })

    res.status(201).json(item)
  } catch (err) {
    next(err)
  }
}

async function purgeNonFdaItems(req, res, next) {
  try {
    const result = await Item.deleteMany({
      $or: [
        { source: { $ne: 'openfda' } },
        { openfdaRecordKey: { $exists: false } },
        { openfdaRecordKey: null },
      ],
    })

    req._dbTouched = true

    res.json({
      deletedCount: result?.deletedCount ?? 0,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listItems,
  createItem,
  purgeNonFdaItems,
}
