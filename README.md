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
- **Docker** (optional, for containerized development)
- **Docker Compose** (optional, for local Docker setup)

## Quick Start

### Option 1: Using npm workspaces (Recommended)

```bash
# Install all dependencies (root, backend, and frontend)
npm install

# Start both backend and frontend servers simultaneously
npm run dev
```

This will start:
- **Backend** on http://localhost:3000
- **Frontend** on http://localhost:5173

### Option 2: Using Docker

```bash
# Build and start all services with Docker
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

### Option 3: Using setup script

```bash
# Run the setup script
./infrastructure/scripts/setup.sh

# Then start development
npm run dev
```

## Access the Application

- **Frontend**: Open [http://localhost:5173](http://localhost:5173) in your browser
- **Backend API**: Available at [http://localhost:3000/api](http://localhost:3000/api)

## Root Scripts (Monorepo)

From the root directory, you can run:

```bash
# Development
npm run dev              # Start both backend and frontend servers
npm run dev:backend      # Start only backend server
npm run dev:frontend     # Start only frontend server

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

The backend API is prefixed with `/api`:

- `GET /api` - Hello message
- `GET /api/health` - Health check endpoint

The frontend is configured to proxy all `/api/*` requests to the backend server automatically.

## Technology Stack

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Type-safe JavaScript
- **Express** - Web framework (via NestJS)

### Frontend
- **Vue 3** - Progressive JavaScript framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Next-generation frontend tooling
- **Vue Router** - Official router for Vue.js
- **Pinia** - State management for Vue
- **Tailwind CSS** - Utility-first CSS framework
- **Vitest** - Unit testing framework

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Kubernetes** - Container orchestration (production)
- **GitHub Actions** - CI/CD pipelines

## Development Notes

### CORS Configuration

The backend is configured to allow requests from the frontend development server (`http://localhost:5173`). If you change the frontend port, update the CORS configuration in `apps/backend/src/main.ts`.

### API Proxy

The frontend Vite server is configured to proxy all `/api/*` requests to `http://localhost:3000`. This configuration is in `apps/frontend/vite.config.ts`.

### Environment Variables

Create `.env` files in the respective directories if you need environment-specific configuration:

- `apps/backend/.env` - Backend environment variables
- `apps/frontend/.env` - Frontend environment variables

**Note**: `.env` files are already included in `.gitignore` and should not be committed to version control.

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
- Check that the backend is accessible at `http://localhost:3000/api/health`
- Verify CORS is enabled in the backend

### Docker issues
- Ensure Docker is running
- Check Docker logs: `npm run docker:logs`
- Rebuild images: `npm run docker:build`

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
