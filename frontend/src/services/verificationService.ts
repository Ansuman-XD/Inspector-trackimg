/** GPS utilities: Haversine distance and browser geolocation wrapper. */

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface GpsFix {
  lat: number;
  lng: number;
  accuracy: number | null;
  demo: boolean;
}

export class GpsError extends Error {
  constructor(public code: "denied" | "unavailable" | "timeout" | "unsupported", message: string) {
    super(message);
  }
}

export function getCurrentPosition(): Promise<GpsFix> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new GpsError("unsupported", "This browser does not support location services."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Number.isFinite(p.coords.accuracy) ? Math.round(p.coords.accuracy) : null, demo: false }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new GpsError("denied", "Location permission was denied. Allow location access in your browser settings and try again."));
        else if (err.code === err.TIMEOUT) reject(new GpsError("timeout", "Getting your location took too long. Move to an open area and try again."));
        else reject(new GpsError("unavailable", "Your location is currently unavailable. Check that GPS / location services are switched on."));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  });
}

/** Presenter GPS: produce a coordinate at a chosen offset from the target. */
export function demoPosition(lat: number, lng: number, mode: "at_location" | "near" | "far"): GpsFix {
  const meters = mode === "at_location" ? 18 + Math.random() * 20 : mode === "near" ? 70 + Math.random() * 20 : 220 + Math.random() * 80;
  const bearing = Math.random() * 2 * Math.PI;
  const dLat = (meters * Math.cos(bearing)) / 111320;
  const dLng = (meters * Math.sin(bearing)) / (111320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng, accuracy: Math.round(5 + Math.random() * 8), demo: true };
}

export const LOW_ACCURACY_THRESHOLD = 50;
