from typing import Any, Dict, List

# Core Institutional Knowledge Documents for Chilika Institute of Technology (CIT)
CIT_KNOWLEDGE_DOCUMENTS: List[Dict[str, Any]] = [
    {
        "id": "DOC-SCHED-01",
        "title": "CIT Academic Scheduling Policy & Time Model",
        "category": "timetable_guide",
        "department": None,
        "academic_year": "2026-2027",
        "access_role_minimum": "student",
        "content": """
# Chilika Institute of Technology (CIT) - Academic Scheduling Policy
1. Teaching Week: Monday to Friday.
2. Periods and Hours:
   - Periods P1 to P9 are academic teaching periods (08:00 to 18:00), exactly one hour each:
     * P1: 08:00 - 09:00
     * P2: 09:00 - 10:00
     * P3: 10:00 - 11:00
     * P4: 11:00 - 12:00
     * P5: 12:00 - 13:00
     * Lunch Break: 13:00 to 14:00 (between P5 and P6). No academic classes or laboratory sessions may span across lunch.
     * P6: 14:00 - 15:00
     * P7: 15:00 - 16:00
     * P8: 16:00 - 17:00
     * P9: 17:00 - 18:00
   - Periods P10 to P13 (18:00 to 22:00) are reserved strictly for co-curricular activities, guest lectures, and student club events. Regular classes are forbidden in P10-P13.
3. Laboratory Scheduling Constraint:
   - 3-hour practical laboratories (kind: 'lab') can only begin at P2 (09:00 to 12:00) or P6 (14:00 to 17:00).
4. Faculty Daily Teaching Limit:
   - A faculty member cannot teach more than 4 hours per day under any circumstance (Hard Constraint H11).
5. Accessibility Requirement:
   - Any session or student group marked as requiring accessible venues must be allocated an accessible room on the ground floor or a building with elevator access.
""",
    },
    {
        "id": "DOC-BOOK-02",
        "title": "Venue Booking, Priority & Spectra Fest Week Guidelines",
        "category": "booking_rule",
        "department": None,
        "academic_year": "2026-2027",
        "access_role_minimum": "student",
        "content": """
# CIT Venue Booking & Spectra Tech Fest Priority Rules
1. Spectra Fest Week (Week 7):
   - The annual technical fest Spectra runs during Week 7 of the academic semester.
   - High competition exists for central venues: Main Auditorium (AUD), Seminar Halls (SH-1, SH-2), Open Air Theatre (OAT), and Computer Labs.
2. Official Priority Hierarchy (When two requests contest the same venue at the same time):
   1. Exams (Highest Priority)
   2. Regular Classes
   3. Institute Events (Spectra Inauguration, Keynotes, Convocation)
   4. Guest Lectures
   5. Department Events
   6. Club Events (Lowest Priority)
3. Role Category Caps (Strictly Enforced by Server):
   - Admin (Dean's Office): Can claim up to 'institute_event'.
   - Faculty: Can claim up to 'guest_lecture'.
   - Department Coordinator: Can claim up to 'department_event'.
   - Club Representative: Capped strictly at 'club_event'. A club requesting an institute_event is downgraded to club_event.
4. Approval Security & No Self-Approval:
   - Nobody can approve their own request under any circumstance.
   - Department Coordinators are authorized to approve bookings only for their respective department's laboratories (e.g., CSE coordinator for CS-LAB-1).
   - Only the Admin (Dean's Office) can approve bookings that displace regular classes or institute-wide auditoriums.
5. Ties & Rejections:
   - Tie-breaks between equal-priority requests are resolved by earlier submission timestamp ('submitted_at').
   - Cancelled requests can never be approved.
""",
    },
    {
        "id": "DOC-ROOMS-03",
        "title": "CIT Venues, Capacities & Permitted Uses Catalog",
        "category": "resource_catalog",
        "department": None,
        "academic_year": "2026-2027",
        "access_role_minimum": "student",
        "content": """
# Chilika Institute of Technology Campus Venue Directory
1. Total Campus Venues: 27 rooms across 12 building blocks.
2. Major Auditoriums and Seminar Venues:
   - Main Auditorium (AUD): Admin Block, Capacity 500, Accessible (Yes), Features: Projector, PA System, Stage, AC. Allowed uses: Lecture, Tutorial, Exam, Event.
   - Open Air Theatre (OAT): Campus Green, Capacity 800 (Largest campus venue), Accessible (Yes). Strictly for events only; regular classes are forbidden.
   - Seminar Hall 1 (SH-1): Academic Block A, Capacity 150, Accessible (Yes). For seminars, guest talks, and club cultural plays.
   - Seminar Hall 2 (SH-2): Academic Block B, Capacity 120, Accessible (No, 2nd floor no lift).
3. Specialized Laboratories:
   - CS Lab 1 & 2 (CS-LAB-1, CS-LAB-2): CSE Building, Capacity 80, Equipped with computers, high-speed LAN, AC.
   - Electrical Machines Lab (ELEC-LAB-1): EE-ECE Building, Capacity 60.
   - Electronics Systems Lab (ECE-LAB-1): EE-ECE Building, Capacity 50.
   - Physics Lab (PHY-LAB): Science Block, Capacity 70.
   - Civil Workshop & Engineering Shed: Workshop Shed, Capacity 60.
4. Room Use Restrictions:
   - Seminar halls and Open Air Theatre cannot be scheduled for standard weekly lectures or tutorials.
   - A physics laboratory session can only run in the physics laboratory.
""",
    },
    {
        "id": "DOC-EXAM-04",
        "title": "Midsem Examination Scheduling Regulations",
        "category": "regulation",
        "department": None,
        "academic_year": "2026-2027",
        "access_role_minimum": "student",
        "content": """
# CIT Midsem Examination Scheduling Policy
1. Examination Period: Week 8 (immediately following Spectra fest week).
2. Schedule Days: Monday to Saturday.
3. Daily Exam Slots:
   - Morning Session (AM): 09:30 to 11:30.
   - Afternoon Session (PM): 14:00 to 16:00.
4. Capacity Halving Rule (Hard Constraint E2):
   - To prevent malpractices, effective room seating capacity during examinations is exactly halved (Effective Capacity = Room Capacity / 2).
   - If an exam has 180 students, and the Main Auditorium has 500 regular seats, its exam capacity is 250 (which is sufficient). If a room has 60 seats, it seats 30 examinees.
5. Multi-Room Allocation:
   - Large courses can be split across multiple rooms to satisfy the halved capacity check.
""",
    },
    {
        "id": "DOC-DISRUPT-05",
        "title": "Emergency Schedule Disruption & Rescheduling Protocol",
        "category": "policy",
        "department": None,
        "academic_year": "2026-2027",
        "access_role_minimum": "faculty",
        "content": """
# CIT Rescheduling & Disruption Handling Protocol
1. Disruption Types:
   - Faculty sudden illness / unavailability.
   - Room closure / maintenance emergency.
   - Addition or removal of academic sessions.
2. Stability Objective:
   - The platform rescheduling engine solves for a conflict-free timetable that displaces the minimal possible number of unaffected classes.
3. Human-in-the-Loop Governance:
   - AI and solver proposals cannot silently apply changes to the live timetable.
   - The platform calculates the delta, displays moved sessions, identifies conflicting constraints, and commits changes only after explicit Dean / Admin approval.
""",
    },
]
