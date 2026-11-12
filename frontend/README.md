# RailTrack Connect

Build a **fully functional, production-style Progressive Web App (PWA)** for an **Indian Railway Field Visit & Employee Task Management System**.

This is a **client demonstration/proposal version**, but it MUST NOT look or behave like a simple demo, static prototype, template, or collection of dummy screens.

It must feel like a **real enterprise software product that is already operational**.

### Core technical limitation

For this version:

* Frontend only
* No backend
* No external database
* Use browser localStorage as the temporary data layer
* Use real browser APIs wherever possible
* Real browser GPS
* Real browser camera
* Real task creation and assignment
* Real status changes
* Real filtering/searching
* Real dashboard calculations
* Real notifications inside the application
* Real local persistence
* Real CSV export
* Real print reports
* Real PWA installation

The architecture must be designed so that a backend/database can later replace localStorage without rebuilding the UI.

Do NOT repeatedly expose phrases such as "demo data", "fake", "mock", "simulated" throughout the interface.

The user should experience the application as a real operational system.

---

# PRODUCT

Application name:

**RailTrack**

Full title:

**RailTrack Field Visit Management System**

Subtitle:

**Employee Location Visit & Task Monitoring**

Create a premium enterprise identity.

The application is intended for field employees who are assigned locations to visit and for administrators who need to monitor whether those locations were actually visited.

---

# PRODUCT EXPERIENCE

The application has two completely different experiences.

## ADMIN

Admin operates primarily from:

* Desktop
* Laptop
* Tablet

Admin can:

* Manage employees
* Manage locations
* Assign daily visits
* Set visit schedules
* Monitor employee visits
* Monitor GPS verification
* View visit photos
* Track pending visits
* Track missed visits
* View maps
* Generate reports
* Manage settings

## EMPLOYEE

Employee operates primarily from:

* Android phone
* iPhone

Employee can:

* View assigned visits
* See location details
* Start a visit
* Navigate to the location
* Share current GPS location
* Verify proximity
* Capture a visit photograph
* Submit visit verification
* View visit history
* View completed/pending tasks

---

# DESIGN PHILOSOPHY

The UI must look like a **premium enterprise SaaS product**.

Think:

* Government enterprise software
* Railway field operations
* Workforce management
* Location verification
* Professional inspection software

Avoid:

* Generic admin dashboard appearance
* Excessive gradients
* Cartoonish design
* Excessive glassmorphism
* Huge decorative graphics
* Unnecessary animations
* Fake-looking statistics
* Placeholder-looking cards

Use:

* Strong information hierarchy
* Professional typography
* Consistent spacing
* Clean cards
* Subtle shadows
* Thin borders
* Professional icons
* Clear status colors
* High-quality responsive layouts

---

# COLOR SYSTEM

Primary:

Deep railway-inspired red / maroon accent.

Supporting colors:

* Navy / charcoal
* White
* Slate gray
* Green for verified/success
* Amber for pending
* Red for failed
* Blue for active/information

Do not overuse the primary color.

Use accent colors mainly for:

* Buttons
* Active navigation
* Status indicators
* Important actions

---

# LIGHT / DARK MODE

Default:

**LIGHT MODE**

Provide a theme switcher.

Themes:

* Light
* Dark

Save selected theme in localStorage.

Every component must properly support both themes.

---

# RESPONSIVE DESIGN

This is extremely important.

Do NOT simply shrink desktop components for mobile.

Build two optimized experiences.

### Desktop Admin

Use:

Sidebar

Top navigation

Wide tables

Dashboard grids

Map panels

Charts

Detailed task drawers

### Mobile Employee

Use:

Bottom navigation

Large cards

Large buttons

Touch-friendly controls

Sticky action buttons

Minimal typing

Simple GPS workflow

Camera-first workflow

---

# LOGIN

Create a high-quality enterprise login page.

Desktop:

Two-column layout.

Left:

RailTrack branding and field-management illustration.

Right:

Login card.

Mobile:

Single-column login.

Fields:

Employee ID / User ID

Password

Role:

Admin

Employee

Button:

**Sign In**

Additional:

**Remember me**

Forgot password UI can be included visually, but because there is no backend it should display an appropriate informational message rather than pretending to send a real email.

---

# AUTHENTICATION

Create a real frontend authentication flow.

Demo users should be stored in localStorage.

Initial users:

ADMIN001
Admin User
Role: Admin

EMP001
Rajesh Kumar
Role: Employee

EMP002
Amit Das
Role: Employee

EMP003
Suresh Pradhan
Role: Employee

Password for demo:

admin123 / employee123

After login:

* Create session
* Store logged-in user
* Protect routes
* Redirect based on role

Admin cannot access employee screens.

Employee cannot access admin screens.

If a user attempts to access unauthorized routes, redirect them appropriately.

Logout must actually clear the session.

---

# DATA ARCHITECTURE

Do NOT scatter localStorage calls throughout React components.

Create a clean repository/service architecture.

For example:

src/

services/

storageService.ts

authService.ts

employeeService.ts

locationService.ts

taskService.ts

notificationService.ts

reportService.ts

verificationService.ts

Use typed interfaces.

All application data must persist after refresh.

---

# INITIAL DATA

On first application launch, automatically initialize realistic operational data.

Create:

At least 8 employees.

At least 12 locations.

At least 25 tasks.

Tasks should have different states:

* Assigned
* In Progress
* Verified
* Pending
* Not Visited
* Expired

Create realistic dates and times around the current date.

Do NOT use obviously fake values such as:

"Test Location"

"Test Employee"

"Lorem ipsum"

All demo data should look realistic.

---

# ADMIN DASHBOARD

Admin dashboard should immediately look like an active operational system.

Header:

**Good Morning, Admin**

Show current date.

Top-right:

Notifications

Theme

Profile

Logout

---

## KPI CARDS

Show:

### Total Employees

### Active Employees

### Today's Visits

### Completed Visits

### Pending Visits

### Not Visited

### Verification Failed

The values must be dynamically calculated from localStorage.

Never hardcode dashboard numbers.

If an employee completes a task, the dashboard must automatically update.

---

# DASHBOARD CHARTS

Create dynamic charts.

### Visit Status

Donut chart:

Verified

Pending

Not Visited

Failed

### Daily Visit Trend

Last 7 days.

### Employee Activity

Employee-wise:

Assigned

Completed

Pending

Missed

All charts must calculate from actual localStorage data.

---

# LIVE ACTIVITY

Add:

**Recent Activity**

Example:

"Rajesh Kumar completed a visit at Bhubaneswar Railway Station."

"A new task was assigned to Amit Das."

"Suresh Kumar's location verification failed."

"Visit deadline expired."

These activities should be generated from actual actions.

Do not create a static activity list only.

---

# EMPLOYEE MANAGEMENT

Admin can:

Add

Edit

View

Deactivate

Delete

employees.

Fields:

Full Name

Employee ID

Phone

Email

Department

Designation

Joining Date

Status

Profile Photo

Employee ID must be unique.

Prevent duplicate IDs.

Add:

Search

Department filter

Status filter

Sorting

Pagination if required.

---

# LOCATION MANAGEMENT

Admin can create real visit locations.

Fields:

Location Name

Description

Address

Latitude

Longitude

Location Type

Status

Location Type examples:

Railway Station

Railway Office

Maintenance Yard

Track Inspection Point

Level Crossing

Depot

Other

---

# LOCATION PICKER

Provide two ways to select coordinates.

### Option 1

Enter latitude and longitude manually.

### Option 2

**Use Current Location**

Use browser:

navigator.geolocation

### Option 3

Map selection.

If possible, use a frontend map library such as Leaflet with OpenStreetMap.

Allow admin to click the map and select coordinates.

When location is selected:

Automatically update:

Latitude

Longitude

---

# LOCATION DETAILS

When opening a location:

Show:

Location name

Address

Description

Coordinates

Map

Assigned visits

Completed visits

Pending visits

Last visit

Last verified employee

---

# TASK ASSIGNMENT

Create a highly polished:

**Assign Visit**

workflow.

Step-based interface:

### Step 1 — Select Employee

Search employee.

### Step 2 — Select Location

Search location.

### Step 3 — Schedule

Visit date

Start time

End time

### Step 4 — Instructions

Add visit instructions.

### Step 5 — Review

Display a complete summary.

Button:

**Assign Visit**

After assignment:

Show success confirmation.

Immediately update employee task list and admin dashboard.

---

# TASK VALIDATION

Prevent:

* Missing employee
* Missing location
* Missing date
* Invalid time
* End time before start time
* Duplicate assignment for same employee/location/date unless intentionally allowed

Show proper validation messages.

---

# TASK STATUS ENGINE

Task status must automatically change based on actions.

Statuses:

**Assigned**

Task created but employee has not started.

**In Progress**

Employee starts the visit.

**Location Reached**

Employee GPS enters allowed radius.

**Verified**

GPS + photo successfully submitted.

**Pending**

Assigned but not completed.

**Not Visited**

Deadline passed without successful verification.

**Verification Failed**

Employee attempted verification but GPS requirement was not satisfied.

**Expired**

Visit deadline passed.

Status should be represented consistently throughout the application.

---

# EMPLOYEE HOME

After employee login:

Show:

**Good Morning, Rajesh 👋**

"Here are your visits for today."

Summary:

Today's Visits

Completed

Pending

Verified

---

# EMPLOYEE TASK CARDS

Each card:

Location

Address

Scheduled time

Priority

Status

Instructions

Distance when available

CTA:

**View Visit**

Cards must be optimized for mobile.

---

# EMPLOYEE VISIT SCREEN

When employee opens a task:

Display:

## Visit Details

Location

Address

Description

Date

Start time

Deadline

Priority

Instructions

---

## LOCATION

Show map.

Show:

Assigned location

Coordinates

Address

Button:

**Open Directions**

Open Google Maps directions using latitude/longitude.

---

# START VISIT

Button:

**Start Visit**

When clicked:

* Validate current date/time
* Change status to In Progress
* Record visit start timestamp
* Save to localStorage
* Show GPS verification screen

---

# REAL GPS VERIFICATION

This must use actual browser geolocation.

Request:

navigator.geolocation.getCurrentPosition()

Show professional GPS loading UI:

**Checking your location**

Then show:

Current latitude

Current longitude

Assigned latitude

Assigned longitude

Distance

Accuracy

---

# DISTANCE CALCULATION

Use the Haversine formula.

Calculate exact distance between:

Assigned location

Employee current location

Default verification radius:

**100 meters**

---

# VERIFICATION RESULT

If distance <=100 meters:

Display:

**LOCATION VERIFIED**

Green success state.

Show:

"You are within the required verification radius."

Then unlock:

**Continue to Photo Verification**

---

If distance >100 meters:

Display:

**LOCATION NOT VERIFIED**

Show:

"You are approximately 248 meters away from the assigned location."

Then:

"Move closer to the assigned location and try again."

Keep photo submission disabled.

---

# GPS ACCURACY

Also display GPS accuracy when available.

Example:

GPS Accuracy: ±12 meters

If browser reports poor accuracy, show:

"GPS accuracy is currently low. Please wait or move to an open area."

Do not falsely claim accuracy if browser does not provide it.

---

# PHOTO VERIFICATION

After successful GPS verification:

Open:

**Photo Verification**

Use actual browser camera:

navigator.mediaDevices.getUserMedia()

Prefer:

facingMode: "environment"

for mobile rear camera.

Display:

Live camera preview.

Button:

**Capture Photo**

After capture:

Show preview.

Buttons:

Retake

Use Photo

---

# LOCATION-TAGGED VISIT RECORD

After photo capture, create a professional inspection record.

Display photo with a location verification information panel:

RAILTRACK FIELD VISIT

Location:

Bhubaneswar Railway Station

Date:

27 September 2026

Time:

10:42 AM

GPS:

20.xxxxxx, 85.xxxxxx

Distance:

42 meters

GPS:

VERIFIED

Do not claim actual EXIF GPS metadata was embedded.

Instead, create a visual verification record associated with the captured image.

---

# FINAL SUBMISSION

Before final submission show:

### Visit Verification Summary

Employee

Location

Date

Time

Distance

GPS status

Photo

Button:

**Submit Visit**

After submission:

Update:

Task status → Verified

verifiedAt

employeeLatitude

employeeLongitude

distanceFromLocation

photo

photoTimestamp

verificationStatus

Save everything in localStorage.

---

# SUCCESS SCREEN

Show an attractive but professional success state.

Large check icon.

**Visit Successfully Verified**

"Your visit has been recorded."

Show:

Location

Verified time

Distance

Photo thumbnail

Button:

**Back to My Visits**

---

# ADMIN MONITORING

Create:

**Visit Monitoring**

This should be one of the most important admin modules.

Table:

Employee

Location

Date

Time

Status

GPS

Distance

Photo

Actions

---

# MONITORING FILTERS

Filters:

Date

Employee

Location

Status

Priority

Department

Search

Sorting

---

# REAL-TIME FEEL

Because there is no backend, create a local reactive data system.

When an employee completes a visit:

Admin dashboard should reflect it immediately if opened in the same browser session.

When refreshed:

The data must remain.

---

# TASK DETAILS ADMIN

Opening a task should show a professional detail drawer.

Sections:

### Employee

Name

ID

Department

Phone

### Assignment

Location

Date

Time

Instructions

### Verification

GPS status

Assigned coordinates

Employee coordinates

Distance

GPS accuracy

Verification timestamp

### Evidence

Visit photograph

Photo timestamp

Location verification record

---

# PHOTO VIEWER

Clicking a visit photo should open a professional full-screen/lightbox viewer.

Show:

Image

Employee

Location

Timestamp

GPS

Distance

Verification status

---

# ADMIN MAP

Create:

**Visit Map**

Map with location markers.

Marker states:

Green = Verified

Yellow = Pending

Red = Not Visited

Blue = Assigned

Click marker:

Show task details.

If employee coordinates are available, also show employee verification position.

For a verified visit, visually show:

Assigned location → Employee location

and distance.

---

# REPORTS

Create professional reports.

Filters:

Date range

Employee

Department

Location

Status

Generate dynamically.

Summary:

Total Visits

Verified

Pending

Not Visited

Failed

---

# CSV EXPORT

Implement actual browser CSV generation.

Button:

**Export CSV**

Downloaded file should contain:

Employee

Employee ID

Location

Date

Start Time

End Time

Status

GPS Status

Distance

Verification Time

Priority

---

# PRINT REPORT

Implement:

**Print Report**

Use browser print functionality.

Create a clean print layout without sidebar/navigation.

---

# NOTIFICATION SYSTEM

Create a real local notification center.

Notification types:

Task Assigned

Visit Started

Location Verified

Verification Failed

Visit Completed

Deadline Passed

Use localStorage.

Unread notification count must dynamically update.

Clicking a notification marks it read.

---

# EMPLOYEE HISTORY

Employee:

**My Visits**

Tabs:

All

Today

Completed

Pending

Missed

Show visit history.

Each record:

Location

Date

Time

Status

Distance

Photo

Verification

---

# PROFILE

Employee profile:

Profile photo

Name

Employee ID

Department

Designation

Phone

Email

Account status

---

# ADMIN PROFILE

Show:

Admin name

Role

Email

Last login

Logout

---

# SETTINGS

Admin settings:

Theme

Verification radius

Notification preferences

Application preferences

Reset demo environment

---

# VERIFICATION RADIUS

Default:

100 meters.

Allow admin to change it.

Example:

50m

100m

150m

200m

Save in localStorage.

The GPS verification engine must read the configured value dynamically.

---

# DEMO CONTROL CENTER

Because this is a proposal environment, create an optional:

**Demo Controls**

inside Settings.

This must NOT interfere with normal functionality.

Allow the presenter to:

* Reset demo data
* Load fresh realistic dataset
* Simulate a completed task
* Simulate pending task
* Simulate missed task

Also provide:

**GPS Demo Mode**

This allows the presenter to select a predefined simulated coordinate for demonstration when the presenter cannot physically travel to the assigned location.

Clearly label:

**DEMO MODE**

Production-style real GPS should remain the default behavior.

---

# SECURITY-STYLE UX

Even though this is frontend-only, make the UI feel secure.

Include:

* Session timeout UI
* Role-based route protection
* Logout
* Confirmation dialogs
* Form validation
* Unique IDs
* Activity logs

Do not falsely claim enterprise security certifications or backend security.

---

# ERROR STATES

Every operation must have proper error handling.

Examples:

GPS permission denied

GPS unavailable

Camera permission denied

Camera unavailable

Location outside radius

Expired task

Invalid task

Duplicate assignment

Invalid employee

Invalid location

Network-independent operation

No tasks

No results

Use professional toast notifications and error screens.

---

# LOADING STATES

Never leave empty screens while an operation is happening.

Create:

* Skeleton loaders
* GPS loading
* Camera loading
* Saving state
* Processing state

Example:

**Checking your current location...**

---

# MOBILE UX DETAILS

For employee mobile screens:

Minimum touch target:

44px+

Bottom navigation.

Sticky primary action.

Avoid tiny tables.

Convert tables into cards on mobile.

Use mobile-friendly date/time pickers.

Use safe-area spacing for modern phones.

Make camera/GPS buttons large.

---

# DESKTOP UX DETAILS

For admin:

Sidebar width approximately 250px.

Header.

Responsive content area.

Tables should use horizontal scrolling only when necessary.

Use drawers for details.

Use modals for short forms.

Use full-page screens for complex workflows.

---

# PWA

Implement a real PWA.

Include:

manifest

service worker

offline shell

installable app

app icons

standalone display

theme color

The app should be installable on Android and desktop browsers.

---

# OFFLINE BEHAVIOR

Since the current version has no backend:

The core application should remain usable offline after the app shell has been cached.

localStorage data should remain available.

Show a subtle connection status:

Online

Offline

Do not prevent normal demo functionality when offline.

---

# DEMO DATA SHOULD FEEL REAL

Do not use:

John Doe

Test User

Demo Location

Lorem Ipsum

Instead use realistic Indian names and railway-related locations.

Example:

Rajesh Kumar

Amit Das

Suresh Pradhan

Priyanka Mohanty

Anil Kumar

Locations:

Bhubaneswar Railway Station

Cuttack Railway Station

Khurda Road Junction

Puri Railway Station

Railway Maintenance Yard

Railway Engineering Office

Track Inspection Point

Level Crossing

---

# DYNAMIC DATE

Do not hardcode dashboard dates.

Use the user's current date.

Format dates appropriately for India.

Use:

DD MMM YYYY

Example:

27 Sep 2026

Use 12-hour time with AM/PM for the UI.

---

# INDIAN LOCALIZATION

Use:

Indian date formats

Indian phone number format

₹ where monetary values are ever required

IST / Asia/Kolkata where timezone is displayed

Do not introduce unnecessary currency features because this is a visit-management application.

---

# ROUTING

Create clean routes.

Example:

/login

/admin/dashboard

/admin/employees

/admin/locations

/admin/tasks

/admin/monitoring

/admin/map

/admin/reports

/admin/settings

/employee/dashboard

/employee/tasks

/employee/tasks/:id

/employee/visits

/employee/profile

Protect all routes based on authentication and role.

---

# COMPONENT QUALITY

Use reusable components.

Do not create giant components with hundreds/thousands of lines where avoidable.

Use:

TypeScript interfaces

Reusable hooks

Service layer

Utility functions

Validation utilities

GPS utility

Distance calculation utility

LocalStorage repository

---

# IMPORTANT: NO FAKE FUNCTIONALITY

Do not create buttons that do nothing.

Every visible primary button must have a meaningful action.

Examples:

"Assign Visit" → actually creates task.

"Complete Visit" → actually updates task.

"Verify Location" → actually checks GPS.

"Capture Photo" → actually uses camera.

"Export CSV" → actually generates CSV.

"Reset Data" → actually resets localStorage.

"Change Theme" → actually changes theme.

"Logout" → actually logs out.

"Add Employee" → actually adds employee.

"Add Location" → actually adds location.

---

# IMPORTANT: NO STATIC DASHBOARD NUMBERS

All:

KPI values

Charts

Tables

Task counts

Employee statistics

Pending counts

Completed counts

Notifications

must be derived from the localStorage application state.

If the user creates or completes a task, the numbers should change automatically.

---

# FINAL DEMONSTRATION FLOW

The following complete scenario MUST work:

## ADMIN

Login

↓

Dashboard

↓

Add Employee

↓

Add Location

↓

Assign Visit

↓

Select Employee

↓

Select Location

↓

Select Date

↓

Set Time

↓

Add Instructions

↓

Assign

↓

Success

---

## EMPLOYEE

Logout

↓

Employee Login

↓

Employee Dashboard

↓

See New Assignment

↓

Open Visit

↓

View Location

↓

Start Visit

↓

GPS Permission

↓

Check Current Location

↓

Calculate Distance

↓

Within 100m

↓

Location Verified

↓

Open Camera

↓

Capture Photo

↓

Review Photo

↓

Location Verification Record

↓

Submit Visit

↓

Visit Verified

---

## ADMIN

Admin Login

↓

Task Monitoring

↓

See Verified Task

↓

Open Task

↓

See Employee

↓

See Location

↓

See GPS Coordinates

↓

See Distance

↓

See Verification Time

↓

See Visit Photo

↓

Dashboard statistics automatically update

↓

Report automatically updates

---

# QUALITY BAR

Before considering the application complete, verify:

* Login works
* Logout works
* Role protection works
* Admin can add employee
* Employee persists after refresh
* Admin can add location
* Location persists after refresh
* Admin can assign task
* Employee receives task
* Employee can start task
* Browser GPS works
* Haversine distance calculation works
* 100m verification works
* Camera works where browser permissions allow
* Photo persists in localStorage for demo
* Visit verification works
* Task status updates
* Admin sees updated task
* Dashboard statistics update
* Charts update
* Filters work
* Search works
* Notifications work
* CSV export works
* Print report works
* Light theme works
* Dark theme works
* PWA installation works
* Mobile layout works
* Desktop layout works
* Refresh does not destroy data
* Empty states work
* Error states work
* Permission-denied states work

---

# MOST IMPORTANT DESIGN PRINCIPLE

Do NOT present this as:

"Here is a demo of some screens."

Instead build it as:

**"This is a fully operational frontend prototype of a Railway Field Visit Management System."**

Every interaction should feel intentional.

Every action should change application state.

Every dashboard number should come from actual application data.

Every task should have a lifecycle.

Every visit should have evidence.

Every verification should have GPS information.

Every completed visit should produce a clear audit trail.

The result should be impressive enough that when the client opens the application on a laptop and the employee workflow is demonstrated on a phone, it feels like a real software product ready for backend integration.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6e3be289-7680-4042-a818-271dddae6daf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
