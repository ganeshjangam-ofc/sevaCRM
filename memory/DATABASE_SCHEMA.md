# CRM Suite - Database Schema (MongoDB)

## Database: `test_database`

---

## 1. `users` Collection
Stores all users: Admin, Sales Team, and Customers.

| Field          | Type     | Description                              | Required | Index    |
|----------------|----------|------------------------------------------|----------|----------|
| `_id`          | ObjectId | Auto-generated MongoDB ID                | Yes      | Primary  |
| `email`        | String   | User email (lowercase, unique)           | Yes      | Unique   |
| `password_hash`| String   | Bcrypt hashed password                   | Yes      | -        |
| `name`         | String   | Full name                                | Yes      | -        |
| `role`         | String   | `admin` / `sales_team` / `customer`      | Yes      | -        |
| `phone`        | String   | Phone number                             | No       | -        |
| `company`      | String   | Company name                             | No       | -        |
| `gst_number`   | String   | GST Identification Number (GSTIN)        | No       | -        |
| `address`      | String   | Full address                             | No       | -        |
| `profile_notes`| String   | Internal notes about the user            | No       | -        |
| `created_at`   | String   | ISO 8601 timestamp                       | Yes      | -        |
| `updated_at`   | String   | ISO 8601 timestamp                       | Yes      | -        |

**Sample Document:**
```json
{
  "_id": ObjectId("..."),
  "email": "admin@crm.com",
  "password_hash": "$2b$12$...",
  "name": "Admin",
  "role": "admin",
  "phone": "",
  "company": "CRM Corp",
  "gst_number": "",
  "address": "",
  "profile_notes": "",
  "created_at": "2026-04-15T17:42:26.847Z",
  "updated_at": "2026-04-15T17:42:26.847Z"
}
```

---

## 2. `inquiries` Collection
Tracks customer inquiries/leads.

| Field            | Type     | Description                                          | Required | Index   |
|------------------|----------|------------------------------------------------------|----------|---------|
| `_id`            | ObjectId | Auto-generated MongoDB ID                            | Yes      | -       |
| `id`             | String   | UUID - application-level unique ID                   | Yes      | Unique  |
| `title`          | String   | Inquiry title/subject                                | Yes      | -       |
| `description`    | String   | Detailed description                                 | No       | -       |
| `customer_id`    | String   | Reference to `users._id` (customer)                  | No       | -       |
| `customer_name`  | String   | Denormalized customer name                           | No       | -       |
| `customer_email` | String   | Denormalized customer email                          | No       | -       |
| `assigned_to`    | String   | Reference to `users._id` (sales team member)         | No       | -       |
| `assigned_to_name`| String  | Denormalized assignee name                           | No       | -       |
| `status`         | String   | `new` / `in_progress` / `qualified` / `converted` / `closed` | Yes | -  |
| `priority`       | String   | `low` / `medium` / `high`                            | Yes      | -       |
| `source`         | String   | `website` / `phone` / `email` / `walk_in` / `referral` | Yes   | -       |
| `notes`          | String   | Internal notes                                       | No       | -       |
| `created_by`     | String   | Reference to `users._id` (creator)                   | Yes      | -       |
| `created_by_name`| String   | Denormalized creator name                            | Yes      | -       |
| `created_at`     | String   | ISO 8601 timestamp                                   | Yes      | -       |
| `updated_at`     | String   | ISO 8601 timestamp                                   | Yes      | -       |

**Status Flow:** `new` → `in_progress` → `qualified` → `converted` / `closed`

---

## 3. `followups` Collection
Tracks follow-up tasks for the sales team.

| Field            | Type     | Description                                   | Required | Index   |
|------------------|----------|-----------------------------------------------|----------|---------|
| `_id`            | ObjectId | Auto-generated MongoDB ID                     | Yes      | -       |
| `id`             | String   | UUID - application-level unique ID            | Yes      | Unique  |
| `inquiry_id`     | String   | Reference to `inquiries.id`                   | No       | -       |
| `customer_id`    | String   | Reference to `users._id` (customer)           | No       | -       |
| `customer_name`  | String   | Denormalized customer name                    | No       | -       |
| `assigned_to`    | String   | Reference to `users._id` (assignee)           | Yes      | -       |
| `assigned_to_name`| String  | Denormalized assignee name                    | Yes      | -       |
| `type`           | String   | `call` / `email` / `meeting` / `visit`        | Yes      | -       |
| `notes`          | String   | Follow-up notes                               | No       | -       |
| `due_date`       | String   | Date string (YYYY-MM-DD)                      | No       | -       |
| `status`         | String   | `pending` / `completed`                       | Yes      | -       |
| `completed_at`   | String   | ISO 8601 timestamp (set when completed)       | No       | -       |
| `created_at`     | String   | ISO 8601 timestamp                            | Yes      | -       |

---

## 4. `quotations` Collection
Stores quotations/invoices with line items and GST.

| Field            | Type     | Description                                   | Required | Index   |
|------------------|----------|-----------------------------------------------|----------|---------|
| `_id`            | ObjectId | Auto-generated MongoDB ID                     | Yes      | -       |
| `id`             | String   | UUID - application-level unique ID            | Yes      | Unique  |
| `quotation_number`| String  | Auto-generated (QT-00001 format)              | Yes      | -       |
| `customer_id`    | String   | Reference to `users._id`                      | No       | -       |
| `customer_name`  | String   | Customer full name                            | Yes      | -       |
| `customer_email` | String   | Customer email                                | No       | -       |
| `customer_gst`   | String   | Customer GSTIN                                | No       | -       |
| `billing_address`| String   | Billing address                               | No       | -       |
| `items`          | Array    | Array of line item objects (see below)        | Yes      | -       |
| `subtotal`       | Number   | Sum of all item amounts (before GST)          | Yes      | -       |
| `total_gst`      | Number   | Sum of all GST amounts                        | Yes      | -       |
| `total`          | Number   | subtotal + total_gst                          | Yes      | -       |
| `status`         | String   | `draft` / `sent` / `accepted` / `rejected` / `expired` | Yes | -  |
| `valid_until`    | String   | Expiry date string                            | No       | -       |
| `notes`          | String   | Additional notes                              | No       | -       |
| `created_by`     | String   | Reference to `users._id`                      | Yes      | -       |
| `created_by_name`| String   | Creator name                                  | Yes      | -       |
| `created_at`     | String   | ISO 8601 timestamp                            | Yes      | -       |
| `updated_at`     | String   | ISO 8601 timestamp                            | Yes      | -       |

### `items[]` (Embedded Array)
| Field        | Type   | Description                      |
|--------------|--------|----------------------------------|
| `name`       | String | Item/product name                |
| `description`| String | Item description                 |
| `quantity`   | Number | Quantity                         |
| `unit_price` | Number | Price per unit                   |
| `gst_rate`   | Number | GST percentage (e.g., 18)        |
| `amount`     | Number | quantity × unit_price            |
| `gst_amount` | Number | amount × (gst_rate / 100)        |

**Status Flow:** `draft` → `sent` → `accepted` / `rejected` / `expired`

---

## 5. `inventory` Collection
Manages product stock and pricing.

| Field          | Type     | Description                            | Required | Index   |
|----------------|----------|----------------------------------------|----------|---------|
| `_id`          | ObjectId | Auto-generated MongoDB ID              | Yes      | -       |
| `id`           | String   | UUID - application-level unique ID     | Yes      | Unique  |
| `name`         | String   | Product name                           | Yes      | -       |
| `sku`          | String   | Stock Keeping Unit code                | No       | -       |
| `category`     | String   | Product category                       | No       | -       |
| `description`  | String   | Product description                    | No       | -       |
| `quantity`     | Integer  | Current stock level                    | Yes      | -       |
| `unit_price`   | Number   | Price per unit (INR)                   | Yes      | -       |
| `gst_rate`     | Number   | Applicable GST rate (%)                | Yes      | -       |
| `hsn_code`     | String   | HSN/SAC code for GST                   | No       | -       |
| `reorder_level`| Integer  | Minimum stock threshold for alerts     | Yes      | -       |
| `supplier`     | String   | Supplier name                          | No       | -       |
| `created_at`   | String   | ISO 8601 timestamp                     | Yes      | -       |
| `updated_at`   | String   | ISO 8601 timestamp                     | Yes      | -       |

**Alert Rule:** When `quantity <= reorder_level`, item shows as "Low Stock" on dashboard.

---

## 6. `tickets` Collection
Support ticketing system with message threads.

| Field            | Type     | Description                                   | Required | Index   |
|------------------|----------|-----------------------------------------------|----------|---------|
| `_id`            | ObjectId | Auto-generated MongoDB ID                     | Yes      | -       |
| `id`             | String   | UUID - application-level unique ID            | Yes      | Unique  |
| `customer_id`    | String   | Reference to `users._id` (ticket creator)     | Yes      | -       |
| `customer_name`  | String   | Customer name                                 | Yes      | -       |
| `customer_email` | String   | Customer email                                | Yes      | -       |
| `subject`        | String   | Ticket subject                                | Yes      | -       |
| `description`    | String   | Initial ticket description                    | No       | -       |
| `status`         | String   | `open` / `in_progress` / `resolved` / `closed`| Yes     | -       |
| `priority`       | String   | `low` / `medium` / `high`                     | Yes      | -       |
| `assigned_to`    | String   | Reference to `users._id` (support agent)      | No       | -       |
| `assigned_to_name`| String  | Assigned agent name                           | No       | -       |
| `messages`       | Array    | Array of message objects (see below)          | Yes      | -       |
| `created_at`     | String   | ISO 8601 timestamp                            | Yes      | -       |
| `updated_at`     | String   | ISO 8601 timestamp                            | Yes      | -       |

### `messages[]` (Embedded Array)
| Field        | Type   | Description                                   |
|--------------|--------|-----------------------------------------------|
| `id`         | String | UUID for the message                          |
| `sender_id`  | String | Reference to `users._id`                      |
| `sender_name`| String | Sender's name                                 |
| `sender_role`| String | `admin` / `sales_team` / `customer`           |
| `message`    | String | Message content                               |
| `created_at` | String | ISO 8601 timestamp                            |

**Status Flow:** `open` → `in_progress` → `resolved` → `closed`

---

## 7. `gst_rates` Collection
Configurable GST tax rates.

| Field        | Type     | Description                        | Required | Index   |
|--------------|----------|------------------------------------|----------|---------|
| `_id`        | ObjectId | Auto-generated MongoDB ID          | Yes      | -       |
| `id`         | String   | UUID - application-level unique ID | Yes      | Unique  |
| `name`       | String   | Rate label (e.g., "GST 18%")      | Yes      | -       |
| `rate`       | Number   | Tax percentage (e.g., 18)          | Yes      | -       |
| `hsn_code`   | String   | HSN/SAC code                       | No       | -       |
| `description`| String   | Rate description                   | No       | -       |
| `is_active`  | Boolean  | Whether rate is active/selectable  | Yes      | -       |
| `created_at` | String   | ISO 8601 timestamp                 | Yes      | -       |

**Pre-seeded Rates:** 5%, 12%, 18%, 28%

---

## 8. `counters` Collection
Auto-increment counters for quotation numbers.

| Field  | Type   | Description                          |
|--------|--------|--------------------------------------|
| `_id`  | String | Counter name (e.g., `"quotation"`)   |
| `seq`  | Number | Current sequence number              |

Used by `find_one_and_update` with `$inc` for atomic counter increments.

---

## Relationships Diagram

```
users (role: admin/sales_team)
  │
  ├── creates → inquiries (assigned_to → users)
  │                │
  │                └── linked to → followups (assigned_to → users)
  │
  ├── creates → quotations (customer_id → users[customer])
  │                │
  │                └── items[] reference → inventory / gst_rates
  │
  ├── manages → inventory
  │
  └── responds to → tickets.messages[]

users (role: customer)
  │
  ├── referenced by → inquiries.customer_id
  ├── receives → quotations.customer_id
  └── creates → tickets (messages[] thread)
```

## Indexes

| Collection             | Field       | Type   |
|------------------------|-------------|--------|
| `users`                | `email`     | Unique |
| `inquiries`            | `id`        | Unique |
| `followups`            | `id`        | Unique |
| `quotations`           | `id`        | Unique |
| `inventory`            | `id`        | Unique |
| `tickets`              | `id`        | Unique |
| `gst_rates`            | `id`        | Unique |
