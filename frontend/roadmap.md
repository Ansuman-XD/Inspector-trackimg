# Inspector Tracking System Roadmap

## Done
- [x] Data layer (storage, auth, employees, locations, tasks/status engine, notifications, reports CSV, GPS/Haversine)
- [x] Seed data, theme (light/dark), PWA manifest/icons/service worker config
- [x] Login, admin shell, dashboard, employees, locations (map picker + place search), assign-visit wizard, task drawer, photo viewer
- [x] /admin/monitoring, /admin/map, /admin/reports (CSV + print)
- [x] Employee area: bottom nav, dashboard, tasks, visit flow, visits history, profile

## Current update (Saswat)
- [x] Remove admin Settings page, notification bell, admin profile
- [x] Employee password set/editable by admin; used at employee login
- [x] Per-location verification radius
- [x] Employee self-planning (PlanVisitDialog), edit/delete own planned visits, 9 AM IST cutoff history rules
- [x] Check-in / check-out two-stage visit flow with sequential lock
- [x] taskService: plan/updatePlan/deleteByEmployee/remove/override, stage GPS + photo
- [x] TaskDrawer: stage cards, admin override (reason), admin delete
- [x] Employee Tasks page: "Plan a Visit" button → PlanVisitDialog
- [x] Verified: typecheck clean, build OK, browser end-to-end (admin assign + conflict block → employee start/check-in GPS verify → plan-a-visit → admin drawer stages + override + delete)

## Rebranding & admin/employee upgrade round (Saswat)
- [x] Renamed app to "Inspector Tracking System" (login, shells, route heads, manifest, README, CSV/PDF)
- [x] Admin dashboard: Recent Activity removed, Employee Activity chart full width
- [x] Departments page (/admin/departments) + Location Types page (/admin/location-types); sidebar grouped Overview / Master Data / Operations
- [x] Dynamic department dropdown in employee forms/filters; dynamic location-type dropdown in location forms/filters
- [x] Employees: Download CSV button; 3-dot menu "Download Work History" (All Time / date range) -> branded PDF
- [x] Locations: Download CSV; detail drawer "Download Visits History" CSV
- [x] Visit Monitoring: Download CSV respecting active filters (15 columns)
- [x] Reports: Planning Visit / Check-In By / Check-Out By filters wired to reportService; CSV uses filterTasks
- [x] Employee tasks: date filter on Upcoming/Open tabs; My Visits: from/to filter + Reset + Download Report PDF
- [x] Print CSS page-break rules; jsPDF/jspdf-autotable branded PDFs
- [x] Verified: typecheck clean, build OK, Playwright (admin pages, dialogs, CSV + PDF downloads real files, no page errors)
