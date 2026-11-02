# Teacher Login & Student Database Management System

A minimal, professional, and secure full-stack Student Database Management System built with **React + Vite** and **Supabase PostgreSQL & Auth**. Designed for a 10-mark college DBMS practical examination.

---

## 1. Project Overview

This application provides a secure portal for teachers to manage student records:
- **Teacher Authentication:** Authenticates teachers using Supabase managed `auth.users` via teacher ID (e.g., `T001`) mapped to a configurable institutional email domain.
- **Row Level Security (RLS):** Enforces strict database-level data isolation where each teacher can only query, insert, update, and delete their own students.
- **Full CRUD:** Create, Read, Search, Update, and Delete operations executed directly against Supabase PostgreSQL (no mock data or local storage).
- **Minimal Interface:** Clean black-and-white theme using plain CSS, responsive layout, clear error feedback, and loading states.

---

## 2. Technology Stack

- **Frontend:** React 19 + Vite 8 (Port 7000)
- **Backend:** Standalone Java 25 REST Server (`Server.java` on Port 8080)
- **Styling:** Plain CSS (Minimal Black & White Theme, Botanical ASCII Art)
- **Database:** Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication:** Supabase Auth (`auth.users`)
- **Package Manager:** npm
- **Java Requirements:** JDK 11 or higher (Tested on Java 25 LTS, zero external build tools required)

---

## 3. Java Backend (`Server.java`)

A complete, self-contained single-file Java backend server with **zero external dependencies**:
- **Start Command:** `java Server.java`
- **Default Port:** `8080`
- **Endpoints:**
  - `GET /api/health` — Server health status
  - `POST /api/auth/login` — Teacher authentication and JWT issuance
  - `GET /api/students` — Fetch students (supports `?search=<reg_no>` filtering)
  - `POST /api/students` — Validate and create student record
  - `PUT /api/students/{id}` — Edit and update existing student
  - `DELETE /api/students/{id}` — Delete student by primary key
- **Features:** Auto-loads `.env`, handles CORS, validates payloads, enforces PostgreSQL constraints, and outputs terminal logs.

---

## 3. Database Architecture & Schema

The system uses exactly two logical entities:
1. `auth.users` (Supabase-managed authentication table)
2. `public.students` (Custom student records table)

### Table Schema (`public.students`)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `BIGINT` | `IDENTITY PRIMARY KEY` | Auto-incrementing unique identifier |
| `register_no` | `TEXT` | `NOT NULL` | Student Register Number (e.g. `2024CS101`) |
| `name` | `TEXT` | `NOT NULL` | Full Name of student |
| `department` | `TEXT` | `NOT NULL` | Academic department |
| `year` | `INTEGER` | `NOT NULL CHECK (year >= 1 AND year <= 4)` | Year of study (1 to 4) |
| `email` | `TEXT` | `NOT NULL` | Student contact email |
| `teacher_id` | `UUID` | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Foreign key referencing authenticated teacher |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | Record creation timestamp |

### Constraints & Indexes
- **Unique Constraint:** `UNIQUE (teacher_id, register_no)` — prevents duplicate register numbers under the same teacher.
- **Check Constraint:** `CHECK (year >= 1 AND year <= 4)` — validates academic year at database level.
- **Indexes:**
  - `idx_students_teacher_id` on `public.students (teacher_id)`
  - `idx_students_teacher_register_no` on `public.students (teacher_id, register_no)`

### Row Level Security (RLS) Policies
- **SELECT Policy:** `USING (auth.uid() = teacher_id)`
- **INSERT Policy:** `WITH CHECK (auth.uid() = teacher_id)`
- **UPDATE Policy:** `USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id)`
- **DELETE Policy:** `USING (auth.uid() = teacher_id)`

---

## 4. Supabase Setup Guide

### Step 1: Create a Supabase Project
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**, choose an organization, assign a project name (e.g. `college-dbms`), and set a database password.

### Step 2: Apply the SQL Schema
1. In the Supabase project dashboard, open the **SQL Editor** from the left navigation menu.
2. Click **New query**.
3. Copy the entire contents of [`supabase/schema.sql`](./supabase/schema.sql).
4. Paste it into the editor and click **Run**.
5. Ensure the query outputs `Success. No rows returned`.

### Step 3: Configure Authentication Settings
1. Go to **Authentication** > **Providers** > **Email**.
2. Verify that **Email provider** is enabled.
3. For academic demo convenience, uncheck **Confirm email** (or manually verify test teachers) so created accounts can sign in immediately.
4. Under **Authentication** > **Settings**, disable **Allow new users to sign up** to prevent public registration.

### Step 4: Create a Test Teacher Account
1. Go to **Authentication** > **Users** in the Supabase Dashboard.
2. Click **Add user** > **Create user**.
3. Enter:
   - **Email:** `t001@school.edu` (format: `<lowercase-teacher-id>@<VITE_TEACHER_EMAIL_DOMAIN>`)
   - **Password:** A secure password (e.g., `Teacher@12345`)
   - **Auto-confirm User:** Checked
4. Click **Create user**.

---

## 5. Environment Variables

Create `.env` in the root of the project by copying `.env.example`:

```bash
cp .env.example .env
```

Set the values from your Supabase Dashboard (**Project Settings** > **API**):

```env
# Project URL (Found under Project Settings > API > Project URL)
VITE_SUPABASE_URL=https://your-project-ref.supabase.co

# Project Publishable Key (Found under Project Settings > API > Project API keys > anon public)
VITE_SUPABASE_PUBLISHABLE_KEY=your-actual-anon-publishable-key

# Institutional domain used to map Teacher ID to Auth email alias
VITE_TEACHER_EMAIL_DOMAIN=school.edu
```

> **Security Note:** Never expose the `service_role` secret key in `.env` or frontend client code. Only use the public `anon` / publishable key.

---

## 6. Installation & Execution

### Prerequisites
- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation
```bash
npm install
```

### Run Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Production Build & Preview
```bash
npm run build
npm run preview
```

---

## 7. Testing CRUD Operations Step-by-Step

### 1. Teacher Authentication
1. Enter Teacher ID `T001` and password `Teacher@12345`.
2. Click **Sign In**.
3. The page redirects to the Student Database portal displaying **Teacher Account: T001** in the navigation bar.
4. Refresh the browser; verify that you remain signed in (session persistence).

### 2. CREATE (Add Student)
1. Fill in the form:
   - **Register Number:** `2024CS101`
   - **Student Name:** `Alex Morgan`
   - **Department:** `Computer Science`
   - **Year:** `2`
   - **Email:** `alex.m@college.edu`
2. Click **Add Student**.
3. Verify that a success alert appears and the record appears in the table.
4. Try adding the same Register Number `2024CS101` again; verify the duplicate prevention error message appears.

### 3. READ (View Records)
1. Notice the structured table with columns: Register No, Student Name, Department, Year, Email, and Actions.
2. Verify the record count badge updates accurately.

### 4. SEARCH (Filter by Register No)
1. In the search box, enter `101`.
2. Click **Search**; verify only `2024CS101` is shown.
3. Click **Clear Filter** or the `×` button; verify the full list re-appears.

### 5. UPDATE (Edit Student)
1. Click the **Edit** button next to `2024CS101`.
2. Notice the form transitions to **Edit Student Record** and fields are prepopulated.
3. Change the Student Name to `Alex Morgan Jr.` and Year to `3`.
4. Click **Update Record**.
5. Verify the updated information is reflected in the table.

### 6. DELETE (Remove Student)
1. Click the **Delete** button next to the student.
2. Confirm the browser prompt: `Are you sure you want to delete student record...`.
3. Verify the row is deleted and the empty state message is shown if no records remain.

### 7. LOGOUT
1. Click **Sign Out** in the navigation bar.
2. Verify you are redirected back to the login screen and student records are no longer accessible.

---

## 8. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `VITE_SUPABASE_URL is missing or invalid` | `.env` is missing or variables are not prefixed with `VITE_` | Ensure `.env` exists with valid `VITE_SUPABASE_URL` and restart the Vite server. |
| `Invalid Teacher ID or password` | Credentials don't match the user created in Supabase Auth | Confirm user email in Supabase matches `<teacherId>@<domain>` (e.g. `t001@school.edu`). |
| `Email not confirmed` | Email confirmation is enabled on Supabase project | Disable email confirmations in Auth settings or mark user confirmed in Auth dashboard. |
| `Permission denied` / RLS error | RLS policy blocked operation or teacher_id mismatch | Run `supabase/schema.sql` completely to establish policies. |
| Duplicate register number error | `(teacher_id, register_no)` constraint triggered | Use a unique register number for the teacher. |
