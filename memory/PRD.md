# CRM Suite - Product Requirements Document

## Original Problem Statement
Build CRM system for inquiry handling, follow-up system for sales team, quotation, inventory management, customer registration, customer profiling, customer account, GST management, help center for customer.

## Architecture
- **Backend**: FastAPI + MongoDB (motor async driver)
- **Frontend**: React 19 + Shadcn UI + Tailwind CSS
- **Auth**: JWT Bearer tokens + httpOnly cookies
- **PDF**: ReportLab for quotation PDF generation
- **Database**: MongoDB collections - users, inquiries, followups, quotations, inventory, tickets, gst_rates, counters

## User Personas
1. **Admin** - Full system access, user management, GST configuration, analytics
2. **Sales Team** - Customer management, inquiry handling, follow-ups, quotations, inventory
3. **Customer** - Self-service portal, ticket support, view quotations

## Core Requirements (Static)
- JWT authentication with 3 roles (admin, sales_team, customer)
- Customer registration, profiling, account management
- Inquiry handling with assignment and status tracking
- Sales follow-up system with due dates and status
- Quotation generator with line items, GST calculation, PDF export
- Inventory management with stock levels and reorder alerts
- Support ticketing system with message threads
- GST rate management (CRUD with HSN codes)
- Role-based dashboard with analytics
- Help center for customers

## What's Been Implemented (April 15, 2026)
- [x] JWT auth with admin seeding
- [x] Role-based routing and access control
- [x] Admin dashboard with 8 stat cards + recent activity
- [x] Customer dashboard with ticket/quotation overview
- [x] Customer CRUD (search, profile view)
- [x] Inquiry management (create, assign, status tracking, priority, source)
- [x] Follow-up system (create, mark complete, due dates, calendar picker)
- [x] Quotation system (line items, GST calc, PDF generation, status management)
- [x] Inventory management (CRUD, stock alerts, search)
- [x] Support tickets (create, message thread, status updates)
- [x] GST rate management (pre-seeded 5/12/18/28%, CRUD)
- [x] User management (admin only - create users with roles)
- [x] Help center (customer-facing ticket system)
- [x] Collapsible sidebar navigation with role-based menu items
- [x] Professional Swiss + High-Contrast design (Klein Blue, Outfit/Figtree fonts)

## Prioritized Backlog
### P0 (Critical) - Done
- All core CRM features implemented

### P1 (High)
- AI-powered follow-up suggestions
- Email/SMS notifications for follow-ups
- Stripe payment integration for quotations
- Customer profile editing page

### P2 (Medium)
- AI Chatbot for help center
- Advanced analytics with charts (monthly trends)
- Quotation PDF customization (company logo, terms)
- Inventory import/export (CSV)
- Bulk operations (assign multiple inquiries)

### P3 (Nice to have)
- Dark mode toggle
- Calendar view for follow-ups
- Customer activity timeline
- Export reports to PDF/Excel
- Mobile responsive optimization

## Next Tasks
1. AI-powered follow-up suggestions using LLM
2. Email/SMS notifications for follow-up reminders
3. Stripe payment integration
4. Advanced dashboard charts
5. Customer profile editing page
