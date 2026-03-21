-- ============================================================
-- SCRIPT COMPLETO: Gestão de Finanças Pessoais
-- Execute este script inteiro no Supabase SQL Editor de uma vez
-- ============================================================

-- 1. Criar tabela de transações
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa_fixa', 'despesa_variavel', 'reserva')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago')),
  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_group_id UUID,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2000 AND year <= 2100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1b. Migração: se a tabela já existe, atualizar o CHECK constraint para incluir 'reserva'
DO $$ BEGIN
  ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_type_check
    CHECK (type IN ('receita', 'despesa_fixa', 'despesa_variavel', 'reserva'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_month_year ON public.transactions(month, year);
CREATE INDEX IF NOT EXISTS idx_transactions_recurring_group ON public.transactions(recurring_group_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_month_year ON public.transactions(user_id, month, year);

-- 3. Habilitar Row Level Security
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS (DROP IF EXISTS para ser idempotente)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
  DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
END $$;

CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON public.transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON public.transactions FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_transactions_updated_at ON public.transactions;

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
