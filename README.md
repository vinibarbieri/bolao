# Bolao 2026 - World Cup Prediction App

A Next.js app for predicting the 2026 FIFA World Cup results, built with Supabase, Drizzle ORM, and shadcn/ui.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

## Getting Started with Docker

### 1. Clone the repository

```bash
git clone <repo-url>
cd bolao
```

### 2. Start all services

```bash
docker compose up --build
```

This starts 5 services:

| Service | URL | Description |
|---------|-----|-------------|
| **app** | http://localhost:3000 | Next.js dev server (hot reload) |
| **db** | localhost:54322 | PostgreSQL database |
| **auth** | localhost:9999 | Supabase Auth (GoTrue) |
| **rest** | localhost:3001 | Supabase REST (PostgREST) |
| **kong** | localhost:8000 | API Gateway |

### 3. Open the app

Go to [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Seed the database (first time only)

In a separate terminal:

```bash
docker compose exec app npm run db:seed
```

### 5. Stop the services

```bash
# Stop (keeps data)
docker compose down

# Stop and delete database volume
docker compose down -v
```

## Running without Docker

### Prerequisites

- Node.js 20+
- A Supabase project (or local Supabase CLI)

### Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file and fill in your credentials:

```bash
cp .env.local.example .env.local
```

3. Push the schema and seed:

```bash
npm run db:push
npm run db:seed
```

4. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:seed` | Seed database with teams and matches |
| `npm run db:push` | Push Drizzle schema to database |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |
