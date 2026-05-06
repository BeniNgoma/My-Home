export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  role: 'admin' | 'agent'
  hourly_rate: number
  is_active: boolean
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  full_name: string
  address: string | null
  phone: string | null
  email: string | null
  notes: string | null
  is_active: boolean
  latitude: number | null
  longitude: number | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AgentClientAssignment {
  id: string
  agent_id: string
  client_id: string
  assigned_at: string
  assigned_by: string | null
  is_active: boolean
}

export interface TimeEntry {
  id: string
  agent_id: string
  client_id: string
  clock_in_at: string
  clock_in_photo_url: string | null
  clock_in_latitude: number | null
  clock_in_longitude: number | null
  clock_in_address: string | null
  clock_out_at: string | null
  clock_out_photo_url: string | null
  clock_out_latitude: number | null
  clock_out_longitude: number | null
  clock_out_address: string | null
  duration_minutes: number | null
  status: 'active' | 'completed' | 'corrected'
  gps_alert: boolean
  gps_distance_meters: number | null
  correction_note: string | null
  corrected_by: string | null
  created_at: string
}

export interface PayrollPeriod {
  id: string
  name: string
  period_start: string
  period_end: string
  status: 'draft' | 'finalized' | 'paid'
  created_by: string | null
  created_at: string
}

export interface PayrollEntry {
  id: string
  payroll_period_id: string
  agent_id: string
  total_minutes: number
  hourly_rate: number
  gross_pay: number
  notes: string | null
  created_at: string
}

export interface TimeEntryWithRelations extends TimeEntry {
  agent?: Pick<Profile, 'id' | 'full_name' | 'email'>
  client?: Pick<Client, 'id' | 'full_name' | 'address'>
}

export interface PayrollEntryWithRelations extends PayrollEntry {
  agent?: Pick<Profile, 'id' | 'full_name' | 'email' | 'hourly_rate'>
  payroll_period?: Pick<PayrollPeriod, 'id' | 'name' | 'period_start' | 'period_end'>
}

export type UserRole = 'admin' | 'agent'
export type TimeEntryStatus = 'active' | 'completed' | 'corrected'
export type PayrollStatus = 'draft' | 'finalized' | 'paid'

export function formatDuration(minutes: number | null): string {
  if (!minutes) return '—'
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const dphi = ((lat2 - lat1) * Math.PI) / 180
  const dlambda = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
