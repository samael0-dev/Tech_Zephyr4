import React, { Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import AppShell from "@/components/layout/AppShell";
import RoleGuard, { getDashboardForRole } from "@/components/auth/RoleGuard";

// ─── Spinner fallback ────────────────────────────────────────────────────────
const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#080A09]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-[#B8F36B] animate-spin" />
      <p className="text-slate-400 text-sm tracking-wide">Loading…</p>
    </div>
  </div>
);

// ─── Lazy imports ────────────────────────────────────────────────────────────
const LandingPage            = React.lazy(() => import("@/features/landing/LandingPage"));
const LoginPage              = React.lazy(() => import("@/features/auth/LoginPage"));
const AdminCommandCenter     = React.lazy(() => import("@/features/admin/AdminCommandCenter"));
const TimetableGenWorkspace  = React.lazy(() => import("@/features/admin/TimetableGenWorkspace"));
const MidsemScheduling       = React.lazy(() => import("@/features/admin/MidsemScheduling"));
const SpectraManagement      = React.lazy(() => import("@/features/admin/SpectraManagement"));
const DisruptionManagement   = React.lazy(() => import("@/features/admin/DisruptionManagement"));
const TimetableComparison    = React.lazy(() => import("@/features/admin/TimetableComparison"));
const AnalyticsDashboard     = React.lazy(() => import("@/features/admin/AnalyticsDashboard"));
const AuditLog               = React.lazy(() => import("@/features/admin/AuditLog"));
const DataImportExport       = React.lazy(() => import("@/features/admin/DataImportExport"));
const CoordinatorDashboard   = React.lazy(() => import("@/features/coordinator/CoordinatorDashboard"));
const FacultyDashboard       = React.lazy(() => import("@/features/faculty/FacultyDashboard"));
const FacultyUnavailability  = React.lazy(() => import("@/features/faculty/FacultyUnavailability"));
const ClubDashboard          = React.lazy(() => import("@/features/club/ClubDashboard"));
const StudentDashboard       = React.lazy(() => import("@/features/student/StudentDashboard"));
const CampusPage             = React.lazy(() => import("@/features/campus/CampusPage"));
const BuildingExplorer       = React.lazy(() => import("@/features/campus/BuildingExplorer"));
const FloorExplorer          = React.lazy(() => import("@/features/campus/FloorExplorer"));
const RoomDetail             = React.lazy(() => import("@/features/campus/RoomDetail"));
const RoomSearch             = React.lazy(() => import("@/features/rooms/RoomSearch"));
const BookingHistory         = React.lazy(() => import("@/features/bookings/BookingHistory"));
const BookingForm            = React.lazy(() => import("@/features/bookings/BookingForm"));
const NLBookingComposer      = React.lazy(() => import("@/features/bookings/NLBookingComposer"));
const BookingDetail          = React.lazy(() => import("@/features/bookings/BookingDetail"));
const WeeklyTimetable        = React.lazy(() => import("@/features/timetable/WeeklyTimetable"));
const DailyTimetable         = React.lazy(() => import("@/features/timetable/DailyTimetable"));
const ApprovalManagement     = React.lazy(() => import("@/features/approvals/ApprovalManagement"));
const AIAssistant            = React.lazy(() => import("@/features/assistant/AIAssistant"));
const NotificationsPage      = React.lazy(() => import("@/features/notifications/NotificationsPage"));

// ─── Root Redirect Helper ───────────────────────────────────────────────────
function RootRedirect() {
  const { user, isAuthenticated, loading } = useAuthStore();
  if (loading) return <PageSpinner />;
  if (isAuthenticated && user) {
    return <Navigate to={getDashboardForRole(user.role)} replace />;
  }
  return <Navigate to="/login" replace />;
}

// ─── ProtectedRoute ──────────────────────────────────────────────────────────
function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuthStore();
  const location = useLocation();
  if (loading) return <PageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Outlet />;
}

// ─── AppShell wrapper ────────────────────────────────────────────────────────
function AppShellLayout() {
  return (
    <AppShell>
      <Suspense fallback={<PageSpinner />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

// ─── Router definition ───────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<PageSpinner />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    path: "/landing",
    element: (
      <Suspense fallback={<PageSpinner />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    path: "/login",
    element: (
      <Suspense fallback={<PageSpinner />}>
        <LoginPage />
      </Suspense>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShellLayout />,
        children: [
          // ─── Admin Role Protected Routes ─────────────────────────────────
          {
            element: <RoleGuard allowedRoles={['admin']} />,
            children: [
              { path: "/admin",                    element: <AdminCommandCenter /> },
              { path: "/admin/timetable/generate", element: <TimetableGenWorkspace /> },
              { path: "/admin/midsem",             element: <MidsemScheduling /> },
              { path: "/admin/spectra",            element: <SpectraManagement /> },
              { path: "/admin/disruptions",        element: <DisruptionManagement /> },
              { path: "/admin/timetable/compare",  element: <TimetableComparison /> },
              { path: "/admin/analytics",          element: <AnalyticsDashboard /> },
              { path: "/admin/audit",              element: <AuditLog /> },
              { path: "/admin/data",               element: <DataImportExport /> },
            ],
          },

          // ─── Coordinator Role Protected Routes ───────────────────────────
          {
            element: <RoleGuard allowedRoles={['coordinator']} />,
            children: [
              { path: "/coordinator", element: <CoordinatorDashboard /> },
            ],
          },

          // ─── Faculty Role Protected Routes ───────────────────────────────
          {
            element: <RoleGuard allowedRoles={['faculty']} />,
            children: [
              { path: "/faculty",                  element: <FacultyDashboard /> },
              { path: "/faculty/unavailability",   element: <FacultyUnavailability /> },
            ],
          },

          // ─── Club Role Protected Routes ──────────────────────────────────
          {
            element: <RoleGuard allowedRoles={['club']} />,
            children: [
              { path: "/club", element: <ClubDashboard /> },
            ],
          },

          // ─── Student Role Protected Routes ───────────────────────────────
          {
            element: <RoleGuard allowedRoles={['student']} />,
            children: [
              { path: "/student", element: <StudentDashboard /> },
            ],
          },

          // ─── Approvals (Admin & Coordinator only) ────────────────────────
          {
            element: <RoleGuard allowedRoles={['admin', 'coordinator']} />,
            children: [
              { path: "/approvals", element: <ApprovalManagement /> },
            ],
          },

          // ─── Bookings (Admin, Coordinator, Faculty, Club only) ───────────
          {
            element: <RoleGuard allowedRoles={['admin', 'coordinator', 'faculty', 'club']} />,
            children: [
              { path: "/bookings",                 element: <BookingHistory /> },
              { path: "/bookings/new",             element: <BookingForm /> },
              { path: "/bookings/new/nl",          element: <NLBookingComposer /> },
              { path: "/bookings/:id",             element: <BookingDetail /> },
            ],
          },

          // ─── Shared Authenticated Routes (All 5 Roles) ───────────────────
          { path: "/campus",                                         element: <CampusPage /> },
          { path: "/campus/:buildingId",                             element: <BuildingExplorer /> },
          { path: "/campus/:buildingId/floor/:floor",               element: <FloorExplorer /> },
          { path: "/campus/:buildingId/floor/:floor/room/:roomId",  element: <RoomDetail /> },
          { path: "/rooms",                                          element: <RoomSearch /> },
          { path: "/timetable/weekly",                               element: <WeeklyTimetable /> },
          { path: "/timetable/daily",                                element: <DailyTimetable /> },
          { path: "/assistant",                                      element: <AIAssistant /> },
          { path: "/notifications",                                  element: <NotificationsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
