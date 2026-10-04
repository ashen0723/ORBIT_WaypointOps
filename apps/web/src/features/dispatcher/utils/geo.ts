import { AVG_SPEED_KMH, ROAD_FACTOR } from '../data/rules';

interface Point {
  lat: number;
  lng: number;
}

export function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Deterministic road-distance estimate: straight line × road factor. */
export function roadKm(a: Point, b: Point): number {
  return haversineKm(a, b) * ROAD_FACTOR;
}

export function driveMin(km: number): number {
  return Math.round(km / AVG_SPEED_KMH * 60);
}