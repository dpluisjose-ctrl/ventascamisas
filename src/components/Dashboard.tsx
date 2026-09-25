import React, { useState } from 'react';
import { SublimationOrder, SublimationPreset } from '../types';
import { 
  ShoppingBag, Clock, DollarSign, CheckCircle2, TrendingUp, AlertCircle, Thermometer,
  Zap, Compass, Calendar, ArrowRight, User, Sparkles
} from 'lucide-react';

interface DashboardProps {
  orders: SublimationOrder[];
  onNavigateToOrders: () => void;
  onNavigateToDtfPrepress: () => void;
  onSelectOrder: (order: SublimationOrder) => void;
}

export default function Dashboard({ orders, onNavigateToOrders, onNavigateToDtfPrepress, onSelectOrder }: DashboardProps) {
  const [selectedProductPreset, setSelectedProductPreset] = useState<string>('Taza de Cerámica');

  // Sublimation Presets Reference Database
  const presets: Record<string, SublimationPreset> = {
    'Taza de Cerámica': {
      product: 'Taza de Cerámica',
      temperature: 180,
      time: 180,
      pressure: 'Media',
      notes: 'Colocar papel bien estirado, sin arrugas. Al retirar, sumergir con cuidado en agua templada para cortar la sublimación y evitar bordes borrosos (efecto fantasma).',
    },
    'Remera de Poliéster': {
      product: 'Remera de Poliéster',
      temperature: 195,
      time: 40,
      pressure: 'Media',
      notes: 'Realizar un pre-planchado de 5 segundos para eliminar humedad. Colocar papel boca abajo y usar papel teflonado protector encima para evitar marcas.',
    },
    'Remera Algodón con Sublimable': {
      product: 'Remera de Algodón con Poliamida',
      temperature: 190,
      time: 50,
      pressure: 'Alta',
      notes: 'Si usas poliamida en polvo o vinilo sublimable. Deja enfriar completamente antes de retirar el transportador si usas vinilo textil de corte.',
    },
    'Gorra (Poliéster)': {
      product: 'Gorra (Frente de Poliéster)',
      temperature: 185,
      time: 50,
      pressure: 'Media',
      notes: 'Usar horma de gorras para sujetar bien la pieza. Ajustar cinta térmica para que el diseño no se mueva en la curva.',
    },
    'Mousepad (Neopreno)': {
      product: 'Mousepad de Neopreno',
      temperature: 190,
      time: 45,
      pressure: 'Baja',
      notes: 'No ejercer presión excesiva para evitar deformar el neopreno. Usar cinta térmica para fijar el diseño en las esquinas.',
    },
    'Llavero de Polímero': {
      product: 'Llavero de Polímero (Plástico)',
      temperature: 180,
      time: 60,
      pressure: 'Media',
      notes: 'Sublimar a dos caras por separado si aplica. Colocar un objeto pesado encima al retirar de la plancha para evitar que se doble al enfriarse.',
    },
    'Chopp de Vidrio': {
      product: 'Chopp / Jarro de Vidrio Esmerilado',
      temperature: 180,
      time: 200,
      pressure: 'Media',
      notes: 'El vidrio requiere un poco más de tiempo para calentarse por completo. Introducir una almohadilla de silicona si el prensa-tazas ejerce presión desigual.',
    }
  };

  // Metrics calculations
  const totalOrders = orders.length;
  const activeOrders = orders.filter(o => o.status !== 'Entregado').length;
  const pendingDesign = orders.filter(o => o.status === 'Pendiente' || o.status === 'En Diseño').length;
  const readyToPickUp = orders.filter(o => o.status === 'Listo para Retirar').length;

  const totalRevenue = orders.reduce((sum, o) => sum + o.price, 0);
  const totalPendingBalance = orders
    .filter(o => o.status !== 'Entregado')
    .reduce((sum, o) => sum + (o.price - o.advancePayment), 0);

  // Sorting orders for upcoming deadlines (closest to today first)
  const upcomingDeliveries = [...orders]
    .filter(o => o.status !== 'Entregado')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 4);

  const activePreset = presets[selectedProductPreset] || presets['Taza de Cerámica'];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="bg-white/10 text-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
            🚀 Emprendimiento Activo
          </span>
          <h1 className="text-2xl md:text-3xl font-extrabold mt-3 tracking-tight">
            ¡Hola, Diseñador!
          </h1>
          <p className="text-indigo-100 mt-2 text-sm md:text-base leading-relaxed">
            Bienvenido a tu panel de control de sublimación. Administra tus pedidos, consulta parámetros de estampación y optimiza tus películas DTF para remeras oscuras con nuestro módulo de preprensa.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={onNavigateToOrders}
              className="px-4 py-2 bg-white text-indigo-700 hover:bg-indigo-50 font-semibold rounded-lg text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              Ver mis Pedidos
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onNavigateToDtfPrepress}
              className="px-4 py-2 bg-indigo-500/30 hover:bg-indigo-500/50 text-white border border-indigo-400/30 font-semibold rounded-lg text-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              Módulo de Preprensa DTF
              <Sparkles className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_bottom_right,var(--tw-gradient-stops))] from-white to-transparent pointer-events-none hidden md:block"></div>
      </div>

      {/* Metrics Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Pedidos Activos</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{activeOrders}</span>
            <span className="text-xs text-slate-500 mt-1 block">
              {totalOrders} en total registrados
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-lg bg-violet-50 text-violet-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Diseños Pendientes</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{pendingDesign}</span>
            <span className="text-xs text-slate-500 mt-1 block">
              Requieren preparar archivos
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-lg bg-green-50 text-green-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Listo para Entrega</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{readyToPickUp}</span>
            <span className="text-xs text-slate-500 mt-1 block">
              Estampado finalizado
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start gap-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Saldo por Cobrar</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">
              ${totalPendingBalance.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">
              De {activeOrders} pedidos vigentes
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Sublimation Parameters Guide & Planner */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-slate-100">
              <Thermometer className="w-5 h-5 text-violet-600" />
              <h2 className="text-lg font-bold text-slate-800">Guía de Tiempos y Temperaturas</h2>
            </div>
            
            <p className="text-xs text-slate-500 mb-4">
              Cada material requiere parámetros de calor, presión y tiempo específicos para que los pigmentos de gas de sublimación penetren correctamente. Selecciona un producto para ver la receta técnica recomendada:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              {/* Product list tabs */}
              <div className="sm:col-span-5 flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                {Object.keys(presets).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSelectedProductPreset(key)}
                    className={`px-3 py-2 text-xs font-semibold text-left rounded-lg transition-all border ${
                      selectedProductPreset === key
                        ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* Param Display */}
              <div className="sm:col-span-7 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm mb-3 border-b border-slate-200/50 pb-2 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-violet-500" />
                    Parámetros para: <span className="text-violet-600">{activePreset.product}</span>
                  </h3>
                  
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Temp. (°C)</span>
                      <span className="text-lg font-bold text-slate-800 mt-0.5 block">{activePreset.temperature}°C</span>
                      <span className="text-[9px] text-slate-400 block">{(activePreset.temperature * 1.8 + 32).toFixed(0)}°F</span>
                    </div>

                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Tiempo</span>
                      <span className="text-lg font-bold text-slate-800 mt-0.5 block">{activePreset.time} seg</span>
                      <span className="text-[9px] text-slate-400 block">{(activePreset.time / 60).toFixed(1)} min</span>
                    </div>

                    <div className="bg-white border border-slate-200 p-2.5 rounded-lg text-center">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Presión</span>
                      <span className="text-lg font-bold text-slate-800 mt-0.5 block">{activePreset.pressure}</span>
                      <span className="text-[9px] text-slate-400 block">Plancha térmica</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-3 rounded-lg">
                    <span className="text-[10px] font-bold text-violet-600 uppercase tracking-wide block mb-1">
                      💡 Consejos y Recomendaciones del Diseñador:
                    </span>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activePreset.notes}
                    </p>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 mt-4 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                  Los parámetros son aproximados y pueden variar según la marca del papel, tinta o plancha.
                </div>
              </div>
            </div>
          </div>

          {/* Graphic Design Quick Helper Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Checklist del Proceso de Sublimación</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50">
                <span className="w-6 h-6 bg-violet-100 text-violet-700 font-bold rounded-full flex items-center justify-center text-xs mb-2">1</span>
                <h4 className="font-bold text-slate-700 text-xs mb-1">Diseño en Espejo</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  ¡Regla de oro! Imprime siempre tus diseños con el "Efecto Espejo" activado, de lo contrario las letras quedarán al revés al estampar.
                </p>
              </div>
              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors" onClick={onNavigateToDtfPrepress}>
                <span className="w-6 h-6 bg-violet-100 text-violet-700 font-bold rounded-full flex items-center justify-center text-xs mb-2">2</span>
                <h4 className="font-bold text-slate-700 text-xs mb-1 flex items-center gap-1">
                  Preprensa DTF
                  <Sparkles className="w-3 h-3 text-violet-600" />
                </h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Usa nuestro módulo de preprensa para tramar semitonos (LPI 45-60) y eliminar fondos negros profundos para remeras oscuras.
                </p>
              </div>
              <div className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50">
                <span className="w-6 h-6 bg-violet-100 text-violet-700 font-bold rounded-full flex items-center justify-center text-xs mb-2">3</span>
                <h4 className="font-bold text-slate-700 text-xs mb-1">Enfriamiento Óptimo</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Algunos materiales (como tazas y polímeros) pueden presentar migración de tinta si se dejan enfriar lentamente. Sumergir en agua frena el gas.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Proximas Entregas (Alerts / Deadlines) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-full">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                <h2 className="text-base font-bold text-slate-800">Próximas Entregas Críticas</h2>
              </div>
              <span className="bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                Activas
              </span>
            </div>

            {upcomingDeliveries.length === 0 ? (
              <div className="text-center py-12 flex-1 flex flex-col justify-center items-center">
                <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-500">No tienes entregas pendientes</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px] mx-auto">
                  ¡Excelente trabajo! Todos los pedidos están entregados o no hay registros aún.
                </p>
                <button
                  onClick={onNavigateToOrders}
                  className="mt-4 text-xs font-bold text-violet-600 hover:text-violet-700 hover:underline"
                >
                  Registrar nuevo pedido
                </button>
              </div>
            ) : (
              <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[420px] pr-1">
                {upcomingDeliveries.map((order) => {
                  const daysRemaining = Math.ceil(
                    (new Date(order.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
                  );
                  
                  let urgencyBg = 'bg-slate-50 border-slate-100 text-slate-700';
                  let urgencyLabel = `${daysRemaining} días`;
                  if (daysRemaining <= 1) {
                    urgencyBg = 'bg-rose-50 border-rose-100 text-rose-700 font-bold animate-pulse';
                    urgencyLabel = daysRemaining === 0 ? 'Entrega HOY' : daysRemaining < 0 ? 'VENCIDO' : 'Mañana';
                  } else if (daysRemaining <= 3) {
                    urgencyBg = 'bg-amber-50 border-amber-100 text-amber-700 font-semibold';
                    urgencyLabel = `En ${daysRemaining} días`;
                  }

                  return (
                    <div
                      key={order.id}
                      onClick={() => onSelectOrder(order)}
                      className="border border-slate-200 hover:border-violet-300 rounded-xl p-3.5 transition-all cursor-pointer bg-white hover:bg-slate-50/50 flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="truncate">
                          <h4 className="font-bold text-slate-800 text-sm truncate flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {order.clientName}
                          </h4>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {order.quantity}x {order.productType === 'Otro' ? order.customProductType : order.productType}
                          </p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${urgencyBg}`}>
                          {urgencyLabel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                        <span className="text-slate-400 font-medium">
                          Faltan pagar: <strong className="text-slate-700">${order.price - order.advancePayment}</strong>
                        </span>
                        
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          order.status === 'Pendiente' ? 'bg-amber-100 text-amber-800' :
                          order.status === 'En Diseño' ? 'bg-cyan-100 text-cyan-800' :
                          order.status === 'En Producción' ? 'bg-violet-100 text-violet-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
