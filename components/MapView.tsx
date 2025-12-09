import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';
import maplibregl, { LngLatLike, Map } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Language } from '../types';
import getSupabase from '../services/supabaseClient'

interface MapViewProps {
  lang: Language;
}

// Since we cannot ensure Leaflet assets load perfectly in all environments without build steps,
// we create a high-fidelity visual mock using a styled background and absolute positioning.
const MapView: React.FC<MapViewProps> = ({ lang }) => {
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: -8.838333, lng: 13.234444 }) // Luanda
  const [providers, setProviders] = useState<{ lat: number; lng: number; user_id: string; type: 'driver' | 'delivery' | 'service' }[]>([])
  const [loading, setLoading] = useState(true)
  const mapRef = useRef<Map | null>(null)
  const mapReadyRef = useRef<boolean>(false)
  const [trackingActive, setTrackingActive] = useState<boolean>(false)
  const [searchingText, setSearchingText] = useState<string>('')
  const [trackingRadiusKm, setTrackingRadiusKm] = useState<number>(8)
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const searchPulseRef = useRef<number | null>(null)
  const presenceChannelRef = useRef<any>(null)
  const typesByUserRef = useRef<Record<string, 'driver' | 'delivery' | 'service'>>({})

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kombo_last_center')
      if (raw) {
        const c = JSON.parse(raw)
        if (typeof c.lat === 'number' && typeof c.lng === 'number') setCenter({ lat: c.lat, lng: c.lng })
      }
    } catch (_e) {}
  }, [])

  useEffect(() => {
    try {
      const flag = localStorage.getItem('kombo_tracking_active') === '1'
      const req = localStorage.getItem('kombo_tracking_requesting') === '1'
      setTrackingActive(flag)
      setSearchingText(req ? (lang==='pt'?'A procurar prestadores disponíveis...':'Searching available providers...') : '')
      const rRaw = localStorage.getItem('kombo_tracking_radius_km')
      const r = rRaw ? Number(rRaw) : 8
      setTrackingRadiusKm(isFinite(r) && r>0 ? r : 8)
      const oRaw = localStorage.getItem('kombo_tracking_origin') || localStorage.getItem('kombo_last_origin')
      const o = oRaw ? JSON.parse(oRaw) : null
      if (o && typeof o.lat==='number' && typeof o.lng==='number') { setOrigin(o) }
    } catch {}
  }, [lang])

  useEffect(() => {
    const supabase = getSupabase()
    ;(async () => {
      try {
        const { data: pres } = await supabase!.from('provider_presence').select('user_id,lat,lng,online').eq('online', true)
        const list: { lat: number; lng: number; user_id: string; type: 'driver' | 'delivery' | 'service' }[] = []
        for (const r of (pres as any[] || [])) {
          let type: 'driver' | 'delivery' | 'service' = 'service'
          try {
            const { data: srv } = await supabase!.from('services').select('category').eq('user_id', String(r.user_id)).limit(1)
            const cat = (srv as any[] || [])[0]?.category
            if (cat === 'driver') type = 'driver'
            else if (cat === 'delivery') type = 'delivery'
            else type = 'service'
          } catch (_e) {}
          typesByUserRef.current[String(r.user_id)] = type
          list.push({ lat: Number(r.lat||0), lng: Number(r.lng||0), user_id: String(r.user_id), type })
        }
        setProviders(list)
      } catch (_e) {
        setProviders([])
      }
      setLoading(false)
    })()

    try {
      const ch = supabase!.channel('presence_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'provider_presence' }, async (payload: any) => {
          const row = payload?.new || payload?.old
          if (!row) return
          const uid = String(row.user_id)
          const online = !!row.online
          const lat = Number(row.lat || 0)
          const lng = Number(row.lng || 0)
          if (!online) {
            setProviders(prev => prev.filter(p => p.user_id !== uid))
            return
          }
          let type = typesByUserRef.current[uid]
          if (!type) {
            try {
              const { data: srv } = await supabase!.from('services').select('category').eq('user_id', uid).limit(1)
              const cat = (srv as any[] || [])[0]?.category
              type = cat === 'driver' ? 'driver' : cat === 'delivery' ? 'delivery' : 'service'
              typesByUserRef.current[uid] = type
            } catch (_e) { type = 'service' }
          }
          setProviders(prev => {
            const i = prev.findIndex(p => p.user_id === uid)
            if (i >= 0) {
              const next = prev.slice()
              next[i] = { ...next[i], lat, lng, type }
              return next
            }
            return [...prev, { lat, lng, user_id: uid, type }]
          })
        })
        .subscribe()
      presenceChannelRef.current = ch
    } catch (_e) {}

    return () => {
      try { if (presenceChannelRef.current) supabase?.removeChannel(presenceChannelRef.current) } catch (_e) {}
    }
  }, [])

  useEffect(() => {
    const key = (localStorage.getItem('kombo_maptiler_key') || import.meta.env.VITE_MAPTILER_KEY || (window as any).MAPTILER_API_KEY) as string
    const dark = document.documentElement.classList.contains('dark')
    const styleId = dark ? 'basic-v2-dark' : 'basic-v2'
    const styleUrl = `https://api.maptiler.com/maps/${styleId}/style.json?key=${key}`
    const target = document.getElementById('map_container') as HTMLElement
    if (!target) return
    mapReadyRef.current = false
    mapRef.current = new maplibregl.Map({ container: target, style: styleUrl, center: [center.lng, center.lat] as LngLatLike, zoom: 12 })
    mapRef.current.addControl(new maplibregl.NavigationControl({ visualizePitch: true }))
    mapRef.current.on('load', () => {
      mapReadyRef.current = true
      const toRad = (v: number) => v * Math.PI / 180
      const R = 6371
      const within = (lat:number,lng:number) => {
        if (!trackingActive || !origin) return true
        const dLat = toRad(lat - origin.lat)
        const dLon = toRad(lng - origin.lng)
        const lat1 = toRad(origin.lat)
        const lat2 = toRad(lat)
        const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
        const d = 2 * R * Math.asin(Math.sqrt(h))
        return d <= trackingRadiusKm
      }
      const features = providers.filter(p => within(p.lat,p.lng)).map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { type: p.type } }))
      mapRef.current!.addSource('providers', { type: 'geojson', data: { type: 'FeatureCollection', features }, cluster: true, clusterRadius: 50 })
      mapRef.current!.addLayer({ id: 'providers-clusters', type: 'circle', source: 'providers', filter: ['has', 'point_count'], paint: { 'circle-color': '#2563eb', 'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 25, 24], 'circle-opacity': 0.7 } })
      mapRef.current!.addLayer({ id: 'providers-clusters-count', type: 'symbol', source: 'providers', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }, paint: { 'text-color': '#ffffff' } })
      mapRef.current!.addLayer({ id: 'providers-points', type: 'circle', source: 'providers', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['match', ['get','type'], 'driver', '#10b981', 'delivery', '#f59e0b', '#6b7280'], 'circle-radius': 8, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2 } })
      if (trackingActive && origin) {
        mapRef.current!.addSource('search-ring', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'Point', coordinates: [origin.lng, origin.lat] } } })
        mapRef.current!.addLayer({ id: 'search-ring-layer', type: 'circle', source: 'search-ring', paint: { 'circle-color': '#22c55e', 'circle-opacity': 0.2, 'circle-radius': 10, 'circle-stroke-color': '#22c55e', 'circle-stroke-width': 2 } })
        let r = 8
        searchPulseRef.current = window.setInterval(() => {
          r = r >= 24 ? 8 : r + 1
          try { mapRef.current!.setPaintProperty('search-ring-layer', 'circle-radius', r) } catch {}
        }, 120)
      }
    })
    return () => {
      if (mapRef.current) {
        try { if (mapReadyRef.current) mapRef.current.remove() } catch (_e) {}
        mapRef.current = null
      }
      if (searchPulseRef.current) { clearInterval(searchPulseRef.current); searchPulseRef.current = null }
    }
  }, [])

  useEffect(() => {
    if (mapRef.current && mapReadyRef.current) {
      const source = mapRef.current.getSource('providers') as any
      const toRad = (v: number) => v * Math.PI / 180
      const R = 6371
      const within = (lat:number,lng:number) => {
        if (!trackingActive || !origin) return true
        const dLat = toRad(lat - origin.lat)
        const dLon = toRad(lng - origin.lng)
        const lat1 = toRad(origin.lat)
        const lat2 = toRad(lat)
        const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
        const d = 2 * R * Math.asin(Math.sqrt(h))
        return d <= trackingRadiusKm
      }
      const features = providers.filter(p => within(p.lat,p.lng)).map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { type: p.type } }))
      try { source?.setData({ type: 'FeatureCollection', features }) } catch (_e) {}
    }
  }, [providers])

  const cancelRequest = () => {
    try {
      localStorage.setItem('kombo_tracking_requesting', '0')
      localStorage.setItem('kombo_tracking_active', '0')
    } catch {}
    setTrackingActive(false)
    setSearchingText('')
    try {
      if (mapRef.current && mapReadyRef.current) {
        try { mapRef.current.removeLayer('search-ring-layer') } catch {}
        try { mapRef.current.removeSource('search-ring') } catch {}
      }
    } catch {}
    if (searchPulseRef.current) { clearInterval(searchPulseRef.current); searchPulseRef.current = null }
  }

  return (
    <div className="relative w-full h-full bg-blue-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
      <div id="map_container" className="absolute inset-0 w-full h-full" />
      <div className="absolute top-4 left-4 right-4 z-10">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/50 dark:border-gray-700/50 flex items-center gap-3 transition-colors">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {localStorage.getItem('kombo_tracking_requesting')==='1' ? (lang==='pt'?'A procurar motoristas':'Searching drivers') : (loading ? (lang==='pt'?'A carregar mapa real...':'Loading real map...') : (lang==='pt'?'Prestadores online carregados':'Online providers loaded'))}
          </span>
          {localStorage.getItem('kombo_tracking_requesting')==='1' && (
            <button onClick={cancelRequest} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700">
              {lang==='pt'?'Cancelar solicitação':'Cancel request'}
            </button>
          )}
        </div>
      </div>
      {localStorage.getItem('kombo_tracking_requesting')!=='1' && (
        <button className="absolute bottom-24 right-4 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-xl flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
          <Navigation size={20} />
        </button>
      )}
    </div>
  );
};

export default MapView;
