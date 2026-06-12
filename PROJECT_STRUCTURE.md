# Parking API - Project Structure & Implementation Guide

## Directory Structure

```
parking-api/
├── prisma/                           # Database schema and migrations
│   ├── schema.prisma                # Database models
│   ├── seed.ts                      # Seed script for test data
│   ├── migrations/                  # Migration history
│   │   ├── 20260605042821_init/
│   │   └── migration_lock.toml
│   └── .env                         # Local database URL
│
├── src/
│   ├── app.ts                       # Express app setup & route integration
│   │
│   ├── controllers/                 # Request handlers
│   │   ├── gate.controller.ts       # Gate CRUD
│   │   ├── zone.controller.ts       # Zone CRUD
│   │   ├── vehicle-type.controller.ts  # Vehicle types & zone-vehicle rules [NEW B11]
│   │   ├── pricing.controller.ts       # Pricing management [NEW B12]
│   │   ├── reservation.controller.ts   # Reservations [NEW B13]
│   │   ├── reports.controller.ts       # Analytics reports [NEW B14]
│   │   └── admin.controller.ts         # User & config management [NEW B15]
│   │
│   ├── services/                    # Business logic
│   │   ├── gate.service.ts          # Gate operations
│   │   ├── zone.service.ts          # Zone operations
│   │   ├── vehicle-type.service.ts     # Vehicle types [NEW B11]
│   │   ├── pricing.service.ts          # Pricing calculations [NEW B12]
│   │   ├── reservation.service.ts      # Reservation logic & auto-cancel [NEW B13]
│   │   ├── reports.service.ts          # Report generation [NEW B14]
│   │   ├── admin.service.ts            # User & config operations [NEW B15]
│   │   └── cron-job.service.ts         # Scheduled tasks [NEW B13]
│   │
│   ├── routes/                      # API endpoints
│   │   ├── zone-gate.routes.ts      # Zone & Gate endpoints
│   │   ├── vehicle-type.routes.ts      # Vehicle type endpoints [NEW B11]
│   │   ├── pricing.routes.ts           # Pricing endpoints [NEW B12]
│   │   ├── reservation.routes.ts       # Reservation endpoints [NEW B13]
│   │   ├── reports.routes.ts           # Reports endpoints [NEW B14]
│   │   └── admin.routes.ts             # Admin endpoints [NEW B15]
│   │
│   ├── validators/                  # Input validation (Joi schemas)
│   │   ├── gate.validator.ts        # Gate validation
│   │   ├── zone.validator.ts        # Zone validation
│   │   ├── vehicle-type.validator.ts   # Vehicle type schemas [NEW B11]
│   │   ├── pricing.validator.ts        # Pricing schemas [NEW B12]
│   │   ├── reservation.validator.ts    # Reservation schemas [NEW B13]
│   │   └── admin.validator.ts          # Admin schemas [NEW B15]
│   │
│   ├── middlewares/                 # Express middlewares
│   │   ├── auth.middleware.ts       # JWT authentication & authorization
│   │   └── error.middleware.ts      # Error handling & 404
│   │
│   └── __tests__/                   # Unit tests
│       └── zone-gate.test.ts
│
├── dist/                            # Compiled JavaScript (generated)
│   └── [all .js files from src/]
│
├── .env                             # Environment variables (not in repo)
├── .gitignore                       # Git ignore rules
├── package.json                     # Dependencies & scripts
├── tsconfig.json                    # TypeScript config
├── jest.config.js                   # Jest test config
├── API_DOCUMENTATION.md             # API reference [NEW - comprehensive]
├── MIGRATION_SETUP.md               # Database setup guide [NEW]
└── README.md                        # Project overview

```

---

## Feature Implementation Summary

### B11: Vehicle Type & Zone-Vehicle Rules

**Files Created/Modified:**
- [vehicle-type.validator.ts](src/validators/vehicle-type.validator.ts) - Input validation
- [vehicle-type.service.ts](src/services/vehicle-type.service.ts) - Business logic
- [vehicle-type.controller.ts](src/controllers/vehicle-type.controller.ts) - Request handlers
- [vehicle-type.routes.ts](src/routes/vehicle-type.routes.ts) - API endpoints
- [schema.prisma](prisma/schema.prisma) - Added ZoneVehicleRule relations

**Endpoints:**
```
GET    /api/vehicle-types              - List types
POST   /api/vehicle-types              - Create type
GET    /api/vehicle-types/:id          - Get type
PATCH  /api/vehicle-types/:id          - Update type
DELETE /api/vehicle-types/:id          - Delete type
GET    /api/zone-vehicle-rules         - List rules
POST   /api/zone-vehicle-rules         - Create rule
DELETE /api/zone-vehicle-rules         - Delete rule
```

**Key Features:**
- Vehicle type CRUD operations
- Zone-vehicle rule management (which vehicle types allowed in which zones)
- Auto-validation of zone and vehicle type existence
- Prevents duplicate rules with unique composite key

---

### B12: Pricing Policy

**Files Created/Modified:**
- [pricing.validator.ts](src/validators/pricing.validator.ts) - Input validation
- [pricing.service.ts](src/services/pricing.service.ts) - Pricing logic & calculations
- [pricing.controller.ts](src/controllers/pricing.controller.ts) - Request handlers
- [pricing.routes.ts](src/routes/pricing.routes.ts) - API endpoints

**Endpoints:**
```
GET    /api/pricing                    - List policies
GET    /api/pricing/active             - Get active policies
POST   /api/pricing                    - Create policy
GET    /api/pricing/:id                - Get policy
PATCH  /api/pricing/:id                - Update policy
DELETE /api/pricing/:id                - Delete policy
POST   /api/pricing/calculate          - Calculate fee
```

**Key Features:**
- Dynamic pricing by vehicle type
- Peak hour multipliers (configurable)
- Effective date range (only active policies returned)
- Auto-deactivates overlapping policies
- Pricing calculation service:
  - Base price + hourly rate * duration
  - Peak hour multiplier applied automatically
  - Returns detailed fee breakdown

**Peak Hours:**
- Default: 7-9 AM and 5-7 PM
- Configurable via System Config: `PEAK_HOURS` key

---

### B13: Reservation (Booking)

**Files Created/Modified:**
- [reservation.validator.ts](src/validators/reservation.validator.ts) - Input validation
- [reservation.service.ts](src/services/reservation.service.ts) - Reservation logic
- [reservation.controller.ts](src/controllers/reservation.controller.ts) - Request handlers
- [reservation.routes.ts](src/routes/reservation.routes.ts) - API endpoints
- [cron-job.service.ts](src/services/cron-job.service.ts) - Scheduled tasks [NEW]
- [app.ts](src/app.ts) - Cron job initialization

**Endpoints:**
```
POST   /api/reservations                - Create reservation
GET    /api/reservations                - List reservations
GET    /api/reservations/active         - Get active bookings
GET    /api/reservations/user/:userId   - User's reservations
GET    /api/reservations/:id            - Get details
PATCH  /api/reservations/:id/cancel     - Cancel booking
```

**Key Features:**
- Create pre-bookings with duration in minutes
- Automatic `endTime` calculation
- Validation:
  - Vehicle type allowed in zone
  - No overlapping reservations
  - Start time must be future
- Status management: ACTIVE → CANCELLED
- **Auto-cancellation Cron Job**:
  - Runs every 1 minute
  - Auto-cancels ACTIVE reservations after 15 minutes of start time
  - Only if no parking session created (no check-in)
  - Can be toggled via environment config

---

### B14: Reports & Analytics

**Files Created/Modified:**
- [reports.service.ts](src/services/reports.service.ts) - Report generation
- [reports.controller.ts](src/controllers/reports.controller.ts) - Request handlers
- [reports.routes.ts](src/routes/reports.routes.ts) - API endpoints

**Endpoints:**
```
GET    /api/reports/revenue            - Revenue by period
GET    /api/reports/traffic            - Hourly traffic breakdown
GET    /api/reports/occupancy          - Zone occupancy rates
GET    /api/reports/vehicle-types      - Vehicle distribution
GET    /api/reports/peak-hours         - Peak hour analysis
```

**Key Features:**
- Period-based revenue reports (day, week, month)
- Hourly traffic breakdown (24-hour distribution)
- Zone occupancy percentages
- Vehicle type distribution with percentages
- Peak hour identification (top 4 hours)
- All using Prisma aggregation & groupBy for efficiency
- Supports date range filtering

**Query Parameters:**
```
period=day|week|month
startDate=2026-06-06
endDate=2026-06-06
```

---

### B15: Admin Management

**Files Created/Modified:**
- [admin.validator.ts](src/validators/admin.validator.ts) - Input validation
- [admin.service.ts](src/services/admin.service.ts) - User & config operations
- [admin.controller.ts](src/controllers/admin.controller.ts) - Request handlers
- [admin.routes.ts](src/routes/admin.routes.ts) - API endpoints
- [schema.prisma](prisma/schema.prisma) - Added User & SystemConfig models

**Endpoints:**
```
# User Management
GET    /api/admin/users                - List users
POST   /api/admin/users                - Create user
GET    /api/admin/users/:id            - Get user
PATCH  /api/admin/users/:id            - Update user
PATCH  /api/admin/users/:id/role       - Change role
PATCH  /api/admin/users/:id/status     - Lock/unlock

# Audit Logs
GET    /api/admin/audit-logs           - View action history

# System Config
GET    /api/admin/system-config        - Get all configs
GET    /api/admin/system-config/:key   - Get config
POST   /api/admin/system-config        - Create config
PATCH  /api/admin/system-config/:key   - Update config
DELETE /api/admin/system-config/:key   - Delete config
```

**Key Features:**
- User CRUD with role-based access
- User roles: USER, DRIVER, ADMIN, MANAGER
- User statuses: ACTIVE, INACTIVE, BLOCKED
- Password hashing with bcrypt
- Audit log tracking (user actions on resources)
- System configuration key-value store
- Configurable data types: string, number, boolean, json

**Database Models Added:**
```prisma
// User account management
model User {
  id, email, password, name, phone, role, status, timestamps
}

// Dynamic system configuration
model SystemConfig {
  id, key (unique), value, description, type, timestamps
}
```

---

## Database Schema

### Models Summary

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| Zone | Parking zones/floors | id, name, floor, capacity, status |
| Gate | Entry/exit gates | id, name, code, type, zoneId, status |
| ParkingSlot | Individual spaces | id, code, zoneId, status |
| VehicleType | Vehicle categories | id, name, code, description, dimensions |
| ZoneVehicleRule | Zone-vehicle restrictions | zoneId, vehicleTypeId (composite unique) |
| PricePolicy | Pricing rules | id, vehicleTypeId, basePrice, peakMultiplier, effective dates |
| Reservation | Pre-bookings | id, userId, vehicleTypeId, zoneId, startTime, endTime, status |
| ParkingSession | Parking records | id, userId, vehicleTypeId, zoneId, licensePlate, entryTime, exitTime, totalFee |
| AuditLog | Action tracking | id, userId, action, resource, resourceId, oldData, newData |
| User | User accounts | id, email, password, name, role, status |
| SystemConfig | Configuration | id, key (unique), value, type |

---

## Service Layer Architecture

### Service Classes
Each service class encapsulates business logic and database operations:

```typescript
export const vehicleTypeService = {
  async getAll(page, limit) { ... },
  async getById(id) { ... },
  async create(data) { ... },
  async update(id, data) { ... },
  async delete(id) { ... },
}
```

### Error Handling
- Services throw `AppError(message, statusCode)`
- Controllers catch and pass to error middleware
- Error middleware returns formatted JSON response

### Database Transactions
Services use Prisma for:
- Aggregate queries (reports)
- GroupBy queries (analytics)
- Cascade deletes (related records)
- Unique constraints (validation)

---

## Middleware Stack

1. **helmet** - Security headers
2. **cors** - Cross-origin requests
3. **morgan** - Request logging
4. **express.json()** - Body parser
5. **authenticate** - JWT validation
6. **authorize** - Role-based access
7. **errorHandler** - Exception handler

---

## Testing

### Running Tests
```bash
npm test              # Run once
npm run test:watch   # Watch mode
```

### Test Structure
```
src/__tests__/
└── zone-gate.test.ts   # Sample test file
```

---

## Deployment

### Build for Production
```bash
npm run build
```

Creates optimized `dist/` folder with compiled JavaScript.

### Environment Setup
```bash
# Copy .env template
cp .env.example .env

# Update with production values
```

### Start Server
```bash
npm start
```

---

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| bcrypt | ^5.1.1 | Password hashing |
| @types/bcrypt | ^5.0.2 | TypeScript types |

---

## Performance Optimizations

1. **Pagination**: All list endpoints paginated (default 20 items)
2. **Selective Includes**: Only load related data when needed
3. **Indexing**: Automatic on primary keys, unique constraints
4. **Query Aggregation**: Reports use Prisma groupBy for efficiency
5. **Cron Job**: Runs only in non-test environments

---

## Security Considerations

1. **Authentication**: JWT tokens required for all endpoints (except /health)
2. **Authorization**: Role-based access control (ADMIN, MANAGER, USER, DRIVER)
3. **Password**: Hashed with bcrypt before storage
4. **Input Validation**: Joi schemas validate all inputs
5. **Error Handling**: No sensitive data in error messages
6. **Helmet**: Security headers on all responses

---

## Future Enhancements

- [ ] Email notifications for reservations
- [ ] SMS alerts for parking status
- [ ] Payment gateway integration
- [ ] Mobile app API
- [ ] Advanced analytics & machine learning
- [ ] Real-time slot availability via WebSocket
- [ ] Multi-language support
- [ ] Rate limiting per user
- [ ] API key authentication
- [ ] Webhook support for external integrations
