# DeGarda - Shift Scheduler App

## 🎯 Mission & Objectives

### Goal
Provide medical staff with an intuitive, secure platform to reserve and manage shifts while enabling managers to oversee departmental schedules within strict hospital boundaries.

### Core Objectives
1. **Multi‑hospital isolation** – Each hospital is a hard‑walled tenant; no cross‑hospital visibility.
2. **Two‑role model** – Staff (reserve, view, request swaps) and Manager (approve swaps, generate schedules, department oversight).
3. **Ultra‑simple authentication** – Single‑field access code issued by the hospital; token‑based session thereafter.
4. **Core workflows** – Reservations → Departmental schedule generation → Shift swaps with manager approval.
5. **Minimal, but beautiful UI** – Login, Dashboard (calendar & actions), Manager tools tab.

### Key Models (Target Architecture)
* **Hospital** - Isolated tenant boundaries
* **Department** - Within hospital organizational units
* **User {role}** - Staff vs Manager role-based access
* **Reservation** - Staff-initiated shift preferences
* **Shift** - Generated/assigned shifts
* **SwapRequest** - Manager-approved shift exchanges

### Target User Flow
```
Staff → Reserve dates → Manager clicks Generate → Schedule populated → Staff request swap → Manager approves → Calendars update
```

---

## 📊 Current Implementation Analysis

### ✅ **ALIGNED**: Technical Foundation
- **Clean codebase architecture** - Well-structured Next.js app with TypeScript
- **Database design** - PostgreSQL with proper relations and constraints
- **Performance optimizations** - O(n log n) shift generation algorithms
- **Professional logging** - Structured logging system with context
- **Data models** - Hospital, Staff (roles), Shifts, Swap requests mostly implemented

### ⚠️ **PARTIAL**: Core Features  
- **Shift generation** - ✅ Implemented but complex admin interface
- **UI design** - ✅ Beautiful design but too many features
- **Swap requests** - ✅ Database structure exists, needs manager approval workflow
- **Multi-hospital support** - ⚠️ Basic filtering but no security isolation

### ❌ **CRITICAL GAPS**: Security & Simplicity

#### 1. **Authentication System - BROKEN**
**Objective**: Single-field access code per hospital + token sessions
**Current**: Email/password for admin, name selection for staff (NO AUTH!)

**Issues**:
- Staff portal has ZERO authentication - just pick a name from dropdown
- No hospital-specific access codes
- Admin uses email/password instead of access codes
- Token validation exists but bypassed in staff portal

#### 2. **Multi-Hospital Isolation - SECURITY HOLES**
**Objective**: Hard-walled tenants with no cross-hospital visibility
**Current**: Basic filtering that can be bypassed

**Issues**:
- No middleware enforcing hospital boundaries
- API routes don't consistently validate hospital_id
- Frontend relies on localStorage (manipulatable)
- Staff can potentially access other hospitals via direct API calls

#### 3. **Two-Role Model - INCOMPLETE** 
**Objective**: Staff (reserve, view, swap) vs Manager (approve, generate)
**Current**: Admin/Manager/Staff roles but no proper access control

**Issues**:
- No role-based component rendering
- Staff portal exists but separate from admin (should be unified)
- Manager features mixed with admin features
- No role validation in API routes

#### 4. **UI Complexity - TOO MUCH**
**Objective**: Login, Dashboard, Manager tools (3 sections)
**Current**: Admin has 6+ navigation sections

**Issues**:
- Admin interface: Dashboard, Hospitals, Staff, Schedule, Swaps, Settings
- Staff interface: Separate app with basic calendar
- No unified manager interface
- Too many features visible at once

#### 5. **Reservation Workflow - DISCONNECTED**
**Objective**: Reservations → Generation → Swaps workflow
**Current**: Reservations in localStorage, generation manual, swaps separate

**Issues**:
- Reservations not saved to database
- No integration between reservation and generation
- Manual shift assignment instead of reservation-based generation
- Workflow sequence not enforced

---

## 🚨 Priority Fixes Required

### **IMMEDIATE (Security Critical)**

#### Fix #1: Implement Proper Authentication
```typescript
// Current: Staff portal has no auth
// Target: Single access code per hospital
POST /api/auth/login { accessCode: "HOSPITAL_CODE_123" }
→ JWT token with { userId, hospitalId, role }
```

#### Fix #2: Enforce Hospital Isolation  
```typescript
// Add middleware to ALL API routes
middleware: validateHospitalAccess(req.user.hospitalId, req.params.hospitalId)
// Block cross-hospital data access completely
```

#### Fix #3: Role-Based Access Control
```typescript
// Protect routes by role
/api/shifts/generate → MANAGER only
/api/shifts/reserve → STAFF only  
/api/swaps/approve → MANAGER only
```

### **HIGH PRIORITY (User Experience)**

#### Fix #4: Simplify UI to Match Objectives
- **Staff Interface**: Login → Dashboard (calendar + my shifts) → Swap requests
- **Manager Interface**: Login → Dashboard (calendar + pending approvals) → Generate schedules
- **Remove**: Hospitals management, Staff management, Settings complexity

#### Fix #5: Integrate Reservation Workflow
- Move reservations from localStorage to database
- Connect reservations to shift generation
- Enforce workflow: Reserve → Generate → Assign → Swap

### **MEDIUM PRIORITY (Polish)**

#### Fix #6: Unified Authentication Flow
- Single login page with access code field
- Role-based redirect after authentication
- Remove separate staff/admin login flows

---

## 🛣️ Implementation Roadmap

### **Phase 1: Security Foundation (Week 1)**
1. **Implement access code authentication**
   - Generate unique codes per hospital
   - Replace email/password with access code login
   - Add proper JWT token validation

2. **Add hospital isolation middleware**
   - Validate hospital_id in all API routes
   - Block cross-hospital data access
   - Secure all endpoints

3. **Implement role-based access control**
   - Add role validation to API routes
   - Create role-based route protection
   - Remove unauthorized access points

### **Phase 2: UI Simplification (Week 2)**
1. **Unified authentication interface**
   - Single login page with access code
   - Role-based redirect after login
   - Remove separate admin/staff portals

2. **Simplified staff interface**
   - Dashboard: Calendar + My Shifts + Actions
   - Reservation flow: Pick dates → Submit
   - Swap requests: View pending → Request new

3. **Simplified manager interface**  
   - Dashboard: Calendar + Pending Approvals
   - Generate: Select department → Generate schedule
   - Approvals: Review swap requests → Approve/Deny

### **Phase 3: Workflow Integration (Week 3)**
1. **Database-backed reservations**
   - Move reservations from localStorage to DB
   - Add reservation limits and validation
   - Connect to shift generation

2. **Workflow enforcement**
   - Staff can only reserve available dates
   - Managers generate based on reservations
   - Enforce approval workflow for swaps

3. **Manager approval controls**
   - Restrict generation to managers only
   - Add swap approval interface
   - Implement approval notifications

### **Phase 4: Polish & Testing (Week 4)**
1. **UI/UX refinement**
   - Consistent design across interfaces  
   - Mobile-responsive optimization
   - Accessibility improvements

2. **Testing & validation**
   - Security testing (hospital isolation)
   - Role-based access testing
   - Workflow integration testing

---

## 📈 Success Metrics

### **Security Metrics**
- [ ] Zero cross-hospital data access possible
- [ ] All API routes require authentication
- [ ] Role-based access enforced everywhere
- [ ] Staff cannot access manager functions

### **Simplicity Metrics** 
- [ ] Staff interface: ≤3 main sections
- [ ] Manager interface: ≤3 main sections  
- [ ] Single login flow for all users
- [ ] ≤5 clicks for core workflows

### **Workflow Metrics**
- [ ] Reservations integrate with generation
- [ ] Manager approval required for swaps
- [ ] Clear workflow sequence enforced
- [ ] No manual workarounds needed

### **User Experience Metrics**
- [ ] New user can complete workflow in <5 minutes
- [ ] Zero training required for basic functions
- [ ] Beautiful, intuitive interface
- [ ] Mobile-friendly design

---

## 🎯 Definition of Done

**DeGarda will be considered complete when:**

1. **A staff member can**: Login with access code → Reserve preferred dates → View generated schedule → Request shift swaps
2. **A manager can**: Login with access code → See all reservations → Generate schedules → Approve/deny swaps  
3. **Hospital isolation is**: Complete and secure - no cross-hospital access possible
4. **Interface is**: Minimal, beautiful, and requires zero training to use
5. **Workflow is**: Seamless reservation → generation → swap sequence

This document serves as our North Star for all development decisions and feature priorities.