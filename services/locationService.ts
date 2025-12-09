import getSupabase from './supabaseClient'

type Coords = { lat: number; lng: number }

let watchId: number | null = null
let intervalId: any = null

export const startTracking = (userId: string, role: 'driver' | 'delivery' | 'service' | 'client' = 'driver') => {
  const supabase = getSupabase()
  if (!supabase || !userId) return
  const pushPosition = async (pos: GeolocationPosition) => {
    const lat = pos.coords.latitude
    const lng = pos.coords.longitude
    const speed = typeof pos.coords.speed === 'number' ? pos.coords.speed : null
    const heading = typeof pos.coords.heading === 'number' ? pos.coords.heading : null
    const ts = new Date().toISOString()
    try {
      await supabase.from('provider_presence').upsert({ user_id: userId, online: true, lat, lng, updated_at: ts })
    } catch (_e) {}
    try {
      await supabase.from('locations').insert({ user_id: userId, role, lat, lng, speed, heading, timestamp: ts })
    } catch (_e) {}
  }
  if ('geolocation' in navigator) {
    try {
      watchId = navigator.geolocation.watchPosition(pushPosition, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 })
    } catch (_e) {}
  }
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(async () => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(pushPosition, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 })
  }, 5000)
}

export const stopTracking = () => {
  try { if (watchId !== null) navigator.geolocation.clearWatch(watchId) } catch (_e) {}
  watchId = null
  if (intervalId) clearInterval(intervalId)
  intervalId = null
}

export const haversineKm = (a: Coords, b: Coords): number => {
  const toRad = (v: number) => v * Math.PI / 180
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export default { startTracking, stopTracking, haversineKm }
