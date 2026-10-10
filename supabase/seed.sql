-- Local development seed. Runs on `supabase db reset`.
--
-- Ports the prototype's mock data. Dates are relative to the day you reset,
-- so the schedule always has upcoming work and recent completions.
--
-- Demo login: demo@electrocrm.local / password

-- ---------------------------------------------------------------------------
-- Demo user
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'demo@electrocrm.local',
  extensions.crypt('password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
  gen_random_uuid(),
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"sub":"a0000000-0000-0000-0000-000000000001","email":"demo@electrocrm.local","email_verified":true}',
  'email', now(), now(), now()
);

-- ---------------------------------------------------------------------------
-- Shop
-- ---------------------------------------------------------------------------

insert into shops (id, name, tax_rate, labor_rate, timezone) values
  ('50000000-0000-0000-0000-000000000001', 'Demo Electric', 0.08, 125.00, 'America/Chicago');

insert into shop_members (shop_id, user_id, role, display_name) values
  ('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner', 'Demo Owner');

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

insert into customers (id, shop_id, name, email, phone, address, type, created_at) values
  ('c0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   'Johnson Residence', 'mark.johnson@email.com', '(555) 123-4567',
   '123 Oak Street, Springfield, IL 62701', 'residential', '2024-01-15'),
  ('c0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001',
   'Springfield Mall', 'facilities@springfieldmall.com', '(555) 234-5678',
   '456 Commerce Drive, Springfield, IL 62702', 'commercial', '2023-06-20'),
  ('c0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001',
   'Sarah Williams', 'sarah.w@email.com', '(555) 345-6789',
   '789 Maple Avenue, Springfield, IL 62703', 'residential', '2025-03-10'),
  ('c0000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001',
   'Downtown Office Complex', 'management@downtownoffice.com', '(555) 456-7890',
   '321 Business Boulevard, Springfield, IL 62704', 'commercial', '2023-02-01'),
  ('c0000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001',
   'Robert Chen', 'rchen@email.com', '(555) 567-8901',
   '654 Pine Road, Springfield, IL 62705', 'residential', '2024-08-22');

-- ---------------------------------------------------------------------------
-- Estimates
-- ---------------------------------------------------------------------------

insert into estimates (id, shop_id, customer_id, title, description, status, tax_rate, created_at, valid_until, sent_at) values
  ('e0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'Electrical Panel Upgrade',
   'Complete electrical panel upgrade with new service entrance',
   'approved', 0.08, now() - interval '17 days', current_date + 44, now() - interval '16 days'),
  ('e0000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000003', 'Home Office Electrical Setup',
   'Add dedicated circuits for home office equipment',
   'sent', 0.08, now() - interval '5 days', current_date + 25, now() - interval '5 days'),
  ('e0000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000004', 'Conference Room Electrical Upgrade',
   'Modernize electrical for AV equipment and lighting',
   'draft', 0.08, now() - interval '3 days', current_date + 57, null);

insert into estimate_items (shop_id, estimate_id, kind, description, quantity, unit_price, position) values
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'material', '200A Electrical Panel', 1, 850, 0),
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'material', 'Circuit Breakers (20A)', 8, 45, 1),
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'labor', 'Labor - Panel Installation', 6, 125, 2),
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'permit', 'Permit and Inspection', 1, 350, 3),
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'labor', 'Dedicated 20A Circuit Installation', 2, 450, 0),
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'material', 'Surge Protected Outlets', 6, 75, 1),
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'material', 'Cable Management System', 1, 200, 2),
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'material', 'Floor Power Outlets', 8, 180, 0),
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'material', 'Smart Dimmer Switches', 6, 95, 1),
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'labor', 'Electrical Rewiring', 12, 150, 2),
  ('50000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 'labor', 'Labor', 16, 125, 3);

-- ---------------------------------------------------------------------------
-- Agent drafts. A hand-written example of what the estimate tool will
-- propose, so the approval flow has something to show before a model is
-- connected. Labor uses the shop's $125/hr rate.
-- ---------------------------------------------------------------------------

insert into agent_drafts (id, shop_id, kind, status, payload, summary, reason, customer_id, requested_by, created_at) values
  ('d0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   'estimate', 'proposed',
   jsonb_build_object(
     'title', '200A Panel Upgrade',
     'description', 'Replace 100A panel with 200A service, new meter base and grounding.',
     'valid_until', to_char(current_date + 30, 'YYYY-MM-DD'),
     'tax_rate', null,
     'labor_hours', 8,
     'items', '[
       {"kind": "material", "description": "200A main breaker panel, 40 space", "quantity": 1, "unit_price": 285.00},
       {"kind": "material", "description": "200A meter base", "quantity": 1, "unit_price": 145.00},
       {"kind": "material", "description": "2/0 aluminum SER cable (ft)", "quantity": 25, "unit_price": 4.20},
       {"kind": "material", "description": "Ground rod, 8 ft, with clamp", "quantity": 2, "unit_price": 18.50},
       {"kind": "labor", "description": "Labor - panel and service upgrade", "quantity": 8, "unit_price": 125.00},
       {"kind": "permit", "description": "Electrical permit and inspection", "quantity": 1, "unit_price": 150.00}
     ]'::jsonb,
     'missing', '[
       {"description": "Utility disconnect/reconnect fee", "reason": "Not in the price list; check with the utility"}
     ]'::jsonb
   ),
   'Demo data: estimate draft for a 200A panel upgrade at Robert Chen''s',
   'Demo data written by hand for the seed, not by the agent. Prices are placeholders.',
   'c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   now() - interval '1 hour');

-- ---------------------------------------------------------------------------
-- Jobs. Times are shop-local (America/Chicago).
-- ---------------------------------------------------------------------------

insert into jobs (
  id, shop_id, customer_id, estimate_id, assigned_to, title, description, type, status, priority,
  scheduled_at, completed_at, estimated_hours, actual_hours, price, address
) values
  ('10000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'Electrical Panel Upgrade',
   'Upgrade 100A panel to 200A service. Replace old breakers and add new circuits for kitchen renovation.',
   'upgrade', 'scheduled', 'high',
   (current_date + 1 + time '09:00') at time zone 'America/Chicago', null,
   6, null, 2494.80, '123 Oak Street, Springfield, IL 62701'),
  ('10000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000002', null,
   'a0000000-0000-0000-0000-000000000001',
   'Emergency Exit Lighting Repair',
   'Fix malfunctioning emergency exit lights in south wing. Code compliance issue.',
   'repair', 'in-progress', 'urgent',
   (current_date + time '08:00') at time zone 'America/Chicago', null,
   4, 3, 1200, '456 Commerce Drive, Springfield, IL 62702'),
  ('10000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000003', null, null,
   'Ceiling Fan Installation',
   'Install 3 ceiling fans in bedrooms. Customer providing fans.',
   'installation', 'completed', 'low',
   (current_date - 9 + time '10:00') at time zone 'America/Chicago',
   (current_date - 9 + time '12:30') at time zone 'America/Chicago',
   2, 2.5, 450, '789 Maple Avenue, Springfield, IL 62703'),
  ('10000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000004', null, null,
   'Quarterly Electrical Inspection',
   'Comprehensive electrical system inspection for all floors. Generate compliance report.',
   'inspection', 'scheduled', 'medium',
   (current_date + 3 + time '13:00') at time zone 'America/Chicago', null,
   8, null, 1800, '321 Business Boulevard, Springfield, IL 62704'),
  ('10000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000005', null, null,
   'Outlet and Switch Replacement',
   'Replace 15 outdated outlets and 8 light switches throughout home.',
   'maintenance', 'completed', 'low',
   (current_date - 5 + time '14:00') at time zone 'America/Chicago',
   (current_date - 5 + time '16:00') at time zone 'America/Chicago',
   3, 2, 680, '654 Pine Road, Springfield, IL 62705'),
  ('10000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000001',
   'c0000000-0000-0000-0000-000000000002', null, null,
   'LED Lighting Conversion',
   'Convert all parking lot lighting to LED. Energy efficiency upgrade project.',
   'upgrade', 'scheduled', 'medium',
   (current_date + 8 + time '07:00') at time zone 'America/Chicago', null,
   16, null, 8500, '456 Commerce Drive, Springfield, IL 62702');
