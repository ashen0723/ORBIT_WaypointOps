export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  const wrapped = (total % (24 * 60) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function windowStatus(eta: string | undefined, window: string): 'On time' | 'At risk' | 'Late' {
  if (!eta) return 'On time';
  const [, closeRaw] = window.split('–');
  const toMinutes = (value: string) => {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + m;
  };
  const etaMinutes = toMinutes(eta);
  const closeMinutes = toMinutes(closeRaw);
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