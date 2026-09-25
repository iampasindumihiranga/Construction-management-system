# Odiliya Residencies - Luxury Construction & EP-01 Client Management System

Spring Boot 3 + React (Vite) ultra-luxury real estate portal and client management system based on the Prime Lands / Odiliya Residencies design specifications.

---

## Features Implemented

### 1. Creative Residences Showcase (Client Dashboard)
- Luxury serif header: **"The Residences"** with curated description.
- 3 Creative showcase cards:
  - **The One Collection**: Modern high-rise architectural tower with gradient overlay and bottom title.
  - **Barefoot Luxury**: Warm champagne / cream card (`#e7dfcf`) with serif typography and dark rounded **VIEW ALL →** button.
  - **Lifestyle Residences**: Night skyline view with city lights.
- Floating widgets:
  - **Let's Chat** pill button on the bottom left.
  - **WhatsApp** button with green "How can we help you?" badge on the bottom right.

### 2. Luxury Footer
- Top brand row with circular emblem + phone numbers (`+94 710 777 666`, `+94 71 669 9822`).
- 3-column directory:
  - Column 1: Navigation & Investor Relations links.
  - Column 2: Head Office address (Colombo 08, Sri Lanka), email, and social media channels.
  - Column 3: Lands & Houses, Careers, Testimonials, News, Contact Us.
- Bottom copyright bar with legal links, eMarketingEye design credit, and circular scroll-to-top button.

### 3. Responsive Left Side Navbar & Header
- Header with `(=) MENU` pill button, navigation links (`ABOUT US`, `RESIDENCIES ⌵`, `COMMUNITIES ⌵`), central brand logo, and contact pills.
- Off-canvas left sliding drawer providing responsive navigation across mobile, tablet, and desktop.

### 4. Separate Residencies, Homes, Lands Selection & Whole-System Theme
- Interactive category tabs allowing users to explore:
  - **Residencies**: Luxury apartments & condominium towers.
  - **Homes**: Standalone residences and private courtyard villas.
  - **Lands**: Master-planned residential and commercial land plots.
- Unified luxury dark aesthetic (`#0b0f15`, `#121820`, `#18202d`, gold `#c5a059`/`#d4af37`, warm cream `#ece5d8`) applied across Landing Page, Client Dashboard, Client Manager Dashboard, Login, and Register.

### 5. EP-01 Client Management System (US-CM-01 through US-CM-25)
- **US-CM-01**: Client Account Registration with validation and unique OD ID generation.
- **US-CM-02 & US-CM-04**: Client Manager profile management (view, edit contact & company info).
- **US-CM-03**: Secure Client login with session token.
- **US-CM-05**: Client Manager can delete inactive or invalid client accounts.
- **US-CM-06 & US-CM-07**: Client can view and update permitted profile information.
- **US-CM-08**: Client Manager can search and filter clients by name, email, phone, company, or ID.
- **US-CM-09 & US-CM-10**: Client Manager records contracts and views start/end dates.
- **US-CM-11**: **Contract Expiry Alerts** (automatic alerts for contracts expiring in <= 60 days).
- **US-CM-12 & US-CM-13**: View projects assigned to clients.
- **US-CM-14, 15, 16**: Direct project inquiries, manager replies, and communication history.
- **US-CM-17 & US-CM-18**: Construction status monitoring, progress percentages, and milestone tracking.
- **US-CM-19, 20, 21, 22**: Central documents repository (upload/download deeds, blueprints, KYC, receipts).
- **US-CM-23**: Client service feedback and 1-5 star ratings.
- **US-CM-24**: Client notification alerts for project updates, documents, and inquiry replies.
- **US-CM-25**: Client Manager executive KPI overview dashboard.

### 6. Backend Cleanup
- Unnecessary files from other modules (Attendance, Employee, Expense, Material, MaterialRequest, MaterialTransaction, PurchaseOrder, Task) were removed.
- Backend is clean, lightweight, and focused on EP-01 Client Management.

---

## Demo Credentials

- **Client Portal**:
  - Username: `client@odiliya.com`
  - Password: `Client@123`
- **Client Manager Portal**:
  - Username: `clientmanager`
  - Password: `ClientManager@123`
- **Admin**:
  - Username: `admin`
  - Password: `Admin@123`

---

## Quick Start

### 1. Start the Spring Boot Backend
Ensure MySQL is running and the database `construction_management` exists:
```powershell
mvn spring-boot:run
```
*(Runs on `http://localhost:8080`)*

### 2. Start the Frontend
```powershell
npm run dev
```
*(Runs on `http://localhost:5173`)*
