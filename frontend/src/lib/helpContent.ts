export interface HelpItem { q: string; a: string }
export interface HelpSection { title: string; items: HelpItem[] }

export const ADMIN_HELP: HelpSection[] = [
  {
    title: "Getting started",
    items: [
      { q: "How do I sign in as Admin?", a: "Choose the Admin tab on the sign-in page, enter your User ID (e.g. ADMIN001) and password, then tap Sign In. You are signed out automatically after 30 minutes of inactivity unless you tick Remember me." },
      { q: "How do I share the app with inspectors?", a: "Click Share App in the top bar. Copy the install link, share it on WhatsApp, or let the inspector scan the QR code. They open the link and tap Install App." },
      { q: "How do I log out?", a: "Click Logout in the top bar and confirm in the dialog." },
    ],
  },
  {
    title: "Dashboard",
    items: [
      { q: "What do the dashboard cards show?", a: "Total and active employees, plus today's visits split into Completed, Pending, Not Visited and Verification Failed. All numbers update automatically." },
      { q: "What do the charts show?", a: "The donut shows visit status for the last 7 days, the area chart shows assigned vs verified visits per day, and the bar chart shows each employee's assigned, completed, pending and missed visits." },
    ],
  },
  {
    title: "Master data",
    items: [
      { q: "How do I add an employee?", a: "Go to Employees → Add Employee. Fill name, Employee ID (3–12 letters/digits), phone, email, department, designation, joining date and a login password (min. 6 characters), then save. The employee signs in with that ID and password." },
      { q: "How do I reset an employee's password?", a: "Employees → ⋯ menu → Edit, type a new password and save. Their old sessions stop working." },
      { q: "How do I deactivate or delete an employee?", a: "Use the ⋯ menu on the employee row. Deactivate blocks sign-in and new visits. Delete is blocked while the employee has open visits, so reassign or close them first." },
      { q: "How do I download an employee's work history?", a: "Employees → ⋯ menu → Download Work History. Choose All Time or a date range to get a PDF." },
      { q: "How do I manage Departments and Location Types?", a: "Use the Departments and Location Types pages. Click Add, enter a unique name and code (1–6 letters). An entry that is still in use cannot be deleted." },
      { q: "How do I add a location?", a: "Locations → Add Location. Search a place, click on the map, type latitude/longitude, or use Use Current Location. Set the verification radius, then save." },
      { q: "What is the verification radius?", a: "The distance (10–2000 m) within which an employee must be to check in or out. It is set per location. The default is 100 m." },
      { q: "Why can't I delete a location?", a: "Locations that already have visit records can't be deleted. Mark them Inactive instead." },
    ],
  },
  {
    title: "Operations",
    items: [
      { q: "How do I assign a visit?", a: "Assign Visit → pick Employee → Location → Schedule (date, optional start/end time, priority) → Instructions → Review → Assign Visit. The employee is notified." },
      { q: "Why do I get 'location already scheduled'?", a: "A location can be booked by only one employee per date. Choose another date or location." },
      { q: "How do I track visits live?", a: "Open Visit Monitoring. Filter by date, employee, location or status, or search by visit ID. Click a row to open full details." },
      { q: "What are the visit statuses?", a: "Assigned, In Progress, Location Reached, Checked In, Completed, Pending, Not Visited, Verification Failed, Expired and Cancelled." },
      { q: "What does the Visit Map show?", a: "Locations for the chosen date, coloured by status: green verified, yellow in progress or pending, red missed or failed, blue assigned. A line shows the distance from the site to where the employee verified." },
      { q: "What can I do inside a visit's detail panel?", a: "See employee, assignment, check-in and check-out evidence with photos, GPS and distance. You can Override Check-In/Out, Mark Important, or Delete Visit." },
      { q: "What is an Admin Override?", a: "If an employee cannot check in or out (for example no GPS at site), use Override. Enter a reason of at least 10 characters. The stage is marked verified without GPS or photo and is recorded as Admin Override." },
      { q: "What does 'Mark Important' do?", a: "Important visits are highlighted, and their photos are kept for 30 days instead of 7." },
      { q: "How long are photos stored?", a: "7 days normally and 30 days for visits marked important. After that the photo is deleted, but the visit record stays." },
    ],
  },
  {
    title: "Reports",
    items: [
      { q: "How do I download a report?", a: "Reports → set filters (dates, planning type, check-in/out by, employee, department, location, status, importance) → Download CSV (opens as Excel) or Print / Save as PDF." },
      { q: "How do I clear filters?", a: "Click Reset Filters at the top of the Reports page." },
    ],
  },
];

export const EMPLOYEE_HELP: HelpSection[] = [
  {
    title: "Getting started",
    items: [
      { q: "How do I sign in?", a: "Open the app, choose the Employee tab, enter your Employee ID (e.g. EMP001) and password. Forgot your password? Ask your administrator to reset it." },
      { q: "How do I install the app on my phone?", a: "Open the install link from your admin and tap Install App. On iPhone use Safari → Share → Add to Home Screen." },
      { q: "Why was I signed out?", a: "For security you are signed out after 30 minutes of inactivity. Tick Remember me on the sign-in page to stay signed in longer." },
    ],
  },
  {
    title: "Home & Tasks",
    items: [
      { q: "What does the Home page show?", a: "Today's visits, how many are done or open, and an 'Up next' card for your next open visit." },
      { q: "What are the Today, Upcoming and Open tabs?", a: "Today shows visits for today, Upcoming shows future dates (you can filter by date), and Open shows every visit that is not finished yet." },
      { q: "Who assigned my visit?", a: "Each card is tagged Admin (assigned by your administrator) or Self (planned by you)." },
    ],
  },
  {
    title: "Planning a visit",
    items: [
      { q: "How do I plan my own visit?", a: "Tasks → Plan a Visit. Choose a date and an active location, add optional notes, and save." },
      { q: "Why can't I choose a location?", a: "A location can be booked by only one employee per date, and you can't book the same location twice on one date." },
      { q: "Can I edit or delete a planned visit?", a: "Yes, but only your own self-planned visits that have not started. Open the visit and tap Edit or Delete. Visits assigned by Admin can only be deleted by Admin." },
    //   { q: "What is the 9:00 AM rule?", a: "After 9:00 AM (IST) on the visit day, deleting a plan marks it Cancelled and keeps it in history. Changing the location keeps your original plan in history." },
    ],
  },
  {
    title: "Doing a visit (Check-In / Check-Out)",
    items: [
      { q: "How do I do a visit step by step?", a: "1) Open the visit and tap Start visit (only on the visit date). 2) Tap Verify location for Check-In. 3) Capture a photo and tap Submit Check-In. 4) When your work is finished, verify your location again, take a photo and Submit Check-Out." },
      { q: "Verification says I am too far away. What do I do?", a: "Move closer, within the radius shown on the visit (usually 100 m), stand outdoors and tap Verify again." },
      { q: "GPS accuracy is low. What do I do?", a: "Go to an open area, wait a few seconds and try again. The server rejects readings with very poor accuracy." },
      { q: "I can't start my second visit. Why?", a: "You must check out of your previous visit first. A banner shows which visit to complete, with a link to it." },
      { q: "The camera does not open.", a: "Allow camera permission in your browser or phone settings. If it still fails, tap Use Device Camera to take a photo with your phone camera." },
      { q: "I have no internet at the site.", a: "Your check-in/out is saved on the device and uploaded automatically when you are back online." },
      { q: "I cannot check in at all. What now?", a: "Contact your administrator. They can apply an Admin Override with a reason." },
      { q: "What happens if I miss the time window?", a: "The visit becomes Not Visited (never started) or Expired (started but not finished)." },
    ],
  },
  {
    title: "History, notifications & profile",
    items: [
      { q: "Where can I see past visits?", a: "My Visits shows completed and missed visits. Filter by From/To date and tap Download Report for a PDF." },
      { q: "How do notifications work?", a: "The bell icon shows alerts such as a new visit assigned or a deadline passed. Allow notifications when asked to hear a sound alert." },
      { q: "How do I switch to dark mode?", a: "Tap the sun/moon icon at the top." },
      { q: "How do I sign out?", a: "Profile → Sign out." },
    ],
  },
];