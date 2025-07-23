-- Test data for Knowledge page debugging
-- Customer ID: ecda6471-4060-412e-ac0e-8ba08dd5c02a

-- Insert test use cases (with required created_by field)
INSERT INTO use_cases (id, title, information_needed, customer_id, is_active, created_by, created_at, updated_at) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Mietbescheinigung beantragen', 'Zweck der Mietbescheinigung (Wohngeld, Kindergeld, etc.), Zeitraum, besondere Anforderungen', 'ecda6471-4060-412e-ac0e-8ba08dd5c02a', true, '2d520b0b-8819-4208-abd7-f13d2f2862ce', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Nebenkostenabrechnung anfragen', 'Abrechnungszeitraum, spezielle Fragen zur Abrechnung, gewünschtes Format', 'ecda6471-4060-412e-ac0e-8ba08dd5c02a', true, '2d520b0b-8819-4208-abd7-f13d2f2862ce', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Reparaturmeldung', 'Art des Schadens, Dringlichkeit, Raum/Bereich, Kontaktdaten für Terminvereinbarung', 'ecda6471-4060-412e-ac0e-8ba08dd5c02a', true, '2d520b0b-8819-4208-abd7-f13d2f2862ce', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'Kündigung einreichen', 'Kündigungstermin, Grund der Kündigung, Nachmieter gewünscht, Übergabetermin', 'ecda6471-4060-412e-ac0e-8ba08dd5c02a', true, '2d520b0b-8819-4208-abd7-f13d2f2862ce', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'Hausordnung Fragen', 'Spezifische Frage zur Hausordnung, betroffener Bereich/Aktivität', 'ecda6471-4060-412e-ac0e-8ba08dd5c02a', true, '2d520b0b-8819-4208-abd7-f13d2f2862ce', NOW(), NOW());

-- Insert test knowledge articles (with required created_by field)
INSERT INTO knowledge_articles (id, title, content, customer_id, is_active, created_by, created_at, updated_at) VALUES 
('660e8400-e29b-41d4-a716-446655440001', 'Mietrecht Grundlagen', 'Grundlegende Informationen zum Mietrecht, Rechte und Pflichten von Mietern und Vermietern. Wichtige Gesetze und Regelungen im Überblick.', 'ecda6471-4060-412e-ac0e-8ba08dd5c02a', true, '2d520b0b-8819-4208-abd7-f13d2f2862ce', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440002', 'Nebenkostenabrechnung verstehen', 'Erklärung der verschiedenen Posten in der Nebenkostenabrechnung und wie diese berechnet werden. Tipps zur Überprüfung der Abrechnung.', 'ecda6471-4060-412e-ac0e-8ba08dd5c02a', true, '2d520b0b-8819-4208-abd7-f13d2f2862ce', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440003', 'Kündigungsfristen und -formen', 'Übersicht über die verschiedenen Kündigungsfristen je nach Mietvertrag und die korrekte Form der Kündigung.', 'ecda6471-4060-412e-ac0e-8ba08dd5c02a', true, '2d520b0b-8819-4208-abd7-f13d2f2862ce', NOW(), NOW()),
('660e8400-e29b-41d4-a716-446655440004', 'Hausordnung Regelungen', 'Wichtige Punkte der Hausordnung: Ruhezeiten, Gemeinschaftsräume, Haustierhaltung und weitere Regelungen für das Zusammenleben.', 'ecda6471-4060-412e-ac0e-8ba08dd5c02a', true, '2d520b0b-8819-4208-abd7-f13d2f2862ce', NOW(), NOW());

-- Verify the data was inserted
SELECT 'Use Cases' as table_name, COUNT(*) as count FROM use_cases WHERE customer_id = 'ecda6471-4060-412e-ac0e-8ba08dd5c02a' AND is_active = true
UNION ALL
SELECT 'Knowledge Articles' as table_name, COUNT(*) as count FROM knowledge_articles WHERE customer_id = 'ecda6471-4060-412e-ac0e-8ba08dd5c02a' AND is_active = true;
