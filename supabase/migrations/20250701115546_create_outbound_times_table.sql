CREATE TABLE IF NOT EXISTS public.outbound_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.outbound_times ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can do all operations" ON public.outbound_times
  FOR ALL USING (auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin'));

CREATE POLICY "Agents can view outbound times for their customers" ON public.outbound_times
  FOR SELECT USING (customer_id IN 
    (SELECT customer_id FROM user_customer_assignments WHERE user_id = auth.uid())
  );

CREATE POLICY "Customers can view their own outbound times" ON public.outbound_times
  FOR SELECT USING (customer_id = (SELECT customer_id FROM profiles WHERE id = auth.uid()));

-- Index für effiziente Abfragen nach Kunde und Datum
CREATE INDEX idx_outbound_times_customer_date ON public.outbound_times (customer_id, date);
