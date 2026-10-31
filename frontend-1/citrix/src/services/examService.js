// src/services/examService.js
import { apiClient } from './apiClient';

function normalizeExam(e) {
  const courseId = e.course_ids?.[0] || e.courseId || e.course || 'CS101';
  const group = e.groups?.[0] || e.group || 'All Cohorts';
  const room = e.rooms?.[0] || e.room || 'TBD';
  const status = e.status || (e.day && e.day !== 'Unscheduled' ? 'scheduled' : 'unscheduled');

  return {
    ...e,
    id: e.id,
    course: courseId,
    courseId,
    courseTitle: e.courseTitle || e.title || `Course ${courseId}`,
    group,
    groups: e.groups || (group ? [group] : []),
    size: e.size || e.strength || 60,
    durationHours: e.duration_hours || e.durationHours || 2,
    day: e.day || 'Unscheduled',
    session: e.session || 'AM',
    slot: e.day ? `${e.day} (${e.session || 'AM'})` : 'Pending Placement',
    room,
    rooms: e.rooms || (room ? [room] : []),
    status,
    spacingCompliant: e.spacingCompliant ?? true,
  };
}

export const examService = {
  getExams: async () => {
    try {
      const data = await apiClient.get('/exams');
      const list = Array.isArray(data) ? data : data?.exams || [];
      return { data: list.map(normalizeExam), demo: false };
    } catch (err) {
      console.error('Real /exams API error:', err.message);
      throw err;
    }
  },

  generateSchedule: async (params = {}) => {
    try {
      // NOTE: FastAPI /exams/generate expects time_limit_seconds and auto_publish as QUERY parameters
      const timeout = params.time_limit_seconds || 15.0;
      const data = await apiClient.post(
        `/exams/generate?time_limit_seconds=${timeout}&auto_publish=false`,
        null
      );

      const assignments = (data.assignments || []).map(normalizeExam);
      return {
        data: {
          status: data.status || 'success',
          is_feasible: data.is_feasible,
          examsScheduled: data.total_exams_scheduled || assignments.length || 0,
          conflicts: data.validation?.hard_violation_count || 0,
          softPenalty: data.soft_penalty || 0,
          assignments,
          exams: assignments,
          validation: data.validation || {},
          message: data.message || 'Midsem exam schedule generated via CP-SAT solver (halved capacity rule enforced).',
        },
        demo: false,
      };
    } catch (err) {
      console.error('Real /exams/generate API error:', err.message);
      throw err;
    }
  },

  publishSchedule: async (assignments) => {
    return apiClient.post('/exams/publish', { assignments });
  },

  validateSchedule: async (assignments) => {
    return apiClient.post('/exams/validate', { assignments });
  },
};

export default examService;
