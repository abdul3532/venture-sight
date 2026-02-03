-- VentureSight AI Database Schema
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- VC Thesis (fund investment criteria)
CREATE TABLE IF NOT EXISTS public.vc_thesis (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  thesis_text TEXT,
  target_sectors TEXT[],
  geography TEXT,
  check_size_min INTEGER,
  check_size_max INTEGER,
  preferred_stage TEXT CHECK (preferred_stage IN ('Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth')),
  anti_thesis TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Pitch Decks
CREATE TABLE IF NOT EXISTS public.pitch_decks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  startup_name TEXT,
  raw_text TEXT,
  match_score FLOAT DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'analyzed', 'archived')),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Council Analyses
CREATE TABLE IF NOT EXISTS public.council_analyses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  deck_id UUID REFERENCES public.pitch_decks(id) ON DELETE CASCADE UNIQUE,
  optimist_analysis JSONB,
  skeptic_analysis JSONB,
  quant_analysis JSONB,
  consensus_summary TEXT,
  investment_memo TEXT,
  match_score FLOAT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deck Embeddings (for RAG with pgvector)
CREATE TABLE IF NOT EXISTS public.deck_embeddings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  deck_id UUID REFERENCES public.pitch_decks(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Conversations (keep for AI Associate)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  deck_id UUID REFERENCES public.pitch_decks(id) ON DELETE SET NULL,
  title TEXT DEFAULT 'New Chat',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pitch_decks_user ON public.pitch_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_pitch_decks_status ON public.pitch_decks(status);
CREATE INDEX IF NOT EXISTS idx_council_deck ON public.council_analyses(deck_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_deck ON public.deck_embeddings(deck_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id);

-- Enable Row Level Security
ALTER TABLE public.vc_thesis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitch_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.council_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users can manage their thesis" ON public.vc_thesis
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their decks" ON public.pitch_decks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their deck analyses" ON public.council_analyses
  FOR ALL USING (deck_id IN (SELECT id FROM public.pitch_decks WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their deck embeddings" ON public.deck_embeddings
  FOR ALL USING (deck_id IN (SELECT id FROM public.pitch_decks WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their conversations" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage messages in their conversations" ON public.messages
  FOR ALL USING (conversation_id IN (SELECT id FROM public.conversations WHERE user_id = auth.uid()));
