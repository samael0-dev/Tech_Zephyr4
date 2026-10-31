// src/utils/formatters.js
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export const formatDate = (date, fmt = 'MMM dd, yyyy') =>
  format(typeof date === 'string' ? parseISO(date) : date, fmt);

export const formatTime = (time24) => {
  const [h, m] = time24.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

export const formatTimeRange = (start, end) =>
  `${formatTime(start)} – ${formatTime(end)}`;

export const timeAgo = (date) =>
  formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, {
    addSuffix: true,
  });

export const formatCapacity = (cap) => `${cap} seats`;

export const capitalize = (s) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

export const truncate = (str, len = 60) =>
  str && str.length > len ? str.substring(0, len) + '…' : str;

export const formatDayShort = (day) => {
  const map = {
    Monday: 'Mon',
    Tuesday: 'Tue',
    Wednesday: 'Wed',
    Thursday: 'Thu',
    Friday: 'Fri',
    Saturday: 'Sat',
    Sunday: 'Sun',
  };
  return map[day] || day;
};

export const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
