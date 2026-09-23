# File & Folder Structure Plan
## Nely's Salon — Web-Based Salon Management System

**Stack:** HTML5 · Tailwind CSS v4 · Vanilla JavaScript (Frontend) · PHP 8.1+ · MySQL 8.0 (Backend)
**Devices:** Mobile Phone & Desktop Browser
**Last Updated:** 2026-09-23

---

## Overview

The system is split into two clear layers:

| Layer | Root Folder | Purpose |
|---|---|---|
| **Frontend** | Root HTML files | All browser-facing HTML pages, CSS, and JS |
| **Backend** | `server/` | PHP controllers, models, routes, services, middleware |
| **Database** | `server/db/` | SQL schema, seed data, migrations |
| **Documentation** | `docs/` | PRD, structure plan, API reference |
| **Config/Build** | Root | Tailwind build, `.env`, `package.json`, `.gitignore` |

---

## Full Directory Tree

```
nelys-salon/
│
├── index.html                           # Public landing page
├── login.html                           # Authentication — login form
├── signup.html                          # Authentication — sign-up form
├── forgot-password.html                 # Forgot / reset password page
│
├── customer/                            # Customer panel pages (logged-in customers)
│   ├── dashboard.html                   # Customer dashboard (next appt, quick book)
│   ├── booking.html                     # Multi-step booking wizard (customer panel)
│   ├── appointments.html                # Upcoming appointments list
│   ├── notifications.html               # Customer notifications, reminders & updates
│   ├── services.html                    # Browse services, prices, search & quick book
│   ├── history.html                     # Past bookings & cancelled bookings
│   ├── profile.html                     # Edit name, mobile, email, address, notif prefs
│   └── cancel-booking.html              # Booking cancellation confirmation page
│
├── admin/                               # Admin panel pages (authenticated admin only)
│   ├── dashboard.html                   # KPI tiles: today's revenue, appointments, alerts
│   ├── appointments.html                # Booking calendar / list with status controls
│   ├── appointments-view.html           # Single appointment detail & status editor
│   ├── customers.html                   # Customer directory & search
│   ├── customer-view.html               # Individual customer profile + booking history
│   ├── services.html                    # Service catalog: add, edit, toggle active
│   ├── inventory.html                   # Product list with stock levels, low-stock alerts
│   ├── inventory-movement.html          # Record stock-in / stock-out / adjustments
│   ├── sales.html                       # Sales reports: daily / weekly / monthly / yearly
│   ├── notifications.html               # Reminder queue, delivery status, failure log
│   └── settings.html                    # Operating hours, cancellation policy, payment info
│
├── assets/                              # All static frontend assets
│   │
│   ├── css/
│   │   ├── input.css                    # Tailwind CSS source (directives & custom layers)
│   │   └── output.css                   # Compiled Tailwind CSS (generated — do not edit)
│   │
│   ├── js/
│   │   ├── app.js                       # Shared utilities & global init
│   │   │
│   │   ├── modules/                     # Reusable Vanilla JS modules
│   │   │   ├── api.js                   # Fetch wrapper: base URL, headers, error handling
│   │   │   ├── auth.js                  # Login, logout, session check, role redirect
│   │   │   ├── toast.js                 # Toast notification component
│   │   │   ├── modal.js                 # Generic modal open/close/confirm helpers
│   │   │   ├── validation.js            # Form validation rules (phone, email, required)
│   │   │   └── formatter.js             # Currency (₱), date, time formatting helpers
│   │   │
│   │   └── pages/                       # Page-specific JS (loaded per page)
│   │       ├── landing.js               # Hero animation, service card interactions
│   │       ├── login.js                 # Login form submit, "remember device"
│   │       ├── signup.js                # Sign-up form submit, real-time validation
│   │       ├── booking.js               # Multi-step wizard logic, slot availability fetch
│   │       ├── forgot-password.js       # Reset flow (request token, set new password)
│   │       │
│   │       ├── customer/
│   │       │   ├── dashboard.js         # Load next appointment, quick actions
│   │       │   ├── appointments.js      # Fetch & display upcoming bookings
│   │       │   ├── notifications.js     # Filter categories, mark read, notification modals
│   │       │   ├── services.js          # Search catalog, category filter & modal details
│   │       │   ├── history.js           # Fetch & display past bookings
│   │       │   ├── profile.js           # Load & submit profile edit form
│   │       │   └── cancel-booking.js    # Cancellation policy display & confirm submit
│   │       │
│   │       └── admin/
│   │           ├── dashboard.js         # KPI fetch, low-stock alert render
│   │           ├── appointments.js      # Calendar / list, status change, filters
│   │           ├── customers.js         # Directory search, pagination
│   │           ├── services.js          # CRUD form for service catalog
│   │           ├── inventory.js         # Product list, stock level indicators
│   │           ├── inventory-movement.js# Stock movement form & history table
│   │           ├── sales.js             # Report period selector, chart, CSV export
│   │           ├── notifications.js     # Reminder queue display, resend action
│   │           └── settings.js          # Settings form save & confirmation
│
│   └── images/                          # All image assets
│       ├── logo.svg                     # Nely's Salon logo (SVG preferred)
│       ├── logo-white.svg               # White variant for dark backgrounds
│       ├── hero-bg.jpg                  # Landing page hero background
│       ├── hero-woman.jpg               # Landing page hero foreground model
│       ├── og-image.jpg                 # Open Graph / social share image (1200x630)
│       └── team/                        # Stylist / staff profile photos
│           ├── director.jpg
│           ├── sculptor.jpg
│           └── spa-specialist.jpg
│
├── components/                          # Reusable HTML component snippets (loaded via JS)
│   ├── navbar.html                      # Public top navigation bar
│   ├── footer.html                      # Public footer with address + social links
│   ├── admin-sidebar.html               # Admin panel sidebar navigation
│   ├── admin-topbar.html                # Admin panel top bar (user info, logout)
│   ├── customer-navbar.html             # Customer panel navigation
│   └── booking-wizard.html              # Booking form step fragments
│
├── server/                              # PHP backend (MVC architecture)
│   │
│   ├── config/
│   │   ├── database.php                 # PDO connection factory
│   │   ├── constants.php                # Booking statuses, roles, payment methods
│   │   └── env.php                      # .env file loader (for DB credentials, keys)
│   │
│   ├── routes/
│   │   └── api.php                      # Route table: URL to Controller method mapping
│   │
│   ├── controllers/
│   │   ├── AuthController.php           # Register, login, logout, password reset
│   │   ├── BookingController.php        # Create, confirm, cancel, status update
│   │   ├── ServiceController.php        # CRUD for service catalog
│   │   ├── AvailabilityController.php   # Fetch available time slots by date
│   │   ├── CustomerController.php       # Customer profile, directory (admin)
│   │   ├── InventoryController.php      # Products, stock movements, alerts
│   │   ├── SalesController.php          # Report queries (daily/weekly/monthly/yearly)
│   │   ├── NotificationController.php   # Reminder queue, delivery log
│   │   └── SettingsController.php       # Business settings read/write
│   │
│   ├── models/
│   │   ├── User.php                     # users table queries
│   │   ├── CustomerProfile.php          # customer_profiles table queries
│   │   ├── Booking.php                  # bookings table queries
│   │   ├── Service.php                  # services table queries
│   │   ├── Product.php                  # products table queries
│   │   ├── InventoryMovement.php        # inventory_movements table queries
│   │   ├── Sale.php                     # sales table queries
│   │   ├── Notification.php             # notifications table queries
│   │   ├── Payment.php                  # payments table queries
│   │   └── Setting.php                  # business_settings table queries
│   │
│   ├── middleware/
│   │   ├── AuthMiddleware.php           # Validate session / JWT; reject unauthenticated
│   │   ├── RoleMiddleware.php           # Enforce role: admin | customer
│   │   └── CsrfMiddleware.php           # CSRF token generation and validation
│   │
│   ├── services/
│   │   ├── AvailabilityService.php      # Time-slot conflict checking logic
│   │   ├── NotificationService.php      # Email / SMS dispatch (Mailer integration)
│   │   ├── SalesService.php             # Revenue aggregation calculations
│   │   ├── InventoryService.php         # Stock ledger, low-stock detection
│   │   └── BookingReferenceService.php  # Unique booking reference generator
│   │
│   ├── helpers/
│   │   ├── Response.php                 # Standard JSON response builder (success/error)
│   │   ├── Validator.php                # Server-side input validation rules
│   │   ├── Sanitizer.php                # Input sanitization before DB operations
│   │   └── DateHelper.php              # Asia/Manila timezone conversions
│   │
│   └── db/
│       ├── schema.sql                   # Full CREATE TABLE statements (all tables)
│       ├── seeds.sql                    # Seed: 13 services, default admin user, settings
│       └── migrations/
│           ├── 001_initial_schema.sql   # Initial tables (users, bookings, services)
│           ├── 002_inventory.sql        # Products and inventory_movements tables
│           ├── 003_notifications.sql    # Notifications and audit_logs tables
│           └── 004_settings.sql         # business_settings table
│
├── docs/                                # Project documentation
│   ├── PRD.md                           # Product Requirements Document
│   ├── FILE_STRUCTURE_PLAN.md           # This document
│   ├── API_REFERENCE.md                 # REST API endpoints (to be written)
│   └── DB_SCHEMA.md                     # Data model reference (to be written)
│
├── .env                                 # Environment variables (NOT committed to Git)
├── .env.example                         # Template for .env (committed to Git)
├── .gitignore                           # Excludes .env, node_modules, output.css
├── package.json                         # npm: Tailwind CSS build scripts
├── package-lock.json                    # npm lockfile
└── README.md                            # Project setup and developer guide
```

---

## Layer-by-Layer Breakdown

### 1. Public HTML Pages (Root Level)

These are the pages accessible before login. Served statically.

| File | Role | Auth Required |
|---|---|---|
| `index.html` | Landing page with services, CTA, about, location | None |
| `login.html` | Customer & admin login form | None |
| `signup.html` | Customer registration form | None |
| `booking.html` | Booking wizard (guest or logged-in) | Optional |
| `forgot-password.html` | Password reset request + token form | None |

---

### 2. Customer Panel (`customer/`)

Protected. Only accessible to authenticated users with `role = customer`.
The JS on each page checks the session and redirects to `login.html` if unauthenticated.

| File | Description |
|---|---|
| `dashboard.html` | Welcome greeting, next appointment card, Book Now CTA |
| `appointments.html` | Upcoming confirmed or pending bookings with cancel option |
| `history.html` | Completed, cancelled, no-show bookings |
| `profile.html` | Edit personal info and notification preferences |
| `cancel-booking.html` | Policy display then cancellation confirmation |

---

### 3. Admin Panel (`admin/`)

Protected. Only accessible to users with `role = admin`.
A role check on page load redirects unauthorized users to `login.html`.

| File | Description |
|---|---|
| `dashboard.html` | KPI tiles: today's appts, revenue, pending count, low stock |
| `appointments.html` | Calendar / list view with date/status filters and bulk actions |
| `appointments-view.html` | Single booking detail, status transitions, notes |
| `customers.html` | Searchable customer directory with pagination |
| `customer-view.html` | Full customer profile with linked booking history |
| `services.html` | Add / edit / deactivate salon services and prices |
| `inventory.html` | Product list with current stock and low-stock indicators |
| `inventory-movement.html` | Record stock-in, stock-out, damaged, adjustment movements |
| `sales.html` | Report dashboard with period selector and CSV export |
| `notifications.html` | Reminder queue, delivery status, resend / retry action |
| `settings.html` | Hours, cancellation policy, GCash number, bank details |

---

### 4. Frontend Assets (`assets/`)

#### CSS
- `assets/css/input.css` — Tailwind source file. All custom design tokens and component overrides go here.
- `assets/css/output.css` — Compiled output. Generated by the build command. **Never edit this file manually.**

#### JavaScript — Modules (`assets/js/modules/`)

Shared utilities imported by page scripts.

| Module | Responsibility |
|---|---|
| `api.js` | `fetchAPI(endpoint, options)` — sets base URL, handles auth headers, parses JSON, throws on HTTP error |
| `auth.js` | `login()`, `logout()`, `getCurrentUser()`, `requireAuth(role)` — reads session from localStorage or cookie |
| `toast.js` | `showToast(message, type)` — renders success/error/info toast using Font Awesome icons |
| `modal.js` | `openModal(id)`, `closeModal(id)`, `confirmModal(message)` — accessible modal helpers |
| `validation.js` | `validatePhone(v)`, `validateEmail(v)`, `validateRequired(v)`, `validatePasswordStrength(v)` |
| `formatter.js` | `toPeso(amount)`, `toDatePH(date)`, `toTimePH(time)` — localized formatting for display |

#### JavaScript — Pages (`assets/js/pages/`)

Each page script handles only its own page's logic.

- **Landing:** Hero animations, service tab switching, back-to-top.
- **Login / Signup / Forgot Password:** Form submission, validation display, redirect on success.
- **Booking:** Step navigator, real-time slot availability fetch, review summary render.
- **Customer pages:** API calls to load personal data; cancellation confirm flow.
- **Admin pages:** Table renders, status change dropdowns, chart rendering (sales), CSV download trigger.

---

### 5. PHP Backend (`server/`)

#### Config (`server/config/`)

| File | Purpose |
|---|---|
| `env.php` | Reads `.env` file keys into `$_ENV`. Must be the first file included. |
| `database.php` | Returns a singleton PDO connection. Sets `ERRMODE_EXCEPTION`, charset utf8mb4, `Asia/Manila` timezone. |
| `constants.php` | PHP constants: `BOOKING_STATUS_*`, `ROLE_*`, `PAYMENT_METHOD_*`, `NOTIF_CHANNEL_*` |

#### Routes (`server/routes/api.php`)

Maps HTTP method + path to a controller method. Summary:

| Method | Route | Controller | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | AuthController::login | None |
| POST | `/api/auth/register` | AuthController::register | None |
| POST | `/api/auth/logout` | AuthController::logout | Any |
| POST | `/api/auth/forgot-password` | AuthController::forgotPassword | None |
| GET | `/api/services` | ServiceController::index | None |
| POST | `/api/services` | ServiceController::store | Admin |
| PUT | `/api/services/{id}` | ServiceController::update | Admin |
| DELETE | `/api/services/{id}` | ServiceController::destroy | Admin |
| GET | `/api/availability` | AvailabilityController::index | None |
| POST | `/api/bookings` | BookingController::store | Customer |
| GET | `/api/bookings` | BookingController::index | Admin |
| GET | `/api/bookings/my` | BookingController::myBookings | Customer |
| GET | `/api/bookings/{id}` | BookingController::show | Any |
| PUT | `/api/bookings/{id}/status` | BookingController::updateStatus | Admin |
| POST | `/api/bookings/{id}/cancel` | BookingController::cancel | Customer/Admin |
| GET | `/api/customers` | CustomerController::index | Admin |
| GET | `/api/customers/{id}` | CustomerController::show | Admin |
| PUT | `/api/customers/profile` | CustomerController::updateProfile | Customer |
| GET | `/api/inventory` | InventoryController::index | Admin |
| POST | `/api/inventory` | InventoryController::store | Admin |
| POST | `/api/inventory/movement` | InventoryController::movement | Admin |
| GET | `/api/sales/report` | SalesController::report | Admin |
| GET | `/api/sales/export` | SalesController::export | Admin |
| GET | `/api/notifications` | NotificationController::index | Admin |
| POST | `/api/notifications/{id}/resend` | NotificationController::resend | Admin |
| GET | `/api/settings` | SettingsController::index | Admin |
| PUT | `/api/settings` | SettingsController::update | Admin |

#### Controllers (`server/controllers/`)

Each controller method:
1. Runs through middleware (Auth, Role, CSRF).
2. Validates and sanitizes input.
3. Delegates business logic to a Service or Model.
4. Returns a standardized JSON response.

#### Models (`server/models/`)

Each model holds only data-access methods (PDO queries). No business logic in models.

| Model | Key Methods |
|---|---|
| `User.php` | `findByEmail`, `findByPhone`, `create`, `updatePassword` |
| `Booking.php` | `create`, `findById`, `findByCustomer`, `updateStatus`, `checkConflict` |
| `Service.php` | `all`, `findById`, `create`, `update`, `toggleActive` |
| `Product.php` | `all`, `findById`, `create`, `update`, `findLowStock` |
| `InventoryMovement.php` | `create`, `findByProduct`, `applyToStock` |
| `Sale.php` | `createFromBooking`, `sumByPeriod`, `breakdownByService` |
| `Notification.php` | `createReminder`, `markSent`, `markFailed`, `findPending` |
| `Setting.php` | `get(key)`, `set(key, value)`, `all` |

#### Services (`server/services/`)

| Service | Key Methods |
|---|---|
| `AvailabilityService.php` | `getAvailableSlots(date, serviceId)` — checks bookings, hours, max concurrent |
| `NotificationService.php` | `sendEmail(to, template, data)`, `sendSMS(to, message)`, `scheduleReminder(bookingId)` |
| `SalesService.php` | `getReport(period, startDate, endDate)`, `getDailySummary(date)` |
| `InventoryService.php` | `recordMovement(productId, type, qty, reason)`, `getLowStockAlerts()` |
| `BookingReferenceService.php` | `generate()` — produces unique `NS-YYYYMMDD-XXXX` reference |

#### Helpers (`server/helpers/`)

| Helper | Purpose |
|---|---|
| `Response.php` | `json(data, status=200)`, `error(message, status=400)`, `unauthorized()`, `forbidden()` |
| `Validator.php` | `required`, `email`, `phone`, `min`, `max`, `in`, `dateFormat` validation rules |
| `Sanitizer.php` | `trim`, `stripTags`, `escapeHtml` for all user-supplied strings |
| `DateHelper.php` | Converts UTC to Asia/Manila, formats for display, computes appointment cutoff times |

#### Middleware (`server/middleware/`)

| Middleware | Behavior |
|---|---|
| `AuthMiddleware.php` | Reads session or Bearer token. Returns `401` if missing or expired. |
| `RoleMiddleware.php` | Accepts required role; returns `403` if user's role does not match. |
| `CsrfMiddleware.php` | On `GET`: generates and stores a CSRF token. On `POST/PUT/DELETE`: validates token. |

---

### 6. Database (`server/db/`)

#### Tables

| Table | Purpose |
|---|---|
| `users` | Authentication: email, phone, password hash, role |
| `customer_profiles` | Extended info: name, home address, notification preference |
| `services` | Service catalog: name, category, price, duration, active |
| `bookings` | Core booking record: all details, status, payment method |
| `payments` | Payment records linked to bookings |
| `notifications` | Reminder and status notification queue + delivery log |
| `sales` | Completed service transactions with price snapshot |
| `products` | Inventory product catalog |
| `inventory_movements` | Audited stock movement log |
| `business_settings` | Key/value store for configurable salon settings |
| `audit_logs` | Change history for bookings, payments, prices, and settings |

#### File Descriptions

| File | Description |
|---|---|
| `schema.sql` | Full `CREATE TABLE IF NOT EXISTS` definitions for all tables |
| `seeds.sql` | Inserts: 13 default services, 1 admin user, default settings |
| `migrations/001_initial_schema.sql` | Tables: users, customer_profiles, services, bookings, payments |
| `migrations/002_inventory.sql` | Tables: products, inventory_movements |
| `migrations/003_notifications.sql` | Tables: notifications, audit_logs |
| `migrations/004_settings.sql` | Table: business_settings |

---

### 7. Documentation (`docs/`)

| File | Status | Purpose |
|---|---|---|
| `PRD.md` | Done | Full product requirements document |
| `FILE_STRUCTURE_PLAN.md` | Done | All files, folders, and their roles |
| `API_REFERENCE.md` | To Do | Endpoint list, request/response schemas, error codes |
| `DB_SCHEMA.md` | To Do | Full data model with column types, constraints, indexes |

---

### 8. Root Config Files

| File | Purpose |
|---|---|
| `.env` | DB host/user/pass, mailer API key, session secret. Never committed. |
| `.env.example` | Safe template showing all required keys with empty values. Committed. |
| `.gitignore` | Ignores `.env`, `node_modules/`, `output.css` |
| `package.json` | Tailwind CSS v4 build scripts (`npm run build`, `npm run watch`) |
| `README.md` | Local setup guide, environment setup, DB import steps |

---

## Build Commands

```bash
# Install frontend dependencies
npm install

# Build Tailwind CSS once
npm run build

# Watch for changes during development
npm run watch
```

---

## Implementation Order

```
Phase 0  — Project Setup & Schema
  Create full folder structure
  Import schema.sql into MySQL
  Run seeds.sql
  Configure .env
  Verify PDO connection

Phase 1  — Auth System (Foundation for everything else)
  server/config/ (env, db, constants)
  server/helpers/ (Response, Validator, Sanitizer)
  server/middleware/ (Auth, Role, CSRF)
  User.php + AuthController.php
  server/routes/api.php (auth routes only)
  login.html + assets/js/pages/login.js
  signup.html + assets/js/pages/signup.js

Phase 2  — Landing Page & Public Surface
  index.html (already built)
  assets/js/pages/landing.js
  Service.php + ServiceController.php (GET only)
  components/navbar.html, footer.html

Phase 3  — Booking System
  booking.html + assets/js/pages/booking.js
  AvailabilityService.php + AvailabilityController.php
  Booking.php + BookingController.php
  BookingReferenceService.php
  NotificationService.php (booking created trigger)

Phase 4  — Customer Panel
  customer/dashboard.html + dashboard.js             [COMPLETED]
  customer/booking.html + booking.js                 [COMPLETED]
  customer/appointments.html + appointments.js       [COMPLETED]
  customer/notifications.html + notifications.js     [COMPLETED]
  customer/services.html + services.js               [COMPLETED]
  customer/profile.html + profile.js                 [COMPLETED]
  customer/history.html + history.js
  customer/cancel-booking.html + cancel-booking.js

Phase 5  — Admin Panel — Bookings & Customers
  admin/dashboard.html + dashboard.js
  admin/appointments.html + appointments.js
  admin/appointments-view.html
  admin/customers.html + customers.js
  admin/customer-view.html

Phase 6  — Services Management (Admin)
  admin/services.html + services.js
  ServiceController.php (POST, PUT, DELETE)

Phase 7  — Inventory
  Product.php + InventoryMovement.php
  InventoryController.php + InventoryService.php
  admin/inventory.html + inventory.js
  admin/inventory-movement.html + inventory-movement.js

Phase 8  — Sales & Reports
  Sale.php + SalesController.php + SalesService.php
  admin/sales.html + sales.js (with CSV export)

Phase 9  — Notifications & Reminders
  Notification.php + NotificationController.php
  NotificationService.php (email/SMS dispatch)
  Cron job / scheduler setup
  admin/notifications.html + notifications.js

Phase 10 — Settings, Hardening & Launch
  Setting.php + SettingsController.php
  admin/settings.html + settings.js
  Security audit (CSRF, IDOR, SQL injection review)
  Responsive testing on mobile
  Accessibility check
  Production deployment + DB backup setup
```

---

## Naming Conventions

| Element | Convention | Example |
|---|---|---|
| PHP Files | PascalCase | `BookingController.php` |
| PHP Classes | PascalCase | `class BookingController` |
| PHP Methods | camelCase | `public function updateStatus()` |
| JS Modules | camelCase | `fetchAPI()`, `showToast()` |
| JS Files | kebab-case | `cancel-booking.js` |
| HTML Files | kebab-case | `cancel-booking.html` |
| CSS Classes | Tailwind utilities + custom BEM-lite | `btn-primary`, `card-service` |
| DB Tables | snake_case, plural | `inventory_movements` |
| DB Columns | snake_case | `payment_status`, `created_at` |
| API Routes | kebab-case, resource-first | `/api/bookings/{id}/cancel` |
| Constants | SCREAMING_SNAKE_CASE | `BOOKING_STATUS_CONFIRMED` |

---

*All folder and file names are final unless a structural change is approved by the team.
Refer to `PRD.md` for business rules that drive these decisions.*
