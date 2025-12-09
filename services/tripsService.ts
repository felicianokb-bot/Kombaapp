import getSupabase from './supabaseClient'
import { Trip, AuthUser } from '../types'

type TripRow = {
  id: string
  host_id: string
  origin: string
  destination: string
  date: string
  time: string | null
  transport_type: string
  capacity: number | null
  capacity_unit: string
  price_per_unit: number
  currency: string
  description: string | null
  status: string
}

const toTrip = (row: TripRow): Trip => ({
  id: String(row.id),
  hostId: row.host_id,
  origin: row.origin,
  destination: row.destination,
  date: row.date,
  time: row.time || '',
  transportType: row.transport_type as Trip['transportType'],
  capacity: row.capacity ?? 0,
  capacityUnit: row.capacity_unit as Trip['capacityUnit'],
  pricePerUnit: row.price_per_unit,
  currency: row.currency,
  description: row.description || '',
  status: row.status as Trip['status']
})

export const getTrips = async (): Promise<Trip[]> => {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('date', { ascending: false })
  if (error || !data) return []
  return (data as TripRow[]).map(toTrip)
}

export const addTrip = async (newTrip: Omit<Trip, 'id' | 'host' | 'hostId'>, user: AuthUser): Promise<Trip | null> => {
  const supabase = getSupabase()
  if (!supabase) return null
  const payload = {
    host_id: user.id,
    origin: newTrip.origin,
    destination: newTrip.destination,
    date: newTrip.date,
    time: newTrip.time || null,
    transport_type: newTrip.transportType,
    capacity: newTrip.capacity ?? null,
    capacity_unit: newTrip.capacityUnit,
    price_per_unit: newTrip.pricePerUnit,
    currency: newTrip.currency,
    description: newTrip.description || null,
    status: newTrip.status
  }
  const { data, error } = await supabase.from('trips').insert(payload).select('*').single()
  if (error || !data) return null
  return toTrip(data as TripRow)
}

export default { getTrips, addTrip }
