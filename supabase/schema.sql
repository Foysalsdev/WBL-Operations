-- =====================================================
-- WBL Operations ERP - Complete Database Schema
-- Supabase (PostgreSQL)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. SKU LIST
-- =====================================================
CREATE TABLE IF NOT EXISTS skus (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sl INTEGER NOT NULL,
  china_code TEXT,
  model_code INTEGER NOT NULL UNIQUE,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('refrigerator', 'washing_machine', 'microwave_oven', 'air_conditioner'))
);

-- =====================================================
-- 2. CUSTOMERS LIST
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  code INTEGER NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 3. INBOUND ENTRIES
-- =====================================================
CREATE TABLE IF NOT EXISTS inbound_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sl_no SERIAL,
  receiving_date DATE NOT NULL,
  sap_invoice_no TEXT,
  party_code INTEGER REFERENCES customers(code),
  party_name TEXT NOT NULL,
  load_from TEXT NOT NULL,
  offload_to TEXT NOT NULL,
  vehicle_type TEXT,
  vehicle_size TEXT,
  courier TEXT,
  refrigerator_qty INTEGER NOT NULL DEFAULT 0,
  washing_machine_qty INTEGER NOT NULL DEFAULT 0,
  microwave_oven_qty INTEGER NOT NULL DEFAULT 0,
  air_conditioner_qty INTEGER NOT NULL DEFAULT 0,
  transport_cost NUMERIC(12,2),
  transport_vendor TEXT,
  vehicle_no TEXT,
  remarks TEXT,
  month TEXT,
  scanned_serials TEXT[] DEFAULT '{}'
);

-- =====================================================
-- 4. OUTBOUND ENTRIES
-- =====================================================
CREATE TABLE IF NOT EXISTS outbound_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sl SERIAL,
  dispatch_date DATE NOT NULL,
  sap_invoice_no TEXT,
  party_code INTEGER REFERENCES customers(code),
  party_name TEXT NOT NULL,
  load_from TEXT NOT NULL,
  offload_to TEXT NOT NULL,
  vehicle_type TEXT,
  vehicle_size TEXT,
  courier TEXT,
  refrigerator_qty INTEGER NOT NULL DEFAULT 0,
  washing_machine_qty INTEGER NOT NULL DEFAULT 0,
  microwave_oven_qty INTEGER NOT NULL DEFAULT 0,
  transport_cost NUMERIC(12,2),
  transport_vendor TEXT,
  vehicle_no TEXT,
  remarks TEXT,
  month TEXT,
  scanned_serials TEXT[] DEFAULT '{}'
);

-- =====================================================
-- 5. PHYSICAL INVENTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS physical_inventory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scanner_name TEXT NOT NULL,
  location TEXT NOT NULL,
  sl INTEGER NOT NULL,
  sku_code TEXT,
  serial_no TEXT NOT NULL,
  remarks TEXT,
  session_id TEXT NOT NULL,
  UNIQUE(serial_no, session_id)
);

-- =====================================================
-- 6. STOCK SUMMARY (computed/stored)
-- =====================================================
CREATE TABLE IF NOT EXISTS stock_summary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  period TEXT NOT NULL,
  sku_code INTEGER NOT NULL,
  sku_description TEXT NOT NULL,
  opening_inventory INTEGER NOT NULL DEFAULT 0,
  total_inbound INTEGER NOT NULL DEFAULT 0,
  total_outbound INTEGER NOT NULL DEFAULT 0,
  closing_inventory INTEGER GENERATED ALWAYS AS (opening_inventory + total_inbound - total_outbound) STORED,
  saleable_qty INTEGER NOT NULL DEFAULT 0,
  replacement_qty INTEGER NOT NULL DEFAULT 0,
  UNIQUE(period, sku_code)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_inbound_date ON inbound_entries(receiving_date DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_month ON inbound_entries(month);
CREATE INDEX IF NOT EXISTS idx_inbound_party ON inbound_entries(party_name);
CREATE INDEX IF NOT EXISTS idx_outbound_date ON outbound_entries(dispatch_date DESC);
CREATE INDEX IF NOT EXISTS idx_outbound_month ON outbound_entries(month);
CREATE INDEX IF NOT EXISTS idx_outbound_party ON outbound_entries(party_name);
CREATE INDEX IF NOT EXISTS idx_inventory_session ON physical_inventory(session_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON physical_inventory(location);
CREATE INDEX IF NOT EXISTS idx_inventory_serial ON physical_inventory(serial_no);
CREATE INDEX IF NOT EXISTS idx_stock_period ON stock_summary(period);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE skus ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbound_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbound_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_summary ENABLE ROW LEVEL SECURITY;

-- Public read for authenticated users (adjust as needed)
CREATE POLICY "Allow all for authenticated" ON skus FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON customers FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON inbound_entries FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON outbound_entries FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON physical_inventory FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated" ON stock_summary FOR ALL USING (true);

-- =====================================================
-- SEED DATA - SKUs (from Excel)
-- =====================================================
INSERT INTO skus (sl, china_code, model_code, description, category) VALUES
(1, NULL, 25001, 'NEO 258LH CLS PLUS CHROMIUM STEEL BD', 'refrigerator'),
(2, NULL, 25002, 'IF INV 258 CHROMIUM STEEL BD', 'refrigerator'),
(3, NULL, 25003, 'IF INV 258 STEEL ONYX BD', 'refrigerator'),
(4, NULL, 25004, 'NEO INV 258GD PRM CRYSTAL BLACK BD', 'refrigerator'),
(5, NULL, 25005, 'NEO INV 258GD PRM GALAXY BD', 'refrigerator'),
(6, NULL, 25006, 'IF INV 278 CHROMIUM STEEL BD', 'refrigerator'),
(7, NULL, 25007, 'IF INV 278 STEEL ONYX BD', 'refrigerator'),
(8, NULL, 25008, 'NEO INV 278GD PRM CRYSTAL BLACK BD', 'refrigerator'),
(9, NULL, 25009, 'NEO INV 278GD PRM GALAXY BD', 'refrigerator'),
(10, NULL, 25010, 'NEO 258LH CLS PLUS STEEL ONYX BD', 'refrigerator'),
(11, NULL, 72410, 'FreshMagic Pro 236L Chromium Steel XWH', 'refrigerator'),
(12, NULL, 72411, 'FreshMagic Pro 236L Chromium Steel', 'refrigerator'),
(13, NULL, 72412, 'FreshMagic Pro 236L GD Florina Red', 'refrigerator'),
(14, NULL, 72413, 'FreshMagic Pro 236L GD Florina Purple', 'refrigerator'),
(15, NULL, 72414, 'FreshMagic Pro 236L GD Florina Blue', 'refrigerator'),
(16, NULL, 72415, 'FreshMagic Pro 236L GD Inv Floret Red', 'refrigerator'),
(17, NULL, 72416, 'FreshMagic Pro 236L GD Inv Floret Purple', 'refrigerator'),
(18, NULL, 72421, 'FreshMagic Pro 257L GD Florina Red', 'refrigerator'),
(19, NULL, 72422, 'FreshMagic Pro 257L GD Florina Purple', 'refrigerator'),
(20, NULL, 72423, 'FreshMagic Pro 257L GD Florina Blue', 'refrigerator'),
(21, NULL, 72424, 'FreshMagic Pro 257L GD Inv Floret Red', 'refrigerator'),
(22, NULL, 72425, 'FreshMagic Pro 257L GD Inv Floret Purple', 'refrigerator'),
(23, NULL, 72429, 'FreshMagic Pro 278L GD Florina Red', 'refrigerator'),
(24, NULL, 72430, 'FreshMagic Pro 278L GD Florina Purple', 'refrigerator'),
(25, NULL, 72431, 'FreshMagic Pro 278L GD Florina Blue', 'refrigerator'),
(26, NULL, 72432, 'FreshMagic Pro 278L GD Inv Floret Red', 'refrigerator'),
(27, NULL, 72433, 'FreshMagic Pro 278L GD Inv Floret Purple', 'refrigerator'),
(28, NULL, 73001, 'FreshMagic Pro 236L GD Crystal Black', 'refrigerator'),
(29, NULL, 73002, 'FreshMagic Pro 257L GD Crystal Black', 'refrigerator'),
(30, NULL, 73003, 'FreshMagic Pro 278L GD Crystal Black', 'refrigerator'),
(31, NULL, 73091, 'FreshMagic Pro 236L Steel Onyx', 'refrigerator'),
(32, NULL, 73268, 'FreshMagic Pro 236L GD Inv Mirror', 'refrigerator'),
(33, NULL, 73269, 'FreshMagic Pro 257L GD Inv Mirror', 'refrigerator'),
(34, NULL, 73270, 'FreshMagic Pro 278L GD Inv Mirror', 'refrigerator'),
(35, NULL, 73314, 'FreshMagic Pro 236L Rosalia', 'refrigerator'),
(36, NULL, 73315, 'FreshMagic Pro 257L Rosalia', 'refrigerator'),
(37, NULL, 73316, 'FreshMagic Pro 278L Rosalia', 'refrigerator'),
(38, NULL, 73320, 'FreshMagic Pro 236L Glow', 'refrigerator'),
(39, NULL, 73321, 'FreshMagic Pro 257L Glow', 'refrigerator'),
(40, NULL, 73322, 'FreshMagic Pro 278L Glow', 'refrigerator'),
(41, NULL, 73326, 'FreshMagic Pro 236L Steel Onyx X', 'refrigerator'),
(42, NULL, 73327, 'FreshMagic Pro 236L Chromium Steel X', 'refrigerator'),
(43, NULL, 73328, 'FreshMagic Pro 236L GD Florina Red X', 'refrigerator'),
(44, NULL, 73329, 'FreshMagic Pro 236L GD Florina Purple X', 'refrigerator'),
(45, NULL, 73330, 'FreshMagic Pro 236L GD Florina Blue X', 'refrigerator'),
(46, NULL, 73334, 'FreshMagic Pro 236L GD Floral Red X', 'refrigerator'),
(47, NULL, 73335, 'FreshMagic Pro 236L GD Floral Purple X', 'refrigerator'),
(48, NULL, 31357, 'SW ULTRA 7.5 (SC) GREY', 'washing_machine'),
(49, NULL, 31492, 'WHITEMAGIC ELITE 7.5 GREY', 'washing_machine'),
(50, NULL, 31493, 'SW ULTRA 7.5 (SC) GREY 10YMW BD', 'washing_machine'),
(51, NULL, 31496, '360 BW PRO-H 9.5 GRAPHITE', 'washing_machine'),
(52, NULL, 31610, 'WM ROYAL PLUS 7.5 (H) GREY 5YMW', 'washing_machine'),
(53, NULL, 31635, 'STAINWASH PRO H 8.0 KG GREY 10YrMW', 'washing_machine'),
(54, NULL, 31662, '360 BW PRO-H 13KG GRAPHITE BD', 'washing_machine'),
(55, NULL, 31664, 'SW ROYAL PLUS 7.5 (H) GREY 10YMW', 'washing_machine'),
(56, NULL, 31679, 'STAINWASH PRO H 8.0 KG GREY 10YrMW', 'washing_machine'),
(57, '301G2786', 31697, 'SANI CARE WFC90604RT-D (9 KG FRONT LOAD)', 'washing_machine'),
(58, '301G2767', 31698, 'SANI CARE WFC105604RT-D (10.5 KG FRONT LOAD)', 'washing_machine'),
(59, '301G2773', 31699, 'SANICARE WDC11704RG-D(11KG FRNTLD COMBO)', 'washing_machine'),
(60, NULL, 50015, 'MAGICOOK 20L CLASSIC Solo MWO - Black', 'microwave_oven'),
(61, NULL, 50031, 'MAGICOOK 20L CLASSIC Solo MWO with Knob-Black', 'microwave_oven'),
(62, NULL, 50039, 'MAGICOOK 30L BLACK MIRROR', 'microwave_oven'),
(63, NULL, 50050, 'MAGICOOK PRO 25GE BLACK', 'microwave_oven'),
(64, NULL, 50054, 'MAGICOOK PRO 30 GE', 'microwave_oven'),
(65, NULL, 50065, 'GT-288 (25L CRIPS CONV.MW OVEN-BLACK)', 'microwave_oven'),
(66, '859991328171', 50092, 'Whirlpool Supreme chef 35L', 'microwave_oven'),
(67, '50057', 50093, 'MAGICOOK PRO 31CES ROTISSERIE', 'microwave_oven'),
(68, 50052, 50094, 'MAGICOOK PRO 26CE Black', 'microwave_oven'),
(69, NULL, 60025, '1.5T SUPREMECOOLPRO 3SCOPR INV (IDU)', 'air_conditioner')
ON CONFLICT (model_code) DO NOTHING;

-- =====================================================
-- 7. SERIAL AUDIT LOG
-- Tracks every edit/replace with reason
-- =====================================================
CREATE TABLE IF NOT EXISTS serial_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  action TEXT NOT NULL CHECK (action IN ('edit_entry', 'replace_serial', 'add_serial', 'remove_serial')),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('inbound', 'outbound', 'inventory')),
  entry_id UUID NOT NULL,
  serial_old TEXT,
  serial_new TEXT,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  operator_name TEXT,
  created_by TEXT DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_audit_entry ON serial_audit_log(entry_id);
CREATE INDEX IF NOT EXISTS idx_audit_serial_old ON serial_audit_log(serial_old);
CREATE INDEX IF NOT EXISTS idx_audit_serial_new ON serial_audit_log(serial_new);
CREATE INDEX IF NOT EXISTS idx_audit_action ON serial_audit_log(action);

ALTER TABLE serial_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON serial_audit_log FOR ALL USING (true);

-- =====================================================
-- 8. PURCHASE REQUISITION (PR) — Internal
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_number             TEXT UNIQUE NOT NULL,
  supplier_name         TEXT,
  supplier_code         INT,
  pr_date               DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  status                TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','partially_received','fully_received','closed')),
  approved_by           TEXT,
  delivery_terms        TEXT,
  total_value           NUMERIC(14,2) DEFAULT 0,
  remarks               TEXT,
  auto_created          BOOLEAN DEFAULT FALSE,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_requisition_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_id            UUID NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
  sku_code         INT,
  sku_description  TEXT,
  ordered_qty      INT NOT NULL DEFAULT 0,
  unit_price       NUMERIC(10,2) DEFAULT 0,
  received_qty     INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pr_status     ON purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_pr_items_pr   ON purchase_requisition_items(pr_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_sku  ON purchase_requisition_items(sku_code);

ALTER TABLE purchase_requisitions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requisition_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON purchase_requisitions      FOR ALL USING (true);
CREATE POLICY "Allow all" ON purchase_requisition_items FOR ALL USING (true);

-- =====================================================
-- 9. GRN — Goods Receipt Note
-- =====================================================
CREATE TABLE IF NOT EXISTS grn_entries (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_sap_ref   TEXT,
  pr_id         UUID REFERENCES purchase_requisitions(id),
  receive_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  supplier_name TEXT,
  remarks       TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grn_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_id           UUID NOT NULL REFERENCES grn_entries(id) ON DELETE CASCADE,
  sku_code         INT,
  sku_description  TEXT,
  ordered_qty      INT DEFAULT 0,
  received_qty     INT NOT NULL DEFAULT 0,
  damaged_qty      INT DEFAULT 0,
  shortage_qty     INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS grn_serials (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_id     UUID NOT NULL REFERENCES grn_entries(id) ON DELETE CASCADE,
  serial_no  TEXT NOT NULL,
  sku_code   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grn_pr       ON grn_entries(pr_id);
CREATE INDEX IF NOT EXISTS idx_grn_items    ON grn_items(grn_id);
CREATE INDEX IF NOT EXISTS idx_grn_serials  ON grn_serials(grn_id);

ALTER TABLE grn_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE grn_serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON grn_entries FOR ALL USING (true);
CREATE POLICY "Allow all" ON grn_items   FOR ALL USING (true);
CREATE POLICY "Allow all" ON grn_serials FOR ALL USING (true);

-- =====================================================
-- 10. PRN — Purchase Return Note
-- =====================================================
CREATE TABLE IF NOT EXISTS prn_entries (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prn_sap_ref    TEXT,
  grn_id         UUID REFERENCES grn_entries(id),
  pr_id          UUID REFERENCES purchase_requisitions(id),
  return_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  return_reason  TEXT,
  supplier_name  TEXT,
  remarks        TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prn_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prn_id           UUID NOT NULL REFERENCES prn_entries(id) ON DELETE CASCADE,
  sku_code         INT,
  sku_description  TEXT,
  received_qty     INT DEFAULT 0,
  return_qty       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prn_serials (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  prn_id     UUID NOT NULL REFERENCES prn_entries(id) ON DELETE CASCADE,
  serial_no  TEXT NOT NULL,
  sku_code   TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prn_grn     ON prn_entries(grn_id);
CREATE INDEX IF NOT EXISTS idx_prn_items   ON prn_items(prn_id);
CREATE INDEX IF NOT EXISTS idx_prn_serials ON prn_serials(prn_id);

ALTER TABLE prn_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE prn_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE prn_serials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON prn_entries FOR ALL USING (true);
CREATE POLICY "Allow all" ON prn_items   FOR ALL USING (true);
CREATE POLICY "Allow all" ON prn_serials FOR ALL USING (true);

-- =====================================================
-- Add min_stock_level to skus
-- =====================================================
ALTER TABLE skus ADD COLUMN IF NOT EXISTS min_stock_level INT DEFAULT 0;
