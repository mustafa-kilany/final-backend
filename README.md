# InventoryGo Backend (Express + Mongoose)

## Setup
1. Copy `.env.example` to `.env` and set `MONGO_URI`.
2. Install deps: `npm install`
3. Run dev: `npm run dev`

## Auth (Current)
This backend currently uses a simple header-based authentication middleware:

- Send `x-user-id: <mongoUserId>` (recommended)
- Or send `x-user-email: user@example.com`

If neither header is provided, the backend will fall back to the first admin user (or first user) in the DB. This is **development-friendly** but **not secure for production**.

Protected endpoints use:
- `requireAuth` to populate `req.user`
- `requireRole(...)` to enforce role-based access

## DB Request History (Audit Log)
Every API handler that touches MongoDB sets `req._dbTouched = true`. A global middleware then writes one log entry into MongoDB collection `db_request_history`.

Stored fields include: `method`, `path`, `statusCode`, `actor` (user id), `query`, `params`, and a redacted `body`.

This is separate from the purchase-request history stored in `request_history`.

## Endpoints

### Auth
- `POST /api/auth/admin/signup` — create an admin (requires `ADMIN_SIGNUP_TOKEN`)
	- Body: `{ "name", "email", "password", "adminSignupToken" }`
- `POST /api/auth/login` — validate credentials
	- Body: `{ "email", "password" }`
- `GET /api/auth/me` — returns the authenticated user (requires `x-user-id` header)

### Items
- `GET /api/items` — list items
- `POST /api/items` — create item (requires auth + role admin/purchase)
	- Body: `{ "name": "Paper", "qty": 10 }`

### Users (Admin only)
- `GET /api/users` — list users (requires role admin)
- `POST /api/users` — create user (requires role admin)
	- Body: `{ "name", "email", "password", "role" }`

### Purchase Requests + History
- `POST /api/requests` — create purchase request (requires role purchase)
	- Body: `{ "itemId": "...", "qty": 2, "reason": "..." }`
- `GET /api/requests` — list requests (admin sees all; others see own)
- `GET /api/requests/:id` — get a request
- `POST /api/requests/:id/approve` — approve request (requires role admin)
- `POST /api/requests/:id/reject` — reject request (requires role admin)
	- Body: `{ "message": "..." }`
- `GET /api/requests/:id/history` — purchase-request history (admin or owner)

### Medical Devices (Stored in MongoDB)
These are devices imported from openFDA into collection `medical_devices`.

- `GET /api/devices?term=stent&limit=25&skip=0` — list stored devices (auth required)
- `GET /api/devices/:recordKey` — get one device by `recordKey` (auth required)

### Import (Third-party → MongoDB)
Inventory items are imported from FDA sources (openFDA UDI).

- `POST /api/import/openfda/items?term=stent&limit=25&skip=0&mode=replace` — import items into `items` (admin)
	- Note: openFDA UDI data does not include stock; imported items default to `qty=0`.

### openFDA (UDI) Integration
The backend integrates with the openFDA UDI endpoint:

- API used: `https://api.fda.gov/device/udi.json`

Two behaviors are supported:

1) Fetch-only (no DB writes)
- `GET /api/import/openfda/devices?term=...&limit=...&skip=...` (auth required)

2) Import into MongoDB (upsert)
- `POST /api/import/openfda/devices?term=...&limit=...&skip=...` (admin only)

Import logic:
- Calls openFDA with a generated `search` query based on `term`/`productCode`
- Maps the response into medical-focused fields (device names/class/regulation/specialty/GMDN)
- Upserts each device into `medical_devices` using `record_key` as `recordKey`


## Notes / Design
- **Architecture:** Express routes → controllers → Mongoose models.
- **Auth:** middleware-based (`requireAuth`, `requireRole`).
- **Audit logging:** cross-cutting concern handled with a global middleware + explicit `req._dbTouched` flag.
