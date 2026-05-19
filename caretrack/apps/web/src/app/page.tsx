import Link from 'next/link'
import {
  MapPin, Clock, Users, FileText, Smartphone, Bell,
  CheckCircle, ArrowRight, Home, Shield, Zap, Heart,
} from 'lucide-react'

export const metadata = {
  title: 'My Home Support — Logiciel de gestion aide à domicile',
  description:
    'Gérez vos intervenants, clients et pointages sur une seule plateforme. Pointage GPS, planning, paie automatisée. Essai gratuit 30 jours.',
}

const features = [
  {
    icon: MapPin,
    title: 'Pointage GPS avec photo',
    desc: "Vos intervenants pointent depuis l'app mobile. Localisation et photo vérifiées à chaque arrivée et départ. Preuve irréfutable pour chaque visite.",
    color: 'sage',
  },
  {
    icon: Users,
    title: 'Gestion des équipes',
    desc: "Créez les profils de vos intervenants, gérez leurs affectations et visualisez leurs tournées en temps réel depuis le tableau de bord.",
    color: 'terra',
  },
  {
    icon: FileText,
    title: 'Paie automatisée',
    desc: "Les heures sont calculées automatiquement à partir des pointages. Exportez vos données de paie en un clic en fin de mois.",
    color: 'sage',
  },
  {
    icon: Bell,
    title: 'Alertes en temps réel',
    desc: "Soyez notifié immédiatement si un intervenant tarde à pointer, si une anomalie GPS est détectée ou si un pointage manque.",
    color: 'terra',
  },
  {
    icon: Smartphone,
    title: 'App mobile dédiée',
    desc: "Une application Android simple et intuitive pour vos intervenants. Aucune formation nécessaire — ils la maîtrisent en 5 minutes.",
    color: 'sage',
  },
  {
    icon: Clock,
    title: 'Suivi en temps réel',
    desc: "Voyez en direct qui est en intervention, depuis quand et chez quel bénéficiaire. Tableau de bord mis à jour à la seconde.",
    color: 'terra',
  },
]

const steps = [
  {
    n: '01',
    title: 'Créez votre compte',
    desc: "30 secondes, sans carte bancaire. Votre essai gratuit de 30 jours démarre immédiatement avec toutes les fonctionnalités disponibles.",
  },
  {
    n: '02',
    title: 'Ajoutez vos équipes',
    desc: "Enregistrez vos intervenants et vos bénéficiaires. Chaque intervenant reçoit un accès à l'app mobile instantanément.",
  },
  {
    n: '03',
    title: 'Gérez en temps réel',
    desc: "Suivez les pointages, recevez les alertes, validez les heures et exportez la paie. Tout, depuis un seul tableau de bord.",
  },
]

const plans = [
  {
    name: 'Essai gratuit',
    price: '0€',
    period: '30 jours',
    desc: 'Toutes les fonctionnalités, sans engagement',
    cta: 'Commencer gratuitement',
    href: '/register',
    highlight: false,
    items: [
      'Jusqu\'à 10 intervenants',
      'Pointage GPS + photo',
      'Planning & affectations',
      'Tableau de bord temps réel',
      'App mobile Android',
    ],
  },
  {
    name: 'Starter',
    price: '49€',
    period: '/mois',
    desc: 'Pour les petites structures',
    cta: 'Démarrer l\'essai gratuit',
    href: '/register',
    highlight: false,
    items: [
      'Jusqu\'à 15 intervenants',
      'Tout l\'essai gratuit',
      'Export paie mensuel',
      'Alertes email automatiques',
      'Support par email',
    ],
  },
  {
    name: 'Pro',
    price: '99€',
    period: '/mois',
    desc: 'Pour les structures en croissance',
    cta: 'Démarrer l\'essai gratuit',
    href: '/register',
    highlight: true,
    items: [
      'Intervenants illimités',
      'Tout Starter',
      'Rapports avancés',
      'Exports personnalisés',
      'Support prioritaire',
    ],
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-warm-50 font-sans">

      {/* ── Nav ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-warm-50/90 backdrop-blur-md border-b border-warm-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-sage-600 rounded-xl flex items-center justify-center shadow-sm">
              <Home size={17} className="text-white" />
            </div>
            <span className="font-serif font-bold text-warm-900 text-[15px]">My Home Support</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-semibold text-warm-600 hover:text-warm-900 transition-colors px-3 py-2"
            >
              Se connecter
            </Link>
            <Link href="/register" className="btn-primary text-sm px-5 py-2.5">
              Essai gratuit →
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────── */}
      <section
        className="pt-24 pb-28 px-6 text-center relative overflow-hidden"
        style={{
          background:
            'radial-gradient(ellipse 100% 60% at 50% -10%, rgba(45,106,79,0.10) 0%, transparent 60%), #FAFAF8',
        }}
      >
        {/* Decorative circles */}
        <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-sage-100/40 blur-3xl pointer-events-none" />
        <div className="absolute top-32 right-[8%] w-48 h-48 rounded-full bg-terra-100/30 blur-3xl pointer-events-none" />

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-sage-50 border border-sage-200 text-sage-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-sage-500" />
            Logiciel d&apos;aide à domicile — 100% français
          </div>

          <h1 className="font-serif text-5xl md:text-[3.8rem] font-bold text-warm-900 leading-[1.1] mb-6 tracking-tight">
            Gérez votre service<br />
            d&apos;aide à domicile.<br />
            <span className="text-sage-600">Simplement.</span>
          </h1>

          <p className="text-warm-500 text-lg md:text-xl leading-relaxed max-w-xl mx-auto mb-10">
            My Home Support centralise la gestion de vos intervenants, bénéficiaires
            et pointages sur une seule plateforme. Moins de paperasse, plus de temps
            pour vos équipes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="btn-primary text-base px-8 py-4 shadow-medium"
            >
              Démarrer l&apos;essai gratuit — 30 jours
              <ArrowRight size={17} className="ml-2" />
            </Link>
            <Link
              href="/login"
              className="btn-secondary text-base px-7 py-4"
            >
              J&apos;ai déjà un compte
            </Link>
          </div>

          <p className="text-warm-400 text-sm mt-5 flex items-center justify-center gap-1.5">
            <Shield size={13} />
            Sans carte bancaire · Sans engagement · Données hébergées en France
          </p>
        </div>

        {/* Dashboard preview mockup */}
        <div className="relative max-w-4xl mx-auto mt-16">
          <div
            className="bg-white rounded-3xl border border-warm-200 overflow-hidden"
            style={{ boxShadow: '0 8px 48px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {/* Browser chrome */}
            <div className="bg-warm-100 border-b border-warm-200 px-5 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-amber-400/60" />
                <div className="w-3 h-3 rounded-full bg-sage-400/60" />
              </div>
              <div className="flex-1 bg-white rounded-md px-4 py-1.5 text-xs text-warm-400 text-center ml-2 max-w-xs mx-auto border border-warm-200">
                app.myhomesupport.fr/dashboard
              </div>
            </div>

            {/* Mock dashboard content */}
            <div className="flex">
              {/* Sidebar */}
              <div className="w-52 bg-white border-r border-warm-100 py-6 px-3 hidden md:block">
                <div className="flex items-center gap-2.5 px-3 mb-6">
                  <div className="w-8 h-8 bg-sage-600 rounded-xl flex items-center justify-center">
                    <Home size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-warm-900 font-serif">Carelia SARL</p>
                    <p className="text-[8px] text-warm-400 tracking-widest font-semibold">ADMIN</p>
                  </div>
                </div>
                {['Dashboard', 'Agents', 'Clients', 'Planning', 'Pointages', 'Paie'].map((item, i) => (
                  <div
                    key={item}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl mb-0.5 text-xs font-medium ${
                      i === 0 ? 'bg-sage-600 text-white' : 'text-warm-500'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${i === 0 ? 'bg-white/60' : 'bg-warm-300'}`} />
                    {item}
                  </div>
                ))}
              </div>

              {/* Main */}
              <div className="flex-1 p-6 bg-warm-50/50">
                <p className="font-serif font-bold text-warm-900 text-lg mb-4">Bonjour 👋</p>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Agents actifs', value: '12', color: 'sage' },
                    { label: 'Bénéficiaires', value: '34', color: 'terra' },
                    { label: 'Affectations', value: '28', color: 'sage' },
                    { label: 'En intervention', value: '7', color: 'sage' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white rounded-2xl border border-warm-100 p-3">
                      <p className="text-[10px] text-warm-400 mb-1">{label}</p>
                      <p className={`text-xl font-bold ${color === 'sage' ? 'text-sage-600' : 'text-terra-500'}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl border border-warm-100 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sage-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-sage-500" />
                    </span>
                    <p className="text-xs font-semibold text-warm-700">Sessions actives</p>
                  </div>
                  {['Marie D. → M. Leblanc · 2h14', 'Paul A. → Mme Girard · 1h02', 'Sophie M. → M. Durand · 3h45'].map(row => (
                    <div key={row} className="flex items-center justify-between py-2 border-t border-warm-100 text-[11px]">
                      <span className="text-warm-700 font-medium">{row.split('·')[0]}</span>
                      <span className="text-sage-600 font-bold">·{row.split('·')[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────── */}
      <section className="py-24 px-6 bg-white border-y border-warm-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sage-600 text-sm font-bold tracking-widest uppercase mb-3">Fonctionnalités</p>
            <h2 className="font-serif text-4xl font-bold text-warm-900 mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-warm-500 text-lg max-w-xl mx-auto">
              Conçu spécifiquement pour les services d&apos;aide à domicile, avec les outils
              dont vos équipes ont réellement besoin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-warm-50 rounded-2xl border border-warm-100 p-6 hover:border-sage-200 hover:shadow-soft transition-all duration-200 group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                  color === 'sage' ? 'bg-sage-100 group-hover:bg-sage-200' : 'bg-terra-100 group-hover:bg-terra-100'
                } transition-colors`}>
                  <Icon size={22} className={color === 'sage' ? 'text-sage-600' : 'text-terra-500'} />
                </div>
                <h3 className="font-semibold text-warm-900 text-base mb-2">{title}</h3>
                <p className="text-warm-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sage-600 text-sm font-bold tracking-widest uppercase mb-3">Démarrage</p>
            <h2 className="font-serif text-4xl font-bold text-warm-900 mb-4">
              Opérationnel en 10 minutes
            </h2>
            <p className="text-warm-500 text-lg max-w-lg mx-auto">
              Pas de formation. Pas d&apos;intégration complexe. Créez votre compte
              et commencez à gérer vos équipes immédiatement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="relative">
                {/* Connector line */}
                <div className="hidden md:block absolute top-7 left-[calc(50%+2rem)] right-[-2rem] h-px bg-warm-200" />

                <div className="text-center">
                  <div className="w-14 h-14 bg-sage-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-medium">
                    <span className="font-serif font-bold text-white text-lg">{n}</span>
                  </div>
                  <h3 className="font-semibold text-warm-900 text-lg mb-3">{title}</h3>
                  <p className="text-warm-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────── */}
      <section className="py-24 px-6 bg-white border-y border-warm-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-sage-600 text-sm font-bold tracking-widest uppercase mb-3">Tarifs</p>
            <h2 className="font-serif text-4xl font-bold text-warm-900 mb-4">
              Simple et transparent
            </h2>
            <p className="text-warm-500 text-lg max-w-md mx-auto">
              Commencez gratuitement, évoluez selon vos besoins. Sans frais cachés.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map(({ name, price, period, desc, cta, href, highlight, items }) => (
              <div
                key={name}
                className={`rounded-3xl border p-7 flex flex-col ${
                  highlight
                    ? 'bg-sage-600 border-sage-600 shadow-strong'
                    : 'bg-warm-50 border-warm-200'
                }`}
              >
                <div className="mb-6">
                  {highlight && (
                    <span className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
                      Populaire
                    </span>
                  )}
                  <p className={`text-sm font-bold mb-1 ${highlight ? 'text-sage-200' : 'text-warm-500'}`}>{name}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className={`font-serif text-4xl font-bold ${highlight ? 'text-white' : 'text-warm-900'}`}>
                      {price}
                    </span>
                    <span className={`text-sm mb-1 ${highlight ? 'text-sage-200' : 'text-warm-500'}`}>{period}</span>
                  </div>
                  <p className={`text-sm ${highlight ? 'text-sage-200' : 'text-warm-500'}`}>{desc}</p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {items.map(item => (
                    <li key={item} className="flex items-start gap-2.5">
                      <CheckCircle
                        size={16}
                        className={`shrink-0 mt-0.5 ${highlight ? 'text-sage-200' : 'text-sage-500'}`}
                      />
                      <span className={`text-sm ${highlight ? 'text-white' : 'text-warm-700'}`}>{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={href}
                  className={`w-full text-center font-semibold text-sm py-3.5 rounded-2xl transition-all duration-200 ${
                    highlight
                      ? 'bg-white text-sage-700 hover:bg-sage-50'
                      : 'bg-sage-600 text-white hover:bg-sage-700'
                  }`}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-warm-400 text-sm mt-8 flex items-center justify-center gap-1.5">
            <Shield size={13} />
            Toutes les formules incluent l&apos;app mobile Android, le support email et les mises à jour.
          </p>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────── */}
      <section className="py-24 px-6">
        <div
          className="max-w-3xl mx-auto text-center bg-sage-700 rounded-3xl p-14 relative overflow-hidden"
          style={{ boxShadow: '0 8px 48px rgba(45,106,79,0.25)' }}
        >
          <div className="absolute inset-0 opacity-[0.07]">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <circle cx="20" cy="20" r="1.5" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dots)" />
            </svg>
          </div>

          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Heart size={24} className="text-white" />
            </div>
            <h2 className="font-serif text-4xl font-bold text-white mb-4 leading-tight">
              Prêt à moderniser<br />votre structure ?
            </h2>
            <p className="text-sage-200 text-lg mb-8 leading-relaxed">
              Rejoignez les services d&apos;aide à domicile qui font confiance à
              My Home Support pour gérer leurs équipes au quotidien.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 bg-white text-sage-700 font-bold text-base px-8 py-4 rounded-2xl hover:bg-sage-50 transition-colors shadow-medium"
              >
                <Zap size={18} />
                Démarrer gratuitement
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 bg-white/10 text-white font-semibold text-base px-8 py-4 rounded-2xl hover:bg-white/20 transition-colors border border-white/20"
              >
                Se connecter
              </Link>
            </div>
            <p className="text-sage-300 text-sm mt-6">
              30 jours gratuits · Sans carte bancaire · Annulable à tout moment
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-warm-200 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-sage-600 rounded-xl flex items-center justify-center">
              <Home size={14} className="text-white" />
            </div>
            <span className="font-serif font-bold text-warm-700 text-sm">My Home Support</span>
          </div>
          <p className="text-warm-400 text-sm">
            © {new Date().getFullYear()} My Home Support — Logiciel de gestion aide à domicile
          </p>
          <div className="flex items-center gap-5 text-sm text-warm-400">
            <Link href="/login" className="hover:text-warm-700 transition-colors">Connexion</Link>
            <Link href="/register" className="hover:text-warm-700 transition-colors">Inscription</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
