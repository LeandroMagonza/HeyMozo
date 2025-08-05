# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Starts both React frontend (port 3000) and Express backend (port 3001) concurrently
- `npm start` - Runs the production Express server only
- `npm run build` - Builds React app for production
- `npm test` - Runs React test suite
- `npm run server` - Runs Express backend server only
- `npm run seed` - Seeds the database with initial data
- `npm run migrate` - Runs database migrations

## Architecture Overview

HeyMozo is a restaurant table management system built with React frontend and Express/PostgreSQL backend. The system uses QR codes to enable customer-server communication.

### Core Components

**Frontend Structure:**
- React SPA with React Router for navigation
- Two main user interfaces: AdminScreen (staff) and UserScreen (customers)
- Authentication system with JWT tokens and magic links
- Protected routes for admin functionality

**Backend Structure:**
- Express.js server (`server.js`) with REST API
- Sequelize ORM for PostgreSQL database
- Authentication middleware with permission-based access control
- Mixed public/protected routes (public routes for customer interactions, protected for admin)

### Data Models

**Core Models (src/models/):**
- `Company` - Restaurant chains/businesses
- `Branch` - Individual restaurant locations
- `Table` - Physical tables within branches
- `Event` - Customer requests (call waiter, request check, etc.)
- `User` - Staff users with authentication
- `Permission` - User access control for companies/branches
- `AuthToken` - JWT token management with logout tracking

**Key Relationships:**
- Company → Branch → Table → Event (hierarchical structure)
- User ↔ Permission (many-to-many for access control)
- User → AuthToken (one-to-many for session management)

### Event System

The core functionality revolves around table events defined in `src/constants.js`:
- `CALL_WAITER` - Customer requests waiter attention
- `REQUEST_CHECK` - Customer requests the bill
- `CALL_MANAGER` - Customer requests manager
- `MARK_SEEN` - Staff marks events as viewed
- `MARK_AVAILABLE` - Staff marks table as available

### Authentication Architecture

- Magic link authentication via email (no passwords)
- JWT tokens with refresh mechanism
- Permission-based access control (view/edit permissions per company)
- Token invalidation tracking with `last_logout` field
- Middleware authentication for protected routes
- Email service powered by Resend API for magic link delivery

### Database

- PostgreSQL with Sequelize ORM
- Migrations in `src/database/migrations/`
- Environment-based configuration in `src/config/`
- Auto-creates database if not exists (development)

### Routing Structure

**Public Routes:**
- `/` - Landing page with contact form
- `/user/:companyId/:branchId/:tableId` - Customer interface (QR code destination)
- API routes for specific company/branch/table access (no auth required)

**Protected Routes:**
- `/admin/*` - All admin functionality requires authentication
- `/api/*` - Most API routes require authentication (except public customer endpoints)

### Key Files

- `server.js` - Main Express server with route definitions
- `src/App.js` - React router configuration and landing page
- `src/services/auth.js` - Frontend authentication utilities
- `src/services/email.js` - Email service using Resend API for magic links
- `src/routes/auth.js` - Backend authentication endpoints
- `src/middleware/auth.js` - JWT verification middleware

### Development Notes

- Frontend proxy configured to backend (port 3001)
- Environment variables loaded based on NODE_ENV
- CORS enabled for development
- Static file serving for production build
- Comprehensive error handling and logging

### Email Configuration

The system uses Resend API for sending magic link authentication emails:

**Environment Variables:**
- `RESEND_API_KEY` - Resend API key for email delivery
- `EMAIL_FROM` - From email address (defaults to 'onboarding@resend.dev')

**Behavior:**
- In development mode: Emails are logged to console instead of being sent
- In production mode: Emails are sent via Resend API if `RESEND_API_KEY` is configured
- Magic links are valid for 15 minutes
- All tokens are logged to console for testing purposes