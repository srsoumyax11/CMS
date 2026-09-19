# Synergy CMS: Demo & Pitch Strategy

## The Pitch Narrative
*Most hackathon teams pitch "features." You are going to pitch "reality." Your core narrative is that you built a system that survives contact with a real campus network.*

**Opening Hook (1 Minute):**
"Every college management system has a login page and a database. But most hackathon projects break the moment they hit the reality of a campus. We didn’t just build the Synergy CMS to look good; we built it to survive. We focused on three things that usually get ignored until it’s too late: an airtight security model to prevent data leaks, a resilient rate limiter that understands hostel NAT networks, and an adoption strategy that doesn't assume every student owns a smartphone."

## The Live Demo Walkthrough (4 Minutes)

### Phase 1: The Core Loop & The Offline PWA (1 Minute)
*Goal: Show the baseline functionality, then immediately prove resilience.*
1. **Action:** Log in as an Admin. Create a new Public Notice ("Library Hours Extended").
2. **Action:** Switch to a Student view. See the notice.
3. **The Flex:** Open Chrome DevTools, go to the Network tab, and check "Offline". 
4. **Talk Track:** "But what happens when a student walks between buildings and loses WiFi? In a standard app, it crashes. In Synergy CMS, our Service Worker intercepts the failed network call and serves the cached notice seamlessly. We designed for patchy campus networks."
5. **Action:** Refresh the page while offline. The notice is still there. Uncheck "Offline".

### Phase 2: Security & IDOR Protection (2 Minutes)
*Goal: Prove the RBAC and row-level security isn't just theory. Show a failure on purpose.*
1. **Action:** As Student A, file a *Private* Complaint ("Broken lock on Hostel door").
2. **Action:** Copy the Complaint ID from the URL or UI.
3. **Action:** Log out, and log in as Student B. 
4. **The Flex:** Paste Student A's Complaint ID into Student B's URL bar (or use an API tool like Postman on screen).
5. **Action:** Hit Enter. The screen shows a hard `403 Forbidden` / "Not authenticated / Unauthorized" error.
6. **Talk Track:** "This is the most common vulnerability in student-built portals: Insecure Direct Object Reference. If student B guesses student A's complaint ID, they usually get to read it. We implemented strict row-level ownership checks across the entire system. Student B gets a 403. Our RBAC model enforces this at the database level."

### Phase 3: The Faculty Roster & Cross-Tenant Security (1 Minute)
*Goal: Show that even privileged roles are boxed in.*
1. **Action:** Log in as Faculty A. View the attendance roster for their assigned course (Course X).
2. **Action:** Copy the Slot ID. 
3. **Action:** Log in as Faculty B (who teaches Course Y). Try to hit the API for Faculty A's Slot ID.
4. **Action:** Another hard `403 Forbidden` error.
5. **Talk Track:** "Even users with high-level permissions are restricted to their specific tenants. Faculty can mark attendance, but they can only ever see the rosters for the specific slots they own. The system is locked down laterally as well as vertically."

## The Closing (1 Minute)

"Finally, software is useless if people don't use it. We aren't relying on a mandate. Our adoption plan rolls out high-value, read-only features like the Timetable and Mess Menu first to build daily habits, before we cut over critical security workflows like Outpasses. And for students without smartphones, our offline-capable PWA runs in Kiosk mode at the warden's office, ensuring 100% equity."

"We didn't just build a prototype; we built a system that is secure, resilient, and ready for deployment. Thank you."
