const COLOMBO = 'Asia/Colombo';

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function nextOperatingDay(date: string): string {
  let next = addDays(date, 1);
  while (new Date(`${next}T00:00:00.000Z`).getUTCDay() === 0) next = addDays(next, 1);
  return next;
}

/** Monday-Saturday fallback until Tharusha imports the official operating calendar. */
export function scheduleOrder(submittedDate: string, now: Date): { requestedDate: string; rolledOver: boolean } {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: COLOMBO, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(({ type, value }) => [type, value]));
  const today = `${parts.year}-${parts.month}-${parts.day}`;
  let earliest = nextOperatingDay(today);
  if (Number(parts.hour) * 60 + Number(parts.minute) >= 16 * 60) earliest = nextOperatingDay(earliest);
  let requestedDate = submittedDate < earliest ? earliest : submittedDate;
  while (new Date(`${requestedDate}T00:00:00.000Z`).getUTCDay() === 0) requestedDate = nextOperatingDay(requestedDate);
  return { requestedDate, rolledOver: requestedDate !== submittedDate };
}
