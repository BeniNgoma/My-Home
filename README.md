# CareTrack — Système de Gestion d'Agents de Soins à Domicile

## Architecture

```
caretrack/
├── apps/
│   ├── mobile/          # React Native + Expo (agents terrain)
│   └── web/             # Next.js 14 (tableau de bord admin)
├── packages/
│   └── shared/          # Types TypeScript communs
└── supabase/
    ├── migrations/      # Schéma SQL
    └── seed.sql         # Données de test
```

## Étapes de Configuration

### 1. Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com) → New Project
2. Récupérer l'URL et la clé anon dans **Settings > API**
3. Récupérer la clé service_role dans **Settings > API** (section Service Role)

### 2. Configurer la base de données

1. Ouvrir l'**éditeur SQL** dans Supabase
2. Exécuter `supabase/migrations/001_schema.sql`
3. Aller dans **Storage** → créer deux buckets publics :
   - `clock-in-photos`
   - `clock-out-photos`
4. Pour chaque bucket, activer les policies (Insert pour authenticated, Select pour public)

### 3. Créer les comptes utilisateurs de test

Dans Supabase → **Authentication > Users**, créer manuellement :
- `admin@caretrack.com` / `password123`
- `marie.dupont@caretrack.com` / `password123`
- `jean.martin@caretrack.com` / `password123`
- `fatou.diallo@caretrack.com` / `password123`

Puis récupérer leurs UUIDs et les mettre à jour dans `supabase/seed.sql`, puis exécuter le seed.

### 4. Application Web

```bash
cd apps/web
cp .env.local.example .env.local
# Remplir les variables dans .env.local
yarn install
yarn dev
```

Accès : http://localhost:3000
Login : admin@caretrack.com / password123

### 5. Application Mobile

```bash
cd apps/mobile
cp .env.example .env
# Remplir les variables dans .env
yarn install
npx expo start
```

Scanner le QR code avec l'app **Expo Go** sur votre téléphone.

---

## Fonctionnalités

### Mobile (Agents)
- ✅ Authentification Supabase
- ✅ Liste des clients assignés
- ✅ Clock In avec photo (caméra frontale) + GPS
- ✅ Clock Out avec photo + GPS + durée totale
- ✅ Historique des pointages
- ✅ Estimation du salaire mensuel
- ✅ Alerte GPS si > 500m du client

### Web (Administrateurs)
- ✅ Dashboard temps réel (Supabase Realtime)
- ✅ Alertes sessions > 12h (oubli clock-out)
- ✅ Graphique heures par jour (30 jours)
- ✅ Gestion des agents (CRUD + taux horaire)
- ✅ Gestion des clients (CRUD + GPS)
- ✅ Pointages filtrables + corrections manuelles
- ✅ Export Excel des pointages
- ✅ Paie : calcul automatique via PostgreSQL
- ✅ Export PDF des fiches de paie
- ✅ Workflow Brouillon → Finalisé → Payé

## Stack Technique
- **Mobile** : React Native + Expo + expo-router + expo-camera + expo-location
- **Web** : Next.js 14 App Router + Tailwind CSS + Recharts
- **Backend** : Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Shared** : Package TypeScript commun (types + utilitaires)
- **Export** : jsPDF + jspdf-autotable + xlsx
