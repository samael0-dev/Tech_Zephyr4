import React, { Suspense } from "react";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
} from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import AppShell from "@/components/layout/AppShell";

// ─── Spinner fallback ────────────────────────────────────────────────────────
const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-screen bg-[#0B1120]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin" />
      <p className="text-slate-400 text-sm tracking-wide">Loading…</p>
    </div>
  </div>
);

// ─── Lazy imports ────────────────────────────────────────────────────────────
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

// ─── ProtectedRoute ──────────────────────────────────────────────────────────
function ProtectedRoute() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
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
  { path: "/",      element: <Navigate to="/login" replace /> },
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
          // Admin
          { path: "/admin",                    element: <AdminCommandCenter /> },
          { path: "/admin/timetable/generate", element: <TimetableGenWorkspace /> },
          { path: "/admin/midsem",             element: <MidsemScheduling /> },
          { path: "/admin/spectra",            element: <SpectraManagement /> },
          { path: "/admin/disruptions",        element: <DisruptionManagement /> },
          { path: "/admin/timetable/compare",  element: <TimetableComparison /> },
          { path: "/admin/analytics",          element: <AnalyticsDashboard /> },
          { path: "/admin/audit",              element: <AuditLog /> },
          { path: "/admin/data",               element: <DataImportExport /> },
          // Coordinator
          { path: "/coordinator",              element: <CoordinatorDashboard /> },
          // Faculty
          { path: "/faculty",                  element: <FacultyDashboard /> },
          { path: "/faculty/unavailability",   element: <FacultyUnavailability /> },
          // Club
          { path: "/club",                     element: <ClubDashboard /> },
          // Campus
          { path: "/campus",                   element: <CampusPage /> },
          { path: "/campus/:buildingId",       element: <BuildingExplorer /> },
          { path: "/campus/:buildingId/floor/:floor",               element: <FloorExplorer /> },
          { path: "/campus/:buildingId/floor/:floor/room/:roomId",  element: <RoomDetail /> },
          // Rooms
          { path: "/rooms",                    element: <RoomSearch /> },
          // Bookings
          { path: "/bookings",                 element: <BookingHistory /> },
          { path: "/bookings/new",             element: <BookingForm /> },
          { path: "/bookings/new/nl",          element: <NLBookingComposer /> },
          { path: "/bookings/:id",             element: <BookingDetail /> },
          // Timetable
          { path: "/timetable/weekly",         element: <WeeklyTimetable /> },
          { path: "/timetable/daily",          element: <DailyTimetable /> },
          // Approvals
          { path: "/approvals",                element: <ApprovalManagement /> },
          // AI Assistant
          { path: "/assistant",                element: <AIAssistant /> },
          // Notifications
          { path: "/notifications",            element: <NotificationsPage /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
