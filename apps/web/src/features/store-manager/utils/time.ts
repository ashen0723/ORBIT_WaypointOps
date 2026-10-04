export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

export function splitCountdown(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor(totalSeconds % 3600 / 60);
  const s = totalSeconds % 60;
  return { h, m, s };
}

export function formatClock(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60) % 24;
  const m = Math.floor(minutesOfDay % 60);
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${pad2(m)} ${suffix}`;
}

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function formatTime24(hhmm: string): string {
  return formatClock(toMinutes(hhmm));
}