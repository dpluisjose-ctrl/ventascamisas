import React, { useState, useEffect } from 'react';
import { SublimationOrder } from './types';
import Dashboard from './components/Dashboard';
import Orders from './components/Orders';
import DtfPrepress from './components/DtfPrepress';
import ImageOptimizer from './components/ImageOptimizer';
import BusinessAdmin from './components/BusinessAdmin';
import DatabaseBackup from './components/DatabaseBackup';
import Sales from './components/Sales';
import { 
  Home, ShoppingBag, Database, Sparkles, Scissors, Info, CheckCircle,
  Maximize2, Wand2, Landmark, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Seeding standard high-quality sublimation orders on first launch
const SAMPLE_ORDERS: SublimationOrder[] = [
  {
    id: 'order-1-sofia',
    clientName: 'Sofía Martínez',
    clientContact: '+54 9 11 3456 7890',
    productType: 'Gorra',
    quantity: 5,
    designNotes: 'Gorra truck con frente blanco y red negra. Estampar logo de "Egresados Colegio San Martín 2026" centrado. Letras doradas y bordes negros.',
    price: 15000,
    advancePayment: 10000,
    dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
    status: 'Listo para Retirar',
    priority: 'Alta',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-2-deportivo',
    clientName: 'Club Deportivo Oeste',
    clientContact: 'deportivo_oeste@instagram',
    productType: 'Remera',
    quantity: 15,
    designNotes: 'Remeras deportivas de poliéster dry-fit blanca. Estampar escudo del club en frente izquierdo (8x8cm) y número grande en espalda en color azul marino.',
    price: 90000,
    advancePayment: 45000,
    dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days from now
    status: 'En Producción',
    priority: 'Alta',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-3-margarita',
    clientName: 'Margarita Pastelería',
    clientContact: '+54 9 11 9876 5432',
    productType: 'Taza',
    quantity: 12,
    designNotes: 'Tazas de cerámica importadas. Personalizar con logo circular de pastelería de ambos lados. Fondo rosa pastel con acuarelas degradadas (utilizar semitonos finos si es necesario).',
    price: 36000,
    advancePayment: 18000,
    dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 days from now
    status: 'En Diseño',
    priority: 'Media',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'order-4-lucas',
    clientName: 'Lucas Gómez',
    clientContact: 'lucas_g@gmail.com',
    productType: 'Mousepad',
    quantity: 2,
    designNotes: 'Mousepads de neopreno rectangulares de 20x25cm. Estampa con fondo estilo cyberpunk retro, luces de neón violetas y azuladas de alta saturación.',
    price: 8000,
    advancePayment: 0,
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 12 days from now
    status: 'Pendiente',
    priority: 'Baja',
    createdAt: new Date().toISOString(),
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'dtf_prepress' | 'database' | 'image_optimizer' | 'business_admin' | 'sales'>('dashboard');
  const [orders, setOrders] = useState<SublimationOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SublimationOrder | null>(null);
  const [optimizedImageSrc, setOptimizedImageSrc] = useState<string | null>(null);

  // Load orders from LocalStorage or seed sample data
  useEffect(() => {
    const saved = localStorage.getItem('subligest_orders');
    if (saved) {
      try {
        setOrders(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading orders from localStorage, resetting with samples', e);
        setOrders(SAMPLE_ORDERS);
      }
    } else {
      // Seed with sample data on first launch
      setOrders(SAMPLE_ORDERS);
      localStorage.setItem('subligest_orders', JSON.stringify(SAMPLE_ORDERS));
    }
  }, []);

  // Save orders to LocalStorage
  const saveOrders = (newOrders: SublimationOrder[]) => {
    setOrders(newOrders);
    localStorage.setItem('subligest_orders', JSON.stringify(newOrders));
  };

  // Add order
  const handleAddOrder = (order: SublimationOrder) => {
    const updated = [order, ...orders];
    saveOrders(updated);
  };

  // Update order
  const handleUpdateOrder = (updatedOrder: SublimationOrder) => {
    const updated = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    saveOrders(updated);
  };

  // Delete order
  const handleDeleteOrder = (id: string) => {
    const updated = orders.filter(o => o.id !== id);
    saveOrders(updated);
  };

  // Import JSON orders
  const handleImportOrders = (imported: SublimationOrder[]) => {
    saveOrders(imported);
  };

  // Clear Database
  const handleClearDatabase = () => {
    saveOrders([]);
  };

  // Load Sample Data
  const handleLoadSampleData = () => {
    saveOrders(SAMPLE_ORDERS);
  };

  // Drilldown to specific order from Dashboard
  const handleSelectOrderFromDashboard = (order: SublimationOrder) => {
    setSelectedOrder(order);
    setActiveTab('orders');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white shadow-md shadow-violet-100">
                <Scissors className="w-5 h-5 -rotate-45" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-1.5">
                  SubliGest <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">PRO</span>
                </h1>
                <p className="text-[10px] text-slate-400 font-medium">Gestión de Pedidos de Sublimación</p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setSelectedOrder(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'dashboard'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Home className="w-4 h-4" />
                <span className="hidden md:inline">Resumen</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('orders');
                  setSelectedOrder(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'orders'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span className="hidden md:inline">Pedidos ({orders.filter(o => o.status !== 'Entregado').length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('sales');
                  setSelectedOrder(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'sales'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="hidden md:inline">Ventas ({orders.filter(o => o.status === 'Entregado').length})</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('dtf_prepress');
                  setSelectedOrder(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'dtf_prepress'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span className="hidden md:inline">Preprensa DTF</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('image_optimizer');
                  setSelectedOrder(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'image_optimizer'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Maximize2 className="w-4 h-4 text-violet-500" />
                <span className="hidden md:inline">Optimizar Imagen</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('business_admin');
                  setSelectedOrder(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'business_admin'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Landmark className="w-4 h-4 text-violet-600" />
                <span className="hidden md:inline">Administración</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('database');
                  setSelectedOrder(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'database'
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Database className="w-4 h-4" />
                <span className="hidden md:inline">Base de Datos</span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content Pane */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                orders={orders} 
                onNavigateToOrders={() => setActiveTab('orders')} 
                onNavigateToDtfPrepress={() => setActiveTab('dtf_prepress')}
                onSelectOrder={handleSelectOrderFromDashboard}
              />
            )}

            {activeTab === 'orders' && (
              <Orders 
                orders={orders} 
                onAddOrder={handleAddOrder} 
                onUpdateOrder={handleUpdateOrder} 
                onDeleteOrder={handleDeleteOrder}
                selectedOrderFromDashboard={selectedOrder}
                clearDashboardSelection={() => setSelectedOrder(null)}
              />
            )}

            {activeTab === 'sales' && (
              <Sales 
                orders={orders}
                onUpdateOrder={handleUpdateOrder}
              />
            )}

            {activeTab === 'dtf_prepress' && (
              <DtfPrepress 
                injectedImageSrc={optimizedImageSrc || undefined}
                onClearInjectedImage={() => setOptimizedImageSrc(null)}
              />
            )}

            {activeTab === 'image_optimizer' && (
              <ImageOptimizer 
                onSendToDtf={(imgSrc) => {
                  setOptimizedImageSrc(imgSrc);
                  setActiveTab('dtf_prepress');
                }}
              />
            )}

            {activeTab === 'business_admin' && (
              <BusinessAdmin orders={orders} />
            )}

            {activeTab === 'database' && (
              <DatabaseBackup 
                orders={orders} 
                onImportOrders={handleImportOrders} 
                onClearDatabase={handleClearDatabase} 
                onLoadSampleData={handleLoadSampleData}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              © {new Date().getFullYear()} SubliGest PRO — Creado para Emprendedores Creativos.
            </span>
          </div>
          <div className="flex gap-4 text-xs font-semibold text-slate-400">
            <span className="flex items-center gap-1 text-slate-500">
              <CheckCircle className="w-4 h-4 text-green-500" /> Base de Datos Local Activa
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
