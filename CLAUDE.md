# 🧑‍💻 CLAUDE.md - Development Guide for DeGarda

**Claude Code Assistant Configuration & Development Context**

---

## 🎯 Project Overview

**DeGarda** is a multi-hospital shift scheduling application designed to be **minimal, secure, and beautiful**. It enables medical staff to reserve shifts and request swaps while allowing managers to generate schedules and approve changes—all within strict hospital isolation boundaries.

---

## 📋 Essential Documentation

### **Primary References**
- **[OBJECTIVES.md](./OBJECTIVES.md)** - Complete project mission, architecture goals, and success metrics
- **[ISSUES.md](./ISSUES.md)** - Live issue tracker with security vulnerabilities and functionality bugs
- **[README.md](./README.md)** - Installation, setup, and basic usage instructions

### **Technical References**
- **[DATABASE_SETUP.md](./DATABASE_SETUP.md)** - Database schema and migration instructions
- **[REAL_TIME_SYNC_IMPLEMENTATION.md](./REAL_TIME_SYNC_IMPLEMENTATION.md)** - Real-time data synchronization architecture
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Deployment configuration and environment setup

---

## 🏗️ Architecture Overview

### **Technology Stack**
- **Frontend**: Next.js 15 with TypeScript, Tailwind CSS
- **Backend**: Next.js API routes with middleware
- **Database**: PostgreSQL (Neon) with versioned migrations
- **Authentication**: JWT-based with hospital-specific access codes
- **Deployment**: Vercel with environment-specific configurations

### **Core Models**
```typescript
Hospital     // Isolated tenant boundaries
├── Staff    // Users with roles (staff/manager)
├── Shifts   // Generated/assigned shifts
├── Swaps    // Manager-approved shift exchanges
└── AccessCodes // Hospital-specific authentication
```

### **Security Architecture**
- **Hospital Isolation**: Middleware enforces hard tenant boundaries
- **Role-Based Access**: Staff vs Manager permissions at API + UI levels
- **Access Code Auth**: Single-field login with hospital-specific codes
- **JWT Tokens**: Secure session management with hospital/role context

---

## 🚨 Critical Security Implementation

### **1. Authentication System**
```typescript
// Current Implementation (SECURE)
POST /api/auth/access-code 
{ accessCode: "ABC123" } // Individual staff access codes
→ JWT token with { userId, hospitalId, role }
```

#### **Access Code Generation (NEW - 2025)**
- **Format**: 3 characters (2 letters + 1 number)
- **Generation**: Automatic on staff creation
  - First 2 characters: Initials from staff name (e.g., "JS" for "John Smith")
  - Last character: Random digit (0-9)
- **Uniqueness**: System ensures no duplicate codes across entire database
- **Examples**: 
  - "Dr. Maria Popescu" → "MP7"
  - "John Doe" → "JD3"
  - "Ana-Maria Ionescu" → "AI9"
- **Fallback**: If initials + number combinations exhausted, generates random 3-char code
- **Benefits**:
  - Easy to remember (uses own initials)
  - Direct login to assigned hospital
  - Maintains strict hospital separation
  - No need to select hospital or remember complex passwords

### **2. Hospital Isolation Middleware**
```typescript
// lib/hospitalMiddleware.ts
export async function withHospitalAuth(
  request: NextRequest,
  handler: (authUser: AuthUser) => Promise<NextResponse>
): Promise<NextResponse>
// Blocks ALL cross-hospital access
```

### **3. Role-Based Access Control**
```typescript
// lib/roleBasedAccess.ts
export function hasPermission(
  userRole: UserRole,
  resource: string,
  action: string
): boolean
// Enforces staff/manager boundaries
```

---

## 🔧 Development Commands

### **Database Management**
```bash
# Run migrations
npm run db:migrate

# Reset database (development only)
npm run db:reset

# Connect to database
npm run db:connect
```

### **Development Workflow**
```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

### **Testing & Debugging**
```bash
# Run security tests
npm run test:security

# Check hospital isolation
npm run test:isolation

# Performance monitoring
npm run test:performance
```

---

## 📊 Current Implementation Status

### **✅ COMPLETED (Secure & Functional)**
- **Authentication**: Individual staff access codes (3-char) with JWT tokens
- **Access Code Generation**: Automatic unique codes using initials + number
- **Hospital Isolation**: Middleware enforces strict tenant boundaries  
- **Role-Based Access**: Staff/Manager permissions at API + UI levels
- **Shift Generation**: O(n log n) optimized algorithm with fallback
- **Cascade Deletion**: Hospitals and staff can be deleted with all related data
- **Database Architecture**: Versioned migrations with proper seeding

### **🔧 IN PROGRESS**
- UI simplification to match objectives (currently has 6+ sections vs target 3)
- Integration of reservations with database (currently localStorage)
- Manager approval workflow completion (needs role restrictions)

### **📋 NEXT PRIORITIES**
1. **UI Simplification**: Reduce to Login → Dashboard → Manager Tools only
2. **Reservation Integration**: Move from localStorage to database
3. **Workflow Enforcement**: Complete reservation → generation → approval flow

---

## 🎨 UI/UX Guidelines

### **Design Principles**
- **Minimal**: Maximum 3 main sections per interface
- **Secure**: No cross-hospital visibility ever
- **Beautiful**: Consistent design system with Tailwind
- **Simple**: Zero training required for basic functions

### **Target User Flows**
```
Staff:    Login → Dashboard (calendar + actions) → Request swaps
Manager:  Login → Dashboard (calendar + approvals) → Generate schedules
```

### **Current Navigation Structure**
```typescript
// Role-based navigation (lib/roleBasedAccess.ts)
const allowedItems = getAllowedNavItems(userRole)
// Automatically filters based on permissions
```

---

## 🔍 Debugging & Monitoring

### **Logging System**
```typescript
// lib/logger.ts - Structured logging
logger.info('Component', 'Action completed', { userId, hospitalId })
logger.error('Component', 'Error occurred', error, { context })
logger.shiftGeneration('Generation', stats, { hospitalId })
```

### **Performance Monitoring**
```typescript
// lib/performanceMonitor.ts
const monitor = performanceMonitor.startOperation('shift-generation')
// ... operation
monitor.end()
```

### **Security Validation**
```typescript
// Check hospital isolation
const validation = validateHospitalParam(userHospitalId, requestedHospitalId)
if (!validation.valid) {
  return NextResponse.json({ error: validation.error }, { status: 403 })
}
```

---

## 🚨 Security Checklist

### **Before Any Feature Work**
- [ ] Hospital isolation enforced in API route
- [ ] Role-based access validation implemented
- [ ] JWT token validation present
- [ ] Cross-hospital data access blocked
- [ ] Sensitive data not logged

### **Before Deployment**
- [ ] All authentication vulnerabilities closed
- [ ] Hospital boundaries tested end-to-end
- [ ] Role restrictions verified in UI + API
- [ ] No debug routes or console.log in production
- [ ] Environment variables properly configured

---

## 📈 Success Metrics

### **Security Metrics**
- ✅ Zero cross-hospital data access possible
- ✅ All API routes require authentication
- ✅ Role-based access enforced everywhere
- ✅ Staff cannot access manager functions

### **Simplicity Metrics** 
- 🔧 Staff interface: ≤3 main sections (currently 6+)
- 🔧 Manager interface: ≤3 main sections (currently 6+)
- ✅ Single login flow for all users
- ✅ ≤5 clicks for core workflows

### **Workflow Metrics**
- 📋 Reservations integrate with generation
- 📋 Manager approval required for swaps
- 📋 Clear workflow sequence enforced
- ✅ No manual workarounds needed

---

## 🛠️ Code Patterns & Best Practices

### **API Route Structure**
```typescript
export async function GET(request: NextRequest) {
  return withHospitalAuth(request, async (authUser) => {
    // Hospital isolation and authentication handled
    // authUser contains: { userId, hospitalId, role, name, email }
    
    // Validate hospital parameter if needed
    const validation = validateHospitalParam(authUser.hospitalId, paramValue)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 403 })
    }
    
    // Implementation logic here
  })
}
```

### **Component Security Pattern**
```typescript
// Check role on client-side
const userRole = getClientUserRole()
if (!hasPermission(userRole, 'resource', 'action')) {
  return null // Don't render component
}
```

### **Database Query Pattern**
```typescript
// Always filter by hospital_id
const results = await sql`
  SELECT * FROM table 
  WHERE hospital_id = ${authUser.hospitalId}
  AND other_conditions = ${value}
`
```

---

## 📝 Development Notes

### **For Future Developers**
1. **Security First**: NEVER compromise hospital isolation or role-based access
2. **Keep It Simple**: Every feature should pass the "3-click rule"
3. **Database Queries**: Always include hospital_id in WHERE clauses
4. **Error Handling**: Use structured logging, not console.log
5. **UI Consistency**: Use role-based navigation and permission checks

### **Common Pitfalls to Avoid**
- Cross-hospital data leakage through API parameters
- Bypassing authentication in client-side code
- Adding complexity to UI without objective alignment
- Direct database access without hospital filtering
- Missing role validation in API endpoints

---

## 📞 Support & References

### **Key Files to Understand**
- `lib/hospitalMiddleware.ts` - Hospital isolation enforcement
- `lib/rbac/` - Modular role-based access control system
- `lib/shift-generation/` - Focused shift generation modules
- `lib/accessCodes.ts` - Authentication management
- `contexts/AppProviders.tsx` - Modern focused context providers
- `components/Sidebar.tsx` - Role-based navigation

### **When in Doubt**
1. Check **OBJECTIVES.md** for project goals
2. Check **ISSUES.md** for known problems
3. Review security middleware implementation
4. Test hospital isolation thoroughly
5. Verify role-based access controls

---

## 🔗 External Resources

<script src="https://gist.github.com/rvaidya/53bf27621d6cfdc64d1520d5ba6e0984.js"></script>

---

**Remember**: DeGarda is a **minimal, secure, beautiful** medical shift scheduler. Every line of code should support these three pillars.

---

*This document serves as the primary reference for all development work on DeGarda. Keep it updated as the project evolves.*

*Last Updated: 2025-07-19 by Claude Code Assistant*