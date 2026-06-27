# Parking Building Management API - Complete Feature Documentation

## B11: Vehicle Type & Zone-Vehicle Rules API

### Vehicle Types Endpoints

#### GET `/api/vehicle-types`
Get list of vehicle types with pagination
- **Query params**: `page=1`, `limit=20`
- **Response**: List of vehicle types with their zone rules and active pricing policies

#### POST `/api/vehicle-types`
Create new vehicle type
```json
{
  "name": "Sedan",
  "code": "SEDAN",
  "description": "Small passenger car",
  "maxHeight": 1.8,
  "maxWidth": 1.8
}
```

#### GET `/api/vehicle-types/:id`
Get vehicle type details with all associated rules and pricing

#### PATCH `/api/vehicle-types/:id`
Update vehicle type information

#### DELETE `/api/vehicle-types/:id`
Delete vehicle type (cascade delete with related rules)

### Zone-Vehicle Rules Endpoints

#### GET `/api/zone-vehicle-rules`
Get all zone-vehicle rules with pagination
- **Query params**: `zoneId=xxx`, `vehicleTypeId=yyy`
- **Response**: Rules showing which vehicle types are allowed in which zones

#### POST `/api/zone-vehicle-rules`
Create new zone-vehicle rule (allow a vehicle type in a zone)
```json
{
  "zoneId": "zone-id-1",
  "vehicleTypeId": "vehicle-type-id-1"
}
```
- **Validation**: Zone and vehicle type must exist
- **Unique constraint**: Cannot have duplicate rules for same zone+vehicleType

#### DELETE `/api/zone-vehicle-rules`
Delete zone-vehicle rule
- **Query params**: `zoneId=xxx&vehicleTypeId=yyy`

---

## B12: Pricing Policy API

### Pricing Endpoints

#### GET `/api/pricing`
Get all pricing policies with pagination
- **Query params**: `vehicleTypeId=xxx`, `page=1`, `limit=20`

#### GET `/api/pricing/active`
Get active pricing policies (effective now)
- **Query params**: `vehicleTypeId=xxx` (optional)
- **Returns**: Only policies where `isActive=true` and current date is between `effectiveFrom` and `effectiveTo`

#### POST `/api/pricing`
Create new pricing policy
```json
{
  "vehicleTypeId": "vehicle-type-id-1",
  "name": "Standard Rate 2026",
  "basePrice": 5.0,
  "pricePerHour": 2.5,
  "peakMultiplier": 1.5,
  "effectiveFrom": "2026-01-01T00:00:00Z",
  "effectiveTo": "2026-12-31T23:59:59Z"
}
```
- **Behavior**: Automatically deactivates overlapping active policies for the same vehicle type

#### GET `/api/pricing/:id`
Get pricing policy details

#### PATCH `/api/pricing/:id`
Update pricing policy

#### DELETE `/api/pricing/:id`
Delete pricing policy

### Pricing Calculation

#### POST `/api/pricing/calculate`
Calculate parking fee (internal use for parking sessions)
```json
{
  "vehicleTypeId": "vehicle-type-id-1",
  "entryTime": "2026-06-06T08:00:00Z",
  "exitTime": "2026-06-06T10:30:00Z",
  "isPeakHour": true
}
```
- **Response**:
```json
{
  "vehicleTypeId": "xxx",
  "basePrice": 5.0,
  "hourlyRate": 3.75,
  "durationHours": 2.5,
  "totalFee": 14.375,
  "isPeakHour": true
}
```

### Peak Hours Configuration
- Default peak hours: 7-9 AM and 5-7 PM
- Configurable via System Config with key `PEAK_HOURS` (JSON array of hours: `[7, 8, 9, 17, 18, 19]`)

---

## B13: Reservation API

### Reservation Endpoints

#### POST `/api/reservations`
Create new reservation (booking)
```json
{
  "userId": "user-id-1",
  "vehicleTypeId": "vehicle-type-id-1",
  "zoneId": "zone-id-1",
  "startTime": "2026-06-06T10:00:00Z",
  "duration": 120
}
```
- **Field notes**: 
  - `duration`: in minutes (1-720, max 12 hours)
  - `startTime`: must be >= now
  - Calculates `endTime = startTime + duration`

- **Validations**:
  - Vehicle type must be allowed in the zone (checked via zone-vehicle rules)
  - No overlapping reservations for same user in same zone
  - `endTime` calculated automatically

#### GET `/api/reservations`
Get reservations with filtering
- **Query params**: `userId=xxx`, `status=ACTIVE`, `page=1`, `limit=20`

#### GET `/api/reservations/active`
Get only active reservations (status='ACTIVE' and endTime >= now)
- **Query params**: `page=1`, `limit=20`
- **Use case**: Dashboard showing current bookings

#### GET `/api/reservations/user/:userId`
Get reservations for specific user
- **Query params**: `page=1`, `limit=20`

#### GET `/api/reservations/:id`
Get reservation details with associated parking sessions

#### PATCH `/api/reservations/:id/cancel`
Cancel reservation
```json
{
  "reason": "Change of plans"
}
```
- **Validation**: Can only cancel ACTIVE reservations
- **Result**: Sets status to CANCELLED and adds `cancelledAt` timestamp

### Auto-Cancellation Cron Job
- **Trigger**: Runs every 1 minute
- **Rule**: Auto-cancels ACTIVE reservations where:
  - `startTime` is > 15 minutes ago
  - No parking session has been created yet (no check-in)
- **Status**: `status` becomes CANCELLED, `cancelledAt` set to current time

---

## B14: Reports & Analytics API

All report endpoints require ADMIN or MANAGER role

### Revenue Report

#### GET `/api/reports/revenue`
Get revenue statistics
- **Query params**: 
  - `period=day|week|month` (default: day)
  - `startDate=2026-06-06` (optional ISO date)
  - `endDate=2026-06-06` (optional ISO date)

- **Response**:
```json
{
  "period": "day",
  "startDate": "2026-06-06T00:00:00Z",
  "endDate": "2026-06-06T23:59:59Z",
  "totalRevenue": 5000.50,
  "totalSessions": 150,
  "byZone": [
    {
      "zone": { "id": "zone-1", "name": "Level 1", "floor": 1 },
      "totalSessions": 50,
      "totalRevenue": 1500.00
    }
  ]
}
```

### Traffic Report

#### GET `/api/reports/traffic`
Get hourly traffic statistics
- **Query params**: `startDate=2026-06-06`, `endDate=2026-06-06`

- **Response**: Hourly breakdown of vehicle entries (8760 = 24 hours)
```json
{
  "startDate": "2026-06-06T00:00:00Z",
  "endDate": "2026-06-06T23:59:59Z",
  "hourly": [
    { "hour": 0, "count": 5 },
    { "hour": 1, "count": 2 },
    ...
    { "hour": 7, "count": 45 }
  ],
  "totalVehicles": 500
}
```

### Occupancy Report

#### GET `/api/reports/occupancy`
Get zone occupancy rates
- **Query params**: `startDate`, `endDate`

- **Response**:
```json
{
  "byZone": [
    {
      "zone": { "id": "zone-1", "name": "Level 1", "floor": 1 },
      "occupiedSlots": 45,
      "totalCapacity": 50,
      "occupancyRate": 90.0
    }
  ],
  "averageOccupancy": 82.5
}
```

### Vehicle Type Distribution

#### GET `/api/reports/vehicle-types`
Get breakdown by vehicle type
- **Query params**: `startDate`, `endDate`

- **Response**:
```json
{
  "totalVehicles": 500,
  "byVehicleType": [
    {
      "vehicleType": { "id": "vt-1", "name": "Sedan", "code": "SEDAN" },
      "count": 300,
      "percentage": 60.0
    }
  ]
}
```

### Peak Hours Analysis

#### GET `/api/reports/peak-hours`
Get peak hour statistics
- **Query params**: `startDate`, `endDate`

- **Response**:
```json
{
  "hourly": [
    { "hour": 0, "entries": 5, "exits": 3, "active": 2 },
    { "hour": 7, "entries": 80, "exits": 20, "active": 60 },
    { "hour": 8, "entries": 95, "exits": 15, "active": 80 },
    ...
  ],
  "peakHours": [7, 8, 9, 17],
  "statistics": {
    "totalEntries": 500,
    "totalExits": 450,
    "averageHourlyTraffic": 20.83
  }
}
```

---

## B15: User & Admin API

### User Management

#### GET `/api/admin/users`
Get all users with filtering
- **Query params**: `role=ADMIN|MANAGER|DRIVER|USER`, `status=ACTIVE|INACTIVE|BLOCKED`, `page=1`, `limit=20`
- **Requires**: ADMIN role

#### POST `/api/admin/users`
Create new user account
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe",
  "phone": "0912345678",
  "role": "DRIVER"
}
```
- **Fields**: 
  - `password` optional (can be set later if not provided)
  - `role` defaults to USER if not specified

#### GET `/api/admin/users/:id`
Get user details

#### PATCH `/api/admin/users/:id`
Update user information (name, phone, email)
```json
{
  "name": "Jane Doe",
  "phone": "0987654321"
}
```

#### PATCH `/api/admin/users/:id/role`
Change user role
```json
{
  "role": "MANAGER"
}
```
- **Valid roles**: USER, DRIVER, ADMIN, MANAGER

#### PATCH `/api/admin/users/:id/status`
Change user status (lock/unlock account)
```json
{
  "status": "BLOCKED"
}
```
- **Valid statuses**: ACTIVE, INACTIVE, BLOCKED

### Audit Logs

#### GET `/api/admin/audit-logs`
Get audit trail of all system actions
- **Query params**:
  - `userId=xxx` - filter by user
  - `action=CREATE|UPDATE|DELETE`
  - `resource=Zone|Gate|VehicleType|PricePolicy|Reservation`
  - `startDate=2026-01-01`
  - `endDate=2026-12-31`
  - `page=1`, `limit=20`

- **Response**:
```json
{
  "data": [
    {
      "id": "log-1",
      "userId": "user-1",
      "action": "CREATE",
      "resource": "PricePolicy",
      "resourceId": "pricing-1",
      "oldData": null,
      "newData": "{...}",
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-06-06T10:00:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 150, "totalPages": 8 }
}
```

### System Configuration

#### GET `/api/admin/system-config`
Get all system configuration
- **Returns**: Array of all configuration key-value pairs

#### GET `/api/admin/system-config/:key`
Get specific configuration by key

#### POST `/api/admin/system-config`
Create new system configuration
```json
{
  "key": "PEAK_HOURS",
  "value": "[7, 8, 9, 17, 18, 19]",
  "description": "Peak traffic hours for pricing multiplier",
  "type": "json"
}
```
- **Types**: string, number, boolean, json

#### PATCH `/api/admin/system-config/:key`
Update system configuration value
```json
{
  "value": "[8, 9, 18, 19]",
  "type": "json"
}
```

#### DELETE `/api/admin/system-config/:key`
Delete system configuration

### Predefined System Configurations

---

## AI & Image Recognition API

### Plate Recognition Endpoints

#### POST `/api/ai/plate-recognize`
Recognize vehicle license plate from image using Plate Recognizer API
- **Auth**: Requires JWT authentication (role: any authenticated user)
- **Request body**:
```json
{
  "image": "data:image/jpeg;base64,...base64_encoded_image..."
}
```
- **Supported image formats**:
  - Base64 encoded: `data:image/jpeg;base64,...`
  - Base64 string: Raw base64 string
  - URL: `https://example.com/image.jpg`

- **Response**:
```json
{
  "success": true,
  "message": "Nhận diện biển số thành công",
  "data": {
    "plate": "29A-12345",
    "plateNumber": "29A-12345",
    "licensePlate": "29A-12345",
    "confidence": 0.97,
    "confidenceScore": 0.97,
    "rawText": "29A-12345",
    "source": "plate-recognizer",
    "meta": {
      "provider": "platerecognizer.com",
      "regions": "vn",
      "rawResponse": { ... }
    }
  }
}
```

**Features**:
- Backend proxy hides API key (never expose to frontend)
- Free tier: 2500 requests/month
- Support for Vietnamese license plates
- Legacy format compatible (uses field aliases for backward compatibility)
- Automatic plate normalization (uppercase, whitespace removal)

**Environment Variables**:
```
PLATE_RECOGNIZER_API_KEY=your_token_here
PLATE_RECOGNIZER_API_URL=https://api.platerecognizer.com/v1/plate-reader/
PLATE_RECOGNIZER_REGIONS=vn
```

#### POST `/api/ai/suggest-slot`
Get AI-powered optimal parking slot suggestion
- **Auth**: Requires JWT authentication
- **Request body**:
```json
{
  "vehicleTypeCode": "SEDAN",
  "entryGateCode": "GATE_A1"
}
```
- **Response**:
```json
{
  "success": true,
  "message": "Gợi ý vị trí thành công",
  "data": {
    "slotId": "slot-123-abc",
    "reason": "Chỉ định vị trí trống gần nhất (logic dễ lùi xe)"
  }
}
```

#### POST `/api/ai/predict-peak`
Predict peak parking hours based on historical data
- **Auth**: Requires JWT authentication
- **Request body**: Empty (system analyzes recent sessions)
- **Response**:
```json
{
  "success": true,
  "message": "Dự báo giờ cao điểm thành công",
  "data": {
    "peakHour": "08:00 - 10:00",
    "expectedTraffic": "Cao",
    "analysis": "Dựa trên dữ liệu lịch sử, giờ cao điểm thường xảy ra..."
  }
}
```

### Predefined System Configurations

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `PEAK_HOURS` | json | `[7,8,9,17,18,19]` | Peak hours for pricing multiplier |
| `RESERVATION_CANCEL_MINUTES` | number | `15` | Minutes to wait before auto-cancelling |
| `MAX_RESERVATION_HOURS` | number | `12` | Maximum reservation duration |
| `BASE_TARIFF` | number | `0` | Default base parking fee |

---

## Database Models

### New Models Added

#### User
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String?
  name      String?
  phone     String?
  role      String   @default("USER") // USER, DRIVER, ADMIN, MANAGER
  status    String   @default("ACTIVE") // ACTIVE, INACTIVE, BLOCKED
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### SystemConfig
```prisma
model SystemConfig {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  description String?
  type        String   @default("string") // string, number, boolean, json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

---

## Authentication & Authorization

All endpoints (except `/health` and `/dev/token`) require JWT authentication

### Authorization Levels
- **PUBLIC**: Anyone authenticated
- **ADMIN**: Admin role only
- **MANAGER**: Admin or Manager role
- **OWNER**: User can only access their own data

### Current Endpoints Security
- **B11 (Vehicle Types)**: Create/Update/Delete require ADMIN or MANAGER
- **B12 (Pricing)**: Create/Update/Delete require ADMIN or MANAGER, Calculate requires authentication
- **B13 (Reservations)**: All require authentication, user can only see their own
- **B14 (Reports)**: All require ADMIN or MANAGER role
- **B15 (Admin)**: Requires ADMIN role (except audit logs which allow MANAGER)

---

## Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Update Database
```bash
# Generate Prisma client
npm run db:generate

# Create migration
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### 3. Environment Variables
Add to `.env`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/parking_db
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=3000
CORS_ORIGIN=*
```

### 4. Run Development Server
```bash
npm run dev
```

---

## Testing

Run test suite:
```bash
npm test
npm run test:watch
```

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "pagination": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "status": 400
}
```
