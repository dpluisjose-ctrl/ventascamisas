import React, { useState, useRef } from 'react';
import { SublimationOrder } from '../types';
import { 
  Search, Plus, Filter, Calendar, DollarSign, User, Phone, CheckCircle, 
  Trash2, Edit, AlertTriangle, Eye, ArrowUpRight, ChevronRight, X, Image as ImageIcon,
  Check, FileDown, Layers
} from 'lucide-react';

interface OrdersProps {
  orders: SublimationOrder[];
  onAddOrder: (order: SublimationOrder) => void;
  onUpdateOrder: (order: SublimationOrder) => void;
  onDeleteOrder: (id: string) => void;
  selectedOrderFromDashboard: SublimationOrder | null;
  clearDashboardSelection: () => void;
}

export default function Orders({ 
  orders, 
  onAddOrder, 
  onUpdateOrder, 
  onDeleteOrder,
  selectedOrderFromDashboard,
  clearDashboardSelection
}: OrdersProps) {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Detail Modal State
  const [viewingOrder, setViewingOrder] = useState<SublimationOrder | null>(selectedOrderFromDashboard);
  const [orderIdToDelete, setOrderIdToDelete] = useState<string | null>(null);

  // Reference for detail showing from dashboard
  React.useEffect(() => {
    if (selectedOrderFromDashboard) {
      setViewingOrder(selectedOrderFromDashboard);
    }
  }, [selectedOrderFromDashboard]);

  // Form Fields
  const [clientName, setClientName] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [productType, setProductType] = useState<string>('Taza');
  const [customProductType, setCustomProductType] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [designNotes, setDesignNotes] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<SublimationOrder['status']>('Pendiente');
  const [priority, setPriority] = useState<SublimationOrder['priority']>('Media');
  const [imagePreview, setImagePreview] = useState<string>('');

  const imageInputRef = useRef<HTMLInputElement>(null);

  // Dynamic stock items with pricing loaded from LocalStorage
  const [stockItems, setStockItems] = useState<any[]>([]);

  React.useEffect(() => {
    const savedStock = localStorage.getItem('subligest_stock');
    if (savedStock) {
      try {
        setStockItems(JSON.parse(savedStock));
      } catch (e) {
        console.error('Error loading stock in Orders', e);
      }
    }
  }, [isModalOpen]);

  // Helper to open modal for new order
  const openNewOrderModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setClientName('');
    setClientContact('');
    
    // Read current stock items synchronously from LocalStorage
    const savedStock = localStorage.getItem('subligest_stock');
    let firstItem = null;
    let loadedItems: any[] = [];
    if (savedStock) {
      try {
        loadedItems = JSON.parse(savedStock);
        if (loadedItems.length > 0) {
          firstItem = loadedItems[0];
        }
      } catch (e) {
        console.error('Error parsing stock in openNewOrderModal', e);
      }
    }
    
    // Default product type and initial price based on the first stock item, or Taza as fallback
    const defaultType = firstItem ? firstItem.productType : 'Taza';
    const initialPrice = firstItem ? firstItem.suggestedPrice : 3000;
    
    setProductType(defaultType);
    setCustomProductType('');
    setQuantity(1);
    setDesignNotes('');
    setPrice(initialPrice);
    
    setAdvancePayment(0);
    setDueDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]); // 3 days from now
    setStatus('Pendiente');
    setPriority('Media');
    setImagePreview('');
    setIsModalOpen(true);
  };

  // Helper to open modal for editing
  const openEditOrderModal = (order: SublimationOrder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditing(true);
    setEditingId(order.id);
    setClientName(order.clientName);
    setClientContact(order.clientContact);
    setProductType(order.productType);
    setCustomProductType(order.customProductType || '');
    setQuantity(order.quantity);
    setDesignNotes(order.designNotes);
    setPrice(order.price);
    setAdvancePayment(order.advancePayment);
    setDueDate(order.dueDate);
    setStatus(order.status);
    setPriority(order.priority);
    setImagePreview(order.imagePreview || '');
    setViewingOrder(null); // Close viewing modal if editing
    setIsModalOpen(true);
  };

  // Handle Mockup Image Upload (base64)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Form Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim()) return;

    const orderData: SublimationOrder = {
      id: isEditing && editingId ? editingId : crypto.randomUUID(),
      clientName: clientName.trim(),
      clientContact: clientContact.trim(),
      productType,
      customProductType: productType === 'Otro' ? customProductType.trim() : undefined,
      quantity: Number(quantity),
      designNotes: designNotes.trim(),
      price: Number(price),
      advancePayment: Number(advancePayment),
      dueDate,
      status,
      priority,
      imagePreview,
      createdAt: isEditing && editingId 
        ? (orders.find(o => o.id === editingId)?.createdAt || new Date().toISOString())
        : new Date().toISOString()
    };

    if (isEditing) {
      onUpdateOrder(orderData);
    } else {
      onAddOrder(orderData);
    }

    setIsModalOpen(false);
  };

  // Delete Order with confirmation
  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setOrderIdToDelete(id);
  };

  const handleConfirmDelete = () => {
    if (orderIdToDelete) {
      onDeleteOrder(orderIdToDelete);
      setOrderIdToDelete(null);
      setViewingOrder(null);
      clearDashboardSelection();
    }
  };

  // Status rapid change
  const handleStatusChange = (order: SublimationOrder, newStatus: SublimationOrder['status']) => {
    const updated = { ...order, status: newStatus };
    onUpdateOrder(updated);
    if (viewingOrder?.id === order.id) {
      setViewingOrder(updated);
    }
  };

  // Filter and Search Algorithm
  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.designNotes.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.productType === 'Otro' && order.customProductType?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesProduct = productFilter === 'all' || order.productType === productFilter;
    const matchesPriority = priorityFilter === 'all' || order.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesProduct && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Listado de Pedidos</h2>
          <p className="text-xs text-slate-500 mt-1">
            Visualiza, edita y realiza el seguimiento de cada taza, remera y gorra que tienes que producir.
          </p>
        </div>
        <button
          onClick={openNewOrderModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-all shadow-sm shadow-violet-100"
        >
          <Plus className="w-4 h-4" /> Nuevo Pedido
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, diseño, descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-slate-50/50"
            />
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none"
            >
              <option value="all">Todos los Estados</option>
              <option value="Pendiente">Pendientes</option>
              <option value="En Diseño">En Diseño</option>
              <option value="En Producción">En Producción</option>
              <option value="Listo para Retirar">Listos para Retirar</option>
              <option value="Entregado">Entregados</option>
            </select>

            {/* Product Filter */}
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Cualquier Producto</option>
              {stockItems.map((item) => (
                <option key={item.id || item.productType} value={item.productType}>
                  {item.productType}s
                </option>
              ))}
              <option value="Otro">Otros</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none col-span-3 sm:col-span-1"
            >
              <option value="all">Cualquier Prioridad</option>
              <option value="Baja">Prioridad Baja</option>
              <option value="Media">Prioridad Media</option>
              <option value="Alta">Prioridad Alta</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Grid / Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-600">No se encontraron pedidos</p>
          <p className="text-xs text-slate-400 mt-1 max-w-[280px] mx-auto">
            Prueba a cambiar tus términos de búsqueda o registra tu primer pedido presionando "Nuevo Pedido".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const isCompleted = order.status === 'Entregado';
            const remainsToPay = order.price - order.advancePayment;

            return (
              <div
                key={order.id}
                onClick={() => setViewingOrder(order)}
                className={`bg-white border rounded-2xl p-5 shadow-sm hover:border-violet-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                  order.priority === 'Alta' && order.status !== 'Entregado' ? 'border-l-4 border-l-rose-500 border-slate-200' : 'border-slate-200'
                }`}
              >
                {/* Priority ribbon or icon */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="text-xs text-slate-400 font-medium"># {order.id.slice(0, 5).toUpperCase()}</span>
                    <h3 className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {order.clientName}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                    order.status === 'Pendiente' ? 'bg-amber-100 text-amber-800' :
                    order.status === 'En Diseño' ? 'bg-cyan-100 text-cyan-800' :
                    order.status === 'En Producción' ? 'bg-violet-100 text-violet-800' :
                    order.status === 'Listo para Retirar' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-100 text-slate-500 line-through'
                  }`}>
                    {order.status}
                  </span>
                </div>

                {/* Main attributes */}
                <div className="space-y-2 mb-4 text-xs text-slate-600">
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-medium">Producto:</span>
                    <span className="font-semibold text-slate-800">
                      {order.quantity}x {order.productType === 'Otro' ? order.customProductType : order.productType}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span className="font-medium">Entrega:</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {order.dueDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Saldo pendiente:</span>
                    <span className={`font-bold ${remainsToPay > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {remainsToPay > 0 ? `$${remainsToPay}` : 'Pagado'}
                    </span>
                  </div>
                </div>

                {/* Design notes snippet */}
                {order.designNotes && (
                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100/50 p-2 rounded-lg line-clamp-2 italic mb-4">
                    "{order.designNotes}"
                  </p>
                )}

                {/* Footer and controls */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                  <div className="flex gap-1.5">
                    <button
                      onClick={(e) => openEditOrderModal(order, e)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(order.id, e)}
                      className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => setViewingOrder(order)}
                    className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center gap-0.5"
                  >
                    Detalles
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- MODAL DE CREACIÓN / EDICIÓN --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">
                {isEditing ? '📝 Editar Pedido de Sublimación' : '✨ Registrar Nuevo Pedido'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Client Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contacto / Redes</label>
                  <input
                    type="text"
                    placeholder="Ej. +54 9 11 2345... / @juan_sublimados"
                    value={clientContact}
                    onChange={(e) => setClientContact(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Product and Quantity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tipo de Producto</label>
                  <select
                    value={productType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setProductType(newType);
                      // Auto-update price based on selected product and quantity!
                      const matchedItem = stockItems.find(item => item.productType === newType);
                      if (matchedItem) {
                        setPrice(matchedItem.suggestedPrice * quantity);
                      }
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white cursor-pointer font-bold text-slate-700"
                  >
                    {stockItems.map((item) => (
                      <option key={item.id || item.productType} value={item.productType}>
                        {item.productType}s — (${item.suggestedPrice} c/u)
                      </option>
                    ))}
                    <option value="Otro">Otro Producto...</option>
                  </select>
                </div>

                {productType === 'Otro' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">¿Cuál producto?</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Delantal, Almohadón"
                      value={customProductType}
                      onChange={(e) => setCustomProductType(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => {
                      const newQty = Math.max(1, parseInt(e.target.value) || 1);
                      setQuantity(newQty);
                      // Auto-update price based on selected product and quantity!
                      const matchedItem = stockItems.find(item => item.productType === productType);
                      if (matchedItem) {
                        setPrice(matchedItem.suggestedPrice * newQty);
                      }
                    }}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Customization Details */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Instrucciones y Detalles de Diseño</label>
                <textarea
                  rows={2}
                  placeholder="Ej. Remera blanca talle L, estampa de dragón en espalda de 20x30cm, nombre 'Lucas' centrado adelante en tipografía negrita."
                  value={designNotes}
                  onChange={(e) => setDesignNotes(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>

              {/* Pricing, Advance and Due date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Precio Total ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={price || ''}
                    onChange={(e) => setPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Seña Adelanto ($)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={advancePayment || ''}
                    onChange={(e) => setAdvancePayment(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fecha de Entrega</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Priority and Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Estado de Pedido</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                  >
                    <option value="Pendiente">Pendiente (No iniciado)</option>
                    <option value="En Diseño">En Diseño (Armando estampa)</option>
                    <option value="En Producción">En Producción (Estampando/Estirando)</option>
                    <option value="Listo para Retirar">Listo para Retirar</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prioridad</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg">
                    {(['Baja', 'Media', 'Alta'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-1.5 text-xs font-semibold rounded transition-all ${
                          priority === p
                            ? p === 'Alta' ? 'bg-rose-600 text-white shadow-sm' :
                              p === 'Media' ? 'bg-violet-600 text-white shadow-sm' :
                              'bg-slate-500 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mockup Upload */}
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Boceto / Mockup del Diseño</span>
                <div className="flex items-center gap-4">
                  {imagePreview ? (
                    <div className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                      <img src={imagePreview} alt="Mockup" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setImagePreview('')}
                        className="absolute top-0.5 right-0.5 bg-rose-500 text-white p-0.5 rounded-full hover:bg-rose-600 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 hover:border-violet-400 bg-slate-50 flex flex-col items-center justify-center text-slate-400 hover:text-violet-500 transition-all shrink-0"
                    >
                      <ImageIcon className="w-5 h-5" />
                      <span className="text-[9px] mt-1 font-semibold">Cargar</span>
                    </button>
                  )}
                  <div className="text-xs text-slate-400">
                    Sube una vista previa del boceto o mockup acordado con el cliente. Se almacenará en tu base de datos para referencia rápida durante el estampado.
                  </div>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition-colors border border-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg shadow-sm transition-colors"
                >
                  {isEditing ? 'Guardar Cambios' : 'Registrar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DETALLES DE PEDIDO MODAL (TICKET DE PRODUCCIÓN) --- */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-violet-50/20">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-violet-600 animate-pulse"></div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Ficha de Pedido # {viewingOrder.id.slice(0, 8).toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => {
                  setViewingOrder(null);
                  clearDashboardSelection();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Ticket body */}
            <div className="p-6 space-y-6">
              {/* Status and urgency header */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Prioridad de Entrega</span>
                  <span className={`text-xs font-bold ${
                    viewingOrder.priority === 'Alta' ? 'text-rose-600' :
                    viewingOrder.priority === 'Media' ? 'text-violet-600' :
                    'text-slate-500'
                  }`}>
                    ⚠️ Prioridad {viewingOrder.priority}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide block">Fecha de Entrega</span>
                  <span className="text-xs font-semibold text-slate-700">{viewingOrder.dueDate}</span>
                </div>
              </div>

              {/* Client & Product detail list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1">
                  Datos del Cliente y Producto
                </h4>
                
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="col-span-2 font-bold text-slate-800">{viewingOrder.clientName}</span>
                </div>

                {viewingOrder.clientContact && (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <span className="text-slate-400">Contacto:</span>
                    <span className="col-span-2 font-semibold text-violet-600">{viewingOrder.clientContact}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-slate-400">Trabajo:</span>
                  <span className="col-span-2 font-bold text-slate-800">
                    {viewingOrder.quantity} unidades de {viewingOrder.productType === 'Otro' ? viewingOrder.customProductType : viewingOrder.productType}
                  </span>
                </div>
              </div>

              {/* Customization instruction card */}
              {viewingOrder.designNotes && (
                <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1">
                    Instrucciones de Sublimación / Estampado
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {viewingOrder.designNotes}
                  </p>
                </div>
              )}

              {/* View/Design image if uploaded */}
              {viewingOrder.imagePreview && (
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-1.5">
                    Diseño / Mockup Guardado
                  </span>
                  <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-2 max-h-[180px]">
                    <img
                      src={viewingOrder.imagePreview}
                      alt="Diseño Adjunto"
                      className="max-h-[160px] object-contain rounded-lg shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* Pricing section */}
              <div className="border-t border-b border-slate-100 py-3 flex justify-between text-xs">
                <div>
                  <span className="text-slate-400 block">Total del Trabajo:</span>
                  <strong className="text-slate-800 text-sm">${viewingOrder.price}</strong>
                </div>
                <div className="text-center">
                  <span className="text-slate-400 block">Abonado (Seña):</span>
                  <strong className="text-emerald-600 text-sm">${viewingOrder.advancePayment}</strong>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block">Resta Cobrar:</span>
                  <strong className={`text-sm ${viewingOrder.price - viewingOrder.advancePayment > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    ${viewingOrder.price - viewingOrder.advancePayment}
                  </strong>
                </div>
              </div>

              {/* Change status controls */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                  Actualizar Estado de Producción
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(['Pendiente', 'En Diseño', 'En Producción', 'Listo para Retirar', 'Entregado'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(viewingOrder, s)}
                      className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${
                        viewingOrder.status === s
                          ? 'bg-violet-600 border-violet-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions footer */}
              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  onClick={() => openEditOrderModal(viewingOrder)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" /> Editar Datos
                </button>
                <button
                  onClick={() => handleDelete(viewingOrder.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar Pedido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting an Order */}
      {orderIdToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl shadow-2xl p-5 transform transition-all scale-100 flex flex-col gap-4 font-sans animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl">
                <AlertTriangle className="w-5 h-5 shrink-0" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800">¿Eliminar este pedido?</h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Esta acción eliminará el pedido de forma permanente. No podrás recuperar los datos registrados.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 justify-end pt-1">
              <button
                type="button"
                onClick={() => setOrderIdToDelete(null)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md shadow-rose-100 cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
