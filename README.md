# TaskFlow — Project & Team Task Management Platform

A full-stack project management platform with role-based access control (Admin / Project Manager / Team Member), built with NestJS, Next.js, and PostgreSQL.

## Live Demo

- **Frontend:** https://taskflow-platform.netlify.app
- **Backend API:** https://project-and-team-task-management-platform-production-6c5b.up.railway.app
- **API Docs (Swagger):** https://project-and-team-task-management-platform-production-6c5b.up.railway.app/api/docs

> Note: The backend is hosted on Railway's free trial tier and may take 30–60 seconds to respond on the first request after a period of inactivity.

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@gmail.com | 12345678 |
| Project Manager | pm@gmail.com | 12345678 |
| Team Member | member@gmail.com | 12345678 |

## Tech Stack

**Backend**
- NestJS (Node.js framework)
- TypeORM
- PostgreSQL (hosted on Neon, serverless)
- JWT (access + refresh tokens) with Passport
- class-validator / class-transformer for DTO validation
- bcrypt for password hashing
- Swagger for API documentation

**Frontend**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Axios (with automatic token-refresh interceptor)
- lucide-react (icons)

**Infrastructure**
- Neon (PostgreSQL hosting)
- Railway (backend hosting)
- Netlify (frontend hosting)
- GitHub Actions (CI/CD — lint + build)

## Features

- JWT authentication (register, login, token refresh)
- Role-based access control across 3 roles: Admin, Project Manager, Team Member
- Full CRUD for Users (Admin), Projects (Admin/PM), and Tasks (Admin/PM, status updates by Team Members)
- Kanban board with drag-free status-change dropdown across 4 columns
- Project member management
- Live, role-scoped dashboards for all 3 roles

## Project Structure

```
Project-and-Team-Task-Management-Platform/
├── backend/     # NestJS API
└── frontend/    # Next.js app
```

## Running Locally

### Prerequisites
- Node.js 20+
- npm
- A PostgreSQL database (this project was built and tested against Neon)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in .env with your own DATABASE_URL and JWT secrets
npm run migration:run
npm run start:dev
```

The backend runs on `http://localhost:3000` by default. Swagger docs are available at `http://localhost:3000/api/docs`.

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL to point at your local or deployed backend
npm run dev
```

The frontend runs on `http://localhost:3001` by default.

## Environment Variables

See `backend/.env.example` and `frontend/.env.example` for the full list of required variables.

## AI Tool Usage Disclosure

This project was built with substantial assistance from **Claude (Anthropic)**, used for:
- Debugging deployment issues across Render, Railway, and Netlify (port configuration, environment variable setup, CORS configuration, and Next.js build/publish directory misconfigurations)
- Drafting and reviewing code for new frontend pages (e.g. Settings and Team pages)
- Writing this README, feature completion report, and CI/CD workflow documentation
- General debugging guidance throughout backend and frontend development

All core application logic (authentication, RBAC, database schema, CRUD endpoints, and UI implementation) was developed by the candidate, with Claude used as a pair-programming and troubleshooting aid rather than for autonomous code generation of core features.

## License

This project was built as a coding assignment submission and is not licensed for external use.
