import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import Layout from './components/layout/Layout'
import Dashboard from './pages/dashboard/Dashboard'
import InboundPage from './pages/inbound/InboundPage'
import OutboundPage from './pages/outbound/OutboundPage'
import PhysicalInventoryPage from './pages/inventory/PhysicalInventoryPage'
import SKUPage from './pages/sku/SKUPage'
import CustomersPage from './pages/customers/CustomersPage'
import StockSummaryPage from './pages/reports/StockSummaryPage'
import ReportsPage from './pages/reports/ReportsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/inbound" element={<InboundPage />} />
            <Route path="/outbound" element={<OutboundPage />} />
            <Route path="/inventory" element={<PhysicalInventoryPage />} />
            <Route path="/sku" element={<SKUPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/stock" element={<StockSummaryPage />} />
          </Routes>
        </Layout>
      </Router>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '14px' } }} />
    </QueryClientProvider>
  )
}
