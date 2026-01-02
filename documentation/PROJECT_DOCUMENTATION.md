# 📈 The Lal Street - Complete Project Documentation

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Setup & Installation](#setup--installation)
7. [Configuration](#configuration)
8. [Development Guide](#development-guide)
9. [Deployment](#deployment)
10. [API Documentation](#api-documentation)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)
13. [Maintenance](#maintenance)
14. [Contributing](#contributing)
15. [License](#license)

---

## Project Overview

**The Lal Street** is a comprehensive web application designed for analyzing mutual fund portfolio performance using real-time NAV (Net Asset Value) data. The platform provides advanced financial calculators, portfolio management tools, and detailed performance analytics to help users make informed investment decisions.

### Key Objectives

- Provide accurate mutual fund performance calculations using industry-standard metrics
- Enable users to analyze multiple investment strategies (SIP, Lumpsum, SWP)
- Offer pre-configured suggested investment buckets based on risk profiles
- Deliver real-time NAV data and historical performance analysis
- Provide intuitive visualizations and comprehensive reporting

### Target Users

- Individual investors planning mutual fund investments
- Financial advisors analyzing portfolio performance
- Investment enthusiasts comparing fund strategies
- Retirement planners calculating corpus requirements

---

## Architecture

### System Architecture

The application follows a **client-server architecture** with separate frontend and backend deployments:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Vercel        │         │     Render      │         │  External APIs  │
│   (Frontend)    │◄───────►│   (Backend)     │◄───────►│  (MFAPI, etc.)  │
│   React App     │  HTTPS  │   Express API   │  HTTPS  │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Technology Flow

1. **Frontend (React + Vite)**: User interface and client-side logic
2. **Backend (Node.js + Express)**: API server handling business logic
3. **External APIs**: NAV data providers (MFAPI, RapidAPI)
4. **Caching Layer**: In-memory caching for NAV data to reduce API calls

### Data Flow

```
User Input → Frontend Validation → API Request → Backend Processing → 
External API Call → Data Transformation → Response → Frontend Display
```

---

## Features

### 🧮 Financial Calculators

#### 1. SIP Calculator (Systematic Investment Plan)
- Monthly recurring investment calculations
- Support for 2-5 funds with custom weightage
- XIRR and CAGR calculations
- Month-by-month unit tracking
- Interactive performance charts

#### 2. Lumpsum Calculator
- One-time investment analysis
- Portfolio performance tracking
- Individual fund vs. portfolio comparison
- Historical NAV-based calculations

#### 3. SIP + Lumpsum Calculator
- Combined investment strategy
- Flexible lumpsum distribution options:
  - Initial lumpsum
  - Final lumpsum
  - Distributed lumpsum
- Comprehensive return analysis

#### 4. SWP Calculator (Systematic Withdrawal Plan)
- Monthly withdrawal simulations
- Safe withdrawal rate calculations
- Principal vs. profit breakdown
- Retirement planning support
- Rolling returns analysis

#### 5. Rolling Returns Calculator
- Customizable rolling window periods
- Statistical analysis (Mean, Median, Max, Min, Std Dev)
- Positive period percentage
- Historical performance trends

### 📊 Portfolio Management

#### Suggested Investment Buckets
- Pre-configured portfolios based on risk profiles:
  - **Low Risk**: Conservative funds
  - **Moderate Risk**: Balanced allocation
  - **High Risk**: Aggressive growth funds
- 3-year historical performance data
- Live returns calculation (Lumpsum & SIP)
- Detailed performance reports:
  - Portfolio performance metrics
  - Individual fund analysis
  - CAGR (3Y & 5Y)
  - Maximum/Minimum returns
  - Positive period percentage

#### Fund Search & Selection
- Real-time fund search by name or scheme code
- Support for 2-5 funds per portfolio
- Custom weightage allocation (must total 100%)
- Fund metadata and categorization

### 📈 Analytics & Reporting

#### Performance Metrics
- **XIRR (Extended Internal Rate of Return)**: Accounts for cashflow timing
- **CAGR (Compound Annual Growth Rate)**: Annualized growth percentage
- **Absolute Returns**: Total profit/loss in rupees and percentage
- **Rolling Returns**: Statistical analysis over time windows
- **Portfolio Volatility**: Risk assessment metrics

#### Visualizations
- Interactive line charts (Recharts)
- Performance comparison graphs
- Time-series investment tracking
- Individual fund vs. portfolio comparison
- Growth trend visualization

### 📝 Content Management

#### Blogs & Community
- **Blog Management System**:
  - Create, edit, and delete blog posts
  - Rich HTML content support
  - Image upload via Cloudinary
  - Category and tag organization
  - Exclusive content flagging
  - Publish/draft status control
- **Public Blog Page**:
  - Search functionality
  - Filter by category and tags
  - Sort by latest or most viewed
  - Most popular blogs sidebar
  - Trending tags display
  - Full blog reading experience
- **Automatic Features**:
  - View count tracking
  - Category and tag auto-creation
  - SEO-friendly URLs
  - Responsive design

### 🔐 Admin Features

#### Admin Panel
- Secure authentication system
- **Suggested buckets management**:
  - Create, edit, delete buckets
  - Configure fund allocations
  - Set risk levels and categories
  - Enable/disable buckets
- **Blogs management**:
  - Full CRUD operations
  - Image upload and management
  - Category and tag management
  - Content publishing control
- Performance data management
- System health monitoring

---

## Tech Stack

### Frontend (`client/`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18.3.1 | UI framework |
| **TypeScript** | 5.2.2 | Type safety |
| **Vite** | 5.2.0 | Build tool & dev server |
| **Tailwind CSS** | 3.4.1 | Utility-first styling |
| **Recharts** | 2.13.3 | Chart visualizations |
| **Radix UI** | Latest | Accessible component primitives |
| **Lucide React** | 0.263.1 | Icon library |
| **Axios** | 1.12.2 | HTTP client |

### Backend (`server/`)

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | >=16.0.0 | Runtime environment |
| **Express.js** | 5.1.0 | Web framework |
| **Axios** | 1.12.2 | HTTP client for external APIs |
| **CORS** | 2.8.5 | Cross-origin resource sharing |
| **Express Rate Limit** | 8.1.0 | API rate limiting |
| **LRU Cache** | 11.2.2 | In-memory caching |
| **XIRR** | 1.1.0 | Financial calculations |
| **Dotenv** | 17.2.3 | Environment variable management |

### External Services

- **MFAPI** (api.mfapi.in): Mutual fund NAV data
- **RapidAPI**: Fund search and metadata
- **Vercel**: Frontend hosting
- **Render**: Backend hosting

---

## Project Structure

```
The-Lal-Street/
├── client/                          # Frontend React application
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── calculators/         # Calculator components
│   │   │   │   ├── SIPCalculator.tsx
│   │   │   │   ├── LumpsumCalculator.tsx
│   │   │   │   ├── SIPLumpsumCalculator.tsx
│   │   │   │   ├── SWPCalculator.tsx
│   │   │   │   └── RollingCalculator.tsx
│   │   │   ├── ui/                  # Reusable UI components (Shadcn)
│   │   │   ├── FundSearch.tsx      # Fund search component
│   │   │   ├── FundBucket.tsx      # Portfolio management
│   │   │   ├── BucketManager.tsx   # Bucket operations
│   │   │   ├── SuggestedBuckets.tsx # Suggested portfolios
│   │   │   ├── HomePage.tsx        # Landing page
│   │   │   ├── InvestmentPlanPage.tsx
│   │   │   ├── RetirementPlanPage.tsx
│   │   │   ├── AdminPage.tsx       # Admin panel
│   │   │   └── ...
│   │   ├── services/               # API service layer
│   │   │   ├── navService.ts       # NAV data fetching
│   │   │   └── suggestedBucketsService.ts
│   │   ├── utils/                  # Utility functions
│   │   │   ├── calculations.ts     # Financial calculations
│   │   │   ├── bucketPerformanceCalculator.ts
│   │   │   ├── logger.ts          # Logging utility
│   │   │   └── ...
│   │   ├── config/                 # Configuration
│   │   │   └── api.ts              # API endpoints
│   │   ├── hooks/                  # Custom React hooks
│   │   │   └── useAuth.ts          # Authentication
│   │   ├── types/                  # TypeScript types
│   │   ├── App.tsx                 # Main app component
│   │   └── main.tsx                # Entry point
│   ├── public/                     # Static assets
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── server/                         # Backend Node.js application
│   ├── routes/                     # API routes
│   │   ├── calculator.routes.js    # Calculator endpoints
│   │   ├── funds.routes.js         # Fund search endpoints
│   │   └── suggestedBuckets.routes.js
│   ├── controllers/                # Route controllers
│   ├── services/                   # Business logic
│   ├── logic/                      # Financial calculations
│   │   ├── xirr.js                 # XIRR calculation
│   │   ├── cagr.js                 # CAGR calculation
│   │   └── rollingReturns.js       # Rolling returns
│   ├── utils/                      # Utility functions
│   │   ├── logger.js               # Logging utility
│   │   └── ...
│   ├── data/                       # Data files
│   │   └── suggestedBuckets.json   # Suggested buckets data
│   ├── server.js                   # Entry point
│   ├── package.json
│   └── .env.example
│
├── documentation/                  # All project documentation
│   ├── PROJECT_DOCUMENTATION.md    # This file
│   ├── API_DOCUMENTATION.md        # API reference
│   ├── DEPLOYMENT_GUIDE.md         # Deployment instructions
│   ├── ENVIRONMENT_VARIABLES.md    # Configuration guide
│   ├── ADMIN_PANEL_GUIDE.md        # Admin features
│   └── ...
│
├── .gitignore
├── package.json                    # Root package.json (workspaces)
└── README.md                       # Quick start guide
```

---

## Setup & Installation

### Prerequisites

- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0 (or yarn)
- **Git**: For version control

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/The-Lal-Street.git
cd The-Lal-Street
```

### Step 2: Install Dependencies

#### Option A: Install All at Once (Recommended)

```bash
npm run install:all
```

#### Option B: Install Separately

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Step 3: Environment Setup

#### Backend Environment Variables

Create `server/.env`:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# CORS Configuration (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Admin Authentication
ADMIN_PASSWORD=your-secure-password-here

# External API Keys (if needed)
RAPIDAPI_KEY=your-rapidapi-key-here
RAPIDAPI_HOST=latest-mutual-fund-nav.p.rapidapi.com
```

#### Frontend Environment Variables

Create `client/.env`:

```env
# API Base URL
VITE_API_URL=http://localhost:5000/api

# Admin Password (for client-side auth)
VITE_ADMIN_PASSWORD=your-secure-password-here
```

### Step 4: Start Development Servers

#### Option A: Run Both Together

```bash
npm run dev
```

#### Option B: Run Separately

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### Step 5: Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

---

## Configuration

### Environment Variables

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for detailed configuration.

#### Backend Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | Yes | `development` | Environment mode |
| `ALLOWED_ORIGINS` | Yes | - | CORS allowed origins (comma-separated) |
| `ADMIN_PASSWORD` | Yes | - | Admin authentication password |
| `RAPIDAPI_KEY` | Optional | - | RapidAPI key for fund search |
| `CLOUDINARY_CLOUD_NAME` | Yes* | - | Cloudinary cloud name (for blogs) |
| `CLOUDINARY_API_KEY` | Yes* | - | Cloudinary API key (for blogs) |
| `CLOUDINARY_API_SECRET` | Yes* | - | Cloudinary API secret (for blogs) |

*Required only if using the blogs feature

#### Frontend Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | - | Backend API base URL |
| `VITE_ADMIN_PASSWORD` | Yes | - | Admin password (matches backend) |

### CORS Configuration

The server uses whitelist-based CORS. Add all client URLs to `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:5173
```

### Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Calculator Routes**: 20 requests per 5 minutes per IP
- **Health Check**: Excluded from rate limiting

---

## Development Guide

### Code Structure

#### Frontend Components

- **Calculators**: Located in `client/src/components/calculators/`
- **UI Components**: Shadcn UI components in `client/src/components/ui/`
- **Services**: API calls in `client/src/services/`
- **Utils**: Helper functions in `client/src/utils/`

#### Backend Routes

- **Calculator Routes**: `/api/calculator/*`
- **Fund Routes**: `/api/funds/*`
- **Suggested Buckets**: `/api/suggested-buckets/*`
- **Blogs**: `/api/blogs/*`
- **Auth Routes**: `/api/auth/*`
- **Health Check**: `/api/health`

### Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Follow existing code patterns
   - Use TypeScript for type safety
   - Write descriptive commit messages

3. **Test Locally**
   ```bash
   # Run linter
   cd client && npm run lint
   
   # Test API endpoints
   curl http://localhost:5000/api/health
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Coding Standards

- **TypeScript**: Use types for all functions and components
- **Naming**: Use descriptive, camelCase names
- **Components**: Functional components with hooks
- **Error Handling**: Always handle errors gracefully
- **Logging**: Use `logger` utility (development only)

### Adding New Calculator

1. Create component in `client/src/components/calculators/`
2. Add route in `client/src/App.tsx`
3. Create backend endpoint in `server/routes/calculator.routes.js`
4. Add calculation logic in `server/logic/`
5. Update documentation

---

## Deployment

### Deployment Architecture

The application uses **separate deployments** for frontend and backend:

- **Frontend**: Vercel (Static React App)
- **Backend**: Render (Express API Server)

### Frontend Deployment (Vercel)

See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for detailed steps.

**Quick Steps:**
1. Connect GitHub repository to Vercel
2. Set root directory to `client`
3. Configure build settings:
   - Framework: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables
5. Deploy

### Backend Deployment (Render)

See [RENDER_SETUP_INSTRUCTIONS.md](./RENDER_SETUP_INSTRUCTIONS.md) for detailed steps.

**Quick Steps:**
1. Connect GitHub repository to Render
2. Create new Web Service
3. Configure:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Add environment variables
5. Deploy

### Environment Variables for Production

#### Vercel (Frontend)
```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_ADMIN_PASSWORD=your-production-password
```

#### Render (Backend)
```env
NODE_ENV=production
ALLOWED_ORIGINS=https://your-app.vercel.app
ADMIN_PASSWORD=your-production-password
PORT=5000
```

### Multiple Deployment Pairs

If deploying multiple instances:

1. **Update CORS** on each backend:
   ```env
   ALLOWED_ORIGINS=https://client1.vercel.app,https://client2.vercel.app
   ```

2. **Update API URL** on each frontend:
   ```env
   VITE_API_URL=https://backend1.onrender.com/api
   ```

See [CORS_FIX_NEW_DEPLOYMENT.md](./CORS_FIX_NEW_DEPLOYMENT.md) for troubleshooting.

---

## API Documentation

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for complete API reference.

### Key Endpoints

#### Health Check
```
GET /api/health
```

#### Fund Search
```
GET /api/funds/search?q=query
```

#### NAV Data
```
POST /api/funds/get-nav-bucket
Body: {
  schemeCodes: ["119551"],
  startDate: "2020-01-01",
  endDate: "2024-10-30"
}
```

#### Suggested Buckets
```
GET /api/suggested-buckets?activeOnly=true
GET /api/suggested-buckets/:id
```

#### Blogs (See [BLOGS_FEATURE_DOCUMENTATION.md](./BLOGS_FEATURE_DOCUMENTATION.md) for details)
```
GET /api/blogs?category=trading&tags=volatility&sortBy=createdAt
GET /api/blogs/:id
GET /api/blogs/categories/all
GET /api/blogs/tags/all
POST /api/blogs (Admin only - multipart/form-data)
PUT /api/blogs/:id (Admin only - multipart/form-data)
DELETE /api/blogs/:id (Admin only)
```

#### Calculator Endpoints
```
POST /api/calculator/nav
POST /api/calculator/rolling
```

---

## Testing

### Manual Testing

1. **Calculator Tests**
   - Test each calculator with various inputs
   - Verify calculations match expected results
   - Check error handling for invalid inputs

2. **API Tests**
   - Test all endpoints using Postman or curl
   - Verify CORS headers
   - Check rate limiting

3. **UI Tests**
   - Test responsive design on different devices
   - Verify all interactive elements work
   - Check form validations

### Automated Testing

```bash
# Frontend tests (when implemented)
cd client
npm test

# Backend tests (when implemented)
cd server
npm test
```

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for detailed testing procedures.

---

## Troubleshooting

### Common Issues

#### CORS Errors
**Problem**: `No 'Access-Control-Allow-Origin' header`

**Solution**:
1. Check `ALLOWED_ORIGINS` in backend `.env`
2. Ensure client URL matches exactly (no trailing slash)
3. Restart backend server

#### API Connection Errors
**Problem**: `Failed to fetch` or `Network error`

**Solution**:
1. Verify `VITE_API_URL` in frontend `.env`
2. Check backend server is running
3. Verify backend health: `GET /api/health`

#### Calculation Errors
**Problem**: Incorrect calculation results

**Solution**:
1. Check NAV data availability for date range
2. Verify fund scheme codes are correct
3. Check date format (YYYY-MM-DD)

#### Build Errors
**Problem**: Build fails on Vercel/Render

**Solution**:
1. Check Node.js version compatibility
2. Verify all dependencies in `package.json`
3. Check build logs for specific errors

See [TROUBLESHOOTING_MAINTENANCE.md](./TROUBLESHOOTING_MAINTENANCE.md) for more solutions.

---

## Maintenance

### Regular Tasks

1. **Update Dependencies**
   ```bash
   npm update
   ```

2. **Monitor Server Health**
   - Check Render logs regularly
   - Monitor API response times
   - Review error rates

3. **Update NAV Data Cache**
   - Cache automatically refreshes (1 hour TTL)
   - Monitor cache hit rates

4. **Review Logs**
   - Check for CORS blocked origins
   - Monitor rate limit violations
   - Review error patterns

### Performance Optimization

- **Caching**: NAV data cached for 1 hour
- **Rate Limiting**: Prevents API abuse
- **Code Splitting**: Frontend uses code splitting
- **Lazy Loading**: Components loaded on demand

### Security

- **CORS**: Whitelist-based origin control
- **Rate Limiting**: Prevents DoS attacks
- **Environment Variables**: Sensitive data in env vars
- **Password Security**: Strong admin passwords required

See [SECURITY_PROTOCOLS.md](./SECURITY_PROTOCOLS.md) for detailed security practices.

---

## Contributing

### Contribution Guidelines

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow coding standards**
4. **Write descriptive commit messages**
5. **Test your changes**
6. **Submit a pull request**

### Commit Message Format

```
feat: add new calculator feature
fix: resolve CORS issue
docs: update API documentation
style: format code
refactor: restructure components
test: add unit tests
chore: update dependencies
```

### Code Review Process

1. All PRs require review
2. Code must pass linting
3. Tests must pass (when available)
4. Documentation must be updated

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## Additional Resources

### Documentation Files

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Deployment instructions
- **[ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)** - Configuration guide
- **[ADMIN_PANEL_GUIDE.md](./ADMIN_PANEL_GUIDE.md)** - Admin features
- **[CALCULATOR_DOCUMENTATION.md](./CALCULATOR_DOCUMENTATION.md)** - Calculator details
- **[TROUBLESHOOTING_MAINTENANCE.md](./TROUBLESHOOTING_MAINTENANCE.md)** - Common issues
- **[SECURITY_PROTOCOLS.md](./SECURITY_PROTOCOLS.md)** - Security practices

### External Resources

- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [Recharts Documentation](https://recharts.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

## Support

For support, questions, or issues:

1. **Check Documentation**: Review relevant documentation files
2. **Search Issues**: Check existing GitHub issues
3. **Create Issue**: Open a new issue with detailed information
4. **Contact**: Reach out to the development team

---

## Version History

- **v1.0.0** (Current)
  - Initial release
  - All calculators implemented
  - Admin panel functional
  - Suggested buckets feature
  - Performance analytics

---

## Acknowledgments

- **MFAPI** - Mutual fund NAV data provider
- **RapidAPI** - Fund search API
- **Recharts** - Chart visualization library
- **Shadcn UI** - UI component library
- **Vercel** - Frontend hosting
- **Render** - Backend hosting

---

**Last Updated**: 2024
**Maintained By**: Development Team

---

⭐ **Star this repository if you find it helpful!**

