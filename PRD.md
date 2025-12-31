# Product Requirements Document (PRD)

## Basic Security - Estate Access Management System

A role-based security pass system for gated residential estates. Enables residents to generate guest/staff access codes, guards to validate codes at gates, and estate administrators to manage their estates independently.

---

## User Roles

### 1. Super Admin (Platform Owner)

**Who:** The owner, creator, and developer of the webapp (internal use only).

**Purpose:** Monitor and manage the entire platform, NOT individual estates.

**Responsibilities:**
- Monitor overall platform health and uptime
- View analytics across all estates (aggregate data)
- Receive security alerts and system notifications
- Check for issues, errors, or anomalies
- Monitor security of the webapp
- View list of all registered estates
- Access platform-level logs and metrics

**Access:**
- Dashboard: `/super-admin`
- Login: Via small italic "Super Admin" link in homepage footer
- Creation: Only via `scripts/create-super-admin.mjs` (not through UI)
- MFA: Required

**What Super Admin does NOT do:**
- Does NOT onboard estates (Estate Admins self-register)
- Does NOT manage individual estate residents or guards
- Does NOT generate access codes
- Does NOT validate codes at gates

---

### 2. Estate Admin (Customer)

**Who:** The administrator of a specific residential estate (customer/end-user).

**Purpose:** Manage their own estate's security operations.

**Responsibilities:**
- Self-register their estate via `/auth/sign-up`
- Onboard residents with house numbers
- Create and manage security guard accounts
- Create and manage gate entry points
- View estate activity logs
- Export validation reports
- Configure estate settings

**Access:**
- Dashboard: `/estate-admin`
- Registration: Via "Create Estate" button on homepage
- Login: Via "Admin Login" in navigation
- MFA: Required

---

### 3. Resident

**Who:** A person living in an estate.

**Purpose:** Generate access codes for guests and domestic staff.

**Responsibilities:**
- Generate single-use guest codes (6-hour validity)
- Generate renewable staff codes (6-month validity)
- View their active codes
- Renew staff codes before expiry

**Access:**
- Portal: `/resident-app`
- Login: Via "Residents" link, using estate verification code + phone/password

---

### 4. Resident Delegate

**Who:** A phone number approved by a resident to act on their behalf.

**Purpose:** Generate codes when the primary resident is unavailable.

**Responsibilities:**
- Same as Resident (generate guest/staff codes)
- Codes are generated under the primary resident's name

**Access:**
- Portal: `/resident-app`
- Login: Via "Residents" link, using estate verification code + phone/password

---

### 5. Guard (Security Personnel)

**Who:** Security personnel stationed at estate gates.

**Purpose:** Validate access codes and record entry decisions.

**Responsibilities:**
- Enter access codes to validate
- Record ALLOW or DENY decisions
- View validation history for their shift
- See guest/staff details when code is valid

**Access:**
- Portal: `/security-app`
- Login: Via "Security Guards" link, using estate verification code + phone/password

---

## User Flow Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                        PLATFORM LEVEL                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Super Admin (Developer/Owner)                            │   │
│  │ - Monitors platform health, security, analytics          │   │
│  │ - Views all estates (read-only oversight)                │   │
│  │ - Receives alerts                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ monitors
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        ESTATE LEVEL                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Estate Admin (Customer)                                  │   │
│  │ - Self-registers estate                                  │   │
│  │ - Onboards residents, guards, gates                      │   │
│  │ - Views estate logs                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                    │                    │                        │
│          creates   │                    │  creates               │
│                    ▼                    ▼                        │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │ Residents           │    │ Guards              │            │
│  │ - Generate codes    │    │ - Validate codes    │            │
│  │                     │    │                     │            │
│  └─────────────────────┘    └─────────────────────┘            │
│           │                                                      │
│           │ may have                                             │
│           ▼                                                      │
│  ┌─────────────────────┐                                        │
│  │ Delegates           │                                        │
│  │ - Generate codes    │                                        │
│  │   on behalf of      │                                        │
│  │   resident          │                                        │
│  └─────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Registration Flows

### Estate Admin Registration (Self-Service)
1. User clicks "Create Estate" on homepage
2. Fills in estate name and admin details
3. Creates account with email/password
4. Sets up MFA (TOTP)
5. Lands on Estate Admin dashboard
6. Can now onboard residents and guards

### Super Admin Creation (Developer Only)
1. Developer runs: `node scripts/create-super-admin.mjs`
2. Script creates user in Cognito with SUPER_ADMIN role
3. Developer logs in via footer link
4. Sets up MFA (TOTP)
5. Lands on Super Admin dashboard

---

## Technical Implementation

- **Authentication:** AWS Cognito with custom `role` attribute
- **Database:** DynamoDB with multi-tenant isolation via `estateId`
- **MFA:** Required for SUPER_ADMIN and ESTATE_ADMIN roles
- **Session:** JWT tokens stored in HTTP-only cookies
