#!/bin/sh
set -e

echo "Waiting for database to be ready..."
until PGPASSWORD=postgres psql -h db -U supabase_admin -d postgres -c '\q' 2>/dev/null; do
  sleep 1
done

echo "Setting service role passwords..."
PGPASSWORD=postgres psql -h db -U supabase_admin -d postgres -c "ALTER ROLE supabase_auth_admin WITH PASSWORD 'postgres';"
PGPASSWORD=postgres psql -h db -U supabase_admin -d postgres -c "ALTER ROLE authenticator WITH PASSWORD 'postgres';"

echo "Checking if app schema already exists..."
TABLE_EXISTS=$(PGPASSWORD=postgres psql -h db -U supabase_admin -d postgres -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')")

if [ "$TABLE_EXISTS" = "t" ]; then
  echo "App schema already exists, skipping migration."
else
  echo "Running app migration..."
  PGPASSWORD=postgres psql -h db -U supabase_admin -d postgres -f /migrations/00001_initial_schema.sql
  echo "Migration complete."
fi
