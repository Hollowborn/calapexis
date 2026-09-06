# Calapexis System Sequence Diagrams

This document contains **Sequence Diagrams** detailing message passing, asynchronous RPC calls, server actions, and database transactions for the **Calapexis Campus Visitor Management & Navigation System**. Each section includes both a **High-Level (Simplified)** diagram and a **Low-Level (Technical)** diagram formatted for [mermaid.live](https://mermaid.live/).

---

# 1. Sequence Diagram of User Login Authentication & Session Storage

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor User as User (Admin / Staff / Guard)
    participant App as Calapexis Web App
    participant DB as Database

    User->>App: Submits Email & Password
    App->>DB: Verify Credentials & Fetch Role
    
    alt Valid Account
        DB-->>App: Return User Profile (Role, Office)
        App-->>User: Set Session & Redirect to Dashboard
    else Invalid Account
        DB-->>App: Authentication Failed
        App-->>User: Show "Invalid Email or Password" Error
    end
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor User as Staff / Admin
    participant Browser as Browser Client
    participant Server as SvelteKit Server (+page.server.ts)
    participant SupaAuth as Supabase Auth (auth.users)
    participant SupaDB as PostgreSQL (public.profiles)

    User->>Browser: Enters Email & Password on /auth/login
    Browser->>Server: POST /auth/login (FormData)
    
    Server->>SupaAuth: auth.signInWithPassword(email, password)
    
    alt Authentication Error
        SupaAuth-->>Server: Error 400 (Invalid credentials)
        Server-->>Browser: fail(400, { message: 'Invalid credentials' })
        Browser-->>User: Display Toast Error Alert
    else Successful Authentication
        SupaAuth-->>Server: Return User & Access Token Session
        Server->>SupaDB: SELECT role, office_id FROM public.profiles WHERE id = auth.uid()
        SupaDB-->>Server: Return Profile Row
        
        Server->>Browser: Set-Cookie: sb-access-token, sb-refresh-token (HttpOnly, Secure)
        Server-->>Browser: 303 Redirect to /dashboard
        Browser->>Server: GET /dashboard (with Session Cookies)
        Server-->>Browser: Render Role-Scoped Dashboard
        Browser-->>User: Display Dashboard View
    end
```

---

# 2. Sequence Diagram of User Profile Update & Password Change

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor User as Logged-in User
    participant App as Profile Manager Modal
    participant DB as Supabase Backend

    User->>App: Updates Account Info or New Password
    App->>DB: Save Profile Changes
    DB-->>App: Confirmation Success
    App-->>User: Show "Profile Successfully Updated"
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Browser as GlobalProfileManager.svelte
    participant Server as SvelteKit Server (+page.server.ts)
    participant SupaAuth as Supabase Auth
    participant SupaDB as Supabase DB (public.profiles)

    alt Update Profile Metadata
        User->>Browser: Modifies Name / Contact Information
        Browser->>Server: POST ?/updateProfile (FormData)
        Server->>SupaDB: UPDATE public.profiles SET updated_at = now() WHERE id = session.userId
        SupaDB-->>Server: 200 OK (Updated Row)
        Server-->>Browser: { success: true }
        Browser-->>User: Show Success Toast
    else Update Account Password
        User->>Browser: Submits New Password
        Browser->>Server: POST ?/updatePassword { newPassword }
        Server->>SupaAuth: auth.updateUser({ password: newPassword })
        SupaAuth-->>Server: 200 OK (Password Hash Updated)
        Server-->>Browser: { success: true }
        Browser-->>User: Show "Password updated successfully"
    end
```

---

# 3. Sequence Diagram of Admin Provisioning New Users & Roles

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor Admin as System Administrator
    participant Dashboard as Admin Users Portal
    participant DB as User Directory & Database

    Admin->>Dashboard: Enters Email, Role ('staff'/'security'), & Office
    Dashboard->>DB: Provision New Account
    DB-->>Dashboard: User Created & Role Assigned
    Dashboard-->>Admin: Display New User in Management Table
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor Admin as System Admin
    participant Browser as /dashboard/admin/users
    participant Server as SvelteKit Server Action
    participant SupaAdmin as Supabase Service Role Admin API
    participant SupaDB as PostgreSQL (public.profiles)

    Admin->>Browser: Fills Add User Modal (email, password, role, officeId)
    Browser->>Server: POST ?/createUser (FormData)
    
    Server->>SupaAdmin: auth.admin.createUser({ email, password, user_metadata: { role, office_id } })
    SupaAdmin->>SupaDB: Trigger on_auth_user_created fires
    SupaDB->>SupaDB: INSERT INTO public.profiles (id, email, role, office_id)
    
    SupaAdmin-->>Server: Return Created User Object
    Server-->>Browser: { success: true, user }
    Browser->>Browser: Invalidate page data & re-render Data Table
    Browser-->>Admin: Show newly created user with assigned office badge
```

---

# 4. Sequence Diagram of Visitor Gate Registration & Snapshot Upload

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor Visitor as Campus Visitor
    participant Portal as Visitor Portal (/v)
    participant Storage as Cloud Storage
    participant DB as Database

    Visitor->>Portal: Enters Name & Takes Live Face Photo
    Visitor->>Portal: Selects Destination Office & Purpose
    Portal->>Storage: Upload Visitor Selfie Snapshot
    Portal->>DB: Record Visitor Profile & Issue Passcode
    DB-->>Portal: Return Digital Pass (VIS-XXXX)
    Portal-->>Visitor: Display Pass & Launch Campus Map
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Visitor Smartphone
    participant Browser as Browser Client (/v)
    participant Server as SvelteKit Server (+page.server.ts)
    participant SupaStorage as Supabase Storage ('campus-assets')
    participant SupaDB as PostgreSQL Database

    Visitor->>Browser: Step 1: Input Name & Contact Details
    Visitor->>Browser: Step 2: Live Webcam Selfie Snap (Canvas base64)
    Visitor->>Browser: Step 3: Select Office & Purpose from Dialogs
    
    Browser->>Server: POST ?/register (FormData + base64 photoUrl)
    
    Server->>SupaStorage: storage.from('campus-assets').upload('visitors/selfie.jpg', buffer)
    SupaStorage-->>Server: Return publicUrl (CDN Link)
    
    Server->>SupaDB: INSERT INTO public.registered_visitors (full_name, email, phone, photo_url)
    SupaDB-->>Server: Return visitor_id
    
    Server->>SupaDB: INSERT INTO public.visitor_logs (visitor_id, office_id, purpose, pass_code, verification_status)
    SupaDB-->>Server: Return log record with pass_code (e.g. 'VIS-7821')
    
    Server-->>Browser: Return { success: true, pass: { id, pass_code, ... } }
    Browser->>Browser: Save to LocalStorage (calapexis_active_pass)
    Browser-->>Visitor: Render Live Map Navigation & Verified Pass HUD
```

---

# 5. Sequence Diagram of Google OAuth Auto-Fill Registration

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor Visitor as Campus Visitor
    participant Portal as Visitor Portal (/v)
    participant Google as Google Identity Services
    participant DB as Supabase Backend

    Visitor->>Portal: Clicks "Fill-Up via Google"
    Portal->>Google: Authenticate & Request Profile
    Google-->>Portal: Returns Verified Name, Email, & Photo
    Portal-->>Visitor: Auto-fills Form & Jumps to Office Selection
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Visitor
    participant Browser as Browser Client (/v)
    participant Callback as /auth/callback
    participant GoogleAuth as Google OAuth Provider
    participant SupaAuth as Supabase Auth

    Visitor->>Browser: Clicks "Fill-Up via Google"
    Browser->>SupaAuth: signInWithOAuth({ provider: 'google', redirectTo: '/auth/callback?next=/v' })
    SupaAuth-->>Browser: Return Google OAuth URL
    
    Browser->>GoogleAuth: 302 Redirect to Google Consent
    Visitor->>GoogleAuth: Approves account permissions
    GoogleAuth-->>Browser: Redirect to /auth/callback?code=AUTH_CODE
    
    Browser->>Callback: GET /auth/callback?code=AUTH_CODE
    Callback->>SupaAuth: auth.exchangeCodeForSession(code)
    SupaAuth-->>Callback: Session Object (user_metadata: name, email, avatar_url)
    
    Callback-->>Browser: 303 Redirect to /v
    Browser->>Browser: Parse Google user details & auto-fill state variables
    Browser-->>Visitor: Render Verified Profile Banner & fast-track to Step 3
```

---

# 6. Sequence Diagram of Real-Time Security Pass Approval / Rejection

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor Guard as Security Guard
    participant GuardDesk as Security Portal
    participant DB as Database
    participant VisitorApp as Visitor Smartphone

    Guard->>GuardDesk: Inspects pending visitor selfie & destination
    
    alt Guard Approves
        Guard->>GuardDesk: Clicks "Approve Pass"
        GuardDesk->>DB: Set verification_status = 'approved'
        DB--)VisitorApp: Instant Realtime Push: "Pass Verified"
        VisitorApp-->>VisitorApp: Unlocks Campus Navigation Map
    else Guard Rejects
        Guard->>GuardDesk: Clicks "Reject Pass" & Enters Reason
        GuardDesk->>DB: Set verification_status = 'rejected'
        DB--)VisitorApp: Instant Realtime Push: "Pass Declined"
        VisitorApp-->>VisitorApp: Displays Rejection Notice & Retry Prompt
    end
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor Guard as Gate Security Guard
    participant GuardUI as Guard Portal (/dashboard/guard)
    participant Server as SvelteKit Server Action
    participant SupaDB as PostgreSQL (public.visitor_logs)
    participant Realtime as Supabase Realtime Engine (WebSocket)
    participant VisitorClient as Visitor Smartphone (/v)

    VisitorClient->>Realtime: WebSocket subscribe to 'realtime:visitor-pass-{logId}'
    
    Guard->>GuardUI: Reviews pending queue
    
    alt Approve Visitor Pass
        Guard->>GuardUI: Clicks "Approve Pass"
        GuardUI->>Server: POST ?/approvePass { logId }
        Server->>SupaDB: UPDATE public.visitor_logs SET verification_status = 'approved' WHERE id = logId
        SupaDB-->>Server: 200 OK
        SupaDB->>Realtime: Broadcast UPDATE event (status: 'approved')
        Realtime-->>VisitorClient: Push payload: { verification_status: 'approved' }
        VisitorClient->>VisitorClient: Switch UI to Verified Campus Navigation
    else Reject Visitor Pass
        Guard->>GuardUI: Clicks "Reject Pass" & inputs reason
        GuardUI->>Server: POST ?/rejectPass { logId, reason }
        Server->>SupaDB: UPDATE public.visitor_logs SET verification_status = 'rejected', rejection_reason = reason
        SupaDB-->>Server: 200 OK
        SupaDB->>Realtime: Broadcast UPDATE event (status: 'rejected')
        Realtime-->>VisitorClient: Push payload: { verification_status: 'rejected', rejection_reason }
        VisitorClient->>VisitorClient: Render Declined Pass Alert Screen
    end
```

---

# 7. Sequence Diagram of Office Desk QR Code Verification & Check-In

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor Visitor as Campus Visitor
    participant Scanner as Smartphone Camera Scanner
    participant Server as Calapexis Server
    participant DB as Database

    Visitor->>Scanner: Scans QR Code on Office Door
    Scanner->>Server: Verify Scanned Code (e.g. 'OFF-CCS')
    
    alt Code Matches Assigned Destination
        Server->>DB: Update Status to 'checked_in' with Timestamp
        DB-->>Server: Check-In Confirmed
        Server-->>Scanner: Display Active Verified Pass HUD
    else Code Mismatch / Wrong Office
        Server-->>Scanner: Show "Incorrect Office Location" Alert
    end
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Visitor
    participant Browser as Visitor Client (/v)
    participant QrEngine as Html5Qrcode Camera Engine
    participant Server as SvelteKit Server (?/checkIn)
    participant SupaDB as Supabase Database

    Visitor->>Browser: Opens Office QR Scanner Modal
    Browser->>QrEngine: start({ facingMode: 'environment' })
    QrEngine-->>Browser: Live video feed active
    
    Visitor->>QrEngine: Points camera at door QR code
    QrEngine->>Browser: Decodes text payload: "OFF-CCS"
    
    Browser->>Browser: validateScannedOfficeCode("OFF-CCS")
    
    alt QR Code Mismatched Assigned Office
        Browser-->>Visitor: Render Destructive Alert "QR Mismatch! Scanned different office."
    else QR Code Matched Assigned Office
        Browser->>Server: POST ?/checkIn { logId, officeCode: 'OFF-CCS' }
        Server->>SupaDB: SELECT id FROM public.offices WHERE code = 'OFF-CCS' AND is_active = true
        SupaDB-->>Server: Return office record
        
        Server->>SupaDB: UPDATE public.visitor_logs SET status = 'checked_in', check_in_time = now() WHERE id = logId
        SupaDB-->>Server: 200 OK
        
        Server-->>Browser: { success: true, checkInTime: timestamp }
        Browser->>QrEngine: stop() & clear()
        Browser->>Browser: Update activeOfficialPass reactive state
        Browser-->>Visitor: Render Checked-In Pass Badge in Bottom HUD
    end
```

---

# 8. Sequence Diagram of Visitor Check-Out & Session Resolution

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor Actor as Visitor / Staff / Auto-Cron
    participant App as Calapexis Application
    participant DB as Database

    Actor->>App: Trigger Check-Out
    App->>DB: Stamp Departure Time & Set status = 'checked_out'
    DB-->>App: Session Resolved
    App-->>Actor: Clear Pass & Archive Visitor Record
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor Actor as Visitor / Staff Member
    participant Browser as Browser Client
    participant Server as SvelteKit Server Action
    participant SupaDB as PostgreSQL (public.visitor_logs)
    participant Realtime as Supabase Realtime Channel

    Actor->>Browser: Clicks "Check Out" Button
    Browser->>Server: POST ?/checkout { logId }
    
    Server->>SupaDB: UPDATE public.visitor_logs SET status = 'checked_out', check_out_time = now() WHERE id = logId
    SupaDB-->>Server: 200 OK (Updated Row)
    
    SupaDB->>Realtime: Broadcast postgres_changes UPDATE (status = 'checked_out')
    
    Server-->>Browser: { success: true }
    Browser->>Browser: localStorage.removeItem('calapexis_active_pass')
    Browser->>Browser: Reset UI state to Gate Registration Overlay
    Browser-->>Actor: Display Check-Out Confirmation Toast
```

---

# 9. Sequence Diagram of Dijkstra Campus Pathfinding & GPS Navigation

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor Visitor as Visitor
    participant UI as Interactive Map
    participant PathEngine as Pathfinding Engine
    participant GPS as Device GPS

    Visitor->>UI: Selects Destination Building / Office
    GPS-->>PathEngine: Sends current User Coordinates
    PathEngine->>PathEngine: Compute Shortest Walking Route
    PathEngine-->>UI: Draw Route Line with Walking Time & Distance
    UI-->>Visitor: Displays Turn-by-Turn Navigation Path
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor Visitor as Visitor
    participant Browser as Leaflet Canvas (/v)
    participant Sensors as navigator.geolocation & DeviceOrientation
    participant Dijkstra as Dijkstra Routing Engine
    participant Server as Supabase Data Layer

    Browser->>Server: SELECT * FROM public.map_edges
    Server-->>Browser: Array of GeoJSON pathway waypoints
    Browser->>Dijkstra: Build Adjacency Graph from edges & node coordinates
    
    Sensors->>Browser: watchPosition() returns { latitude, longitude }
    Sensors->>Browser: DeviceOrientation returns compass heading
    Browser->>Browser: Update pulsing user marker & compass arrow on map
    
    Visitor->>Browser: Selects Destination Office (e.g. "CCS Dean's Office")
    Browser->>Dijkstra: calculatePathfindingRoutes(userLat, userLng, destOfficeId)
    
    Dijkstra->>Dijkstra: Find nearest graph entry node
    Dijkstra->>Dijkstra: Execute Dijkstra algorithm (Primary & Alternative routes)
    Dijkstra->>Dijkstra: Compute total distance meters & walking minutes ETA
    
    Dijkstra-->>Browser: Return { primaryPathPoints, distanceMeters, walkTimeSecs }
    Browser->>Browser: L.polyline(primaryPathPoints, { color: '#2563eb', weight: 5 }).addTo(leafMap)
    Browser-->>Visitor: Render Navigation Floating Pill Bar (Distance & Walk Time)
```

---

# 10. Sequence Diagram of Campus Infrastructure Management & Asset Storage

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor Admin as System Administrator
    participant UI as Buildings & Rooms Manager
    participant Storage as Supabase Storage Bucket
    participant DB as PostgreSQL Database

    Admin->>UI: Inputs Building / Room details and uploads Photo
    UI->>Storage: Upload Landmark Image
    Storage-->>UI: Return Image CDN URL
    UI->>DB: Save Building / Room / Office Record
    DB-->>UI: Record Saved
    UI-->>Admin: Show Updated Building in Management Grid
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant Browser as /dashboard/admin/buildings
    participant Server as SvelteKit Server (+page.server.ts)
    participant SupaStorage as storage.buckets('campus-assets')
    participant SupaDB as PostgreSQL Tables

    Admin->>Browser: Fills Building Form & selects image file
    Browser->>Server: POST ?/upsertBuilding (FormData with File)
    
    opt Image File Provided
        Server->>SupaStorage: storage.from('campus-assets').upload('landmarks/building.jpg', fileBuffer)
        SupaStorage-->>Server: Return publicUrl
    end
    
    Server->>SupaDB: INSERT INTO public.buildings (name, code, floors, x_coord, y_coord, image_url) VALUES (...) ON CONFLICT DO UPDATE
    SupaDB-->>Server: 200 OK (Building Record)
    
    Server-->>Browser: { success: true }
    Browser->>Browser: Invalidate page data
    Browser-->>Admin: Display Building with Photo Preview in Grid
```

---

# 11. Sequence Diagram of Interactive Map Graph Edge Authoring

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor Admin as Administrator
    participant MapUI as Visual Edge Canvas
    participant DB as PostgreSQL Database

    Admin->>MapUI: Selects From Node & To Node
    Admin->>MapUI: Clicks along campus walkway to plot waypoints
    Admin->>MapUI: Clicks "Save Pathway Edge"
    MapUI->>DB: Insert Graph Edge & GeoJSON coordinates
    DB-->>MapUI: Edge Saved Successfully
    MapUI-->>Admin: Display Pathfinding Line on Map
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin
    participant Browser as /dashboard/admin/edges
    participant Leaflet as Leaflet Map Canvas
    participant Server as SvelteKit Server Action
    participant SupaDB as PostgreSQL (public.map_edges)

    Admin->>Browser: Selects from_node (Building 1) & to_node (Building 2)
    Admin->>Leaflet: Clicks on map to add pathway points
    Leaflet->>Browser: Captures click event { latlng: { lat, lng } }
    Browser->>Browser: Append to waypoints array & render interactive vertex markers
    
    opt Direct Drag Adjustment
        Admin->>Leaflet: Drags vertex marker to refine coordinate
        Leaflet->>Browser: Updates waypoint index coordinate in state
    end
    
    Admin->>Browser: Clicks "Save Pathway Edge"
    Browser->>Server: POST ?/saveEdge { from_node, to_node, path: JSON.stringify(waypoints) }
    
    Server->>SupaDB: INSERT INTO public.map_edges (from_node, to_node, path) VALUES ($1, $2, $3::jsonb)
    SupaDB-->>Server: 200 OK
    
    Server-->>Browser: { success: true }
    Browser->>Leaflet: Render permanent edge polyline on graph canvas
    Browser-->>Admin: Show Success Toast "Pathway edge saved"
```

---

# 12. Sequence Diagram of Standalone Print Audit Report Engine

## High-Level (Simplified)
```mermaid
sequenceDiagram
    actor User as Admin / Staff User
    participant Logbook as Logbook Dashboard
    participant PrintEngine as Standalone Print Window
    participant Printer as System Print / PDF Dialog

    User->>Logbook: Filters records and clicks "Print Audit Report"
    Logbook->>PrintEngine: Generate HTML Letterhead & Date Groups
    PrintEngine->>PrintEngine: Open isolated popup window
    PrintEngine->>Printer: Trigger window.print()
    Printer-->>User: Outputs Official PDF / Paper Audit Report
```

## Low-Level (Technical)
```mermaid
sequenceDiagram
    autonumber
    actor User as Admin / Staff
    participant Browser as /dashboard/logs
    participant Generator as generatePrintableReportHTML()
    participant Popup as Standalone Window (window.open)
    participant SystemPrint as Native Browser Print Service

    User->>Browser: Selects Date Range & Clicks "Print Audit Report"
    Browser->>Generator: Passes filteredVisitorList data
    
    Generator->>Generator: Sort & Group records by Date (e.g. '2026-08-20')
    Generator->>Generator: Format Date Header Bars ('Monday, Aug 20')
    Generator->>Generator: Format Cross-Day Check-Out timestamps
    Generator->>Generator: Inject BISU Campus Seal, Letterhead, & Table CSS
    
    Generator-->>Browser: Return complete self-contained HTML document string
    
    Browser->>Popup: const printWin = window.open('', '_blank')
    Browser->>Popup: printWin.document.write(printableHTML)
    Browser->>Popup: printWin.document.close()
    
    Popup->>SystemPrint: printWin.print()
    SystemPrint-->>User: Open Print Preview / Save as PDF Dialog
```
