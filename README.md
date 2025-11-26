# Vehicle Sales Service

A REST API service for managing vehicle sales built with Express.js, TypeScript, and Prisma.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Development](#development)
- [Testing](#testing)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
- [API Endpoints](#api-endpoints)

## Prerequisites

- **Node.js** 22 or higher
- **Docker** and **Docker Compose**
- **k6** (for integration tests)

### Installing k6

k6 is required to run integration tests. Install it based on your operating system:

#### macOS (Homebrew)

```bash
brew install k6
```

#### Windows (Chocolatey)

```bash
choco install k6
```

#### Windows (winget)

```bash
winget install k6 --source winget
```

#### Linux (Debian/Ubuntu)

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Linux (Fedora/RHEL)

```bash
sudo dnf install https://dl.k6.io/rpm/repo.rpm
sudo dnf install k6
```

#### Docker (Alternative)

```bash
docker pull grafana/k6
```

For more installation options, visit: https://k6.io/docs/get-started/installation/

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Copy the environment file:

```bash
cp .env.example .env
```

4. Start the development environment:

```bash
docker-compose up -d
```

5. Run database migrations:

```bash
npm run prisma:migrate
```

## Development

Start the development server:

```bash
npm run dev
```

Or using Docker Compose:

```bash
docker-compose up
```

The server will be available at `http://localhost:3001`.

## Testing

### Unit Tests

Run unit tests with coverage:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

### Integration Tests

Integration tests use k6 to test the API endpoints against a real database.

**Prerequisites:**
- Docker and Docker Compose installed
- k6 installed (see [Installing k6](#installing-k6))

Run integration tests:

```bash
npm run test:integration
```

This command will:
1. Start PostgreSQL and the application in Docker containers
2. Wait for the service to be healthy
3. Run k6 integration tests
4. Stop and clean up containers

**Manual integration testing:**

If you want to run the tests manually:

```bash
# Start the test environment
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be ready
docker-compose -f docker-compose.test.yml exec app wget -q --spider http://localhost:3001/health

# Run k6 tests
k6 run k6/integration-tests.js

# Stop and clean up
docker-compose -f docker-compose.test.yml down -v
```

## API Endpoints

### Health Check

- `GET /health` - Check service health

### Internal API (Vehicle Sync)

- `POST /api/internal/vehicles/sync` - Sync vehicle from management service

#### Sync Vehicle Schema

```json
{
  "id": "uuid (required)",
  "brand": "string (required)",
  "model": "string (required)",
  "year": "number (1900 - current year + 1)",
  "color": "string (required)",
  "price": "number (positive)",
  "status": "AVAILABLE | SOLD"
}
```

### Sales API

- `GET /api/sales/vehicles/available` - List all available vehicles for purchase
- `GET /api/sales/vehicles/sold` - List all sold vehicles
- `POST /api/sales/purchase` - Purchase a vehicle
- `POST /api/sales/payment/webhook` - Payment status webhook (from payment provider)

#### Purchase Schema

```json
{
  "vehicleId": "uuid (required)",
  "buyerCpf": "string (11-14 characters, required)",
  "saleDate": "ISO date string (required)"
}
```

#### Payment Webhook Schema

```json
{
  "paymentCode": "string (required)",
  "status": "confirmed | cancelled"
}
```

#### Purchase Response

```json
{
  "sale": {
    "id": "uuid",
    "vehicleId": "uuid",
    "buyerCpf": "string",
    "saleDate": "ISO date",
    "totalAmount": "number",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  },
  "payment": {
    "id": "uuid",
    "paymentCode": "uuid",
    "status": "PENDING",
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```

## Database Models

### Vehicle
- Synced from the management service
- Contains: id, brand, model, year, color, price, status, syncedAt

### Sale
- Represents a vehicle sale transaction
- Contains: id, vehicleId, buyerCpf, saleDate, totalAmount

### Payment
- Payment information for a sale
- Contains: id, saleId, paymentCode, status (PENDING, CONFIRMED, CANCELLED)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3001 |
| `DATABASE_URL` | PostgreSQL connection URL | - |
| `NODE_ENV` | Environment (development, test, production) | development |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm test` | Run unit tests with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:integration` | Run k6 integration tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:studio` | Open Prisma Studio |

