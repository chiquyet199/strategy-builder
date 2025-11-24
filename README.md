# Strategy Project

A full-stack monorepo application with NestJS backend and Vue 3 frontend, including infrastructure and deployment configurations.

## Monorepo Structure

```
strategy/
├── apps/
│   ├── backend/          # NestJS backend application
│   └── frontend/         # Vue 3 frontend application
├── infrastructure/
│   ├── docker/           # Docker configurations
│   │   ├── Dockerfile.backend
│   │   └── Dockerfile.frontend
│   ├── k8s/              # Kubernetes manifests
│   │   ├── backend/
│   │   ├── frontend/
│   │   └── ingress.yaml
│   └── scripts/          # Deployment scripts
├── .github/workflows/    # CI/CD pipelines
├── docker-compose.yml    # Local development with Docker
└── package.json          # Root workspace configuration
```

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v20.19.0 or >=22.12.0)
- **npm** (>=9.0.0)
- **Docker** and **Docker Compose** (for PostgreSQL and Redis)
  - PostgreSQL is run via Docker
  - Redis is run via Docker for rate limiting

## Quick Start

### Option 1: Using npm workspaces (Recommended for Development)

**1. Install Dependencies:**

```bash
# Install all dependencies (root, backend, and frontend)
npm install
```

**2. Start Required Services (PostgreSQL and Redis):**

```bash
# Start PostgreSQL database
npm run db:up

# Start Redis (for rate limiting)
npm run redis:up

# Check if services are running
docker ps | grep -E "postgres|redis"

# View service logs
npm run db:logs      # PostgreSQL logs
npm run redis:logs   # Redis logs
```

**3. Configure Environment Variables:**

Copy the example environment file and update as needed:

```bash
# Copy example environment file
cp apps/backend/.env.example apps/backend/.env
```

The `.env.example` file includes all required variables with development defaults. For production, see the [Environment Variables](#environment-variables) section below.

**4. Start Development Servers:**

```bash
# Start both backend and frontend servers simultaneously (with hot reload)
npm run dev
```

This will start:
- **PostgreSQL** on localhost:5432 (Docker)
- **Redis** on localhost:6379 (Docker)
- **Backend** on http://localhost:3000 (with hot reload)
- **Frontend** on http://localhost:5173 (with hot reload)

**Service Management:**
```bash
# Database
npm run db:up      # Start PostgreSQL
npm run db:down    # Stop PostgreSQL
npm run db:logs    # View PostgreSQL logs
npm run db:reset   # Reset database (removes all data)

# Redis
npm run redis:up   # Start Redis
npm run redis:down # Stop Redis
npm run redis:logs # View Redis logs
npm run redis:cli  # Access Redis CLI
```

### Option 2: Using Docker (Includes PostgreSQL)

```bash
# Build and start all services with Docker (includes PostgreSQL)
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down

# Remove volumes (clears database data)
docker-compose down -v
```

This will start:
- **PostgreSQL** on localhost:5432
- **Backend** on http://localhost:3000
- **Frontend** on http://localhost:5173

### Option 3: Using setup script

```bash
# Run the setup script
./infrastructure/scripts/setup.sh

# Then start development
npm run dev
```

## Access the Application

- **Frontend**: Open [http://localhost:5173](http://localhost:5173) in your browser
- **Backend API**: Available at [http://localhost:3000/api/v1](http://localhost:3000/api/v1)
- **API Documentation**: Available at [http://localhost:3000/api/docs](http://localhost:3000/api/docs) (Swagger UI)

## Root Scripts (Monorepo)

From the root directory, you can run:

```bash
# Development
npm run dev              # Start both backend and frontend servers (with hot reload)
npm run dev:backend      # Start only backend server (with hot reload)
npm run dev:frontend     # Start only frontend server (with hot reload)

# Database (PostgreSQL in Docker)
npm run db:up            # Start PostgreSQL database
npm run db:down          # Stop PostgreSQL database
npm run db:logs          # View PostgreSQL logs
npm run db:reset         # Reset database (removes all data)

# Redis (for rate limiting)
npm run redis:up         # Start Redis
npm run redis:down       # Stop Redis
npm run redis:logs       # View Redis logs
npm run redis:cli        # Access Redis CLI

# Building
npm run build            # Build all applications
npm run build:backend    # Build only backend
npm run build:frontend   # Build only frontend

# Testing
npm run test             # Run tests for all applications
npm run test:backend     # Run backend tests
npm run test:frontend    # Run frontend tests

# Code Quality
npm run lint             # Lint all applications
npm run lint:backend     # Lint backend
npm run lint:frontend    # Lint frontend
npm run format           # Format code in all applications

# Docker
npm run docker:up        # Start services with Docker
npm run docker:down      # Stop Docker services
npm run docker:build     # Build Docker images
npm run docker:logs      # View Docker logs
```

## Workspace Scripts

### Backend Scripts

```bash
cd apps/backend

npm run start          # Start production server
npm run start:dev      # Start development server with hot reload
npm run start:debug    # Start in debug mode
npm run build          # Build for production
npm run test           # Run unit tests
npm run test:e2e       # Run end-to-end tests
npm run lint           # Lint code
npm run format         # Format code with Prettier
```

### Frontend Scripts

```bash
cd apps/frontend

npm run dev            # Start development server
npm run build          # Build for production
npm run preview        # Preview production build
npm run test:unit      # Run unit tests
npm run lint           # Lint code
npm run format         # Format code with Prettier
npm run type-check     # Type check TypeScript
```

## API Endpoints

The backend API is prefixed with `/api/v1`:

- `GET /api/v1` - Hello message
- `GET /api/v1/health` - Health check endpoint
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password with token
- `GET /api/v1/auth/profile` - Get user profile (protected)

**API Documentation**: Visit [http://localhost:3000/api/docs](http://localhost:3000/api/docs) for interactive Swagger documentation.

The frontend is configured to proxy all `/api/*` requests to the backend server automatically.

## Technology Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **Express** - Web framework (via NestJS)
- **PostgreSQL** - Relational database
- **TypeORM** - Object-Relational Mapping
- **JWT** - JSON Web Tokens for authentication
- **bcrypt** - Password hashing
- **Redis** - Distributed rate limiting storage
- **@nestjs/throttler** - Rate limiting middleware

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next-generation frontend tooling
- **Vue Router** - Official router for Vue.js
- **Pinia** - State management for Vue
- **Tailwind CSS** - Utility-first CSS framework
- **Ant Design Vue** - UI component library
- **Vitest** - Unit testing framework

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Kubernetes** - Container orchestration (production)
- **GitHub Actions** - CI/CD pipelines

## Development Notes

### CORS Configuration

The backend CORS is configured via the `FRONTEND_URL` environment variable. Defaults to `http://localhost:5173` in development. Update `FRONTEND_URL` in your `.env` file if your frontend runs on a different URL.

### API Proxy

The frontend Vite server is configured to proxy all `/api/*` requests to `http://localhost:3000`. This configuration is in `apps/frontend/vite.config.ts`.

### Environment Variables

**Backend Environment Variables** (`apps/backend/.env`):

Copy `apps/backend/.env.example` to `apps/backend/.env`:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Required variables:

```env
# Application Environment
NODE_ENV=development  # Use 'production' in production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=strategy

# JWT Configuration
# Generate with: openssl rand -base64 32
# REQUIRED in production (will throw error if missing)
JWT_SECRET=your-secret-key-change-in-production

# Redis Configuration (for rate limiting)
REDIS_HOST=localhost
REDIS_PORT=6379
# REQUIRED in production (will throw error if missing)
REDIS_PASSWORD=redis

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:5173

# Email Configuration (optional)
EMAIL_FROM=noreply@strategy.app
```

**Production Requirements:**

In production (`NODE_ENV=production`), the following are **required** and will throw errors if missing:
- `JWT_SECRET` - Must be a strong random string
- `REDIS_PASSWORD` - Must be set for security

**Frontend Environment Variables** (`apps/frontend/.env`):

```env
VITE_API_URL=http://localhost:3000
```

**Important Notes**: 
- `.env` files are already included in `.gitignore` and should not be committed to version control
- Always copy from `.env.example` and update values for your environment
- In production, use secure secrets management (AWS Secrets Manager, HashiCorp Vault, etc.)
- Generate strong secrets: `openssl rand -base64 32`

## Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Docker Deployment
```bash
# Build images
npm run docker:build

# Start services
npm run docker:up
```

### Kubernetes Deployment

```bash
# Apply Kubernetes manifests
kubectl apply -f infrastructure/k8s/

# Or using kustomize
kubectl apply -k infrastructure/k8s/
```

### Deployment Script

```bash
# Run the deployment script
./infrastructure/scripts/deploy.sh
```

This script will:
1. Install dependencies
2. Run tests
3. Lint code
4. Build applications
5. Build Docker images
6. Deploy to Kubernetes (if configured)

## CI/CD

The project includes GitHub Actions workflows for:

- **Linting and Testing** - Runs on every push and pull request
- **Docker Build** - Builds Docker images on push
- **Deployment** - Deploys to production on push to main branch

Workflows are located in `.github/workflows/ci.yml`.

## Troubleshooting

### Backend won't start
- Ensure port 3000 is not already in use
- Check that all dependencies are installed: `npm install`
- Verify workspace setup: `npm run dev:backend`

### Frontend won't start
- Ensure port 5173 is not already in use
- Check that all dependencies are installed: `npm install`
- Verify workspace setup: `npm run dev:frontend`

### API requests failing
- Verify the backend server is running on port 3000
- Check the browser console for CORS errors
- Ensure the Vite proxy configuration is correct in `apps/frontend/vite.config.ts`

### Connection status shows error
- Make sure both servers are running
- Check that the backend is accessible at `http://localhost:3000/api/v1/health`
- Verify CORS is enabled in the backend (check `FRONTEND_URL` in `.env`)
- Ensure PostgreSQL and Redis are running: `docker ps`

### Docker issues
- Ensure Docker is running
- Check Docker logs: `npm run docker:logs`
- Rebuild images: `npm run docker:build`
- Verify services are running: `docker ps`

### Redis connection errors
- Ensure Redis is running: `npm run redis:up`
- Check Redis logs: `npm run redis:logs`
- Verify Redis password matches in `.env` file
- Test Redis connection: `npm run redis:cli` then type `PING`

### Workspace issues
- Delete `node_modules` and reinstall: `rm -rf node_modules apps/*/node_modules && npm install`
- Clear npm cache: `npm cache clean --force`

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting: `npm run test && npm run lint`
4. Submit a pull request

## License

Private project - All rights reserved
