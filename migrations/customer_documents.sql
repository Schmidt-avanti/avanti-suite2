-- Erstellung der Tabelle für Kunden-Dokumente
CREATE TABLE IF NOT EXISTS customer_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  storage_path TEXT NOT NULL,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES auth.users(id)
);

-- Indizes für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_document_type ON customer_documents(document_type);

-- RLS-Policies für Sicherheit
ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

-- Nur Admins können alle Dokumente sehen/bearbeiten
CREATE POLICY "Admins can do everything with customer documents" 
  ON customer_documents 
  FOR ALL 
  TO authenticated 
  USING (auth.uid() IN (SELECT auth.uid() FROM auth.users WHERE auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin')));

-- Kunden können nur ihre eigenen Dokumente sehen
CREATE POLICY "Customers can view their own documents" 
  ON customer_documents 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() IN (SELECT user_id FROM user_customer_assignments WHERE customer_id = customer_documents.customer_id));
