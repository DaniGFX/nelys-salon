# Product Requirements Document
## Nely's Salon Web-Based Salon Management System

**Document Status:** Draft  
**Prepared For:** Nely's Salon  
**Primary Platforms:** Responsive web application — Mobile Phone & Desktop Browser  
**Proposed Stack:**  
- **Frontend:** HTML5, Tailwind CSS v4, Vanilla JavaScript  
- **Backend:** PHP  
- **Database:** MySQL  

> **Product Promise:** Nely's Salon helps customers discover services, book appointments online, receive reminders, and manage their bookings — while giving the salon owner and staff one reliable workspace for appointments, customers, inventory, payments, and sales reporting.

---

## 1. Product Overview

Nely's Salon is a beauty and wellness salon with **15 years of trusted operation** in Lagro, Quezon City. The system will convert its current manual booking and daily operating processes into a single web-based workflow that supports both customer self-service and salon administration.

| Detail | Value |
|---|---|
| Salon Name | **Nely's Salon** |
| Motto | **"Your Beauty Is Our Duty"** |
| Location | **BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City** |
| Years in Operation | **15 Years** |
| Operating Hours | Mon – Sun: 9:00 AM – 8:00 PM *(to be confirmed)* |

The visual identity must communicate **trust, warmth, cleanliness, and professional beauty care** — not a generic appointment calendar. The interface should feel premium and modern on both phone and desktop screens.

---

## 2. Goals & Success Measures

### 2.1 Product Goals

1. Allow customers to book salon or home-service appointments from their phone or desktop without calling.
2. Give customers visibility into their booking status, appointment date, payment method, and cancellation options.
3. Give the admin and staff a single source of truth for the appointment calendar and customer records.
4. Reduce missed appointments through automated SMS or email reminders.
5. Track product and supply inventory; alert staff when stock is low.
6. Provide accurate daily, weekly, monthly, and yearly sales summaries.
7. Deliver a maintainable system built with semantic HTML, Tailwind CSS, Vanilla JS (frontend) and PHP + MySQL (backend).

### 2.2 Initial Success Measures

| Measure | Target |
|---|---|
| Booking completion rate | At least 70% of started bookings |
| Customer booking time | Under 3 minutes for a returning customer |
| Reminder coverage | 100% of confirmed bookings receive a scheduled reminder |
| Inventory visibility | All active products have a current stock record |
| Report load time | Sales summaries load within 3 seconds for normal date ranges |

---

## 3. User Roles

### 3.1 Guest / Unregistered Visitor
A visitor can browse the public landing page, view services and prices, and initiate an appointment inquiry. A guest may book without an account if the system is configured to allow it.

### 3.2 Customer (Registered)
An authenticated customer can create and manage a profile, make a booking, select a service location (salon or home service), choose a payment method, receive reminders, view booking history, and cancel an eligible booking.

### 3.3 Admin / Salon Manager
The admin manages services, prices, operating hours, booking statuses, customers, products, stock movements, payments, and reports. The admin can create or edit bookings on behalf of customers.

### 3.4 Staff Member *(Phase 2 - For Future Update)*
Staff can view assigned appointments, update appointment status, record completed services and payments, and view relevant customer details. Staff should not change prices or delete sales records unless explicitly authorized.

---

## 4. Scope

### 4.1 MVP (Phase 1 & 2)

| # | Feature | Description |
|---|---|---|
| 1 | **Landing Page** | Public page with salon identity, services, prices, location, booking CTA, and contact details. |
| 2 | **Customer Sign Up & Login** | Registration with name, mobile number, email, and password. Secure login and logout. |
| 3 | **Online Booking** | Multi-step booking wizard: select service → choose salon/home service → pick date & time → enter customer details → select payment method → confirm. |
| 4 | **Booking Management** | View upcoming bookings, booking status, payment status, and booking reference. |
| 5 | **Cancellation** | Customers can cancel eligible bookings. Admin can cancel any booking with a reason. |
| 6 | **Notification Reminders** | Automated reminders sent 24 hours before the appointment via email or SMS. |
| 7 | **Inventory** | Admin can add products, record stock-in and stock-out movements, and view low-stock alerts. |
| 8 | **Sales Computation** | Compute and display daily, weekly, monthly, and yearly sales totals with service and payment breakdowns. |
| 9 | **Customer Panel** | Personal dashboard with next appointment, booking history, and profile settings. |
| 10 | **Admin Panel** | Admin dashboard with today's metrics, appointment calendar, customer management, services, inventory, sales reports, and settings. |

### 4.2 Later-Phase Scope

- Online payment gateway (GCash API / PayMongo).
- Staff scheduling and commission tracking.
- Customer reviews and ratings.
- Before-and-after photo galleries.
- Multi-branch support.
- Native mobile application.

---

## 5. Service Catalog & Pricing

The initial salon service catalog is shown below. Prices are stored as numeric values in the database, never as formatted text, to ensure accurate sales computation.

| Service | Category | Price (PHP) |
|---|---|---:|
| Brazilian | Hair Services | ₱1,999 |
| Hair Dye | Hair Services | ₱699 |
| Cold Wave | Hair Services | ₱699 |
| Power Dose | Hair Services | ₱499 |
| Bonacure | Hair Services | ₱499 |
| Keratine Treatment | Hair Services | ₱499 |
| Trim | Hair Services | ₱149 |
| Rebonding | Hair Services | **TBC** |
| Footspa | Nail & Foot Care | ₱199 |
| Gel Manicure | Nail & Foot Care | ₱499 |
| Gel Pedicure | Nail & Foot Care | ₱499 |
| Manicure | Nail & Foot Care | ₱149 |
| Pedicure | Nail & Foot Care | ₱149 |

> **Note:** The Rebonding price, duration, and whether Brazilian is a category under Rebonding must be confirmed before implementation.

Service prices can be updated by the admin at any time. **Editing a price must not alter the price recorded in past completed sales.** Each completed sale must retain the exact price charged at the time of service.

---

## 6. Functional Requirements

### 6.1 Public Landing Page

The landing page must include:

- Salon name: **Nely's Salon**
- Motto: **"Your Beauty Is Our Duty"**
- Statement that the salon has served customers for 15 years
- Location: **BLK 42 Lot 59 Ascension Rd, Lagro, Quezon City**
- Primary call-to-action: **Book an Appointment**
- Full service catalog with prices and category grouping
- Distinction between salon visit and home service
- Payment options overview
- Operating hours and contact details
- Login and Sign Up navigation links
- Footer with social and contact info

The page must be fast, readable, and usable without an account.

### 6.2 Authentication & Account Management

**Sign Up fields:**
- Full Name
- Mobile Number (Philippines, `09XXXXXXXXX` format)
- Email Address
- Password (minimum 6 characters, stored as a secure hash — never plain text)
- Terms and Privacy Agreement checkbox

**Login:**
- Accepts mobile number or email + password
- Remember device checkbox
- Forgot password / reset link

**Security requirements:**
- Passwords hashed using bcrypt or equivalent on the PHP backend
- Session-based or token-based authentication
- Server-side role validation — not client-side only
- CSRF protection on all authenticated forms

### 6.3 Booking Flow (Multi-Step Wizard)

```
Step 1 → Select Service
Step 2 → Choose Location: Salon Visit  or  Home Service
Step 3 → Select Date & Available Time Slot
Step 4 → Enter / Confirm Customer Details
         (Name, Mobile, Email, + Home Address if Home Service)
Step 5 → Select Payment Method
         Cash | GCash | Bank Transfer | Other
Step 6 → Review & Confirm
         (Service, Date, Time, Location, Price, Payment Method)
Step 7 → Booking Confirmed
         (Unique Reference Number, Booking Summary, Cancellation Info)
```

**Booking rules:**
- Double booking for the same time slot must be prevented.
- Each booking must have a unique reference number.
- Required booking fields: Customer details, Service, Booked Price (snapshot), Appointment Date & Time, Location Type, Home Address if applicable, Payment Method, Payment Status, Booking Status, timestamps.

### 6.4 Booking Statuses

| Status | Meaning | Allowed Transitions |
|---|---|---|
| Pending | Booking submitted, awaiting confirmation | → Confirmed, Cancelled, Expired |
| Confirmed | Salon accepted the appointment | → In Progress, Completed, Cancelled, No-Show |
| In Progress | Service has started | → Completed |
| Completed | Service delivered, sale finalized | — (corrections via adjustment record) |
| Cancelled | Cancelled by customer or salon | — |
| No-Show | Customer did not appear | — |
| Expired | Booking not confirmed in time | — |

The UI must show who changed the status and when.

### 6.5 Cancellation

- Customer can cancel only **Pending** or **Confirmed** bookings.
- System must display the cancellation policy before the customer confirms.
- Admin can cancel any booking with a required reason.
- Cancellation releases the time slot and updates booking history.
- A cancellation notification is sent to the customer.

> **Policy note:** The specific cutoff period, cancellation fee, and refund rules must be confirmed by the salon owner before implementation. Until confirmed, the system records cancellations without calculating a fee.

### 6.6 Notification & Reminder System

Notification events:
- Booking created
- Booking confirmed
- Booking cancelled
- **Appointment reminder** (default: 24 hours before)
- Appointment marked completed
- Payment status updated

Channels: **Email** and/or **SMS** (depending on available integrations).  
Preference stored per customer (SMS, Email, or Both).  
Cancelled or expired bookings must not receive future reminders.  
Failed delivery attempts must be visible to the admin.

**Reminder content must include:**
- Customer name
- Service name
- Appointment date and time
- Location type (salon address or home-service address)
- Contact instructions

### 6.7 Payment Methods

| Method | Notes |
|---|---|
| Cash | Paid in person at the salon |
| GCash | Send to GCash number *(to be confirmed)* |
| Bank Transfer | Bank account details *(to be confirmed)* |
| Other | Admin-configurable |

**Payment Status values:** Unpaid · Pending Verification · Paid · Partially Paid · Refunded · Payment Failed

The MVP captures the selected payment method at booking. Verification of GCash and bank payments is done manually by the admin. Online payment gateway integration is a later-phase feature.

### 6.8 Customer Panel

| Section | Content |
|---|---|
| Dashboard | Greeting, next appointment card, quick "Book Now" button |
| My Appointments | Upcoming bookings with status, payment status, and cancellation action |
| Booking History | Past completed and cancelled bookings |
| Profile | Editable name, mobile, email, home address, notification preference |

Customers must not see other customers' records, admin-only notes, or internal stock data.

### 6.9 Admin Panel

| Section | Content |
|---|---|
| Dashboard | Today's appointments count, today's revenue, pending confirmations, low-stock alerts |
| Appointments | Calendar or list view, date and status filters, status transitions, walk-in creator |
| Customers | Directory search, customer profile view, booking history |
| Services & Pricing | Catalog CRUD, price editor (protected from altering past sales) |
| Inventory | Product list, stock-in / stock-out movements, reorder threshold alerts |
| Sales Reports | Daily, weekly, monthly, yearly, and custom range filters; breakdowns by service and payment method; CSV export |
| Notifications | Reminder queue, delivery status, failure log |
| Settings | Operating hours, cancellation policy, reminder timing, GCash/bank details |

### 6.10 Inventory

Each product record must include:
- Product Name, Category, SKU or Code
- Supplier *(optional)*
- Unit (piece, bottle, ml, etc.)
- Current Quantity
- Minimum Threshold (for low-stock alert)
- Cost per Unit *(optional)*
- Selling Price *(if sold retail)*
- Active Status, Created At, Updated At

**Stock movements are auditable** — stock is always changed through a movement record (Stock-In, Stock-Out, Damaged/Expired, Returned, Manual Adjustment), never by silent direct editing.

Low-stock items must appear as alerts on the admin dashboard and be filterable in the inventory list.

### 6.11 Sales & Reporting

A sale is created when:
- A booking is marked **Completed** by the admin.
- The admin records a walk-in sale directly.

**Each completed sale must store:**
- Booking reference (if applicable)
- Service name and price charged at time of sale
- Discount amount (if any)
- Net amount
- Payment method and payment status
- Date of completion

**Report views:**
- **Daily**: All completed sales for the selected day
- **Weekly**: Grouped by day for the selected week
- **Monthly**: Grouped by week/day for the selected month
- **Yearly**: Grouped by month for the selected year
- **Custom date range**

**Report metrics per period:**
- Gross Sales
- Discounts & Adjustments
- Net Sales
- Completed Services Count
- Sales by Service
- Sales by Payment Method (Cash, GCash, Bank Transfer)
- Cancelled and No-Show counts

Reports must be exportable as **CSV**.

> Report figures are based on **completion date** for service revenue and **payment date** for payment reconciliation.

---

## 7. UX & Visual Design Direction

### 7.1 Brand Color Palette

| Token | Hex | Recommended Use |
|---|---|---|
| Rich Wine | `#810B38` | Primary buttons, active states, headings, key links, accents |
| Warm Cream | `#F1E2D1` | Main background, soft surfaces, hero sections |
| Champagne Sand | `#DCC3AA` | Cards, borders, secondary surfaces, dividers |
| Deep Maroon | `#541A1A` | Body text, dark navigation, footer, high-contrast elements |

The visual language should be **modern, calm, and premium**. Use generous spacing, rounded cards, strong button contrast, and smooth hover states. The design must feel like a beauty brand — not a generic scheduling app.

**Icon rule: Zero emojis.** Use Font Awesome 6 (Free) or inline SVG icons exclusively.

### 7.2 Typography

- **Display / Heading:** Cormorant Garamond (serif, elegant, salon-appropriate)
- **Body / UI:** Plus Jakarta Sans (clean, legible, modern)
- Both served via Google Fonts with `display=swap` for performance.

### 7.3 Responsive Behavior

| Breakpoint | Layout Strategy |
|---|---|
| Mobile (`< 640px`) | Single-column flow, large touch targets, flat forms (no floating modals), sticky CTAs |
| Tablet (`640px – 1024px`) | Two-column grids where appropriate, readable card layouts |
| Desktop (`> 1024px`) | Split-screen auth pages, sidebar admin nav, multi-column dashboards |

No feature may depend exclusively on hover or a wide screen.

### 7.4 Accessibility

- Semantic HTML5 headings and landmark regions
- Visible keyboard focus states
- WCAG 2.1 AA-oriented color contrast
- All form inputs have associated `<label>` elements
- Clear, specific validation error messages
- Color is never the only indicator of status (use text badges alongside color)

---

## 8. Core Data Model (MySQL)

```
+-------------------+        +-----------------------+
|       users       | 1 -- 1 |   customer_profiles   |
|-------------------|        |-----------------------|
| id (PK)           |        | id (PK)               |
| email (UNIQUE)    |        | user_id (FK)          |
| phone (UNIQUE)    |        | full_name             |
| password_hash     |        | home_address          |
| role (ENUM)       |        | notif_preference      |
| is_active         |        +-----------------------+
| created_at        |
| updated_at        |
+-------------------+
        | 1
        | N
+-------------------+        +-----------------------+
|     bookings      | N -- 1 |       services        |
|-------------------|        |-----------------------|
| id (PK)           |        | id (PK)               |
| reference (UQ)    |        | name                  |
| customer_id (FK)  |        | category              |
| service_id (FK)   |        | price (DECIMAL)       |
| booked_price      |        | duration_minutes      |
| appointment_date  |        | is_active             |
| time_slot         |        | created_at            |
| location_type     |        | updated_at            |
| service_address   |        +-----------------------+
| status (ENUM)     |
| payment_method    |
| payment_status    |
| notes             |
| created_at        |
| updated_at        |
+-------------------+
     |  1        | 1
     |  1        | 1
+----------+  +--------------+    +-----------------+
| payments |  | notifications|    |     sales       |
|----------|  |--------------|    |-----------------|
| id       |  | id           |    | id              |
| book_id  |  | booking_id   |    | booking_id (FK) |
| method   |  | channel      |    | gross_amount    |
| amount   |  | scheduled_at |    | discount_amount |
| status   |  | sent_at      |    | net_amount      |
| ref_no   |  | status       |    | payment_method  |
+----------+  +--------------+    | completed_at    |
                                  +-----------------+

+-------------------+        +-----------------------+
|     products      | 1 -- N |  inventory_movements  |
|-------------------|        |-----------------------|
| id (PK)           |        | id (PK)               |
| name              |        | product_id (FK)       |
| category          |        | movement_type (ENUM)  |
| sku               |        | quantity              |
| unit              |        | reason                |
| current_quantity  |        | created_by (FK->users)|
| min_threshold     |        | created_at            |
| cost_price        |        +-----------------------+
| selling_price     |
| is_active         |
| created_at        |
| updated_at        |
+-------------------+

+-------------------+
|  business_settings|
|-------------------|
| id (PK)           |
| setting_key       |
| setting_value     |
| updated_by (FK)   |
| updated_at        |
+-------------------+

+-------------------+
|    audit_logs     |
|-------------------|
| id (PK)           |
| actor_id (FK)     |
| action            |
| entity            |
| entity_id         |
| old_value (JSON)  |
| new_value (JSON)  |
| created_at        |
+-------------------+
```

---

## 9. Backend Technical Requirements (PHP + MySQL)

- **Language:** PHP 8.1+ (using PDO for database access)
- **Database:** MySQL 8.0+
- **Architecture:** MVC pattern — Models, Views (or JSON API responses), Controllers
- **Authentication:** PHP sessions or JWT tokens
- **Password Security:** `password_hash()` with `PASSWORD_BCRYPT`; never store plain text
- **Input Validation:** Server-side validation on all POST/PUT requests
- **CSRF Protection:** CSRF token on all state-changing forms
- **API Style:** REST JSON API consumed by the Vanilla JS frontend
- **Currency:** All monetary values stored as `DECIMAL(10,2)` in PHP Peso (₱)
- **Timezone:** `Asia/Manila` for all appointment rules, reminders, and reporting
- **Environment Config:** `.env` file for database credentials, mailer API keys, and session secrets

### PHP Folder Structure

```
server/
├── config/
│   ├── database.php        # PDO connection
│   ├── constants.php       # Booking statuses, roles, payment methods
│   └── env.php             # .env loader
│
├── controllers/
│   ├── AuthController.php
│   ├── BookingController.php
│   ├── ServiceController.php
│   ├── InventoryController.php
│   ├── SalesController.php
│   ├── CustomerController.php
│   ├── NotificationController.php
│   └── SettingsController.php
│
├── models/
│   ├── User.php
│   ├── Booking.php
│   ├── Service.php
│   ├── Product.php
│   ├── InventoryMovement.php
│   ├── Sale.php
│   ├── Notification.php
│   └── Setting.php
│
├── middleware/
│   ├── AuthMiddleware.php   # Session/token check
│   ├── RoleMiddleware.php   # Role-based access
│   └── CsrfMiddleware.php   # CSRF token validation
│
├── services/
│   ├── AvailabilityService.php   # Slot conflict checker
│   ├── NotificationService.php   # Email/SMS dispatcher
│   ├── SalesService.php          # Revenue calculations
│   └── InventoryService.php      # Stock ledger logic
│
├── routes/
│   └── api.php             # Route definitions mapping URLs to controllers
│
└── db/
    ├── schema.sql           # CREATE TABLE statements
    ├── seeds.sql            # Seed: 13 services, admin account, default settings
    └── migrations/
        └── 001_initial.sql
```

---

## 10. Security, Privacy & Reliability

- Role-based access control enforced on the **PHP server**, not only in JavaScript
- All authenticated traffic must use **HTTPS** in production
- Password reset tokens must **expire** (recommended: 1 hour) and be **single-use**
- Protection against: SQL injection (PDO prepared statements), XSS, CSRF, broken access control, IDOR
- Customer data limited to what is necessary for booking and operations
- Privacy notice accessible from the landing page footer
- Admin configuration changes, booking status changes, inventory movements, and completed sales must be recorded in the audit log
- Automated database backups configured before production go-live

---

## 11. Non-Functional Requirements

| Requirement | Detail |
|---|---|
| **Responsive** | All pages usable on current mobile and desktop browsers |
| **Performance** | Customer pages usable on typical mobile connection; admin reports load within 3 seconds |
| **Maintainability** | MVC PHP architecture, modular Vanilla JS, documented API contracts |
| **Localization** | Currency in Philippine Peso (₱), timezone in Asia/Manila |
| **Error Handling** | Customer-friendly error messages; technical details logged privately |
| **Data Export** | Admins can export sales reports as CSV without exposing credentials |
| **Consistency** | Booking slot availability checked transactionally to prevent conflicts |

---

## 12. Acceptance Criteria for MVP

### Booking
- A customer can complete the full booking wizard (service → location → date → details → payment → confirm).
- The system rejects conflicting time slots.
- A confirmed booking receives a unique reference number visible to both customer and admin.
- The price recorded at booking matches the price in the service catalog at that time.

### Cancellation
- A customer can only cancel a Pending or Confirmed booking.
- The system shows the cancellation policy before the customer confirms.
- The admin can cancel any booking with a required reason.
- A cancellation notification is generated and the slot is released.

### Administration
- Admin can confirm, reschedule, cancel, complete, and mark a booking as No-Show.
- Admin can edit a service price without altering previously completed sales.
- Admin can search customers and filter bookings by status and date.

### Notifications
- A confirmed booking creates a reminder scheduled 24 hours before the appointment.
- Cancelled or expired bookings do not receive future reminders.
- Failed notifications are visible to the admin with an error status.

### Inventory & Reporting
- Admin can add a product, record stock-in, record stock usage (stock-out), and view movement history.
- Low-stock products appear as alerts in the dashboard and inventory list.
- Daily, weekly, monthly, and yearly sales totals are computed accurately.
- Completed sales are unaffected by subsequent service price changes.

### Responsive & Accessible UI
- The booking flow is usable on a phone without horizontal scrolling.
- The admin panel is usable on desktop and remains functional on smaller viewports.
- All forms have visible labels, keyboard focus states, validation messages, and status feedback.

---

## 13. Delivery Phases

### Phase 0 — Design & Business Rules Confirmation
- Confirm Rebonding price, service durations, home-service availability, cancellation policy, payment GCash number, bank account details, operating hours, and notification channels.
- Obtain approved logo, salon photos, contact number, email, and social media links.

### Phase 1 — Foundation & Public Experience
- Project setup, Tailwind CSS pipeline, design token system, PHP MVC skeleton, MySQL schema and seeds.
- Public landing page, authentication (sign up, login, logout, password reset).

### Phase 2 — Booking Operations
- Booking wizard, availability engine, conflict prevention, booking confirmation.
- Cancellation flow, payment method capture, booking notifications.
- Customer panel (dashboard, appointments, history, profile).

### Phase 3 — Admin Workspace & Operations
- Admin dashboard with KPIs.
- Appointment calendar with status transitions.
- Customer directory, service catalog management.

### Phase 4 — Inventory, Sales & Reports
- Inventory ledger with audited stock movements and low-stock alerts.
- Sales computation: daily, weekly, monthly, yearly, and custom date range.
- CSV export, payment status review.

### Phase 5 — Notifications, Settings & Hardening
- Notification reminder scheduler (cron job via PHP or server task).
- Admin settings panel (hours, cancellation cutoff, payment configuration).
- Responsive testing, accessibility audit, security review, data integrity testing.
- Backup setup, staff training, production deployment.

---

## 14. Open Decisions

| # | Decision Required |
|---|---|
| 1 | Exact price, duration, and description of Rebonding service |
| 2 | Is "Brazilian" a standalone service or a Rebonding option? |
| 3 | Which services are available for home service? |
| 4 | What are the exact operating hours, holidays, and maximum simultaneous appointments? |
| 5 | What is the cancellation cutoff period, fee (if any), and refund rule? |
| 6 | What is the GCash number and bank account for payment verification? |
| 7 | Which notification channels are available: Email, SMS, or both? |
| 8 | Can customers book more than one service in a single appointment? |
| 9 | Will staff members have their own accounts? |
| 10 | Which products must be tracked in inventory? |
| 11 | What is the customer data retention and deletion policy? |

---

## 15. Recommended Navigation Structure

### Public Navigation
- Home
- Services & Pricing
- About Nely's Salon
- Location & Contact
- Book an Appointment
- Login
- Sign Up

### Customer Navigation
- Dashboard
- Book Appointment
- My Appointments
- Booking History
- Profile & Preferences
- Logout

### Admin Navigation
- Dashboard
- Appointments / Calendar
- Customers
- Services & Pricing
- Inventory
- Sales Reports
- Notifications
- Settings
- Logout

---

*This PRD is intended to align the salon owner, designer, and developer before implementation begins. It should be revised once the open decisions in Section 14 are confirmed by the salon owner.*
