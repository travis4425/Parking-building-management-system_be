# Database Migration & Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database

#### For PostgreSQL (Development)
```bash
# Create .env file with your database URL
echo 'DATABASE_URL="postgresql://user:password@localhost:5432/parking_db"' > .env

# Generate Prisma Client
npm run db:generate

# Create initial migration (will create all tables)
npm run db:migrate

# Optional: Seed with sample data
npm run db:seed
```

#### Using Docker (Optional)
```bash
# Start PostgreSQL in Docker
docker run --name parking-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=parking_db \
  -p 5432:5432 \
  -d postgres:15

# Then run migrations
npm run db:migrate
```

### 3. Start Server
```bash
npm run dev
```

Server will run on http://localhost:3000

---

## Database Schema Summary

### Core Models
- **zones**: Parking zones/floors
- **gates**: Entry/exit gates
- **parking_slots**: Individual parking spaces
- **vehicle_types**: Types of vehicles (car, motorcycle, truck, etc.)
- **zone_vehicle_rules**: Which vehicle types allowed per zone
- **price_policies**: Pricing rules by vehicle type
- **parking_sessions**: Parking records (check-in/out)
- **reservations**: Pre-bookings
- **audit_logs**: System activity logs
- **users**: User accounts
- **system_configs**: Configuration key-value store

### Relationships
```
Zone 1->* Gate
Zone 1->* ParkingSlot
Zone 1->* Reservation
Zone 1->* ParkingSession
Zone *->* VehicleType (via ZoneVehicleRule)

Gate 1->* ParkingSession (as entry gate)
Gate 1->* ParkingSession (as exit gate)

VehicleType 1->* ZoneVehicleRule
VehicleType 1->* PricePolicy
VehicleType 1->* Reservation
VehicleType 1->* ParkingSession

ParkingSlot 1->* ParkingSession

Reservation 1->* ParkingSession
```

---

## Migration Files Generated

After running `npm run db:migrate`, Prisma creates migration files in `prisma/migrations/`:

```
prisma/migrations/
├── 20260605042821_init/
│   └── migration.sql        (Initial schema)
├── 20260606000001_add_users/
│   └── migration.sql        (User & SystemConfig models)
└── migration_lock.toml      (Lock file for concurrent migrations)
```

---

## Common Prisma Commands

```bash
# Generate Prisma Client
npm run db:generate

# Create new migration
npm run db:migrate

# Seed database
npm run db:seed

# Open Prisma Studio (GUI)
npm run db:studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Check migration status
npx prisma migrate status

# View generated schema
npx prisma schema
```

---

## Seeding Database (prisma/seed.ts)

The seed script populates initial data:

1. **Zones**: 5 zones (B1-B5) with 50 slots each
2. **Gates**: Entry/exit gates for each zone
3. **Vehicle Types**: Car, Motorcycle, Truck, Van
4. **Pricing Policies**: Base rates for each vehicle type
5. **Zone Rules**: Which vehicles allowed where
6. **Test Users**: Admin, manager, and driver accounts

Run seed:
```bash
npm run db:seed
```

---

## Environment Variables

Create `.env` file:
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/parking_db"

# JWT
JWT_SECRET="your-secret-key-min-32-chars"

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=*

# Features
RESERVATION_AUTO_CANCEL_INTERVAL=60000  # milliseconds
```

---

## Testing Database Connection

```bash
# Quick test
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient({}); p.\$connect().then(() => { console.log('✓ Connected'); process.exit(0); }).catch(e => { console.error('✗ Error:', e.message); process.exit(1); });"

# Or use ts-node
npx ts-node -e "import { PrismaClient } from '@prisma/client'; const p = new PrismaClient({}); p.\$connect().then(() => console.log('✓ Connected')).finally(() => process.exit());"
```

---

## Schema Verification

```bash
# Generate and check types
npm run db:generate

# View current schema
npx prisma schema db pull

# Compare with code
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-migrations-folder prisma/migrations
```

---

## Data Validation & Constraints

All new data includes:
- **Timestamps**: createdAt, updatedAt
- **Status Fields**: ACTIVE/INACTIVE for zones, gates, vehicles
- **Soft Deletes**: Use status field instead of hard delete
- **Unique Constraints**: Email (users), code (gates, vehicles)
- **Foreign Keys**: With CASCADE delete policies

---

## Performance Considerations

### Indexes Created Automatically
- `Zone.id` (primary)
- `Gate.code` (unique)
- `VehicleType.code` (unique)
- `ZoneVehicleRule` composite unique (zoneId, vehicleTypeId)
- `User.email` (unique)
- `SystemConfig.key` (unique)

### Additional Recommended Indexes
```sql
-- For reports queries
CREATE INDEX idx_parking_sessions_entry_time ON parking_sessions(entryTime);
CREATE INDEX idx_parking_sessions_exit_time ON parking_sessions(exitTime);
CREATE INDEX idx_parking_sessions_zone_status ON parking_sessions(zoneId, status);

-- For reservations
CREATE INDEX idx_reservations_user_status ON reservations(userId, status);
CREATE INDEX idx_reservations_zone_status ON reservations(zoneId, status);
```

---

## Backup & Restore

### Backup PostgreSQL Database
```bash
# Backup
pg_dump -U postgres -h localhost parking_db > backup.sql

# Restore
psql -U postgres -h localhost -d parking_db < backup.sql
```

### Backup with Docker
```bash
# Backup
docker exec parking-db pg_dump -U postgres parking_db > backup.sql

# Restore
docker exec -i parking-db psql -U postgres parking_db < backup.sql
```

---

## Troubleshooting

### Connection Refused
```bash
# Check if database is running
# For Docker:
docker ps | grep parking-db

# For local PostgreSQL:
psql -U postgres -h localhost -d postgres -c "SELECT version();"
```

### Migration Conflicts
```bash
# Reset to clean state (WARNING: deletes all data!)
npx prisma migrate reset

# Or resolve conflict manually
npx prisma migrate resolve --rolled-back 20260606000001_add_users
```

### Type Errors
```bash
# Regenerate Prisma types
npm run db:generate
```

---

## Production Deployment

### Pre-deployment Checklist
- [ ] Test migrations on staging DB
- [ ] Verify environment variables
- [ ] Check backup systems
- [ ] Enable PostgreSQL replication
- [ ] Configure connection pooling

### Connection String Format
```
postgresql://username:password@host:port/database?schema=public&sslmode=require
```

### Deployment Commands
```bash
# Build
npm run build

# Migrate (from CI/CD)
npx prisma migrate deploy

# Start
npm start
```
