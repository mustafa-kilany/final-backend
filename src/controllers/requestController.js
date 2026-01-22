const Item = require('../models/Item')
const PurchaseRequest = require('../models/PurchaseRequest')
const RequestHistory = require('../models/RequestHistory')

async function logHistory({ requestId, action, actorId, message, snapshot }) {
  await RequestHistory.create({
    requestId,
    action,
    actor: actorId,
    message: message || '',
    snapshot,
  })
}

async function createRequest(req, res, next) {
  try {
    req._dbTouched = true
    const { itemId, qty, reason } = req.body

    if (!itemId) {
      res.status(400)
      throw new Error('itemId is required')
    }

    const quantity = Number(qty)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      res.status(400)
      throw new Error('qty must be a number greater than 0')
    }

    const item = await Item.findById(itemId)
    if (!item) {
      res.status(404)
      throw new Error('Item not found')
    }

    const request = await PurchaseRequest.create({
      itemId: item.id,
      itemName: item.name,
      qty: quantity,
      reason: reason || '',
      requestedBy: req.user.id,
      status: 'pending',
    })

    await logHistory({
      requestId: request.id,
      action: 'created',
      actorId: req.user.id,
      message: 'Request created',
      snapshot: {
        status: request.status,
        qty: request.qty,
        itemName: request.itemName,
        itemId: request.itemId,
      },
    })

    res.status(201).json(request)
  } catch (err) {
    next(err)
  }
}

async function listRequests(req, res, next) {
  try {
    req._dbTouched = true
    const { status } = req.query

    const query = {}
    if (status) query.status = status
    if (req.user.role !== 'admin') {
      query.requestedBy = req.user.id
    }

    const requests = await PurchaseRequest.find(query)
      .sort({ createdAt: -1 })
      .populate('requestedBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('rejectedBy', 'name email role')

    res.json(requests)
  } catch (err) {
    next(err)
  }
}

async function getRequest(req, res, next) {
  try {
    req._dbTouched = true
    const request = await PurchaseRequest.findById(req.params.id)
      .populate('requestedBy', 'name email role')
      .populate('approvedBy', 'name email role')
      .populate('rejectedBy', 'name email role')

    if (!request) {
      res.status(404)
      throw new Error('Request not found')
    }

    if (req.user.role !== 'admin' && String(request.requestedBy?._id || request.requestedBy) !== String(req.user.id)) {
      res.status(403)
      throw new Error('Forbidden')
    }

    res.json(request)
  } catch (err) {
    next(err)
  }
}

async function approveRequest(req, res, next) {
  try {
    req._dbTouched = true
    const request = await PurchaseRequest.findById(req.params.id)
    if (!request) {
      res.status(404)
      throw new Error('Request not found')
    }

    if (request.status !== 'pending') {
      res.status(400)
      throw new Error(`Request is already ${request.status}`)
    }

    const item = await Item.findById(request.itemId)
    if (!item) {
      res.status(404)
      throw new Error('Item not found')
    }
    item.qty = (Number(item.qty) || 0) + request.qty
    await item.save()

    request.status = 'approved'
    request.approvedBy = req.user.id
    request.processedAt = new Date()
    await request.save()

    await logHistory({
      requestId: request.id,
      action: 'approved',
      actorId: req.user.id,
      message: 'Request approved',
      snapshot: {
        status: request.status,
        qty: request.qty,
        itemName: request.itemName,
        itemId: request.itemId,
      },
    })

    res.json(request)
  } catch (err) {
    next(err)
  }
}

async function rejectRequest(req, res, next) {
  try {
    req._dbTouched = true
    const { message } = req.body

    const request = await PurchaseRequest.findById(req.params.id)
    if (!request) {
      res.status(404)
      throw new Error('Request not found')
    }

    if (request.status !== 'pending') {
      res.status(400)
      throw new Error(`Request is already ${request.status}`)
    }

    request.status = 'rejected'
    request.rejectedBy = req.user.id
    request.processedAt = new Date()
    await request.save()

    await logHistory({
      requestId: request.id,
      action: 'rejected',
      actorId: req.user.id,
      message: message || 'Request rejected',
      snapshot: {
        status: request.status,
        qty: request.qty,
        itemName: request.itemName,
        itemId: request.itemId,
      },
    })

    res.json(request)
  } catch (err) {
    next(err)
  }
}

async function getRequestHistory(req, res, next) {
  try {
    req._dbTouched = true
    const request = await PurchaseRequest.findById(req.params.id)
    if (!request) {
      res.status(404)
      throw new Error('Request not found')
    }

    if (req.user.role !== 'admin' && String(request.requestedBy) !== String(req.user.id)) {
      res.status(403)
      throw new Error('Forbidden')
    }

    const history = await RequestHistory.find({ requestId: request.id })
      .sort({ at: 1 })
      .populate('actor', 'name email role')

    res.json(history)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  createRequest,
  listRequests,
  getRequest,
  approveRequest,
  rejectRequest,
  getRequestHistory,
}
