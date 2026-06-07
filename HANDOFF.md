# Project Handoff: Victoria Dental Care (vdc-app)

This repository contains the codebase for **Victoria Dental Care**, a modern, responsive dental clinic management system designed with a premium glassmorphic UI.

---

## 🔗 Repository Information

- **Repository URL**: `https://github.com/esho-esa/vdc-app.git`
- **Active Branch**: `main`
- **Latest Commit**: `bc990352cc3c9c5bd9f0a063ec570c20db9004d8`
- **Commit Message**: `chore: ignore environment files`

---

## 🛠 Tech Stack

- **Core Framework**: [Next.js](https://nextjs.org/) (v16.1.7, App Router)
- **UI & Logic**: [React](https://react.dev/) (v19.2.3), React DOM (v19.2.3)
- **Database Client**: [@supabase/supabase-js](https://supabase.com/docs/reference/javascript/introduction) (v2.100.0)
- **PDF Generation**: [pdfkit](https://pdfkit.org/) (v0.18.0)
- **Notification API**: [twilio](https://www.twilio.com/) (v5.13.0) - *Currently in mocked/demo mode*
- **Authentication**: JWT-based token signing (`lib/auth.js`) & SHA-256 password hashing.
- **Styling**: Custom CSS with Glassmorphism variables, Theme Provider (Dark/Light mode support), and micro-animations.
- **Unused dependencies**: `better-sqlite3` (v12.8.0, currently defined in `package.json` for future synchronization functionality).

---

## ⚙️ Environment Variables Required

Create a `.env.local` file in the root directory and populate the following keys:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL="https://vuypsljuvivdbpsheulx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"

# Authentication Secrets (Optional - fallback provided in development)
JWT_SECRET="your-jwt-secret-key"

# Twilio WhatsApp Configuration (Optional - messaging is mocked if not configured)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
```

---

## 📋 Features

### Completed Features
1. **Patient Management**: Full CRUD capability, patient record retrieval, soft-deletion, and patient restoration API endpoint (`/api/patients/[id]/restore`).
2. **Appointment Scheduling**: Booking, viewing appointments, status updates (`confirmed`, `pending`, `cancelled`, `completed`), and dynamic date/time validation.
3. **Prescriptions & Treatments**: Recording treatment histories, assigning medication dosages, rates, and prescription billing.
4. **PDF Invoice & Prescription Engine**: Auto-generates clean invoice and prescription PDFs in memory and streams them or uploads them directly to Supabase Storage bucket (`dental-clinic-pdfs`).
5. **Interactive Dashboard**: High-level clinic stats cards, live recent activity log, and appointment metrics visualization.
6. **Vibrant Glassmorphism Design**: High-fidelity dark and light themes, smooth layout transitions, responsive top bars, and sidebar controls.
7. **Staff Dashboard**: Manage clinic staff personnel list, roles, and credential configurations.
8. **Security**: SHA-256 hashing for passwords, route guards, and JWT authentication tokens.

### Pending Features
1. **Offline/Local Synchronization**: Fully wire up the `better-sqlite3` package to cache patient records locally for uninterrupted offline clinic usage.
2. **Real-time Synchronization**: Use Supabase Realtime subscriptions to update dashboard widgets concurrently when entries are changed.
3. **Live WhatsApp Reminders**: Uncomment the Twilio API execution logic inside `lib/whatsapp.js` and provide verified credentials to send active messages.

---

## ⚡ Setup and Local Execution Instructions

To run the project locally on a new machine:

### 1. Clone the Repository
```bash
git clone https://github.com/esho-esa/vdc-app.git
cd vdc-app
```

### 2. Install Dependencies
```bash
npm install
```
*(Note: If you run into Execution Policy restrictions on Windows, execute via cmd: `npm.cmd install`)*

### 3. Setup Environment Variables
Configure the `.env.local` file with the values described in the **Environment Variables Required** section.

### 4. Run Development Server
```bash
npm run dev
```
*(Or via cmd wrapper: `npm.cmd run dev`)*

The application will be running at [http://localhost:3000](http://localhost:3000).

### 5. Build for Production
To build and verify compilation, run:
```bash
npm run build
```
*(Or via cmd wrapper: `npm.cmd run build`)*

---

## 🚀 Deployment Status

- **Vercel Project Link**: Linked to project `vdc-app` (ID: `prj_Jwsyqji51wc5lWHyVu7Wiq6CwE2E`) under Vercel team/org `team_BZRRrdwT7ylaDzwA3d16KXfM`.
- **Domain Status**: Deployed directly via Vercel subdomains (e.g. `vdc-app.vercel.app`). No custom domains are currently configured.
- **Supabase Status**: Active and configured via the endpoint URL. All PDF attachments and invoice files upload to Supabase Storage bucket `dental-clinic-pdfs`.
