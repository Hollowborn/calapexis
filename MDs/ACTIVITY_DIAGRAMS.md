# Calapexis System Activity Diagrams

This document contains **Activity Diagrams** representing operational workflows, business rules, decision diamonds, and database interactions for the **Calapexis Campus Visitor Management & Navigation System**.

Both **High-Level (Simplified)** and **Low-Level (Technical)** diagrams follow the standardized academic flowchart conventions:
- **Terminal Nodes**: Oblong / Stadium shapes `([START])` and `([END])`.
- **Process Steps**: Standard rectangles `[Process / Action]`.
- **Database Operations**: Cylinder shapes `[(Database Operation (Read / Write / Delete))]`.
- **Decisions / Branches**: Diamond shapes `{Decision Question?}` with branch labels (`|YES|`, `|NO|`, `|CREATE|`, etc.).
- **Long Processes**: Divided into **Part A** and **Part B** using off-page circular connectors `((A))` to prevent vertical clutter.

---

# 1. Activity Diagram of User Login & RBAC Routing

## High-Level (Simplified)
```mermaid
flowchart TD
    START([START]) --> NavLogin[Navigate to Login Page]
    NavLogin --> EnterCreds[Enter Email & Password]
    EnterCreds --> SubmitLogin[Click Sign In]
    
    SubmitLogin --> QueryAuth[(Query Auth & User Profile<br/>Read)]
    QueryAuth --> CheckCreds{Are credentials valid?}
    
    CheckCreds -->|NO| ShowErr[Display Invalid Login Error]
    ShowErr --> EnterCreds
    
    CheckCreds -->|YES| CheckRole{What is the user role?}
    
    CheckRole -->|ADMIN| DashAdmin[Redirect to Admin Dashboard]
    CheckRole -->|STAFF| DashStaff[Redirect to Staff Logbook]
    CheckRole -->|SECURITY| DashGuard[Redirect to Security Gate Portal]
    
    DashAdmin --> END([END])
    DashStaff --> END
    DashGuard --> END
```

## Low-Level (Technical)
```mermaid
flowchart TD
    START([START]) --> RenderLoginPage[Render /auth/login Page]
    RenderLoginPage --> InputCredentials[User inputs Email & Password]
    InputCredentials --> PostAction[Submit POST /auth/login via Form Action]
    
    PostAction --> SupaAuthVerify{supabase.auth.signInWithPassword}
    
    SupaAuthVerify -->|ERROR| Return400[Return 400 Invalid Credentials]
    Return400 --> ShowToast[Display Error Toast Alert]
    ShowToast --> InputCredentials
    
    SupaAuthVerify -->|SUCCESS| QueryProfiles[(Query public.profiles Table<br/>Read User Role & Office ID)]
    
    QueryProfiles --> SetAuthCookies[Set Secure HttpOnly Session Cookies<br/>sb-access-token & sb-refresh-token]
    
    SetAuthCookies --> EvaluateRole{Evaluate Role Attribute}
    
    EvaluateRole -->|role == 'admin'| RedirectAdmin[303 Redirect to /dashboard]
    EvaluateRole -->|role == 'staff'| RedirectStaff[303 Redirect to /dashboard/logs]
    EvaluateRole -->|role == 'security'| RedirectGuard[303 Redirect to /dashboard/guard]
    
    RedirectAdmin --> END([END])
    RedirectStaff --> END
    RedirectGuard --> END
```

---

# 2. Activity Diagram of User Updating Profile & Credentials

## High-Level (Simplified)
```mermaid
flowchart TD
    START([START]) --> OpenProfile[Open Profile Modal]
    OpenProfile --> FetchUserProfile[(Query Current Profile & Role<br/>Read)]
    FetchUserProfile --> SelectTab{Which action does user select?}
    
    SelectTab -->|GENERAL| EditGeneral[Edit Name & Contact Info]
    SelectTab -->|SECURITY| EditPassword[Enter New Password & Confirm]
    
    EditGeneral --> ClickSaveGeneral[Click Save Profile]
    EditPassword --> ClickSaveSecurity[Click Update Password]
    
    ClickSaveGeneral --> WriteProfile[(Update User Profile Record<br/>Write)]
    ClickSaveSecurity --> WriteAuthPass[(Update Password Hash in Auth DB<br/>Write)]
    
    WriteProfile --> ShowToast[Display Success Notification]
    WriteAuthPass --> ShowToast
    ShowToast --> END([END])
```

## Low-Level (Technical)
```mermaid
flowchart TD
    START([START]) --> TriggerProfileModal[Click Avatar to open GlobalProfileManager.svelte]
    TriggerProfileModal --> FetchProfile[(Query public.profiles by auth.uid<br/>Read)]
    FetchProfile --> PopulateFields[Populate Email, Role, Office Badge]
    
    PopulateFields --> UserActionType{What action does user choose?}
    
    UserActionType -->|UPDATE PROFILE| InputMetadata[Modify Display Metadata]
    UserActionType -->|CHANGE PASSWORD| InputPassword[Enter New Password]
    
    InputPassword --> ValidatePassword{Is password length >= 6 and matching?}
    ValidatePassword -->|NO| ShowValidationErr[Display Mismatch / Length Error]
    ShowValidationErr --> InputPassword
    
    ValidatePassword -->|YES| PostPasswordAction[POST ?/updatePassword Server Action]
    InputMetadata --> PostProfileAction[POST ?/updateProfile Server Action]
    
    PostPasswordAction --> SupaAuthUpdate[(Call supabase.auth.updateUser<br/>Write)]
    PostProfileAction --> SupaDbUpdate[(UPDATE public.profiles SET updated_at = now<br/>Write)]
    
    SupaAuthUpdate --> CloseModalSuccess[Close Modal & Display Success Toast]
    SupaDbUpdate --> CloseModalSuccess
    CloseModalSuccess --> END([END])
```

---

# 3. Activity Diagram of Admin Managing User Accounts

## High-Level (Simplified)
```mermaid
flowchart TD
    START([START]) --> NavUsers[Navigate to User Accounts Module]
    NavUsers --> FetchUsers[(Query Users & Profiles Table<br/>Read)]
    FetchUsers --> DisplayTable[Display User Management Table]
    
    DisplayTable --> ChooseAction{What action does admin choose?}
    
    ChooseAction -->|CREATE| FillCreateForm[Fill Email, Password, Role & Office]
    ChooseAction -->|UPDATE| FillEditForm[Update Assigned Role or Office Desk]
    ChooseAction -->|DELETE| ConfirmDelete[Confirm Account Removal]
    
    FillCreateForm --> InsertUser[(Insert New User Account<br/>Write)]
    FillEditForm --> UpdateUser[(Update User Profile<br/>Write)]
    ConfirmDelete --> DeleteUser[(Delete/Archive User Account<br/>Write)]
    
    InsertUser --> DisplaySuccess[Display Success Notification]
    UpdateUser --> DisplaySuccess
    DeleteUser --> DisplaySuccess
    
    DisplaySuccess --> RefreshTable[Refresh User Accounts Table]
    RefreshTable --> END([END])
```

## Low-Level (Technical)
```mermaid
flowchart TD
    START([START]) --> RequestUsersPage[GET /dashboard/admin/users]
    RequestUsersPage --> QueryProfilesAndOffices[(Query public.profiles JOIN public.offices<br/>Read)]
    QueryProfilesAndOffices --> RenderUsersTable[Render User Accounts Table with Role Badges]
    
    RenderUsersTable --> AdminActionChoice{Select User Operation}
    
    AdminActionChoice -->|ADD USER| OpenAddDialog[Open Create User Modal]
    AdminActionChoice -->|EDIT USER| OpenEditDialog[Open Edit Role & Office Modal]
    AdminActionChoice -->|DELETE USER| OpenDeleteDialog[Open Delete Confirmation Modal]
    
    OpenAddDialog --> SubmitCreate[POST ?/createUser { email, password, role, officeId }]
    OpenEditDialog --> SubmitUpdate[POST ?/updateUser { userId, role, officeId }]
    OpenDeleteDialog --> SubmitDelete[POST ?/deleteUser { userId }]
    
    SubmitCreate --> CallServiceCreate[(Call auth.admin.createUser<br/>Write)]
    CallServiceCreate --> TriggerProfileSync[(Trigger on_auth_user_created<br/>Write to public.profiles)]
    
    SubmitUpdate --> DirectProfileUpdate[(UPDATE public.profiles SET role, office_id<br/>Write)]
    SubmitDelete --> CallServiceDelete[(Call auth.admin.deleteUser<br/>Write)]
    
    TriggerProfileSync --> InvalidateData[Invalidate SvelteKit Load Cache]
    DirectProfileUpdate --> InvalidateData
    CallServiceDelete --> InvalidateData
    
    InvalidateData --> ShowToastNotification[Display Operation Success Toast]
    ShowToastNotification --> END([END])
```

---

# 4. Activity Diagram of 3-Step Visitor Gate Check-In Wizard

## High-Level (Simplified)

### Part A: Personal Details & Live Photo
```mermaid
flowchart TD
    START([START]) --> OpenVisitorPortal[Visitor opens Gate Portal /v]
    OpenVisitorPortal --> CheckLocalCache[(Read Saved Visitor Profile from Storage<br/>Read)]
    
    CheckLocalCache --> HasSavedProfile{Is saved profile found?}
    
    HasSavedProfile -->|YES| FastTrackStep3[Auto-fill Personal Info & Skip to Step 3]
    FastTrackStep3 --> ConnA((A))
    
    HasSavedProfile -->|NO| Step1_EnterInfo[Step 1: Enter Name & Contact Info]
    Step1_EnterInfo --> Step2_MountCamera[Step 2: Capture Live Face Selfie]
    Step2_MountCamera --> CaptureSelfie[Snap Selfie Snapshot]
    CaptureSelfie --> ConnA((A))
```

### Part B: Destination Selection & Pass Generation
```mermaid
flowchart TD
    ConnA((A)) --> Step3_SelectDestination[Step 3: Open Destination Office Picker]
    Step3_SelectDestination --> QueryOffices[(Query Available Offices Table<br/>Read)]
    QueryOffices --> PickOffice[Select Target Office & Purpose]
    
    PickOffice --> SubmitGateRegistration[Click Check In & Unlock Map]
    
    SubmitGateRegistration --> UploadPhoto[(Upload Selfie Snapshot to Storage<br/>Write)]
    UploadPhoto --> InsertVisitorRecord[(Insert Visitor Profile & Visit Log<br/>Write)]
    
    InsertVisitorRecord --> CacheActivePass[(Save Active Pass to Device Storage<br/>Write)]
    CacheActivePass --> DisplayDigitalPass[Display Verified Digital Pass & Launch Map]
    DisplayDigitalPass --> END([END])
```

## Low-Level (Technical)

### Part A: Personal Details & Webcam Snapshot
```mermaid
flowchart TD
    START([START]) --> OpenVisitorPortal[Visitor opens /v on Mobile / Kiosk]
    OpenVisitorPortal --> CheckLocalCache[(Read localStorage for saved visitor profile<br/>Read)]
    
    CheckLocalCache --> HasSavedProfile{Is saved profile found?}
    
    HasSavedProfile -->|YES| FastTrackStep3[Auto-fill Personal Info & Skip to Step 3]
    FastTrackStep3 --> ConnA((A))
    
    HasSavedProfile -->|NO| Step1_EnterInfo[Step 1: Enter First, Middle, Last Name & Phone]
    Step1_EnterInfo --> ValidateNames{Are First & Last Name provided?}
    
    ValidateNames -->|NO| ShowStep1Error[Display Required Name Error]
    ShowStep1Error --> Step1_EnterInfo
    
    ValidateNames -->|YES| Step2_MountCamera[Step 2: Initialize Device Selfie Camera]
    Step2_MountCamera --> ClickCapture[Visitor clicks Capture Snapshot]
    
    ClickCapture --> RenderCanvas[Draw video frame to HTML5 Canvas]
    RenderCanvas --> CompressBase64[Export compressed JPEG base64 DataURL]
    CompressBase64 --> ConnA((A))
```

### Part B: Office Selection, Pass Generation & Map Unlock
```mermaid
flowchart TD
    ConnA((A)) --> Step3_SelectDestination[Step 3: Open Destination Office Picker Dialog]
    Step3_SelectDestination --> QueryOffices[(Query public.offices Table<br/>Read)]
    QueryOffices --> PickOffice[Select Destination Office & Desk]
    
    PickOffice --> PickPurpose[Select Purpose from Presets or Type Custom]
    PickPurpose --> SubmitGateRegistration[Click Check In & Unlock Map]
    
    SubmitGateRegistration --> UploadPhoto[(Upload Selfie to storage.buckets 'campus-assets'<br/>Write)]
    UploadPhoto --> InsertVisitorDir[(Insert into public.registered_visitors<br/>Write)]
    InsertVisitorDir --> InsertVisitorLog[(Insert into public.visitor_logs with pass_code<br/>Write)]
    
    InsertVisitorLog --> CacheActivePass[(Save pass to localStorage calapexis_active_pass<br/>Write)]
    CacheActivePass --> UnlockCampusMap[Unlock Interactive Leaflet Campus Map Canvas]
    UnlockCampusMap --> DisplayBottomHUD[Display Digital Pass Details in Floating Bottom HUD]
    DisplayBottomHUD --> END([END])
```

---

# 5. Activity Diagram of Google Authentication & Profile Auto-Fill

## High-Level (Simplified)
```mermaid
flowchart TD
    START([START]) --> OpenVisitorGate[Open Visitor Registration /v]
    OpenVisitorGate --> ClickGoogleBtn[Click 'Fill-Up via Google' Button]
    ClickGoogleBtn --> RedirectGoogleAuth[Redirect to Google OAuth Consent]
    RedirectGoogleAuth --> AuthorizeAccount[User signs in with Google Account]
    
    AuthorizeAccount --> FetchGoogleProfile[(Query & Verify Google Identity<br/>Read)]
    FetchGoogleProfile --> WriteVisitorData[(Save / Update Visitor Directory<br/>Write)]
    
    WriteVisitorData --> ReturnToPortal[Callback Redirect to Calapexis]
    ReturnToPortal --> PopulateFields[Auto-fill Name, Email, and Avatar Photo]
    PopulateFields --> SkipToOfficeSelect[Fast-track directly to Office Selection]
    SkipToOfficeSelect --> END([END])
```

## Low-Level (Technical)
```mermaid
flowchart TD
    START([START]) --> TriggerGoogleAuth[Visitor clicks Google Sign-In on /v]
    TriggerGoogleAuth --> InitOAuthCall[Call signInWithGoogle with redirect to /auth/callback]
    InitOAuthCall --> Redirect302[302 Redirect to accounts.google.com]
    
    Redirect302 --> UserConsents[User completes Google OAuth Challenge]
    UserConsents --> CallbackRoute[Redirect GET /auth/callback?code=AUTH_CODE]
    
    CallbackRoute --> ExchangeToken[(Exchange code with Supabase Auth for Session<br/>Read)]
    ExchangeToken --> ParseGoogleMetadata[Extract full_name, given_name, email, avatar_url]
    
    ParseGoogleMetadata --> RedirectPortal[303 Redirect to /v with pre-filled state]
    RedirectPortal --> SetReactiveState[Populate firstName, lastName, photoUrl, email]
    SetReactiveState --> RenderVerifiedBadge[Render 'Google Account Details Auto-Filled' Badge]
    RenderVerifiedBadge --> SetStep3[Set registrationStep = 3]
    SetStep3 --> END([END])
```

---

# 6. Activity Diagram of Security Gate Pass Verification

## High-Level (Simplified)
```mermaid
flowchart TD
    START([START]) --> GuardOpensQueue[Security Guard opens Gate Command Portal]
    GuardOpensQueue --> FetchPending[(Query Pending Visitor Passes<br/>Read)]
    FetchPending --> InspectVisitorPass[Review Visitor Selfie, Name & Purpose]
    
    InspectVisitorPass --> GuardDecision{What is the Guard's Decision?}
    
    GuardDecision -->|APPROVE| ApprovePass[Click Approve Pass]
    GuardDecision -->|REJECT| OpenRejectModal[Click Reject Pass & Enter Reason]
    
    ApprovePass --> UpdateStatusApproved[(Update verification_status = 'approved'<br/>Write)]
    OpenRejectModal --> UpdateStatusRejected[(Update verification_status = 'rejected'<br/>Write)]
    
    UpdateStatusApproved --> NotifyVisitor[Instant Realtime Push to Visitor Device]
    UpdateStatusRejected --> NotifyVisitor
    
    NotifyVisitor --> END([END])
```

## Low-Level (Technical)
```mermaid
flowchart TD
    START([START]) --> MountGuardDashboard[GET /dashboard/guard]
    MountGuardDashboard --> SubscribeRealtime[(Subscribe to supabase_realtime public.visitor_logs<br/>Read)]
    SubscribeRealtime --> RenderPendingStream[Render stream of passes where verification_status == 'pending']
    
    RenderPendingStream --> GuardActionSelect{Guard Action}
    
    GuardActionSelect -->|APPROVE| SubmitApprove[POST ?/approvePass { logId }]
    GuardActionSelect -->|REJECT| FillRejectReason[Input specific rejection notes in Dialog]
    
    FillRejectReason --> SubmitReject[POST ?/rejectPass { logId, reason }]
    
    SubmitApprove --> ExecDbApprove[(UPDATE public.visitor_logs SET verification_status = 'approved'<br/>Write)]
    SubmitReject --> ExecDbReject[(UPDATE public.visitor_logs SET verification_status = 'rejected', rejection_reason = reason<br/>Write)]
    
    ExecDbApprove --> BroadcastCdcEvent[Postgres triggers Realtime CDC broadcast]
    ExecDbReject --> BroadcastCdcEvent
    
    BroadcastCdcEvent --> VisitorDeviceSync[Visitor WebSocket receives updated payload]
    
    VisitorDeviceSync --> CheckApprovedStatus{Is pass approved?}
    CheckApprovedStatus -->|YES| RenderVerifiedHUD[Switch Visitor UI to Verified Pass & GPS Navigation]
    CheckApprovedStatus -->|NO| RenderDeclinedCard[Display 'Pass Declined' Screen with Reason]
    
    RenderVerifiedHUD --> END([END])
    RenderDeclinedCard --> END
```

---

# 7. Activity Diagram of Office Desk QR Code Scanning & Check-In

## High-Level (Simplified)
```mermaid
flowchart TD
    START([START]) --> ReachDestination[Visitor arrives at assigned Office / Desk]
    ReachDestination --> OpenScanner[Tap 'Scan Office QR Desk' on Map HUD]
    OpenScanner --> PointCamera[Point smartphone camera at Door QR Code]
    
    PointCamera --> QueryOfficeCode[(Query & Verify Scanned Office Code in Database<br/>Read)]
    QueryOfficeCode --> ScanQrResult{Does scanned code match assigned office?}
    
    ScanQrResult -->|NO| ShowMismatchError[Display 'Incorrect Office Location' Warning]
    ShowMismatchError --> PointCamera
    
    ScanQrResult -->|YES| UpdateCheckIn[(Record Check-In Timestamp in Database<br/>Write)]
    UpdateCheckIn --> DisplayVerifiedBadge[Display Checked-In Verified Status on Pass]
    DisplayVerifiedBadge --> END([END])
```

## Low-Level (Technical)
```mermaid
flowchart TD
    START([START]) --> ClickScanHudButton[Visitor clicks 'Scan Office QR Desk' in /v HUD]
    ClickScanHudButton --> MountHtml5Qrcode[Initialize Html5QrcodeInstance with facingMode: 'environment']
    MountHtml5Qrcode --> StreamVideoFeed[Stream live 10fps camera frames]
    
    StreamVideoFeed --> InputModeChoice{How is office code acquired?}
    
    InputModeChoice -->|QR SCAN| DecodeQrFrame[Html5Qrcode decodes text payload: 'OFF-CCS']
    InputModeChoice -->|MANUAL ENTRY| TypeManualCode[User enters code in manual fallback input]
    
    DecodeQrFrame --> ValidateDeskCode[Execute validateScannedOfficeCode]
    TypeManualCode --> ValidateDeskCode
    
    ValidateDeskCode --> VerifyOfficeMatch{Does code match prePassData.officeId / officeCode?}
    
    VerifyOfficeMatch -->|MISMATCH| TriggerAlertBanner[Display Destructive Alert 'Mismatched Office Location']
    TriggerAlertBanner --> StreamVideoFeed
    
    VerifyOfficeMatch -->|MATCH| SubmitCheckInAction[Submit POST ?/checkIn { logId, officeCode }]
    SubmitCheckInAction --> VerifyOfficeActive[(SELECT id FROM public.offices WHERE code = 'OFF-CCS'<br/>Read)]
    
    VerifyOfficeActive --> UpdateLogRecord[(UPDATE public.visitor_logs SET status = 'checked_in', check_in_time = now<br/>Write)]
    
    UpdateLogRecord --> StopCameraService[qrScannerInstance.stop & qrScannerInstance.clear]
    StopCameraService --> CloseModal[Close Scanner Dialog]
    CloseModal --> SetOfficialPassState[Update activeOfficialPass state in Browser]
    SetOfficialPassState --> RenderActiveHudBadge[Render green 'CHECKED IN' Badge on HUD]
    RenderActiveHudBadge --> END([END])
```

---

# 8. Activity Diagram of Visitor Check-Out Process (Manual & Scheduled)

## High-Level (Simplified)
```mermaid
flowchart TD
    START([START]) --> SelectCheckoutType{Select Check-Out Method}
    
    SelectCheckoutType -->|VISITOR SELF| VisitorClicksCheckout[Visitor clicks Check Out on Mobile HUD]
    SelectCheckoutType -->|STAFF MANUAL| StaffClicksCheckout[Staff clicks Check Out in Dashboard Logbook]
    SelectCheckoutType -->|NIGHTLY CRON| MidnightJobRuns[Automated Midnight Cron Job triggers]
    
    VisitorClicksCheckout --> UpdateCheckoutStatus[(Record Departure Timestamp & status = 'checked_out'<br/>Write)]
    StaffClicksCheckout --> UpdateCheckoutStatus
    MidnightJobRuns --> UpdateCheckoutStatus
    
    UpdateCheckoutStatus --> ClearPassState[(Clear Active Pass from Local Storage<br/>Delete)]
    ClearPassState --> ResetGateScreen[Reset Visitor view to Gate Screen]
    ResetGateScreen --> END([END])
```

## Low-Level (Technical)
```mermaid
flowchart TD
    START([START]) --> IdentifyTriggerSource{Identify Trigger Source}
    
    IdentifyTriggerSource -->|CLIENT SELF-ACTION| UserSelfClick[Visitor clicks Check Out in /v HUD]
    IdentifyTriggerSource -->|STAFF DESK ACTION| StaffClickRow[Staff clicks Check Out row in /dashboard/logs]
    IdentifyTriggerSource -->|PG_CRON ROUTINE| PgCronTrigger[pg_cron fires at 23:59 UTC nightly]
    
    UserSelfClick --> PostSelfCheckout[POST ?/checkout { logId }]
    StaffClickRow --> PostStaffCheckout[POST ?/checkout { logId }]
    PgCronTrigger --> InvokeSqlProcedure[Invoke public.auto_checkout_unresolved_visitors]
    
    PostSelfCheckout --> ExecSingleUpdate[(UPDATE public.visitor_logs SET status = 'checked_out', check_out_time = now WHERE id = logId<br/>Write)]
    PostStaffCheckout --> ExecSingleUpdate
    InvokeSqlProcedure --> ExecBulkUpdate[(UPDATE public.visitor_logs SET status = 'checked_out', check_out_time = now WHERE status = 'checked_in'<br/>Write)]
    
    ExecSingleUpdate --> BroadcastCheckoutEvent[Supabase Realtime broadcasts postgres_changes event]
    ExecBulkUpdate --> BroadcastCheckoutEvent
    
    BroadcastCheckoutEvent --> ClientSyncReceiver[Browser client receives checkout notification]
    ClientSyncReceiver --> RemoveLocalStorage[(localStorage.removeItem 'calapexis_active_pass'<br/>Delete)]
    
    RemoveLocalStorage --> ResetReactivePassState[Set activeOfficialPass = null and prePassData = null]
    ResetReactivePassState --> OpenGateOverlayModal[Re-open Fullscreen Gate Check-In Overlay]
    OpenGateOverlayModal --> END([END])
```

---

# 9. Activity Diagram of Campus Map Pathfinding & GPS Routing

## High-Level (Simplified)

### Part A: Destination & GPS Acquisition
```mermaid
flowchart TD
    START([START]) --> OpenMap[Open Campus Map Portal]
    OpenMap --> FetchMapData[(Query Campus Buildings & Pathway Edges<br/>Read)]
    FetchMapData --> AcquireGPS[Acquire Device GPS Coordinates & Orientation]
    AcquireGPS --> SelectDestination[User searches and selects Target Office]
    SelectDestination --> ConnA((A))
```

### Part B: Route Computation & Navigation
```mermaid
flowchart TD
    ConnA((A)) --> ComputeRoute[Calculate Shortest Walking Path on Graph]
    ComputeRoute --> DrawPolyline[Draw Turn-by-Turn Route Polyline on Map]
    DrawPolyline --> DisplayStats[Display Walking Distance and ETA Mins]
    DisplayStats --> FollowPath[Visitor follows path to destination building]
    FollowPath --> END([END])
```

## Low-Level (Technical)

### Part A: Destination Selection & Hardware GPS Positioning
```mermaid
flowchart TD
    START([START]) --> MountMapCanvas[Initialize Leaflet Map Canvas on /v]
    MountMapCanvas --> LoadMapEdges[(Query public.map_edges Table<br/>Read)]
    LoadMapEdges --> ConstructGraph[Build adjacency graph data structure]
    
    MountMapCanvas --> RequestGpsPermission{Is GPS permission granted?}
    
    RequestGpsPermission -->|YES| WatchGpsPosition[navigator.geolocation.watchPosition]
    WatchGpsPosition --> RenderGpsMarker[Render pulsing blue user location marker on map]
    
    RequestGpsPermission -->|NO| UseGateDefaultCoords[Fallback to Campus Main Gate Coordinates]
    UseGateDefaultCoords --> RenderGpsMarker
    
    RenderGpsMarker --> ListenCompassOrientation[window.addEventListener 'deviceorientation']
    ListenCompassOrientation --> RotateCompassHeading[Rotate directional heading bearing icon]
    
    RotateCompassHeading --> UserSelectsDestination[User searches or selects target Office / Building]
    UserSelectsDestination --> ConnA((A))
```

### Part B: Dijkstra Pathfinding & Turn-by-Turn Waypoint Rendering
```mermaid
flowchart TD
    ConnA((A)) --> ExecuteDijkstraAlgorithm[Run Dijkstra shortest path algorithm on graph]
    ExecuteDijkstraAlgorithm --> FindNearestEntryNode[Find closest map vertex to user coordinates]
    
    FindNearestEntryNode --> ComputePrimaryAndAltPaths[Calculate Primary and Alternative Path Points]
    ComputePrimaryAndAltPaths --> CalculateMetersAndETA[Compute total distance in meters and walking ETA]
    
    CalculateMetersAndETA --> DrawLeafletPolyline[Draw L.polyline with #2563eb on Leaflet canvas]
    DrawLeafletPolyline --> RenderFloatingPillHUD[Display Floating Navigation Pill Bar with Footsteps & Clock]
    
    RenderFloatingPillHUD --> VisitorWalksRoute[Visitor follows polyline walking path across campus]
    VisitorWalksRoute --> ArriveAtTargetLandmark[Visitor reaches destination building]
    ArriveAtTargetLandmark --> END([END])
```

---

# 10. Activity Diagram of Campus Infrastructure Management (Buildings, Rooms, Offices)

## High-Level (Simplified)
```mermaid
flowchart TD
    START([START]) --> OpenInfraPortal[Admin opens Campus Infrastructure Portal]
    OpenInfraPortal --> FetchInfraData[(Query Buildings, Rooms & Offices Table<br/>Read)]
    FetchInfraData --> SelectCategory{Which entity does admin manage?}
    
    SelectCategory -->|BUILDINGS| ManageBuildings[Add / Edit Building Details & Landmark Photo]
    SelectCategory -->|ROOMS| ManageRooms[Add / Edit Room Number, Name & Floor Level]
    SelectCategory -->|OFFICES| ManageOffices[Add / Edit Department Office & Desk Binding]
    
    ManageBuildings --> CommitChanges[(Save to Supabase Database & Storage<br/>Write)]
    ManageRooms --> CommitChanges
    ManageOffices --> CommitChanges
    
    CommitChanges --> RefreshMapMarkers[Refresh Real-Time Campus Map Landmarks]
    RefreshMapMarkers --> END([END])
```

## Low-Level (Technical)
```mermaid
flowchart TD
    START([START]) --> RequestBuildingsPage[GET /dashboard/admin/buildings]
    RequestBuildingsPage --> QueryAllInfra[(Query public.buildings, public.rooms, public.offices<br/>Read)]
    QueryAllInfra --> RenderManagementTabs[Render Buildings Grid, Rooms Table, Offices Table]
    
    RenderManagementTabs --> SelectAdminAction{Select Form Operation}
    
    SelectAdminAction -->|UPSERT BUILDING| OpenBuildingModal[Open Building Modal Form]
    SelectAdminAction -->|UPSERT ROOM| OpenRoomModal[Open Room Modal Form]
    SelectAdminAction -->|UPSERT OFFICE| OpenOfficeModal[Open Office Modal Form]
    
    OpenBuildingModal --> CheckImageProvided{Is landmark image file uploaded?}
    CheckImageProvided -->|YES| UploadImageStorage[(Upload file to storage.buckets 'campus-assets'<br/>Write)]
    CheckImageProvided -->|NO| SkipImageUpload[Retain existing image_url]
    
    UploadImageStorage --> SubmitBuildingAction[POST ?/upsertBuilding]
    SkipImageUpload --> SubmitBuildingAction
    
    OpenRoomModal --> SubmitRoomAction[POST ?/upsertRoom]
    OpenOfficeModal --> SubmitOfficeAction[POST ?/upsertOffice]
    
    SubmitBuildingAction --> InsertBuildingDb[(INSERT/UPDATE public.buildings<br/>Write)]
    SubmitRoomAction --> InsertRoomDb[(INSERT/UPDATE public.rooms<br/>Write)]
    SubmitOfficeAction --> InsertOfficeDb[(INSERT/UPDATE public.offices<br/>Write)]
    
    InsertBuildingDb --> InvalidatePageCache[Invalidate SvelteKit Load Functions]
    InsertRoomDb --> InvalidatePageCache
    InsertOfficeDb --> InvalidatePageCache
    
    InvalidatePageCache --> DisplaySuccessNotification[Display Operation Success Toast]
    DisplaySuccessNotification --> END([END])
```

---

# 11. Activity Diagram of Map Edge & Pathway Configuration

## High-Level (Simplified)

### Part A: Node Selection & Pathway Plotting
```mermaid
flowchart TD
    START([START]) --> OpenEdgeEditor[Admin opens Map Edges Editor]
    OpenEdgeEditor --> LoadExistingEdges[(Query Map Edges Table<br/>Read)]
    LoadExistingEdges --> SelectNodes[Select Start Building and End Building]
    SelectNodes --> ClickMapWaypoints[Click on Map to Plot Walking Path Waypoints]
    ClickMapWaypoints --> ConnA((A))
```

### Part B: Vertex Adjustment & Saving
```mermaid
flowchart TD
    ConnA((A)) --> RefineWaypoints[Adjust or Drag Waypoint Vertex Coordinates]
    RefineWaypoints --> ClickSave[Click Save Pathway Edge]
    ClickSave --> WriteEdgeData[(Insert Pathway Edge & Coordinates into Database<br/>Write)]
    WriteEdgeData --> UpdateGraph[Update Real-Time Campus Pathfinding Graph]
    UpdateGraph --> END([END])
```

## Low-Level (Technical)

### Part A: Node Selection & Interactive Waypoint Plotting
```mermaid
flowchart TD
    START([START]) --> OpenEdgeEditor[Admin opens Map Edges Editor /dashboard/admin/edges]
    OpenEdgeEditor --> LoadExistingEdges[(Query public.map_edges Table<br/>Read)]
    LoadExistingEdges --> RenderGraphCanvas[Render existing pathway polylines on Leaflet map]
    
    RenderGraphCanvas --> SelectStartNode[Select From Building start node from Combobox]
    SelectStartNode --> SelectEndNode[Select To Building destination node from Combobox]
    
    SelectEndNode --> ListenMapClickEvents[Enable Leaflet map click listener]
    ListenMapClickEvents --> AdminClicksMap[Admin clicks along campus walkway on map]
    
    AdminClicksMap --> AppendWaypoint[Append lat, lng coordinate to waypoints array]
    AppendWaypoint --> RenderDynamicPolyline[Render dynamic editable polyline with vertex markers]
    RenderDynamicPolyline --> ConnA((A))
```

### Part B: Direct Vertex Drag Adjustment & Database Persistence
```mermaid
flowchart TD
    ConnA((A)) --> VertexAdjustmentChoice{Does admin want to adjust waypoints?}
    
    VertexAdjustmentChoice -->|DRAG VERTEX| DragMarker[Drag vertex marker on map to refine coordinate position]
    VertexAdjustmentChoice -->|DELETE ROW| RemoveWaypoint[Delete specific coordinate row from table]
    VertexAdjustmentChoice -->|NO ADJUSTMENT| ProceedToSave[Proceed directly to save]
    
    DragMarker --> ProceedToSave
    RemoveWaypoint --> ProceedToSave
    
    ProceedToSave --> ClickSaveEdgeButton[Click 'Save Pathway Edge' Button]
    ClickSaveEdgeButton --> SubmitSaveAction[POST ?/saveEdge { from_node, to_node, path: JSON.stringify(waypoints) }]
    
    SubmitSaveAction --> InsertEdgeRecord[(INSERT INTO public.map_edges from_node, to_node, path<br/>Write)]
    InsertEdgeRecord --> RefreshPathfindingGraph[Re-render updated pathfinding network on map]
    RefreshPathfindingGraph --> DisplaySaveToast[Display 'Pathway edge successfully saved' Toast]
    DisplaySaveToast --> END([END])
```

---

# 12. Activity Diagram of Generating & Printing Audit Reports

## High-Level (Simplified)
```mermaid
flowchart TD
    START([START]) --> OpenLogbookView[Admin / Staff opens Visitor Logbook]
    OpenLogbookView --> FetchLogs[(Query Visitor Logs & Registered Profiles<br/>Read)]
    FetchLogs --> ApplyFilters[Apply Search Query, Date Range & Status Filters]
    
    ApplyFilters --> ClickPrintReport[Click 'Print Audit Report' Button]
    ClickPrintReport --> BuildLetterheadDoc[Generate Clean Document with BISU Calape Seal & Letterhead]
    BuildLetterheadDoc --> GroupByDate[Group Records by Date e.g. 'Monday, Aug 20']
    
    GroupByDate --> OpenStandalonePrintWindow[Open Isolated Print Window & Trigger System Print]
    OpenStandalonePrintWindow --> SavePdfOrPrintPaper[Save as PDF Document or Print to Paper]
    SavePdfOrPrintPaper --> END([END])
```

## Low-Level (Technical)
```mermaid
flowchart TD
    START([START]) --> RequestLogsPage[GET /dashboard/logs]
    RequestLogsPage --> ExecuteScopedQuery[(SELECT * FROM public.visitor_logs JOIN public.registered_visitors WHERE office_id = scopedOfficeId<br/>Read)]
    
    ExecuteScopedQuery --> RenderLogbookTable[Render SvelteKit Data Table with Search & Date Filters]
    RenderLogbookTable --> UserFilterInteractions[User filters table by date preset or custom range]
    
    UserFilterInteractions --> TriggerPrintReportClick[User clicks 'Print Audit Report']
    TriggerPrintReportClick --> CallGenerateHTML[Execute generatePrintableReportHTML(filteredVisitors)]
    
    CallGenerateHTML --> SortRecordsByDate[Sort visitor entries chronologically by check_in_time]
    SortRecordsByDate --> GroupRecordsByDateKey[Group records by date string key 'YYYY-MM-DD']
    
    GroupRecordsByDateKey --> FormatDateHeaderBars[Format date bars e.g. '📅 Monday, Aug 20 • X Records']
    FormatDateHeaderBars --> FormatCrossDayCheckouts[Format cross-day check-out times 'Aug 8, 11:00 AM' / 'Still In']
    
    FormatCrossDayCheckouts --> AssembleHtmlDocument[Assemble standalone HTML with BISU Header, Seal, & Print CSS]
    AssembleHtmlDocument --> OpenPopupWindow[const printWin = window.open('', '_blank')]
    
    OpenPopupWindow --> WriteHtmlStream[printWin.document.write(printableHTML)]
    WriteHtmlStream --> CloseDocumentStream[printWin.document.close]
    
    CloseDocumentStream --> TriggerNativePrint[printWin.print()]
    TriggerNativePrint --> OpenSystemPrintDialog[Browser opens native Print Preview / Save as PDF Dialog]
    OpenSystemPrintDialog --> END([END])
```
