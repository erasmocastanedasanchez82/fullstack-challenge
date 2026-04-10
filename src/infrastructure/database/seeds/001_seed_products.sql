TRUNCATE TABLE products RESTART IDENTITY;

INSERT INTO products (name, category, price, is_active, stock, created_at) VALUES
  ('Aurora Ring', 'rings', 129.00, TRUE, 10, '2025-01-11T09:00:00Z'),
  ('Meridian Necklace', 'necklaces', 210.00, TRUE, 5, '2025-01-12T10:15:00Z'),
  ('Solstice Bracelet', 'bracelets', 89.50, TRUE, 8, '2025-01-13T08:45:00Z'),
  ('Luna Stud Earrings', 'earrings', 59.00, TRUE, 12, '2025-01-14T14:30:00Z'),
  ('Vintage Pearl Pendant', 'necklaces', 175.00, FALSE, 0, '2025-01-15T12:00:00Z'),
  ('Opal Twist Ring', 'rings', 145.00, FALSE, 0, '2025-01-16T16:20:00Z'),
  ('Sapphire Hoop Earrings', 'earrings', 99.00, TRUE, 0, '2025-01-17T11:10:00Z'),
  ('Atlas Chain', 'necklaces', 320.00, TRUE, 0, '2025-01-18T17:00:00Z'),
  ('Woven Gold Cuff', 'bracelets', 260.00, FALSE, 0, '2025-01-19T09:40:00Z'),
  ('Mini Charm Bracelet', 'bracelets', 72.00, TRUE, 0, '2025-01-20T13:05:00Z');
