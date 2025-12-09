
import React, { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Calendar, Package, ArrowRight, UserCheck, Filter, Plane, Bus, Ship, Car, Truck, Info, Clock, Weight, MessageCircle } from 'lucide-react';
import { TEXT } from '../constants';
import { generateTripAdvice } from '../services/geminiService';
import getSupabase from '../services/supabaseClient'
import { Language, TransportType, CapacityUnit, Trip, AuthUser, Job, BoostTier } from '../types';

interface AgitaViewProps {
  lang: Language;
  trips: Trip[];
  onAddTrip: (trip: Trip) => void;
  onChat: (userId: string, userName: string, context: string) => void;
  user: AuthUser;
  onStartSearch?: () => void;
}

const AgitaView: React.FC<AgitaViewProps> = ({ lang, trips, onAddTrip, onChat, user, onStartSearch }) => {
  const [activeTab, setActiveTab] = useState<'find' | 'post'>('find');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [findMode, setFindMode] = useState<'boleia' | 'fretes'>('boleia')
  const [searchDate, setSearchDate] = useState('');
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [originSugs, setOriginSugs] = useState<{ name: string; lat: number; lng: number }[]>([])
  const [destSugs, setDestSugs] = useState<{ name: string; lat: number; lng: number }[]>([])
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [requesting, setRequesting] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(5);
  const [waveTimeoutSec, setWaveTimeoutSec] = useState<number>(10);
  const [waitBetweenWavesSec, setWaitBetweenWavesSec] = useState<number>(3);
  const [maxWaves, setMaxWaves] = useState<number>(6);
  const [expandPercent, setExpandPercent] = useState<number>(50);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [incomingJob, setIncomingJob] = useState<{ job: Job; expiresAt: number } | null>(null);
  const [incomingCountdown, setIncomingCountdown] = useState<number>(0);
  const [jobsLog, setJobsLog] = useState<Job[]>([]);
  const acceptLockRef = useRef<{ [jobId: string]: boolean }>({});
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null)
  
  // Post Trip Form State
  const [postOrigin, setPostOrigin] = useState('');
  const [postDestination, setPostDestination] = useState('');
  const [transportType, setTransportType] = useState<TransportType>('car');
  const [capacity, setCapacity] = useState('');
  const [capacityUnit, setCapacityUnit] = useState<CapacityUnit>('kg');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);

  const t = TEXT[lang];

  useEffect(() => {
    try {
      const raw = localStorage.getItem('kombo_admin_params')
      if (raw) {
        const p = JSON.parse(raw)
        if (typeof p.radiusKm === 'number') setRadiusKm(p.radiusKm)
        if (typeof p.waveTimeoutSec === 'number') setWaveTimeoutSec(p.waveTimeoutSec)
        if (typeof p.waitBetweenWavesSec === 'number') setWaitBetweenWavesSec(p.waitBetweenWavesSec)
        if (typeof p.maxWaves === 'number') setMaxWaves(p.maxWaves)
        if (typeof p.expandPercent === 'number') setExpandPercent(p.expandPercent)
      }
    } catch (_e) {}
  }, [])

  useEffect(() => {
    const supabase = getSupabase()
    if (!supabase || !user?.id) return
    const ch = supabase
      .channel(`user_notify_${user.id}`)
      .on('broadcast', { event: 'job_wave' }, (payload) => {
        if (!isOnline) return
        const data = (payload as any)?.payload as any
        const job: Job = data?.job
        const timeoutSec: number = Number(data?.timeoutSec || 10)
        const exp = Date.now() + timeoutSec * 1000
        setIncomingJob({ job, expiresAt: exp })
      })
      .subscribe()
    return () => { try { supabase.removeChannel(ch) } catch (_e) {} }
  }, [user?.id, isOnline])

  useEffect(() => {
    if (!isOnline) return
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords
      coordsRef.current = { lat: latitude, lng: longitude }
      const supabase = getSupabase()
      const u = user?.id
      if (supabase && u) {
        supabase.from('provider_presence').upsert({ user_id: u, online: true, lat: latitude, lng: longitude, updated_at: new Date().toISOString() })
      }
    }, (_err) => {
      coordsRef.current = null
    }, { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 })
  }, [isOnline, user?.id])

  useEffect(() => {
    if (!incomingJob) { setIncomingCountdown(0); return }
    const tick = () => {
      const leftMs = incomingJob.expiresAt - Date.now()
      setIncomingCountdown(Math.max(0, Math.ceil(leftMs / 1000)))
      if (leftMs <= 0) setIncomingJob(null)
    }
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [incomingJob])

  const getBoostTierForUser = async (userId: string): Promise<BoostTier> => {
    const supabase = getSupabase()
    if (!supabase) return 'none'
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .ilike('reference', 'boost:%')
        .order('date', { ascending: false })
        .limit(1)
      if (!data || (data as any[]).length === 0) return 'none'
      const r = (data as any[])[0]
      const ref: string = r.reference || ''
      const m = ref.match(/^boost:(start|lite|pro|max|elite):/) 
      if (!m) return 'none'
      const k = m[1] as BoostTier
      const durations: Record<BoostTier, number> = { start: 24, lite: 72, pro: 7*24, max: 15*24, elite: 30*24, none: 0 }
      const hours = durations[k]
      const since = new Date(r.date).getTime()
      const expires = since + hours * 3600 * 1000
      return Date.now() < expires ? k : 'none'
    } catch (_e) {
      return 'none'
    }
  }

  const getCandidateProviders = async (): Promise<{ userId: string; tier: BoostTier; distance: number }[]> => {
    const supabase = getSupabase()
    if (!supabase) return []
    const out: { userId: string; tier: BoostTier; distance: number }[] = []
    const presence: Record<string, { lat: number; lng: number; online: boolean } | undefined> = {}
    try {
      const { data: pres } = await supabase.from('provider_presence').select('user_id,lat,lng,online')
      for (const p of (pres as any[] || [])) presence[String(p.user_id)] = { lat: Number(p.lat||0), lng: Number(p.lng||0), online: !!p.online }
      const { data } = await supabase.from('services').select('user_id')
      for (const r of (data as any[] || [])) {
        const uid = String(r.user_id)
        const pr = presence[uid]
        if (pr && !pr.online) continue
        const tier = await getBoostTierForUser(uid)
        let d = 0
        try {
          const oRaw = localStorage.getItem('kombo_last_origin')
          if (oRaw && pr) {
            const O = JSON.parse(oRaw)
            const toRad = (v: number) => v * Math.PI / 180
            const R = 6371
            const dLat = toRad(pr.lat - O.lat)
            const dLon = toRad(pr.lng - O.lng)
            const lat1 = toRad(O.lat)
            const lat2 = toRad(pr.lat)
            const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2
            d = 2 * R * Math.asin(Math.sqrt(h))
          }
        } catch (_e) {}
        out.push({ userId: uid, tier, distance: d })
      }
    } catch (_e) {}
    out.sort((a, b) => {
      const order: BoostTier[] = ['elite', 'max', 'pro', 'lite', 'start', 'none']
      const ai = order.indexOf(a.tier)
      const bi = order.indexOf(b.tier)
      if (ai !== bi) return ai - bi
      return a.distance - b.distance
    })
    return out
  }

  const createJobAndStartWaves = async () => {
    if (!user?.id || !origin || !destination) return
    setRequesting(true)
    const job: Job = { id: String(Date.now()), clientId: user.id, origin, destination, radiusKm, createdAt: new Date().toISOString(), status: 'pending' }
    setJobsLog(prev => [job, ...prev])
    const supabase = getSupabase()
    try { await supabase?.from('jobs').insert({ id: job.id, client_id: job.clientId, origin: job.origin, destination: job.destination, radius_km: job.radiusKm, status: 'pending', created_at: job.createdAt }) } catch (_e) {}
    const jobChannel = supabase?.channel(`job_${job.id}`)
    let locked = false
    jobChannel?.on('broadcast', { event: 'accept' }, (payload) => {
      if (locked) return
      const pid = String((payload as any)?.payload?.providerId || '')
      if (!pid) return
      ;(async () => {
        let ok = false
        try {
          const { error, count } = await supabase!.from('jobs').update({ status: 'assigned', provider_id: pid, assigned_at: new Date().toISOString() }).eq('id', job.id).eq('status', 'pending').select('*', { count: 'exact' })
          ok = !error && (count || 0) > 0
        } catch (_e) {}
        if (!ok) return
        locked = true
        const updated: Job = { ...job, status: 'assigned', assignedProviderId: pid }
        setJobsLog(prev => prev.map(j => j.id === job.id ? updated : j))
        setRequesting(false)
      })()
    }).subscribe()

    const providers = await getCandidateProviders()
    const tiers: BoostTier[] = ['elite', 'max', 'pro', 'lite', 'start', 'none']
    for (let wave = 0; wave < Math.min(maxWaves, tiers.length); wave++) {
      if (locked) break
      const tier = tiers[wave]
      const group = providers.filter(p => p.tier === tier)
      const timeout = waveTimeoutSec
      for (const p of group) {
        supabase?.channel(`user_notify_${p.userId}`).send({ type: 'broadcast', event: 'job_wave', payload: { job, timeoutSec: timeout } })
      }
      const started = Date.now()
      while (!locked && Date.now() - started < timeout * 1000) {
        await new Promise(r => setTimeout(r, 200))
      }
      if (!locked) await new Promise(r => setTimeout(r, waitBetweenWavesSec * 1000))
      if (!locked && wave === tiers.length - 1) {
        const updated: Job = { ...job, status: 'no_service' }
        setJobsLog(prev => prev.map(j => j.id === job.id ? updated : j))
        try { await supabase?.from('jobs').update({ status: 'no_service', finished_at: new Date().toISOString() }).eq('id', job.id) } catch (_e) {}
        setRequesting(false)
      }
    }
    try { supabase?.removeChannel(jobChannel!) } catch (_e) {}
  }

  const acceptIncoming = async () => {
    if (!incomingJob || acceptLockRef.current[incomingJob.job.id]) return
    acceptLockRef.current[incomingJob.job.id] = true
    const supabase = getSupabase()
    supabase?.channel(`job_${incomingJob.job.id}`).send({ type: 'broadcast', event: 'accept', payload: { providerId: user.id } })
    setIncomingJob(null)
  }

  const declineIncoming = async () => {
    setIncomingJob(null)
  }

  // Filtering Logic
  const filteredTripsBase = trips.filter(trip => {
    const matchOrigin = origin ? trip.origin.toLowerCase().includes(origin.toLowerCase()) : true;
    const matchDest = destination ? trip.destination.toLowerCase().includes(destination.toLowerCase()) : true;
    return matchOrigin && matchDest;
  });
  const filteredTrips = filteredTripsBase.filter(trip => {
    if (findMode !== 'fretes') return false
    const matchDate = searchDate ? trip.date === searchDate : true;
    return matchDate;
  });

  const handleSearch = async () => {
    if (origin && destination) {
      setLoadingAdvice(true);
      const advice = await generateTripAdvice(origin, destination, lang);
      setAiAdvice(advice);
      setLoadingAdvice(false);
      try {
        const radius = isFinite(radiusKm) && radiusKm > 0 ? radiusKm : 8
        localStorage.setItem('kombo_tracking_active', '1')
        localStorage.setItem('kombo_tracking_requesting', '1')
        localStorage.setItem('kombo_tracking_radius_km', String(radius))
        const o = originCoords || null
        if (o) localStorage.setItem('kombo_tracking_origin', JSON.stringify(o))
        const d = destCoords || null
        if (d) localStorage.setItem('kombo_tracking_destination', JSON.stringify(d))
      } catch {}
      onStartSearch?.()
      await createJobAndStartWaves();
    }
  };

  useEffect(() => {
    const q = origin.trim()
    if (!q) { setOriginSugs([]); return }
    const id = setTimeout(async () => {
      try {
        const country = 'AO'
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=${country}&limit=5`
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
        const data = await res.json()
        const arr = (data || []).map((r: any) => ({ name: String(r.display_name || r.name || ''), lat: Number(r.lat), lng: Number(r.lon) }))
        setOriginSugs(arr)
      } catch (_e) { setOriginSugs([]) }
    }, 300)
    return () => clearTimeout(id)
  }, [origin])

  useEffect(() => {
    const q = destination.trim()
    if (!q) { setDestSugs([]); return }
    const id = setTimeout(async () => {
      try {
        const country = 'AO'
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=${country}&limit=5`
        const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
        const data = await res.json()
        const arr = (data || []).map((r: any) => ({ name: String(r.display_name || r.name || ''), lat: Number(r.lat), lng: Number(r.lon) }))
        setDestSugs(arr)
      } catch (_e) { setDestSugs([]) }
    }, 300)
    return () => clearTimeout(id)
  }, [destination])

  const handlePublish = async () => {
    if (!postOrigin || !postDestination || !date || !price) return;

    setPublishing(true);
    setPublishError(null);
    const newTrip: Trip = {
      id: Date.now().toString(),
      hostId: 'me',
      origin: postOrigin,
      destination: postDestination,
      date,
      time,
      transportType,
      capacity: Number(capacity),
      capacityUnit,
      pricePerUnit: Number(price),
      currency: 'Kz',
      description,
      status: 'active'
    };

    try {
      await onAddTrip(newTrip as any);
    } catch (e: any) {
      setPublishError(e?.message || 'Falha ao publicar');
    } finally {
      setPublishing(false);
    }
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'plane': return <Plane size={18} />;
      case 'bus': return <Bus size={18} />;
      case 'boat': return <Ship size={18} />;
      case 'truck': return <Truck size={18} />;
      default: return <Car size={18} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full bg-gray-50 dark:bg-gray-900 md:p-6 md:gap-6 transition-colors duration-200">
      
      {/* Sidebar: Toggle between Find and Post */}
      <div className="w-full md:w-96 bg-white dark:bg-gray-800 md:rounded-2xl md:shadow-sm md:border md:border-gray-200 dark:md:border-gray-700 md:h-fit sticky top-0 md:static z-10 shrink-0 transition-colors">
        
        {/* Toggle Tabs */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
           <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
            <button 
              onClick={() => setActiveTab('find')}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'find' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <Search size={16} />
              {t.findTrip}
            </button>
            <button 
              onClick={() => setActiveTab('post')}
              className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'post' ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              <Package size={16} />
              {t.postTrip}
            </button>
          </div>
        </div>

        {/* Content Area based on Tab */}
        <div className="p-4 md:p-6 space-y-5">
          
          {activeTab === 'find' ? (
            /* FIND TRIP FORM */
            <>
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                <button onClick={() => setFindMode('boleia')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${findMode==='boleia' ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{lang==='pt'?'Boleia':'Ride'}</button>
                <button onClick={() => setFindMode('fretes')} className={`flex-1 py-2 text-xs md:text-sm font-bold rounded-lg transition-all ${findMode==='fretes' ? 'bg-white dark:bg-gray-600 text-orange-600 dark:text-orange-300 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>{lang==='pt'?'Fretes':'Freight'}</button>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.from}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 text-blue-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Ex: Luanda" 
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-800 dark:text-white transition-all font-medium"
                  />
                  {originSugs.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                      {originSugs.map((s, i) => (
                        <button key={i} onClick={() => { setOrigin(s.name); const c = { lat: s.lat, lng: s.lng }; setOriginCoords(c); localStorage.setItem('kombo_last_center', JSON.stringify(c)); localStorage.setItem('kombo_last_origin', JSON.stringify(c)) }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.to}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 text-orange-500" size={18} />
                  <input 
                    type="text" 
                    placeholder="Ex: Benguela" 
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-800 dark:text-white transition-all font-medium"
                  />
                  {destSugs.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                      {destSugs.map((s, i) => (
                        <button key={i} onClick={() => { setDestination(s.name); const c = { lat: s.lat, lng: s.lng }; setDestCoords(c); localStorage.setItem('kombo_last_dest', JSON.stringify(c)) }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                          {s.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {findMode==='fretes' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.date}</label>
                    <input 
                      type="date" 
                      value={searchDate}
                      onChange={(e) => setSearchDate(e.target.value)}
                      className="w-full mt-1 px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-gray-600 dark:text-gray-200 font-medium" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.transportType}</label>
                    <select value={transportType} onChange={(e)=>setTransportType(e.target.value as TransportType)} className="w-full mt-1 px-3 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-blue-500 text-gray-600 dark:text-gray-200 font-medium appearance-none">
                      <option value="car">Carro</option>
                      <option value="bus">Autocarro</option>
                      <option value="truck">Camião</option>
                      <option value="plane">Avião</option>
                    </select>
                  </div>
                </div>
              )}

              <button 
                onClick={handleSearch}
                className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
              >
                <Search size={18} />
                {loadingAdvice ? t.analyzing : (findMode==='fretes' ? (lang==='pt'?'Buscar Fretes':'Find Freight') : t.searchBtn)}
              </button>
              
            </>
          ) : (
            /* POST TRIP FORM */
            <>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-900/40 flex gap-2 mb-2">
                 <Info size={16} className="text-orange-500 shrink-0 mt-0.5" />
                 <p className="text-xs text-orange-700 dark:text-orange-300 leading-snug">
                   {lang === 'pt' ? 'Ganhe dinheiro extra levando encomendas na sua viagem.' : 'Earn extra money carrying packages on your trip.'}
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.from}</label>
                   <input 
                      type="text" 
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-orange-500 outline-none text-gray-800 dark:text-white" 
                      placeholder="Origem"
                      value={postOrigin}
                      onChange={(e) => setPostOrigin(e.target.value)}
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.to}</label>
                   <input 
                      type="text" 
                      className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-orange-500 outline-none text-gray-800 dark:text-white" 
                      placeholder="Destino" 
                      value={postDestination}
                      onChange={(e) => setPostDestination(e.target.value)}
                   />
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.date}</label>
                   <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-3 text-gray-400" />
                      <input 
                        type="date" 
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-9 pr-2 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-orange-500 outline-none text-gray-800 dark:text-white" 
                      />
                   </div>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.time}</label>
                   <div className="relative">
                      <Clock size={14} className="absolute left-3 top-3 text-gray-400" />
                      <input 
                        type="time" 
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full pl-9 pr-2 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-orange-500 outline-none text-gray-800 dark:text-white" 
                      />
                   </div>
                 </div>
              </div>

              {/* Transport Selection */}
              <div className="space-y-2">
                 <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.transportType}</label>
                 <div className="grid grid-cols-4 gap-2">
                    {(['car', 'bus', 'truck', 'plane'] as TransportType[]).map((type) => (
                      <button 
                        key={type}
                        onClick={() => setTransportType(type)}
                        className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all ${transportType === type ? 'bg-orange-50 dark:bg-orange-900/30 border-orange-500 text-orange-600 dark:text-orange-400' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'}`}
                      >
                         {getTransportIcon(type)}
                         <span className="text-[9px] font-bold uppercase mt-1">{type}</span>
                      </button>
                    ))}
                 </div>
              </div>

              {/* Capacity & Price */}
              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.capacity}</label>
                   <div className="flex">
                      <input 
                        type="number" 
                        placeholder="20" 
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        className="w-full pl-3 pr-1 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-l-xl text-sm focus:border-orange-500 outline-none text-gray-800 dark:text-white" 
                      />
                      <select 
                        value={capacityUnit}
                        onChange={(e) => setCapacityUnit(e.target.value as CapacityUnit)}
                        className="bg-gray-100 dark:bg-gray-600 border border-l-0 border-gray-200 dark:border-gray-600 rounded-r-xl text-xs font-bold px-2 text-gray-600 dark:text-gray-300 outline-none"
                      >
                        <option value="kg">kg</option>
                        <option value="liters">L</option>
                        <option value="items">Item</option>
                      </select>
                   </div>
                 </div>
                 <div className="space-y-1">
                   <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.price} / un</label>
                   <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-400">Kz</span>
                      <input 
                        type="number" 
                        placeholder="500" 
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full pl-8 pr-2 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-orange-500 outline-none text-gray-800 dark:text-white" 
                      />
                   </div>
                 </div>
              </div>

              <div className="space-y-1">
                 <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide ml-1">{t.description}</label>
                 <textarea 
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={lang === 'pt' ? "Ex: Saio da Maianga. Tenho espaço na mala." : "Ex: Leaving from Maianga. Trunk space available."}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:border-orange-500 outline-none resize-none text-gray-800 dark:text-white"
                 />
              </div>

              <button 
                onClick={handlePublish}
                disabled={publishing}
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-orange-500/20 hover:from-orange-600 hover:to-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                <Package size={18} />
                {publishing ? (lang === 'pt' ? 'A publicar...' : 'Publishing...') : t.publishBtn}
              </button>
              {publishError && (
                <div className="text-xs text-red-600 dark:text-red-400 mt-2">{publishError}</div>
              )}
            </>
          )}

        </div>
      </div>

      {/* Main Results Area */}
      <div className="flex-1 p-4 md:p-0 overflow-y-auto pb-20 md:pb-0">
        <div className="mb-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-200">{lang==='pt'?'Estado':'Status'}: {isOnline ? (lang==='pt'?'Online':'Online') : (lang==='pt'?'Offline':'Offline')}</div>
          <button onClick={()=>setIsOnline(v=>!v)} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-gray-100 dark:bg-gray-700">{isOnline ? (lang==='pt'?'Desligar':'Go Offline') : (lang==='pt'?'Ligar':'Go Online')}</button>
        </div>

        {incomingJob && (
          <div className="mb-4 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="font-bold text-gray-800 dark:text-white text-sm mb-2">{lang==='pt'?'Pedido':'Request'}: {incomingJob.job.origin} → {incomingJob.job.destination}</div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">{lang==='pt'?'Tempo restante':'Time left'}: {incomingCountdown}s</div>
            <div className="flex gap-2">
              <button onClick={acceptIncoming} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-bold">{lang==='pt'?'Aceitar':'Accept'}</button>
              <button onClick={declineIncoming} className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">{lang==='pt'?'Recusar':'Decline'}</button>
            </div>
          </div>
        )}
        
        {/* Desktop Filter Bar */}
        <div className="hidden md:flex items-center justify-between mb-6 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
           <div className="flex gap-2">
             <button onClick={() => { setOrigin(''); setDestination(''); setSearchDate(''); }} className="px-4 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold shadow-md transition-all">Todos</button>
             <button className="px-4 py-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors flex items-center gap-2"><Car size={14}/> Carro</button>
             <button className="px-4 py-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 transition-colors flex items-center gap-2"><Plane size={14}/> Avião</button>
           </div>
           <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm font-medium px-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
             <Filter size={16} />
             <span>Filtros Avançados</span>
           </div>
        </div>

        {/* AI Advice */}
        {aiAdvice && (
          <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 p-4 md:p-5 rounded-2xl border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase text-blue-600 dark:text-blue-300 tracking-wider bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-md">{t.aiLabel}</span>
            </div>
            <p className="text-sm md:text-base text-gray-700 dark:text-gray-200 leading-relaxed font-medium italic">"{aiAdvice}"</p>
          </div>
        )}

        {findMode==='fretes' && (
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-sm md:text-lg font-bold text-gray-700 dark:text-gray-300 uppercase md:normal-case tracking-wide">{t.availableTrips} <span className="text-gray-400 font-normal ml-1">({filteredTrips.length})</span></h3>
          </div>
        )}

        {/* Results Grid */}
        {findMode==='fretes' && (filteredTrips.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Package size={48} className="mb-4 opacity-50" />
              <p>Nenhuma viagem encontrada para esta rota.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTrips.map((trip) => (
              <div key={trip.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-blue-100 dark:hover:border-blue-900 transition-all group flex flex-col h-full relative overflow-hidden">
                
                {/* Transport Icon Watermark */}
                <div className="absolute -right-6 -top-6 text-gray-50 dark:text-gray-700/50 opacity-50 rotate-12 group-hover:scale-110 transition-transform">
                  {React.cloneElement(getTransportIcon(trip.transportType) as React.ReactElement<any>, { size: 120 })}
                </div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={trip.host?.avatar} alt={trip.host?.name} className="w-12 h-12 rounded-full object-cover border-2 border-gray-50 dark:border-gray-700 shadow-sm" />
                      {trip.host?.verified && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white dark:border-gray-800">
                          <UserCheck size={10} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white text-base">{trip.host?.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <span className="flex items-center gap-0.5 text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded-md">
                          <span className="text-sm">★</span> {trip.host?.rating || 5.0}
                        </span>
                        <span className="uppercase text-[10px] bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-md text-gray-500 dark:text-gray-300">{trip.transportType}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block text-xl font-bold text-blue-600 dark:text-blue-400">{trip.currency} {trip.pricePerUnit.toLocaleString()}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-medium bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-full">/ {trip.capacityUnit}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4 bg-gray-50 dark:bg-gray-750 p-3 rounded-xl border border-gray-100 dark:border-gray-600 relative z-10">
                  <div className="flex-1 text-center overflow-hidden">
                    <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{t.from}</span>
                    <span className="font-bold text-gray-700 dark:text-gray-200 text-sm truncate block">{trip.origin}</span>
                  </div>
                  <ArrowRight size={18} className="text-gray-300 dark:text-gray-600 shrink-0" />
                  <div className="flex-1 text-center overflow-hidden">
                    <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">{t.to}</span>
                    <span className="font-bold text-gray-700 dark:text-gray-200 text-sm truncate block">{trip.destination}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4 relative z-10">
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 p-2 rounded-lg">
                      <Calendar size={14} className="text-blue-500" />
                      <span className="font-medium text-gray-600 dark:text-gray-300">{trip.date} • {trip.time}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 p-2 rounded-lg">
                      <Weight size={14} className="text-orange-500" />
                      <span className="font-medium text-gray-600 dark:text-gray-300">{trip.capacity} {trip.capacityUnit} disp.</span>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-50 dark:border-gray-700 flex gap-3 relative z-10">
                  <button 
                    onClick={() => onChat(trip.hostId, trip.host?.name || 'Motorista', `Olá, vi a tua viagem de ${trip.origin} para ${trip.destination}.`)}
                    className="flex-1 py-2.5 text-sm font-bold text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                     <MessageCircle size={16} /> Chat
                  </button>
                  <button 
                    onClick={() => onChat(trip.hostId, trip.host?.name || 'Motorista', lang === 'pt' ? `Quero reservar ${trip.capacityUnit} na viagem ${trip.origin} → ${trip.destination}.` : `I want to book ${trip.capacityUnit} on ${trip.origin} → ${trip.destination}.`)}
                    className="flex-[2] py-2.5 text-sm font-bold text-white bg-gray-900 dark:bg-blue-600 hover:bg-black dark:hover:bg-blue-700 rounded-xl transition-colors shadow-lg shadow-gray-200 dark:shadow-none"
                  >
                    {lang === 'pt' ? 'Reservar Lugar' : 'Book Space'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AgitaView;
