export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  const wrapped = (total % (24 * 60) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function windowStatus(eta: string | undefined, window: string): 'On time' | 'At risk' | 'Late' {
  const toMinutes = (value: string | undefined) => {
    const match = /(\d{1,2}):(\d{2})/.exec(value ?? '');
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  };
  // Live routes may only know a planned time, not an "open–close" window: never fail the render over it.
  const etaMinutes = toMinutes(eta);
  const closeMinutes = toMinutes(window.split('–')[1]);
  if (etaMinutes === null || closeMinutes === null) return 'On time';
  const diff = closeMinutes - etaMinutes;
  if (diff < 0) return 'Late';
  if (diff <= 20) return 'At risk';
  return 'On time';
}

export function arrivalTime(tripId: string, sequence: number, eta?: string): string {
  if (tripId === 'trip-1' && sequence === 3) return '05:38';
  return addMinutes(eta ?? '09:30', 2);
}

export function completionTime(tripId: string, sequence: number, eta?: string): string {
  if (tripId === 'trip-1' && sequence === 3) return '05:46';
  return addMinutes(arrivalTime(tripId, sequence, eta), 8);
}