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
docker-compose -f infra/docker/docker-compose.yml up -d
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
docker-compose -f infra/docker/docker-compose.yml up
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
docker-compose -f infra/docker/docker-compose.test.yml up -d

# Wait for services to be ready
docker-compose -f infra/docker/docker-compose.test.yml exec app wget -q --spider http://localhost:3001/health

# Run k6 tests
k6 run k6/integration-tests.js

# Stop and clean up
docker-compose -f infra/docker/docker-compose.test.yml down -v
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

## Kubernetes Deployment (Minikube)

This service can be deployed to a local Minikube cluster.

### Prerequisites

- **Minikube** installed and running
- **kubectl** configured to use Minikube
- **Docker** (for building images)
- **Management Service** deployed first (to get its URL)

#### Installing Minikube

**macOS (Homebrew):**
```bash
brew install minikube
```

**Linux:**
```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

**Windows:**
```bash
# Using Chocolatey
choco install minikube

# Or download from: https://minikube.sigs.k8s.io/docs/start/
```

**Start Minikube:**
```bash
minikube start
```

**Verify installation:**
```bash
minikube status
kubectl get nodes
```

**Note:** Make sure Minikube is running before using the `k8s:*` commands. If you see an error like "cluster does not exist", run `minikube start` first.

### Building and Deploying

**Before deploying:**

1. **Get the Management Service URL:**

If the management service is already deployed:

```bash
minikube service vehicle-management-service --url
```

2. **Update the ConfigMap:**

Update `infra/k8s/configmap.yaml` with the management service URL. You can use either:
- The Kubernetes service DNS name: `http://vehicle-management-service:80` (for internal communication)
- The external URL from Minikube (if you need external access)

**Quick Start (All-in-one):**

```bash
npm run k8s:start
```

This will build the Docker image, load it into Minikube, and deploy all Kubernetes resources.

**Step-by-step:**

1. **Build the Docker image:**

```bash
npm run k8s:build
```

Or manually:

```bash
docker build -f infra/docker/Dockerfile -t vehicle-sales-service:latest .
```

2. **Load the image into Minikube:**

```bash
npm run k8s:load
```

3. **Apply Kubernetes manifests:**

```bash
npm run k8s:deploy
```

This will create:
- PostgreSQL StatefulSet with PersistentVolumeClaim
- ConfigMap with application configuration
- Secret with database credentials
- Deployment for the sales service
- LoadBalancer Service

4. **Get the service URL:**

```bash
npm run k8s:url
```

**Accessing the Service from Postman/External Tools:**

There are several ways to access the services:

**Option 1: Using Minikube Service Tunnel (Recommended)**
```bash
minikube service vehicle-sales-service --url
```
This will output a URL like `http://127.0.0.1:XXXXX` that you can use directly in Postman.

**Option 2: Using NodePort with Minikube IP**
```bash
# Get Minikube IP
minikube ip

# Access the service (replace <MINIKUBE_IP> with the actual IP)
http://<MINIKUBE_IP>:<NODE_PORT>
```

To find the NodePort:
```bash
kubectl get service vehicle-sales-service -o jsonpath='{.spec.ports[0].nodePort}'
```

**Option 3: Using kubectl port-forward (Recommended for Postman)**
```bash
npm run k8s:port-forward
```
Or manually:
```bash
kubectl port-forward service/vehicle-sales-service 3001:80
```
Then access via: `http://localhost:3001`

**Note:** Keep the port-forward command running in a terminal while using Postman. The connection will be active as long as the command is running.

**Other useful commands:**

- `npm run k8s:logs` - View application logs
- `npm run k8s:status` - Check status of pods, services, and deployments
- `npm run k8s:restart` - Restart the deployment
- `npm run k8s:delete` - Delete all Kubernetes resources

### Important Notes

- **Management Service URL**: Make sure to update the `MANAGEMENT_SERVICE_URL` in `infra/k8s/configmap.yaml` before deploying. After deployment, you can update it and run `kubectl apply -f infra/k8s/configmap.yaml` followed by `kubectl rollout restart deployment/vehicle-sales-service`.

- **Database Credentials**: Default credentials are in `infra/k8s/secret.yaml` (base64 encoded). Change them for production use.

- **Service Discovery**: The management service URL in the ConfigMap uses Kubernetes service DNS (`http://vehicle-management-service:80`) by default. This works for internal communication within the cluster.

### Updating Configuration

To update the management service URL:

1. Get the management service URL:
```bash
minikube service vehicle-management-service --url
```

2. Update `infra/k8s/configmap.yaml` with the URL
3. Apply the updated ConfigMap:
```bash
kubectl apply -f infra/k8s/configmap.yaml
```

4. Restart the deployment to pick up changes:
```bash
kubectl rollout restart deployment/vehicle-sales-service
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm run docker:build` | Build Docker image for the service |
| `npm test` | Run unit tests with coverage |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:integration` | Run k6 integration tests |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:studio` | Open Prisma Studio |
| `npm run k8s:build` | Build Docker image for Kubernetes |
| `npm run k8s:load` | Load Docker image into Minikube |
| `npm run k8s:deploy` | Deploy Kubernetes manifests |
| `npm run k8s:start` | Build, load, and deploy to Kubernetes (all-in-one) |
| `npm run k8s:url` | Get the service URL from Minikube |
| `npm run k8s:port-forward` | Forward service port to localhost (use for Postman) |
| `npm run k8s:logs` | View application logs |
| `npm run k8s:status` | Check status of Kubernetes resources |
| `npm run k8s:restart` | Restart the Kubernetes deployment |
| `npm run k8s:delete` | Delete all Kubernetes resources |

