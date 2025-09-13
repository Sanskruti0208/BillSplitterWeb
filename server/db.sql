-- db.sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  fair_share NUMERIC(12,2) NOT NULL,
  participants JSONB NOT NULL,     -- array of {name, amount}
  transactions JSONB NOT NULL,     -- array of {from,to,amount}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
