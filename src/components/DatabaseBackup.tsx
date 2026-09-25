import React, { useRef, useState, useEffect } from 'react';
import { SublimationOrder } from '../types';
import { 
  Download, Upload, Trash2, Database, ShieldAlert, Sparkles, 
  FileJson, AlertTriangle, CheckCircle, X 
} from 'lucide-react';

interface DatabaseBackupProps {
  orders: SublimationOrder[];
  onImportOrders: (imported: SublimationOrder[]) => void;
  onClearDatabase: () => void;
  onLoadSampleData: () => void;
}

export default function DatabaseBackup({ 
  orders, 
  onImportOrders, 
  onClearDatabase, 
  onLoadSampleData 
}: DatabaseBackupProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Auto-dismiss notifications after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Show status notification helper
  const triggerNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
  };

  // Export JSON file
  const handleExport = () => {
    const dataStr = JSON.stringify(orders, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `subligest_backup_${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    triggerNotification('success', '¡Copia de seguridad descargada con éxito!');
  };

  // Import JSON file
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (file) {
      fileReader.onload = (event) => {
        try {
          const parsedData = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsedData)) {
            // Basic schema check
            const isValid = parsedData.every(item => item.id && item.clientName && item.productType);
            if (isValid) {
              onImportOrders(parsedData);
              triggerNotification('success', '¡Pedidos importados con éxito!');
            } else {
              triggerNotification('error', 'El archivo no tiene el formato de pedidos compatible.');
            }
          } else {
            triggerNotification('error', 'El archivo JSON debe contener un arreglo de pedidos.');
          }
        } catch (error) {
          triggerNotification('error', 'Error al leer el archivo. Asegúrate de que sea un JSON válido.');
        }
      };
      fileReader.readAsText(file);
    }
  };

  const handleClear = () => {
    onClearDatabase();
    // Also clear expenses to reset completely
    localStorage.removeItem('subligest_expenses');
    setShowClearConfirm(false);
    triggerNotification('success', 'Base de datos y gastos del taller restablecidos por completo.');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-4xl mx-auto space-y-8 relative">
      
      {/* Dynamic Toast Notification Banners */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-xl border shadow-lg transition-all transform animate-in fade-in slide-in-from-top-4 duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="text-xs font-bold font-sans">{notification.text}</span>
          <button 
            onClick={() => setNotification(null)}
            className="p-0.5 rounded-md hover:bg-black/5 transition-colors cursor-pointer text-slate-400 hover:text-slate-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
        <Database className="w-6 h-6 text-violet-600" />
        <div>
          <h2 className="text-lg font-bold text-slate-800 font-sans">Administración de Base de Datos</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tus datos se guardan de forma segura en el almacenamiento local de tu navegador (LocalStorage). Gestiona respaldos aquí.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Respaldos */}
        <div className="border border-slate-200 rounded-xl p-5 hover:border-violet-300 transition-all space-y-4">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
            <FileJson className="w-4.5 h-4.5 text-violet-500" /> Respaldar e Importar Pedidos
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Descarga un archivo de copia de seguridad con todos tus pedidos actuales para guardarlo en tu computadora o transferir tus datos a otro dispositivo fácilmente.
          </p>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={handleExport}
              disabled={orders.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" /> Exportar Copia (.json)
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Importar Copia
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </div>
          <span className="text-[10px] text-slate-400 block">
            Pedidos actuales en sistema: <strong>{orders.length}</strong>
          </span>
        </div>

        {/* Card 2: Acciones rápidas y demo */}
        <div className="border border-slate-200 rounded-xl p-5 hover:border-violet-300 transition-all space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-indigo-500" /> Datos de Demostración
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              ¿Quieres probar la aplicación con datos reales antes de registrar los tuyos? Carga nuestro catálogo de pedidos simulados con diseños, señas y entregas ficticias.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={() => {
                onLoadSampleData();
                triggerNotification('success', '¡Datos de demostración cargados exitosamente!');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4" /> Cargar 4 Pedidos Demo
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-5 space-y-3">
        <h3 className="font-bold text-rose-800 text-sm flex items-center gap-2">
          <ShieldAlert className="w-4.5 h-4.5 text-rose-600" /> Zona de Peligro
        </h3>
        <p className="text-xs text-rose-700 leading-relaxed">
          Al presionar el botón de abajo, se borrarán todos los datos del sistema de inmediato. Esta acción es irreversible. Se recomienda exportar un respaldo primero.
        </p>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-all shadow-sm shadow-rose-100 cursor-pointer"
        >
          <Trash2 className="w-4 h-4" /> Restablecer Base de Datos por Completo
        </button>
      </div>

      {/* Custom Confirmation Modal for Cleardown */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-250 w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all scale-100 flex flex-col gap-4 font-sans animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800">¿Restablecer Base de Datos?</h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Esto eliminará permanentemente **todos los pedidos** y **gastos del taller** registrados en el navegador de manera irreversible.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 bg-rose-50 p-3 rounded-xl border border-rose-100">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <p className="text-[10px] text-rose-800 font-bold leading-normal">
                Esta acción no se puede deshacer. Por favor descarga un respaldo si deseas conservar tu información.
              </p>
            </div>

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-all shadow-md shadow-rose-100 cursor-pointer"
              >
                Sí, Restablecer Todo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
