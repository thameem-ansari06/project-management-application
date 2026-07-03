/**
 * Timezone-safe date parsing: split YYYY-MM-DD and construct UTC components
 */
export const parseDate = (dateStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return new Date(Date.UTC(year, month - 1, day));
};

export const getDiffDays = (date1, date2) => {
  if (!date1 || !date2) return 0;
  const msDiff = date1.getTime() - date2.getTime();
  return Math.round(msDiff / (1000 * 60 * 60 * 24));
};

// Add N days to a YYYY-MM-DD string, returns YYYY-MM-DD
export const shiftDateStr = (dateStr, days) => {
  if (!dateStr) return dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

export const formatDayHeader = (date) => {
  const day = date.getUTCDate();
  const weekday = date.toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' }); // E.g. 'M', 'T', 'W'
  const isWeekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
  return { day, weekday, isWeekend };
};
