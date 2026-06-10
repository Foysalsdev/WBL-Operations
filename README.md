# WBL Operations ERP
Whirlpool Bangladesh Warehouse Operations — React + Vite + Supabase + Vercel · PWA + Zebra TC57

## Modules
| Module | What it does |
|---|---|
| Dashboard | Live stats + monthly charts |
| Inbound | Receiving entry (all Excel columns) |
| Outbound | Dispatch entry (all Excel columns) |
| Physical Inventory | Barcode scan for Zebra TC57, session-based |
| Stock Summary | Period stock report (mirrors Excel Summary sheet) |
| Reports | Charts: trends, categories, top customers, transport costs |
| SKU List | 69 products pre-loaded from Excel |
| Customers | Customer master with codes |

---

## Step 1 — Supabase
1. https://supabase.com → New project
2. Settings → API → copy **Project URL** and **anon key**
3. SQL Editor → paste `supabase/schema.sql` → Run

## Step 2 — Local Dev
```
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install && npm run dev
```

## Step 3 — Vercel Deploy
1. vercel.com → Import from GitHub → `Foysalsdev/WBL-Operations`
2. Add env vars: `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
3. Deploy — auto-deploys on every push

## Step 4 — PWA Install (Mobile / Zebra TC57)
- Chrome → Open deployed URL → Add to Home Screen
- Zebra TC57: scanner trigger sends Enter key — Physical Inventory auto-submits

## Zebra TC57 Notes
The scan input is: large font, auto-focus, submits on Enter, duplicate detection, location switching, session grouping.
