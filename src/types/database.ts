export interface Database {
  public: {
    Tables: {
      skus: {
        Row: SKU
        Insert: Omit<SKU, 'id' | 'created_at'>
        Update: Partial<Omit<SKU, 'id' | 'created_at'>>
      }
      customers: {
        Row: Customer
        Insert: Omit<Customer, 'id' | 'created_at'>
        Update: Partial<Omit<Customer, 'id' | 'created_at'>>
      }
      inbound_entries: {
        Row: InboundEntry
        Insert: Omit<InboundEntry, 'id' | 'created_at'>
        Update: Partial<Omit<InboundEntry, 'id' | 'created_at'>>
      }
      outbound_entries: {
        Row: OutboundEntry
        Insert: Omit<OutboundEntry, 'id' | 'created_at'>
        Update: Partial<Omit<OutboundEntry, 'id' | 'created_at'>>
      }
      physical_inventory: {
        Row: PhysicalInventoryItem
        Insert: Omit<PhysicalInventoryItem, 'id' | 'created_at'>
        Update: Partial<Omit<PhysicalInventoryItem, 'id' | 'created_at'>>
      }
      stock_summary: {
        Row: StockSummary
        Insert: Omit<StockSummary, 'id' | 'created_at'>
        Update: Partial<Omit<StockSummary, 'id' | 'created_at'>>
      }
    }
  }
}

export interface SKU {
  id: string
  created_at: string
  sl: number
  china_code: string | null
  model_code: number
  description: string
  category: 'refrigerator' | 'washing_machine' | 'microwave_oven' | 'air_conditioner'
}

export interface Customer {
  id: string
  created_at: string
  code: number
  customer_name: string
  is_active: boolean
}

export interface InboundEntry {
  id: string
  created_at: string
  sl_no: number
  receiving_date: string
  sap_invoice_no: string | null
  party_code: number | null
  party_name: string
  load_from: string
  offload_to: string
  vehicle_type: string | null
  vehicle_size: string | null
  courier: string | null
  refrigerator_qty: number
  washing_machine_qty: number
  microwave_oven_qty: number
  air_conditioner_qty: number
  transport_cost: number | null
  transport_vendor: string | null
  vehicle_no: string | null
  remarks: string | null
  month: string | null
  scanned_serials: string[]
}

export interface OutboundEntry {
  id: string
  created_at: string
  sl: number
  dispatch_date: string
  sap_invoice_no: string | null
  party_code: number | null
  party_name: string
  load_from: string
  offload_to: string
  vehicle_type: string | null
  vehicle_size: string | null
  courier: string | null
  refrigerator_qty: number
  washing_machine_qty: number
  microwave_oven_qty: number
  transport_cost: number | null
  transport_vendor: string | null
  vehicle_no: string | null
  remarks: string | null
  month: string | null
  scanned_serials: string[]
}

export interface PhysicalInventoryItem {
  id: string
  created_at: string
  scan_date: string
  scanner_name: string
  location: string
  sl: number
  sku_code: string
  serial_no: string
  remarks: string | null
  session_id: string
}

export interface StockSummary {
  id: string
  created_at: string
  period: string
  sku_code: number
  sku_description: string
  opening_inventory: number
  total_inbound: number
  total_outbound: number
  closing_inventory: number
  saleable_qty: number
  replacement_qty: number
}

export type VehicleSize = '23FT' | '18FT' | '16FT' | '14FT' | '12FT' | '9FT' | '7FT'
export type SKUCategory = 'refrigerator' | 'washing_machine' | 'microwave_oven' | 'air_conditioner'

export const VEHICLE_SIZES: VehicleSize[] = ['23FT', '18FT', '16FT', '14FT', '12FT', '9FT', '7FT']

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const WAREHOUSES = [
  'Madanpur WH',
  'Narshindi WH',
  'GAL Narshindi',
]
