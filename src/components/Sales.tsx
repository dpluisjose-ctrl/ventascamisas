import React, { useState } from 'react';
import { SublimationOrder } from '../types';
import { 
  DollarSign, ShoppingBag, Calendar, User, Search, Download, FileSpreadsheet,
  CheckCircle, ArrowUpRight, Award, Layers, TrendingUp, Printer, X, Eye, Phone, Info
} from 'lucide-react';

interface SalesProps {
  orders: SublimationOrder[];
  onUpdateOrder: (order: SublimationOrder) => void;
}

export default function Sales({ orders, onUpdateOrder }: SalesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [productFilter, setProductFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<SublimationOrder | null>(null);

  // Filter orders to only show completed/delivered ones (status === 'Entregado')
  const sales = orders.filter(o => o.status === 'Entregado');

  // Math Metrics
  const totalRevenue = sales.reduce((sum, s) => sum + s.price, 0);
  const totalUnits = sales.reduce((sum, s) => sum + s.quantity, 0);
  const totalSalesCount = sales.length;

  // Calculate product distribution
  const productDistribution = sales.reduce((acc, sale) => {
    const type = sale.productType;
    acc[type] = (acc[type] || 0) + sale.quantity;
    return acc;
  }, {} as Record<string, number>);

  const sortedProducts = Object.entries(productDistribution).sort((a, b) => b[1] - a[1]);

  // Format currency
  const formatCurr = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // Filter Sales Ledger
  const filteredSales = sales.filter(s => {
    const matchesSearch = 
      s.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.designNotes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProduct = productFilter === 'all' || s.productType === productFilter;

    return matchesSearch && matchesProduct;
  });

  // Export Sales to CSV
  const handleExportCSV = () => {
    if (sales.length === 0) return;
    
    // Headers
    const headers = ['ID de Venta', 'Cliente', 'Contacto', 'Producto', 'Cantidad', 'Precio Total ($)', 'Fecha de Registro', 'Notas de Diseño'];
    
    // Rows
    const rows = sales.map(s => [
      s.id,
      s.clientName,
      `"${s.clientContact}"`,
      s.productType,
      s.quantity,
      s.price,
      s.createdAt.split('T')[0],
      `"${s.designNotes.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `subligest_ventas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* Card 1: Facturación Total */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Facturación Acumulada</span>
            <h3 className="text-2xl font-black text-slate-800 font-mono">{formatCurr(totalRevenue)}</h3>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 mt-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> 100% Cobrado al entregar
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Unidades Entregadas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Productos Entregados</span>
            <h3 className="text-2xl font-black text-slate-800 font-mono">{totalUnits} uds.</h3>
            <span className="text-[10px] text-slate-500 font-medium block mt-1">
              Promedio: {(totalUnits / (totalSalesCount || 1)).toFixed(1)} uds. por venta
            </span>
          </div>
          <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Ventas Cerradas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Transacciones</span>
            <h3 className="text-2xl font-black text-slate-800 font-mono">{totalSalesCount}</h3>
            <span className="text-[10px] text-slate-500 font-medium block mt-1">
              Historial de pedidos despachados
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Ticket Promedio */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Valor de Ticket Promedio</span>
            <h3 className="text-2xl font-black text-slate-800 font-mono">
              {formatCurr(totalRevenue / (totalSalesCount || 1))}
            </h3>
            <span className="text-[10px] text-violet-600 font-bold block mt-1 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> Rentabilidad optimizada
            </span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Sales Ledger Table (lg:span-8) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4.5 h-4.5 text-emerald-600" />
                  Historial de Ventas Confirmadas
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  Registro histórico de pedidos sublimados que han sido entregados al cliente y cobrados en su totalidad.
                </p>
              </div>

              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleExportCSV}
                  disabled={sales.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-300 rounded-xl transition-all cursor-pointer shadow-xs w-full sm:w-auto justify-center"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Excel / CSV
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, notas, ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-violet-500"
                />
              </div>
              <div className="w-full sm:w-44">
                <select
                  value={productFilter}
                  onChange={(e) => setProductFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-violet-500 cursor-pointer font-sans"
                >
                  <option value="all">Todos los productos</option>
                  <option value="Remera">Remeras</option>
                  <option value="Taza">Tazas</option>
                  <option value="Gorra">Gorras</option>
                  <option value="Mousepad">Mousepads</option>
                  <option value="Llavero">Llaveros</option>
                  <option value="Chopp">Chopps</option>
                  <option value="Otro">Otros</option>
                </select>
              </div>
            </div>

            {/* Sales Table */}
            {filteredSales.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 animate-bounce" />
                <p className="text-xs font-bold text-slate-500">No se encontraron ventas confirmadas</p>
                <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                  Marca un pedido de producción como **"Entregado"** en la pestaña de Pedidos para que se guarde de forma permanente aquí.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">Cliente / Contacto</th>
                      <th className="py-2.5 px-3">Producto / Cantidad</th>
                      <th className="py-2.5 px-3">Fecha Entrega</th>
                      <th className="py-2.5 px-3 text-right">Monto Total</th>
                      <th className="py-2.5 px-4 text-center">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-slate-50/20 transition-all">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{sale.clientName}</div>
                          <div className="text-[10px] text-slate-400 font-medium font-mono">{sale.clientContact}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-slate-700">
                            {sale.productType === 'Otro' ? sale.customProductType : sale.productType}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">{sale.quantity} unidades</div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 font-medium">
                          {sale.dueDate}
                        </td>
                        <td className="py-3.5 px-3 text-right font-black text-slate-800 font-mono">
                          {formatCurr(sale.price)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => setSelectedInvoice(sale)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Ver Recibo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 text-center font-medium">
            Mostrando {filteredSales.length} de {sales.length} ventas confirmadas.
          </div>
        </div>

        {/* Right: Ranking & Category Split (lg:span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Sales distribution list */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Ranking de Productos Vendidos</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Distribución de artículos entregados de mayor a menor volumen.</p>
            </div>

            {sortedProducts.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Sin datos de productos entregados aún.</p>
            ) : (
              <div className="space-y-3.5">
                {sortedProducts.map(([product, quantity], idx) => {
                  const percent = Math.round((quantity / totalUnits) * 100);
                  return (
                    <div key={product} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">
                          {idx + 1}. {product}s
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          <strong>{quantity}</strong> uds ({percent}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-violet-600 h-full rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Notice */}
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2.5 text-xs text-slate-500">
            <div className="flex gap-2 items-start">
              <Info className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-slate-700 block">Flujo Automático de Ventas</span>
                <p className="leading-relaxed text-[10.5px]">
                  Cuando un pedido en producción cambia su estado a **"Entregado"**, se considera una venta realizada con éxito. 
                  El sistema congela el precio pactado y lo registra aquí para proteger tu historial contable de futuras fluctuaciones de precios.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Invoice Generator Modal Dialog */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 flex flex-col font-sans border border-slate-200 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Printer className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-bold uppercase tracking-wider">Comprobante de Entrega y Pago</span>
              </div>
              <button 
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded hover:bg-white/10 transition-colors cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invoice Printable Sheet Content */}
            <div id="printable-invoice" className="p-6 bg-white space-y-6 text-xs text-slate-700 leading-normal">
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b border-dashed border-slate-200 pb-4">
                <div>
                  <h2 className="text-sm font-black text-slate-900">SUBLIGEST TALLER</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Sublimación de Alísima Calidad</p>
                  <p className="text-[9px] text-slate-400 mt-1">Fecha Emisión: {new Date().toLocaleDateString('es-AR')}</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-black px-2.5 py-1 rounded text-[10px] uppercase">
                    COMPROBADO
                  </span>
                  <p className="text-[9px] text-slate-400 font-mono mt-2">RECIBO #{selectedInvoice.id.slice(0, 8).toUpperCase()}</p>
                </div>
              </div>

              {/* Client Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Entregado a:</span>
                  <span className="font-bold text-slate-800 block text-sm">{selectedInvoice.clientName}</span>
                  <span className="text-[10px] text-slate-500 font-mono block flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> {selectedInvoice.clientContact}
                  </span>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Fecha del Pedido:</span>
                  <span className="text-slate-600 font-medium block">{selectedInvoice.createdAt.split('T')[0]}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-2">Fecha Entrega:</span>
                  <span className="text-slate-600 font-medium block">{selectedInvoice.dueDate}</span>
                </div>
              </div>

              {/* Items Desglose Table */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block pb-1 border-b border-slate-100">Detalle de Artículos</span>
                <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded font-bold text-slate-800 text-[11px]">
                  <span>{selectedInvoice.productType === 'Otro' ? selectedInvoice.customProductType : selectedInvoice.productType}s (x{selectedInvoice.quantity})</span>
                  <span className="font-mono">{formatCurr(selectedInvoice.price)}</span>
                </div>
                {selectedInvoice.designNotes && (
                  <p className="text-[10px] text-slate-400 leading-relaxed italic bg-slate-50/50 p-2.5 rounded-lg border border-slate-100 mt-1">
                    <strong>Notas de Diseño:</strong> {selectedInvoice.designNotes}
                  </p>
                )}
              </div>

              {/* Financial Balance Summary */}
              <div className="space-y-1.5 pt-2 border-t border-dashed border-slate-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Seña / Adelanto Recibido:</span>
                  <span className="font-mono text-slate-700 font-semibold">{formatCurr(selectedInvoice.advancePayment)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span className="font-semibold">Monto Restante Cancelado al Entregar:</span>
                  <span className="font-mono font-semibold">{formatCurr(selectedInvoice.price - selectedInvoice.advancePayment)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-250 text-slate-900 font-bold text-sm">
                  <span>Monto Total Cobrado:</span>
                  <span className="font-mono font-black text-violet-700">{formatCurr(selectedInvoice.price)}</span>
                </div>
              </div>

              {/* Receipt Footer Message */}
              <p className="text-[9px] text-slate-400 text-center leading-normal pt-4">
                ¡Gracias por confiar en nuestro taller de sublimación profesional! <br />
                Este documento sirve como comprobante de pago y entrega de mercadería.
              </p>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5 justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 border border-slate-200 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-violet-100"
              >
                <Printer className="w-4 h-4" />
                Imprimir Recibo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
