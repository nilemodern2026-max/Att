/**
 * Geolocation utilities and Haversine distance calculator
 */

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * Calculates distance in meters between two coordinates using the Haversine formula
 */
export function calculateDistanceMeters(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
  const R = 6371000; // Radius of the earth in meters
  const dLat = deg2rad(coord2.latitude - coord1.latitude);
  const dLon = deg2rad(coord2.longitude - coord1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(coord1.latitude)) *
      Math.cos(deg2rad(coord2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
      
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance);
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get current browser GPS location with error handling
 */
export function getCurrentLocation(): Promise<{ coords: GeoCoordinate; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('متصفحك لا يدعم خدمة تحديد الموقع الجغرافي (GPS).'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let msg = 'تعذر الحصول على إحداثيات موقعك.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'تم رفض الإذن بالوصول إلى الموقع الجغرافي. يرجى تفعيل الموقع من إعدادات المتصفح أو الهاتف.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'معلومات الموقع الجغرافي غير متوفرة حالياً.';
            break;
          case error.TIMEOUT:
            msg = 'استغرقت محاولة تحديد الموقع وقتاً أطول من المتوقع.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );
  });
}

/**
 * Format distance to Arabic readable string (أمتار / كيلومترات)
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters} متر`;
  }
  return `${(meters / 1000).toFixed(2)} كم`;
}
