'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Clock, MapPin, CheckCircle2, ChevronRight,
  Heart, UtensilsCrossed, Stethoscope, Car,
  TrendingUp, Calendar, Sparkles,
} from 'lucide-react'

const HOURLY_RATE = 25
const MONTH_PRIOR_MINUTES = 4 * 60 + 30

const CLIENTS = [
  {
    id: '1',
    name: 'Marie Lambert',
    address: '14 rue des Lilas, Paris 75015',
    scheduledTime: '09:00',
    service: 'Aide à la toilette',
    Icon: Heart,
    iconBg: '#D1FAE5',
    iconColor: '#065F46',
  },
  {
    id: '2',
    name: 'Jean-Pierre Moreau',
    address: '27 avenue Foch, Paris 75016',
    scheduledTime: '11:30',
    service: 'Préparation des repas',
    Icon: UtensilsCrossed,
    iconBg: '#FEF3C7',
    iconColor: '#92400E',
  },
  {
    id: '3',
    name: 'Suzanne Petit',
    address: '3 impasse des Roses, Paris 75012',
    scheduledTime: '14:00',
    service: 'Accompagnement médical',
    Icon: Stethoscope,
    iconBg: '#EDE9FE',
    iconColor: '#5B21B6',
  },
  {
    id: '4',
    name: 'Robert Dumont',
    address: '89 bd Voltaire, Paris 75011',
    scheduledTime: '16:30',
    service: 'Aide à la mobilité',
    Icon: Car,
    iconBg: '#FEE2E2',
    iconColor: '#991B1B',
  },
]

type Session = {
  id: string
  clientId: string
  clientName: string
  clockIn: Date
  clockOut: Date | null
  durationMinutes: number | null
}

function pad(n: number) { return String(n).padStart(2, '0') }
function fmtElapsed(s: number) {
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
}
function fmtMins(m: number) {
  if (!m) return '0h'
  const h = Math.floor(m / 60), rem = m % 60
  if (!h) return `${rem}min`
  if (!rem) return `${h}h`
  return `${h}h${pad(rem)}`
}
function fmtTime(d: Date) {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

export default function ClockPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [completed, setCompleted] = useState<Session[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [summary, setSummary] = useState<Session | null>(null)
  const [btnPressed, setBtnPressed] = useState(false)
  const [showSummaryAnim, setShowSummaryAnim] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (activeSession) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeSession.clockIn.getTime()) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      setElapsed(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [activeSession])

  useEffect(() => {
    if (summary) {
      setTimeout(() => setShowSummaryAnim(true), 20)
    } else {
      setShowSummaryAnim(false)
    }
  }, [summary])

  const todayMinutes = completed.reduce((s, ss) => s + (ss.durationMinutes || 0), 0)
  const monthMinutes = MONTH_PRIOR_MINUTES + todayMinutes
  const revenue = ((monthMinutes / 60) * HOURLY_RATE).toFixed(0)

  const selected = CLIENTS.find(c => c.id === selectedId)
  const canClockIn = !!selectedId && !activeSession

  function handleBtn() {
    setBtnPressed(true)
    setTimeout(() => setBtnPressed(false), 150)

    if (activeSession) {
      const now = new Date()
      const mins = Math.max(1, Math.round((now.getTime() - activeSession.clockIn.getTime()) / 60000))
      const done: Session = { ...activeSession, clockOut: now, durationMinutes: mins }
      setCompleted(prev => [...prev, done])
      setActiveSession(null)
      setSelectedId(null)
      setSummary(done)
    } else if (canClockIn && selected) {
      setActiveSession({
        id: `s_${Date.now()}`,
        clientId: selected.id,
        clientName: selected.name,
        clockIn: new Date(),
        clockOut: null,
        durationMinutes: null,
      })
    }
  }

  const dayStr = (() => {
    const s = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

  const btnBg = activeSession ? '#C0392B' : canClockIn ? '#2D6A4F' : '#E8E5DE'
  const btnShadow = activeSession
    ? '0 8px 32px rgba(192,57,43,0.45)'
    : canClockIn
    ? '0 8px 32px rgba(45,106,79,0.45)'
    : 'none'
  const btnColor = canClockIn || activeSession ? '#fff' : '#B8B1A5'

  return (
    <div className="min-h-screen bg-warm-50 font-sans">
      <div className="max-w-sm mx-auto px-4 pt-12 pb-44">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.15em] uppercase text-warm-400">
              {dayStr}
            </p>
            <h1 className="font-serif text-[26px] font-bold text-warm-900 mt-1 leading-none">
              Bonjour, Sophie 👋
            </h1>
          </div>
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-medium select-none"
            style={{ background: 'linear-gradient(145deg, #2D6A4F 0%, #1B4332 100%)' }}
          >
            SD
          </div>
        </div>

        {/* ── Active session card ── */}
        {activeSession && (
          <div
            className="rounded-3xl p-6 mb-5 relative overflow-hidden"
            style={{ background: 'linear-gradient(145deg, #2D6A4F 0%, #163927 100%)' }}
          >
            <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-[0.07] bg-white pointer-events-none" />
            <div className="absolute -bottom-8 -left-8 w-28 h-28 rounded-full opacity-[0.04] bg-white pointer-events-none" />

            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
              <span
                className="text-xs font-bold uppercase tracking-widest"
                style={{ color: '#A7D4BC' }}
              >
                Session en cours
              </span>
            </div>

            <p className="font-serif text-[22px] font-bold text-white leading-tight mb-3">
              {activeSession.clientName}
            </p>

            <p
              className="text-[52px] font-bold text-white mb-3 leading-none"
              style={{
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.06em',
                fontFamily: '"DM Mono", "Courier New", monospace',
              }}
            >
              {fmtElapsed(elapsed)}
            </p>

            <div className="flex items-center gap-1.5">
              <Clock size={12} style={{ color: '#74C69D' }} />
              <span className="text-xs" style={{ color: '#74C69D' }}>
                Démarré à {fmtTime(activeSession.clockIn)}
              </span>
            </div>
          </div>
        )}

        {/* ── Financial panel ── */}
        <div className="bg-white rounded-3xl p-5 mb-5 shadow-soft">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-warm-400 mb-4">
            Mes statistiques
          </p>
          <div className="grid grid-cols-3 divide-x divide-warm-100">
            <div className="text-center pr-3">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-2.5 flex items-center justify-center"
                style={{ background: '#E8F4EC' }}
              >
                <Clock size={17} className="text-sage-600" />
              </div>
              <p className="text-[17px] font-bold text-warm-900 leading-none">
                {fmtMins(todayMinutes)}
              </p>
              <p className="text-[11px] text-warm-400 mt-1">Aujourd'hui</p>
            </div>
            <div className="text-center px-3">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-2.5 flex items-center justify-center"
                style={{ background: '#FEF3C7' }}
              >
                <Calendar size={17} className="text-terra-500" />
              </div>
              <p className="text-[17px] font-bold text-warm-900 leading-none">
                {fmtMins(monthMinutes)}
              </p>
              <p className="text-[11px] text-warm-400 mt-1">Ce mois</p>
            </div>
            <div className="text-center pl-3">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-2.5 flex items-center justify-center"
                style={{ background: '#DBEAFE' }}
              >
                <TrendingUp size={17} style={{ color: '#2563EB' }} />
              </div>
              <p className="text-[17px] font-bold text-warm-900 leading-none">
                {revenue}€
              </p>
              <p className="text-[11px] text-warm-400 mt-1">Estimé</p>
            </div>
          </div>
        </div>

        {/* ── Clients du jour ── */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="font-serif text-[18px] font-bold text-warm-900">
              Clients du jour
            </h2>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: '#E8F4EC', color: '#2D6A4F' }}
            >
              {CLIENTS.length} visites
            </span>
          </div>

          <div className="space-y-3">
            {CLIENTS.map(client => {
              const { Icon } = client
              const isSelected = selectedId === client.id
              const isThisActive = activeSession?.clientId === client.id
              const isDone = completed.some(s => s.clientId === client.id)
              const isBlocked = (!!activeSession && !isThisActive) || (isDone && !isThisActive)

              return (
                <button
                  key={client.id}
                  disabled={isBlocked}
                  onClick={() => {
                    if (activeSession || isDone) return
                    setSelectedId(isSelected ? null : client.id)
                  }}
                  className="w-full text-left rounded-2xl p-4 relative overflow-hidden"
                  style={{
                    background: isThisActive
                      ? 'linear-gradient(135deg, #F0FAF4, #D1FAE5)'
                      : '#fff',
                    border: isSelected
                      ? '2px solid #2D6A4F'
                      : '2px solid transparent',
                    boxShadow: isSelected
                      ? '0 0 0 4px rgba(45,106,79,0.12), 0 2px 12px rgba(0,0,0,0.06)'
                      : '0 2px 10px rgba(0,0,0,0.05)',
                    opacity: isBlocked ? 0.4 : 1,
                    transition: 'border-color 200ms, box-shadow 200ms, opacity 200ms',
                    cursor: isBlocked ? 'default' : 'pointer',
                  }}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Service icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: client.iconBg }}
                    >
                      <Icon size={20} style={{ color: client.iconColor }} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-warm-900 text-[15px] truncate leading-snug">
                            {client.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[12px] font-bold text-terra-500">
                              {client.scheduledTime}
                            </span>
                            <span className="text-warm-200 text-xs">·</span>
                            <span className="text-[12px] text-warm-400 truncate">
                              {client.service}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin size={10} className="text-warm-300 flex-shrink-0" />
                            <p className="text-[11px] text-warm-300 truncate">
                              {client.address}
                            </p>
                          </div>
                        </div>

                        {/* State indicator */}
                        <div className="flex-shrink-0 pt-0.5">
                          {isDone ? (
                            <CheckCircle2 size={20} className="text-sage-600" />
                          ) : isSelected ? (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center"
                              style={{ background: '#2D6A4F' }}
                            >
                              <CheckCircle2 size={13} color="#fff" />
                            </div>
                          ) : (
                            <ChevronRight size={16} className="text-warm-200" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Active session progress bar */}
                  {isThisActive && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[3px] animate-pulse"
                      style={{ background: 'linear-gradient(to right, #2D6A4F, #52B788, #2D6A4F)' }}
                    />
                  )}

                  {/* Done badge */}
                  {isDone && (
                    <div
                      className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#E8F4EC', color: '#2D6A4F' }}
                    >
                      Terminé
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Completed sessions mini-history */}
        {completed.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-warm-400 mb-3">
              Sessions du jour
            </p>
            <div className="space-y-2">
              {completed.map(s => (
                <div
                  key={s.id}
                  className="flex items-center justify-between bg-white rounded-xl px-4 py-3 shadow-soft"
                >
                  <div>
                    <p className="text-sm font-semibold text-warm-900">{s.clientName}</p>
                    <p className="text-xs text-warm-400 mt-0.5">
                      {fmtTime(s.clockIn)} → {s.clockOut ? fmtTime(s.clockOut) : '—'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-sage-600">{fmtMins(s.durationMinutes || 0)}</p>
                    <p className="text-xs text-terra-500 font-semibold mt-0.5">
                      +{(((s.durationMinutes || 0) / 60) * HOURLY_RATE).toFixed(2)}€
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{ background: 'linear-gradient(to top, #FAFAF8 65%, transparent)' }}
      >
        <div className="max-w-sm mx-auto px-4 pb-10 pt-8">
          <p
            className="text-center text-[13px] mb-3 font-medium transition-all duration-300"
            style={{ color: activeSession ? '#2D6A4F' : canClockIn ? '#2D6A4F' : '#B8B1A5' }}
          >
            {activeSession
              ? `En cours chez ${activeSession.clientName}`
              : canClockIn
              ? `✓ ${selected?.name} — Prêt à démarrer`
              : 'Sélectionnez un client pour commencer'}
          </p>

          <button
            onClick={handleBtn}
            disabled={!canClockIn && !activeSession}
            className="w-full rounded-2xl font-bold text-[16px] flex items-center justify-center gap-3 select-none"
            style={{
              height: '64px',
              background: btnBg,
              color: btnColor,
              boxShadow: btnShadow,
              transform: btnPressed ? 'scale(0.96)' : 'scale(1)',
              transition: 'transform 150ms ease, background 300ms ease, box-shadow 300ms ease',
              letterSpacing: '0.06em',
            }}
          >
            {activeSession ? (
              <>
                <div
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.22)' }}
                >
                  <div className="w-2.5 h-2.5 rounded-sm bg-white" />
                </div>
                <span>CLOCK OUT</span>
                <span
                  className="text-sm opacity-75 font-mono"
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: '"DM Mono","Courier New",monospace',
                  }}
                >
                  {fmtElapsed(elapsed)}
                </span>
              </>
            ) : (
              <>
                <div
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: canClockIn ? 'rgba(255,255,255,0.6)' : '#C4C0BC' }}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full ml-0.5"
                    style={{ background: canClockIn ? 'rgba(255,255,255,0.8)' : '#C4C0BC' }}
                  />
                </div>
                CLOCK IN
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Session summary sheet ── */}
      {summary && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{
            background: 'rgba(28,25,23,0.65)',
            backdropFilter: 'blur(6px)',
            transition: 'opacity 250ms ease',
            opacity: showSummaryAnim ? 1 : 0,
          }}
          onClick={() => setSummary(null)}
        >
          <div
            className="w-full max-w-sm rounded-t-[32px] pt-4 px-6 pb-10"
            style={{
              background: '#FAFAF8',
              transform: showSummaryAnim ? 'translateY(0)' : 'translateY(40px)',
              transition: 'transform 350ms cubic-bezier(0.34,1.56,0.64,1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1.5 rounded-full bg-warm-200 mx-auto mb-6" />

            {/* Icon + heading */}
            <div className="text-center mb-6">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: 'linear-gradient(135deg, #D1FAE5, #A7F3D0)' }}
              >
                <CheckCircle2 size={40} className="text-sage-600" />
              </div>
              <h2 className="font-serif text-[24px] font-bold text-warm-900 leading-tight mb-1">
                Session terminée !
              </h2>
              <p className="text-warm-400 text-sm">{summary.clientName}</p>
            </div>

            {/* Details card */}
            <div className="bg-white rounded-2xl p-5 mb-5 shadow-soft space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-sm text-warm-400">Heure d'arrivée</span>
                <span className="text-sm font-bold text-warm-900">{fmtTime(summary.clockIn)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-warm-400">Heure de départ</span>
                <span className="text-sm font-bold text-warm-900">
                  {summary.clockOut ? fmtTime(summary.clockOut) : '—'}
                </span>
              </div>
              <div className="h-px bg-warm-100" />
              <div className="flex justify-between items-center">
                <span className="text-[15px] font-semibold text-warm-900">Durée totale</span>
                <span className="text-[22px] font-bold text-sage-600 leading-none">
                  {fmtMins(summary.durationMinutes || 0)}
                </span>
              </div>
              <div
                className="flex justify-between items-center rounded-xl px-4 py-3"
                style={{ background: '#FEF3C7' }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-terra-500" />
                  <span className="text-sm font-semibold text-warm-700">Revenus estimés</span>
                </div>
                <span className="text-base font-bold text-terra-500">
                  +{(((summary.durationMinutes || 0) / 60) * HOURLY_RATE).toFixed(2)} €
                </span>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => setSummary(null)}
              className="w-full rounded-2xl font-bold text-white text-[16px] tracking-wide"
              style={{
                height: '58px',
                background: '#2D6A4F',
                boxShadow: '0 8px 28px rgba(45,106,79,0.38)',
              }}
            >
              Continuer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
