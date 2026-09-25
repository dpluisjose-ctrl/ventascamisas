import React, { useState, useEffect } from 'react';
import { SublimationOrder } from '../types';
import { 
  DollarSign, TrendingUp, TrendingDown, Landmark, Plus, 
  Trash2, Sliders, Calculator, PieChart, Tag, Calendar, 
  Percent, FileSpreadsheet, Layers, ShoppingBag, CheckCircle,
  Lock, Unlock, ShieldAlert
} from 'lucide-react';

// Live Firebase integration
import { db } from '../firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

interface BusinessAdminProps {
  orders: SublimationOrder[];
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'Insumos' | 'Servicios' | 'Maquinaria' | 'Alquiler' | 'Otros';
  date: string;
  amortizationType?: 'month' | 'permanent'; // month = only applies to this month, permanent = applies globally/permanently until recovered
}

interface CashClosure {
  id: string;
  month: string; // "YYYY-MM"
  salesTotal: number;
  expensesTotal: number;
  profit: number;
  closedAt: string;
}

interface ProductCostConfig {
  productType: string;
  unitCost: number;
}

interface StockItem {
  id: string;
  productType: string;
  quantity: number;
  unitCost: number;
  suggestedPrice: number;
  minAlert: number;
}

export default function BusinessAdmin({ orders }: BusinessAdminProps) {
  // Expenses state with LocalStorage persistence
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseCategory, setExpenseCategory] = useState<'Insumos' | 'Servicios' | 'Maquinaria' | 'Alquiler' | 'Otros'>('Insumos');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseAmortization, setExpenseAmortization] = useState<'month' | 'permanent'>('month');

  // Finance Viewer states
  const [financeViewMode, setFinanceViewMode] = useState<'month' | 'total'>('month');
  const [cashClosures, setCashClosures] = useState<CashClosure[]>([]);
  const [closureMonthInput, setClosureMonthInput] = useState(new Date().toISOString().slice(0, 7)); // "YYYY-MM"

  // Stock / Inventory state with LocalStorage persistence
  const [stock, setStock] = useState<StockItem[]>([]);
  const [stockFormType, setStockFormType] = useState<string>('Remera');
  const [stockFormQty, setStockFormQty] = useState<number | ''>('');
  const [stockFormMinAlert, setStockFormMinAlert] = useState<number>(5);

  // Product cost configuration (for calculating Gross Margin / Cost of Goods Sold)
  const [productCosts, setProductCosts] = useState<ProductCostConfig[]>([
    { productType: 'Remera', unitCost: 3500 },
    { productType: 'Taza', unitCost: 1200 },
    { productType: 'Gorra', unitCost: 1500 },
    { productType: 'Mousepad', unitCost: 1000 },
    { productType: 'Llavero', unitCost: 400 },
    { productType: 'Chopp', unitCost: 2200 },
    { productType: 'Otro', unitCost: 1500 },
  ]);

  // Editing state for product costs
  const [editingCostType, setEditingCostType] = useState<string | null>(null);
  const [editingCostVal, setEditingCostVal] = useState<number>(0);

  // Custom products inputs
  const [newCustomProductType, setNewCustomProductType] = useState('');
  const [newCustomProductCost, setNewCustomProductCost] = useState<number | ''>('');

  // Break-even simulator inputs
  const [simFixedCosts, setSimFixedCosts] = useState<number>(120000); // monthly rent, power, etc.
  const [simSellingPrice, setSimSellingPrice] = useState<number>(8500); // average price
  const [simUnitCost, setSimUnitCost] = useState<number>(3500); // average cost per unit

  // Pricing Calculator inputs
  const [calcProductType, setCalcProductType] = useState<string>('Remera');
  const [calcBlankPrice, setCalcBlankPrice] = useState<number>(2000); // base price of the blank item
  const [calcPrintCost, setCalcPrintCost] = useState<number>(800); // paper, ink, dtf transfer, polyamide powder, etc.
  const [calcLaborTime, setCalcLaborTime] = useState<number>(0.5); // hours spent designing & pressing (e.g. 0.5 hours = 30 mins)
  const [calcHourlyRate, setCalcHourlyRate] = useState<number>(3000); // hourly rate you want to earn
  const [calcOverheadUnit, setCalcOverheadUnit] = useState<number>(400); // overhead costs like electricity, rent share, packaging, stickers
  const [calcDesiredMargin, setCalcDesiredMargin] = useState<number>(80); // desired profit margin percentage (e.g., 80% markup)
  const [calcSuccessMessage, setCalcSuccessMessage] = useState<string | null>(null);

  // Auto-dismiss calc success message
  useEffect(() => {
    if (calcSuccessMessage) {
      const timer = setTimeout(() => setCalcSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [calcSuccessMessage]);

  // Load initial local caches or seed if Firestore snapshot is empty
  useEffect(() => {
    // 1. Expenses Loader
    const savedExp = localStorage.getItem('subligest_expenses');
    let localExpenses: Expense[] = [];
    if (savedExp) {
      try { localExpenses = JSON.parse(savedExp); } catch(e){}
    }
    const unsubscribeExp = onSnapshot(collection(db, 'expenses'), (snapshot) => {
      if (snapshot.empty) {
        // Seed database if empty
        const initial: Expense[] = localExpenses.length > 0 ? localExpenses : [
          { id: 'exp-1', description: 'Papel de Sublimación A4 Premium x100h', amount: 14500, category: 'Insumos', date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], amortizationType: 'month' },
          { id: 'exp-2', description: 'Tinta de Sublimación Negra 100ml', amount: 9800, category: 'Insumos', date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], amortizationType: 'month' },
          { id: 'exp-3', description: 'Factura de Luz Eléctrica (Taller)', amount: 28000, category: 'Servicios', date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], amortizationType: 'month' },
          { id: 'exp-4', description: 'Repuesto de Resistencia para Prensa de Gorras', amount: 32000, category: 'Maquinaria', date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], amortizationType: 'month' },
          { id: 'exp-5', description: 'Alquiler del Taller de Estampación', amount: 85000, category: 'Alquiler', date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], amortizationType: 'month' },
        ];
        setExpenses(initial);
        localStorage.setItem('subligest_expenses', JSON.stringify(initial));
        initial.forEach(async (exp) => {
          try { await setDoc(doc(db, 'expenses', exp.id), exp); } catch(e){}
        });
      } else {
        const list: Expense[] = [];
        snapshot.forEach((doc) => { list.push(doc.data() as Expense); });
        const sorted = list.sort((a, b) => b.date.localeCompare(a.date));
        setExpenses(sorted);
        localStorage.setItem('subligest_expenses', JSON.stringify(sorted));
      }
    });

    // 2. Stock Loader
    const savedStock = localStorage.getItem('subligest_stock');
    let localStock: StockItem[] = [];
    if (savedStock) {
      try { localStock = JSON.parse(savedStock); } catch(e){}
    }
    const unsubscribeStock = onSnapshot(collection(db, 'stock'), (snapshot) => {
      if (snapshot.empty) {
        const initial = localStock.length > 0 ? localStock : [
          { id: 'st-1', productType: 'Remera', quantity: 30, unitCost: 3500, suggestedPrice: 8500, minAlert: 5 },
          { id: 'st-2', productType: 'Taza', quantity: 45, unitCost: 1200, suggestedPrice: 3000, minAlert: 10 },
          { id: 'st-3', productType: 'Gorra', quantity: 12, unitCost: 1500, suggestedPrice: 4500, minAlert: 5 },
          { id: 'st-4', productType: 'Mousepad', quantity: 25, unitCost: 1000, suggestedPrice: 3000, minAlert: 5 },
          { id: 'st-5', productType: 'Llavero', quantity: 120, unitCost: 400, suggestedPrice: 1200, minAlert: 15 },
          { id: 'st-6', productType: 'Chopp', quantity: 8, unitCost: 2200, suggestedPrice: 6500, minAlert: 3 },
        ];
        setStock(initial);
        localStorage.setItem('subligest_stock', JSON.stringify(initial));
        initial.forEach(async (item) => {
          try { await setDoc(doc(db, 'stock', item.id), item); } catch(e){}
        });
      } else {
        const list: StockItem[] = [];
        snapshot.forEach((doc) => { list.push(doc.data() as StockItem); });
        setStock(list);
        localStorage.setItem('subligest_stock', JSON.stringify(list));
      }
    });

    // 3. Product Costs Loader
    const savedCosts = localStorage.getItem('subligest_product_costs');
    let localCosts: ProductCostConfig[] = [];
    if (savedCosts) {
      try { localCosts = JSON.parse(savedCosts); } catch(e){}
    }
    const unsubscribeCosts = onSnapshot(collection(db, 'productCosts'), (snapshot) => {
      if (snapshot.empty) {
        const initial = localCosts.length > 0 ? localCosts : [
          { productType: 'Remera', unitCost: 3500 },
          { productType: 'Taza', unitCost: 1200 },
          { productType: 'Gorra', unitCost: 1500 },
          { productType: 'Mousepad', unitCost: 1000 },
          { productType: 'Llavero', unitCost: 400 },
          { productType: 'Chopp', unitCost: 2200 },
          { productType: 'Otro', unitCost: 1500 },
        ];
        setProductCosts(initial);
        localStorage.setItem('subligest_product_costs', JSON.stringify(initial));
        initial.forEach(async (cost) => {
          try { await setDoc(doc(db, 'productCosts', cost.productType), cost); } catch(e){}
        });
      } else {
        const list: ProductCostConfig[] = [];
        snapshot.forEach((doc) => { list.push(doc.data() as ProductCostConfig); });
        setProductCosts(list);
        localStorage.setItem('subligest_product_costs', JSON.stringify(list));
      }
    });

    // 4. Cash Closures Loader
    const savedClosures = localStorage.getItem('subligest_cash_closures');
    let localClosures: CashClosure[] = [];
    if (savedClosures) {
      try { localClosures = JSON.parse(savedClosures); } catch(e){}
    }
    const unsubscribeClosures = onSnapshot(collection(db, 'cashClosures'), (snapshot) => {
      if (snapshot.empty && localClosures.length > 0) {
        setCashClosures(localClosures);
        localClosures.forEach(async (cls) => {
          try { await setDoc(doc(db, 'cashClosures', cls.id), cls); } catch(e){}
        });
      } else {
        const list: CashClosure[] = [];
        snapshot.forEach((doc) => { list.push(doc.data() as CashClosure); });
        const sorted = list.sort((a, b) => b.month.localeCompare(a.month));
        setCashClosures(sorted);
        localStorage.setItem('subligest_cash_closures', JSON.stringify(sorted));
      }
    });

    return () => {
      unsubscribeExp();
      unsubscribeStock();
      unsubscribeCosts();
      unsubscribeClosures();
    };
  }, []);

  // Save Expenses helper
  const saveExpenses = (updatedExpenses: Expense[]) => {
    setExpenses(updatedExpenses);
    localStorage.setItem('subligest_expenses', JSON.stringify(updatedExpenses));
  };

  // Save Cash Closures helper
  const saveCashClosures = (updatedClosures: CashClosure[]) => {
    setCashClosures(updatedClosures);
    localStorage.setItem('subligest_cash_closures', JSON.stringify(updatedClosures));
  };

  // Save Stock helper
  const saveStock = (updatedStock: StockItem[]) => {
    setStock(updatedStock);
    localStorage.setItem('subligest_stock', JSON.stringify(updatedStock));
  };

  // Save Product Costs helper
  const saveProductCosts = (updatedCosts: ProductCostConfig[]) => {
    setProductCosts(updatedCosts);
    localStorage.setItem('subligest_product_costs', JSON.stringify(updatedCosts));
  };

  // Add Expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || !expenseAmount || expenseAmount <= 0) return;

    const newExp: Expense = {
      id: `exp-${Date.now()}`,
      description: expenseDesc.trim(),
      amount: Number(expenseAmount),
      category: expenseCategory,
      date: expenseDate,
      amortizationType: expenseAmortization
    };

    const updated = [newExp, ...expenses];
    saveExpenses(updated);
    try {
      await setDoc(doc(db, 'expenses', newExp.id), newExp);
    } catch(err) {
      console.error("Firestore writing error:", err);
    }

    // Reset inputs
    setExpenseDesc('');
    setExpenseAmount('');
    setExpenseCategory('Insumos');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setExpenseAmortization('month');
  };

  // Create Monthly Cash Closure
  const handleCreateCashClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closureMonthInput) return;

    // Check if closure already exists
    if (cashClosures.some(c => c.month === closureMonthInput)) {
      setCalcSuccessMessage(`El período ${closureMonthInput} ya se encuentra cerrado.`);
      return;
    }

    // Filter orders and calculate total sales for that month
    const monthSales = orders
      .filter(o => o.createdAt.startsWith(closureMonthInput))
      .reduce((sum, o) => sum + o.price, 0);

    // Filter expenses for that month (standard monthly + active permanent ones)
    const monthExpenses = expenses
      .filter(exp => {
        if (exp.date.startsWith(closureMonthInput)) return true;
        if (exp.amortizationType === 'permanent') {
          // Check if sales up to the end of that month have covered it
          const salesSince = orders
            .filter(o => o.createdAt >= exp.date && o.createdAt <= `${closureMonthInput}-31`)
            .reduce((sum, o) => sum + o.price, 0);
          return salesSince < exp.amount; // still unrecovered during this month
        }
        return false;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);

    const profit = monthSales - monthExpenses;

    const newClosure: CashClosure = {
      id: `cls-${Date.now()}`,
      month: closureMonthInput,
      salesTotal: monthSales,
      expensesTotal: monthExpenses,
      profit,
      closedAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newClosure, ...cashClosures].sort((a, b) => b.month.localeCompare(a.month));
    saveCashClosures(updated);
    try {
      await setDoc(doc(db, 'cashClosures', newClosure.id), newClosure);
    } catch(err) {
      console.error("Firestore writing error:", err);
    }
    setCalcSuccessMessage(`¡Cierre mensual de ${closureMonthInput} guardado exitosamente!`);
  };

  // Delete Cash Closure
  const handleDeleteCashClosure = async (id: string) => {
    const updated = cashClosures.filter(c => c.id !== id);
    saveCashClosures(updated);
    try {
      await deleteDoc(doc(db, 'cashClosures', id));
    } catch(err) {
      console.error("Firestore deleting error:", err);
    }
    setCalcSuccessMessage('Se eliminó el cierre de caja.');
  };

  // Delete Expense
  const handleDeleteExpense = async (id: string) => {
    const updated = expenses.filter(exp => exp.id !== id);
    saveExpenses(updated);
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch(err) {
      console.error("Firestore deleting error:", err);
    }
  };

  // Quick adjust stock quantity
  const handleAdjustStockQty = async (id: string, amount: number) => {
    const matched = stock.find(item => item.id === id);
    if (!matched) return;
    const updatedItem = { ...matched, quantity: Math.max(0, matched.quantity + amount) };
    const updated = stock.map(item => item.id === id ? updatedItem : item);
    saveStock(updated);
    try {
      await setDoc(doc(db, 'stock', id), updatedItem);
    } catch(e){}
  };

  // Add stock from stock form
  const handleAddStockItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockFormQty || stockFormQty <= 0) return;

    // Check if product type already exists in stock
    const exists = stock.find(item => item.productType === stockFormType);
    if (exists) {
      // Add quantity to existing
      const updatedItem = { ...exists, quantity: exists.quantity + Number(stockFormQty) };
      const updated = stock.map(item => item.productType === stockFormType ? updatedItem : item);
      saveStock(updated);
      try {
        await setDoc(doc(db, 'stock', exists.id), updatedItem);
      } catch (e) {}
      setCalcSuccessMessage(`Se agregaron +${stockFormQty} unidades de ${stockFormType} al stock existente.`);
    } else {
      // Find configured cost/price
      const config = productCosts.find(c => c.productType === stockFormType);
      const cost = config ? config.unitCost : 1500;
      const suggested = cost * 2.5; // default 150% markup

      const newItem: StockItem = {
        id: `st-${Date.now()}`,
        productType: stockFormType,
        quantity: Number(stockFormQty),
        unitCost: cost,
        suggestedPrice: suggested,
        minAlert: stockFormMinAlert
      };
      saveStock([...stock, newItem]);
      try {
        await setDoc(doc(db, 'stock', newItem.id), newItem);
      } catch (e) {}
      setCalcSuccessMessage(`Se creó el artículo ${stockFormType} con ${stockFormQty} unidades en stock.`);
    }

    setStockFormQty('');
  };

  // Remove item from stock entirely
  const handleDeleteStockItem = async (id: string) => {
    const updated = stock.filter(item => item.id !== id);
    saveStock(updated);
    try {
      await deleteDoc(doc(db, 'stock', id));
    } catch(e){}
  };

  // Update Product Cost Inline
  const handleSaveProductCost = async (productType: string) => {
    const updated = productCosts.map(c => 
      c.productType === productType ? { ...c, unitCost: editingCostVal } : c
    );
    saveProductCosts(updated);
    const matched = updated.find(c => c.productType === productType);
    if (matched) {
      try {
        await setDoc(doc(db, 'productCosts', productType), matched);
      } catch(e){}
    }
    setEditingCostType(null);
  };

  // Add dynamic custom product type
  const handleAddCustomProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomProductType.trim()) return;

    const formattedName = newCustomProductType.trim().charAt(0).toUpperCase() + newCustomProductType.trim().slice(1);

    // Check if it already exists
    if (productCosts.some(c => c.productType.toLowerCase() === formattedName.toLowerCase())) {
      setCalcSuccessMessage(`El artículo "${formattedName}" ya existe.`);
      return;
    }

    const initialCost = newCustomProductCost === '' ? 1500 : Number(newCustomProductCost);
    const newCostItem = { productType: formattedName, unitCost: initialCost };
    const updatedCosts = [...productCosts, newCostItem];
    saveProductCosts(updatedCosts);
    try {
      await setDoc(doc(db, 'productCosts', formattedName), newCostItem);
    } catch(e){}

    // Also add to stock table automatically with 0 quantity so it is visible immediately in inventory list!
    const newStockItem: StockItem = {
      id: `st-custom-${Date.now()}`,
      productType: formattedName,
      quantity: 0,
      unitCost: initialCost,
      suggestedPrice: initialCost * 2.5,
      minAlert: 5
    };
    saveStock([...stock, newStockItem]);
    try {
      await setDoc(doc(db, 'stock', newStockItem.id), newStockItem);
    } catch(e){}

    setNewCustomProductType('');
    setNewCustomProductCost('');
    setCalcSuccessMessage(`¡Se ha creado el artículo personalizado "${formattedName}" con éxito!`);
  };

  // Delete dynamic custom product type
  const handleDeleteCustomProduct = async (prodType: string) => {
    const coreTypes = ['Remera', 'Taza', 'Gorra', 'Mousepad', 'Llavero', 'Chopp', 'Otro'];
    if (coreTypes.includes(prodType)) {
      setCalcSuccessMessage('No se pueden eliminar los productos estándar del sistema.');
      return;
    }
    const updatedCosts = productCosts.filter(c => c.productType !== prodType);
    saveProductCosts(updatedCosts);
    try {
      await deleteDoc(doc(db, 'productCosts', prodType));
    } catch(e){}

    const matchedStockItem = stock.find(item => item.productType === prodType);
    const updatedStock = stock.filter(item => item.productType !== prodType);
    saveStock(updatedStock);
    if (matchedStockItem) {
      try {
        await deleteDoc(doc(db, 'stock', matchedStockItem.id));
      } catch(e){}
    }
    setCalcSuccessMessage(`Se eliminó el producto "${prodType}" del sistema.`);
  };

  // Apply calculator results to product costs config and update matching Stock Item
  const handleApplyCalcToProduct = async (prodType: string, calculatedUnitCost: number, calculatedSellingPrice: number) => {
    const updatedCostItem = { productType: prodType, unitCost: Math.round(calculatedUnitCost) };
    const updated = productCosts.map(c => 
      c.productType === prodType ? updatedCostItem : c
    );
    saveProductCosts(updated);
    try {
      await setDoc(doc(db, 'productCosts', prodType), updatedCostItem);
    } catch(e){}
    
    // Also update Break-even variables automatically!
    setSimUnitCost(Math.round(calculatedUnitCost));
    setSimSellingPrice(Math.round(calculatedSellingPrice));
    
    // Also update matching Stock Item unit cost and suggested price automatically!
    const matchedStock = stock.find(item => item.productType === prodType);
    if (matchedStock) {
      const updatedStockItem = {
        ...matchedStock,
        unitCost: Math.round(calculatedUnitCost),
        suggestedPrice: Math.round(calculatedSellingPrice)
      };
      const updatedStock = stock.map(item => item.productType === prodType ? updatedStockItem : item);
      saveStock(updatedStock);
      try {
        await setDoc(doc(db, 'stock', matchedStock.id), updatedStockItem);
      } catch(e){}
    }
    
    setCalcSuccessMessage(`¡Se actualizó el costo de ${prodType}s a ${formatCurr(calculatedUnitCost)} y precio sugerido en inventario, simulador y base de datos!`);
  };

  // --- Calculations & Analytics ---

  const currentYearMonth = new Date().toISOString().slice(0, 7);

  // Helper to check if a permanent investment has been covered by total revenues since purchase
  const getExpenseRecovery = (e: Expense) => {
    if (e.amortizationType !== 'permanent') {
      return { percent: 100, covered: true, salesSince: e.amount };
    }
    // Sales since the investment was made
    const salesSince = orders
      .filter(o => o.createdAt >= e.date)
      .reduce((sum, o) => sum + o.price, 0);
    const percent = Math.min(100, Math.round((salesSince / e.amount) * 100));
    return {
      percent,
      covered: salesSince >= e.amount,
      salesSince
    };
  };

  // Filter orders according to view mode
  const filteredOrders = financeViewMode === 'month'
    ? orders.filter(o => o.createdAt.startsWith(currentYearMonth))
    : orders;

  // Filter expenses according to view mode
  const filteredExpensesForCalcs = financeViewMode === 'month'
    ? expenses.filter(e => e.date.startsWith(currentYearMonth) || (e.amortizationType === 'permanent' && !getExpenseRecovery(e).covered))
    : expenses;

  // 1. Total Revenue from Sublimation Orders
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.price, 0);
  
  // 2. Total Collected Revenue (sum of advance payments for all orders, plus total price for completed orders)
  const totalCollected = filteredOrders.reduce((sum, o) => {
    if (o.status === 'Entregado') {
      return sum + o.price;
    }
    return sum + o.advancePayment;
  }, 0);

  // 3. Outstanding Balance (Cuentas por cobrar)
  const totalOutstanding = filteredOrders
    .filter(o => o.status !== 'Entregado')
    .reduce((sum, o) => sum + (o.price - o.advancePayment), 0);

  // 4. Total Expenses
  const totalExpenses = filteredExpensesForCalcs.reduce((sum, e) => sum + e.amount, 0);

  // 5. Calculate Cost of Goods Sold (COGS) based on configured unit costs and order quantities
  const totalOrderCOGS = filteredOrders.reduce((sum, o) => {
    const costConfig = productCosts.find(c => c.productType === o.productType);
    const unitCost = costConfig ? costConfig.unitCost : 1500; // default cost
    return sum + (o.quantity * unitCost);
  }, 0);

  // 6. Net Profit = Total Revenue - Total Expenses
  const netProfit = totalRevenue - totalExpenses;
  const netProfitPercentage = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // 7. Sales by Product breakdown for charts
  const salesByProduct = filteredOrders.reduce((acc, o) => {
    acc[o.productType] = (acc[o.productType] || 0) + o.price;
    return acc;
  }, {} as Record<string, number>);

  const salesByProductList = Object.keys(salesByProduct).map(key => ({
    name: key,
    value: salesByProduct[key]
  })).sort((a, b) => b.value - a.value);

  // 8. Expenses by Category breakdown
  const expensesByCategory = filteredExpensesForCalcs.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + e.amount;
    return acc;
  }, {} as Record<string, number>);

  const expensesByCategoryList = Object.keys(expensesByCategory).map(key => ({
    category: key,
    amount: expensesByCategory[key]
  })).sort((a, b) => b.amount - a.amount);

  // 9. Format Currency Utility (Argentine Peso / Spanish Standard)
  const formatCurr = (val: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  // 10. Break-even Quantity Calculation
  const contributionMargin = simSellingPrice - simUnitCost;
  const breakEvenQty = contributionMargin > 0 ? Math.ceil(simFixedCosts / contributionMargin) : 0;

  // Category Color Map
  const categoryColorMap: Record<string, string> = {
    'Insumos': 'bg-emerald-500 text-emerald-800 border-emerald-100',
    'Servicios': 'bg-sky-500 text-sky-800 border-sky-100',
    'Maquinaria': 'bg-amber-500 text-amber-800 border-amber-100',
    'Alquiler': 'bg-indigo-500 text-indigo-800 border-indigo-100',
    'Otros': 'bg-slate-500 text-slate-800 border-slate-100',
  };

  return (
    <div className="space-y-8">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-100/50 p-4 rounded-2xl border border-slate-200/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-violet-100 text-violet-700 rounded-lg animate-pulse">
              <Landmark className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-slate-800">Administración de Empresa y Finanzas</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Monitorea ingresos reales, registra gastos del taller, calcula rentabilidad y simula tu punto de equilibrio.
          </p>
        </div>

        {/* Dynamic Selector Toggle */}
        <div className="flex bg-white border border-slate-200 rounded-xl p-1 shrink-0 shadow-sm">
          <button
            onClick={() => setFinanceViewMode('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              financeViewMode === 'month'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Este Mes ({new Date().toLocaleString('es-AR', { month: 'long' })})
          </button>
          <button
            onClick={() => setFinanceViewMode('total')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              financeViewMode === 'total'
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Historial Total
          </button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {financeViewMode === 'month' ? 'Facturación del Mes' : 'Facturación Total'}
              </span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">{formatCurr(totalRevenue)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 pt-2 border-t border-slate-50">
            <span className="font-semibold text-violet-600">{formatCurr(totalCollected)}</span>
            <span>cobrado</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-amber-600">{formatCurr(totalOutstanding)}</span>
            <span>pendiente</span>
          </div>
        </div>

        {/* Card 2: Expenses */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {financeViewMode === 'month' ? 'Gastos del Mes' : 'Gastos Totales'}
              </span>
              <span className="text-2xl font-black text-red-600 mt-1 block">{formatCurr(totalExpenses)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-red-50 text-red-600">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-500 pt-2 border-t border-slate-50 flex justify-between items-center">
            <span>Fijos, variables e inversiones</span>
            <span className="font-bold text-red-700">{filteredExpensesForCalcs.length} registros</span>
          </div>
        </div>

        {/* Card 3: Production Cost Estimate (COGS) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {financeViewMode === 'month' ? 'Costo Insumos Mes' : 'Costo Insumos Total'}
              </span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">{formatCurr(totalOrderCOGS)}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-500 pt-2 border-t border-slate-50 flex justify-between items-center">
            <span>Insumos por producción</span>
            <span className="font-bold text-amber-700">{filteredOrders.length} pedidos</span>
          </div>
        </div>

        {/* Card 4: Net Balance / Net Profit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {financeViewMode === 'month' ? 'Beneficio Neto Mes' : 'Beneficio Neto Total'}
              </span>
              <span className={`text-2xl font-black mt-1 block ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurr(netProfit)}
              </span>
            </div>
            <div className={`p-2.5 rounded-xl ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[10px] text-slate-500 pt-2 border-t border-slate-50 flex justify-between items-center">
            <span>Rendimiento neto final</span>
            <span className={`font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {netProfitPercentage.toFixed(1)}% margen
            </span>
          </div>
        </div>

      </div>

      {/* Main Splits */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Expense Tracker (lg:span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Add Expense Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-violet-600" />
              Registrar Gasto del Taller
            </h3>
            
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Descripción / Concepto</label>
                <input
                  type="text"
                  required
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Ej. Papel sublimación, Factura Luz..."
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Categoría</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:border-violet-500 focus:outline-none"
                >
                  <option value="Insumos">Insumos</option>
                  <option value="Servicios">Servicios</option>
                  <option value="Maquinaria">Maquinaria</option>
                  <option value="Alquiler">Alquiler</option>
                  <option value="Otros">Otros</option>
                </select>
              </div>

              <div className="md:col-span-3 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Monto ($)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="Ej. 8500"
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-4 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:border-violet-500 focus:outline-none"
                />
              </div>

              <div className="md:col-span-4 flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Amortización / Impacto</label>
                <select
                  value={expenseAmortization}
                  onChange={(e) => setExpenseAmortization(e.target.value as any)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:border-violet-500 focus:outline-none cursor-pointer font-semibold text-slate-700"
                >
                  <option value="month">Gasto del mes</option>
                  <option value="permanent">Mantener hasta recuperar inversión</option>
                </select>
              </div>

              <div className="md:col-span-4 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-violet-100 cursor-pointer h-[29px]"
                >
                  <Plus className="w-4 h-4" />
                  Registrar Gasto
                </button>
              </div>
            </form>
          </div>

          {/* Expenses List Table */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800">Historial de Gastos</h3>
              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                Total: {formatCurr(totalExpenses)}
              </span>
            </div>

            {expenses.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay gastos registrados en el sistema. Agrega uno usando el formulario superior.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">Descripción</th>
                      <th className="py-2.5 px-3">Categoría</th>
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-3 text-right">Monto</th>
                      <th className="py-2.5 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp) => {
                      const recovery = getExpenseRecovery(exp);
                      return (
                        <tr key={exp.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="py-2.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-slate-700">{exp.description}</span>
                              {exp.amortizationType === 'permanent' ? (
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[8px] font-black uppercase bg-violet-100 text-violet-700 px-1.5 py-0.2 rounded border border-violet-200">
                                    Inversión Activa
                                  </span>
                                  <span className={`text-[8px] font-black ${recovery.covered ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {recovery.covered ? '✅ Recuperada' : `📈 Recuperado: ${recovery.percent}%`}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-[8px] text-slate-400 font-medium italic">
                                  Gasto ordinario del mes
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase border bg-opacity-10 ${
                              exp.category === 'Insumos' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                              exp.category === 'Servicios' ? 'bg-sky-100 text-sky-800 border-sky-200' :
                              exp.category === 'Maquinaria' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                              exp.category === 'Alquiler' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                              'bg-slate-100 text-slate-800 border-slate-200'
                            }`}>
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500">{exp.date}</td>
                          <td className="py-2.5 px-3 font-black text-right text-red-600">{formatCurr(exp.amount)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                              title="Eliminar gasto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Monthly Cash Closures Management */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4">
            <div className="flex justify-between items-start pb-2 border-b border-slate-150">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-emerald-600 animate-bounce" />
                  Cierres de Caja Mensuales
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                  Consolida y congela las ventas y egresos de tu taller para auditar los resultados de cada período cerrado.
                </p>
              </div>
            </div>

            {/* Quick Closure Trigger */}
            <form onSubmit={handleCreateCashClosure} className="bg-slate-50 p-3.5 rounded-xl border border-slate-150 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 flex flex-col gap-1 w-full">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Período a Cerrar</label>
                <input
                  type="month"
                  required
                  value={closureMonthInput}
                  onChange={(e) => setClosureMonthInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:border-violet-500 font-bold"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs shrink-0 h-[31px]"
              >
                <Lock className="w-3.5 h-3.5" />
                Guardar Cierre Mensual
              </button>
            </form>

            {/* Closures Ledger List */}
            {cashClosures.length === 0 ? (
              <div className="text-center p-6 text-slate-400 text-xs leading-normal">
                No hay cierres mensuales registrados. <br />
                Selecciona un mes arriba para consolidar tus finanzas.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-150 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2 px-3">Período</th>
                      <th className="py-2 px-3 text-right">Ventas</th>
                      <th className="py-2 px-3 text-right">Gastos</th>
                      <th className="py-2 px-3 text-right">Utilidad</th>
                      <th className="py-2 px-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cashClosures.map((closure) => (
                      <tr key={closure.id} className="hover:bg-slate-50/50 transition-all font-medium">
                        <td className="py-2.5 px-3 font-bold text-slate-700">
                          {new Date(closure.month + "-02").toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {formatCurr(closure.salesTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-red-600">
                          {formatCurr(closure.expensesTotal)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                          {formatCurr(closure.profit)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleDeleteCashClosure(closure.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all cursor-pointer"
                            title="Eliminar registro de cierre"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stock / Inventory Management Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-violet-600 animate-pulse" />
                  Control de Stock / Inventario de Blanks
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                  Administra las cantidades disponibles de productos listos para estampar.
                </p>
              </div>
              <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                {stock.reduce((sum, item) => sum + item.quantity, 0)} unidades
              </span>
            </div>

            {/* Quick stock adder form */}
            <form onSubmit={handleAddStockItem} className="p-4 border-b border-slate-100 bg-slate-50/20 grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5 flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Artículo base</label>
                <select
                  value={stockFormType}
                  onChange={(e) => setStockFormType(e.target.value)}
                  className="px-2 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-violet-500 cursor-pointer"
                >
                  {productCosts.map(c => (
                    <option key={c.productType} value={c.productType}>{c.productType}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4 flex flex-col gap-0.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Añadir Cantidad</label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="Ej. 50"
                  value={stockFormQty}
                  onChange={(e) => setStockFormQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="sm:col-span-3 flex items-end">
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar
                </button>
              </div>
            </form>

            {stock.length === 0 ? (
              <p className="p-6 text-center text-xs text-slate-400">No hay artículos cargados en el inventario.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">Producto</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3 text-center">Ajustar</th>
                      <th className="py-2.5 px-3 text-right">Costo / Venta</th>
                      <th className="py-2.5 px-4 text-center">Eliminar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stock.map((item) => {
                      const isOutOfStock = item.quantity === 0;
                      const isLowStock = item.quantity <= item.minAlert;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/30 transition-all">
                          <td className="py-3 px-4 font-bold text-slate-700">{item.productType}s</td>
                          <td className="py-3 px-3">
                            {isOutOfStock ? (
                              <span className="bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                                Agotado (0)
                              </span>
                            ) : isLowStock ? (
                              <span className="bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                                Bajo Stock ({item.quantity})
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                                En Stock ({item.quantity})
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleAdjustStockQty(item.id, -1)}
                                className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded flex items-center justify-center font-bold text-xs cursor-pointer"
                                title="Descontar 1 unidad"
                              >
                                -
                              </button>
                              <span className="w-7 text-center font-bold text-slate-800 font-mono text-xs">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleAdjustStockQty(item.id, 1)}
                                className="w-5 h-5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded flex items-center justify-center font-bold text-xs cursor-pointer"
                                title="Sumar 1 unidad"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="text-[10px] text-slate-400 font-medium font-sans">C: {formatCurr(item.unitCost)}</div>
                            <div className="font-bold text-violet-700 text-[11px] font-sans">V: {formatCurr(item.suggestedPrice)}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleDeleteStockItem(item.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                              title="Remover de inventario"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Costs Config & Charts & Simulator (lg:span-5) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Charts Section: Pure SVG Sales by Product */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <PieChart className="w-4 h-4 text-violet-600" />
              Análisis de Ventas por Producto
            </h3>

            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Inserta pedidos para ver el análisis de ventas.</p>
            ) : (
              <div className="space-y-4">
                {/* SVG Horizontal Bar Chart for simple clear presentation */}
                <div className="space-y-3">
                  {salesByProductList.map((item) => {
                    const pct = totalRevenue > 0 ? (item.value / totalRevenue) * 100 : 0;
                    return (
                      <div key={item.name} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <Tag className="w-3 h-3 text-slate-400" />
                            {item.name}s
                          </span>
                          <span className="font-bold text-slate-800">
                            {formatCurr(item.value)} <span className="text-[10px] text-slate-400 font-medium">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-violet-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Product Unit Costs Config */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-violet-600" />
              Configurar Costo Unitario de Insumos
            </h3>
            <p className="text-[10px] text-slate-400 mb-4 leading-normal">
              Establece el costo promedio de producción por artículo. Esto se aplicará como costo por defecto.
            </p>

            <div className="divide-y divide-slate-150 border-t border-b border-slate-150 max-h-60 overflow-y-auto pr-1">
              {productCosts.map((config) => (
                <div key={config.productType} className="py-2.5 flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-700">{config.productType}s</span>
                    {!['Remera', 'Taza', 'Gorra', 'Mousepad', 'Llavero', 'Chopp', 'Otro'].includes(config.productType) && (
                      <span className="text-[8px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded font-bold uppercase border border-slate-200">
                        Personalizado
                      </span>
                    )}
                  </div>
                  
                  {editingCostType === config.productType ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        className="w-20 px-2 py-1 border border-slate-350 rounded text-xs focus:outline-none"
                        value={editingCostVal}
                        onChange={(e) => setEditingCostVal(Number(e.target.value))}
                      />
                      <button
                        onClick={() => handleSaveProductCost(config.productType)}
                        className="bg-emerald-600 text-white font-bold px-2 py-1 rounded hover:bg-emerald-700 transition-all text-[10px] cursor-pointer"
                      >
                        Guardar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-600">{formatCurr(config.unitCost)}</span>
                      <button
                        onClick={() => {
                          setEditingCostType(config.productType);
                          setEditingCostVal(config.unitCost);
                        }}
                        className="text-[10px] text-violet-600 hover:text-violet-800 font-bold cursor-pointer"
                      >
                        Editar
                      </button>
                      
                      {!['Remera', 'Taza', 'Gorra', 'Mousepad', 'Llavero', 'Chopp', 'Otro'].includes(config.productType) && (
                        <button
                          onClick={() => handleDeleteCustomProduct(config.productType)}
                          className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-all cursor-pointer"
                          title="Eliminar artículo personalizado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Form for adding a brand new product type */}
            <form onSubmit={handleAddCustomProduct} className="mt-4 pt-4 border-t border-slate-100 flex gap-2 items-center">
              <div className="flex-1 flex flex-col gap-0.5">
                <input
                  type="text"
                  required
                  placeholder="Ej. Mate de Polímero..."
                  value={newCustomProductType}
                  onChange={(e) => setNewCustomProductType(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:border-violet-500 focus:outline-none bg-slate-50/50"
                />
              </div>
              <div className="w-24 flex flex-col gap-0.5">
                <input
                  type="number"
                  placeholder="Costo ($)"
                  value={newCustomProductCost}
                  onChange={(e) => setNewCustomProductCost(e.target.value === '' ? '' : Number(e.target.value))}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:border-violet-500 focus:outline-none bg-slate-50/50"
                />
              </div>
              <button
                type="submit"
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold p-2 rounded-xl text-xs transition-all flex items-center justify-center shrink-0 cursor-pointer"
                title="Crear artículo personalizado"
              >
                <Plus className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Pricing Calculator based on Production Costs */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-start pb-1.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Calculator className="w-4.5 h-4.5 text-violet-600 animate-pulse" />
                  Calculadora de Precio de Venta
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                  Calcula el precio de venta sugerido basado en tus insumos, mano de obra y margen deseado.
                </p>
              </div>
            </div>

            {/* Success Message Banner */}
            {calcSuccessMessage && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[10.5px] font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{calcSuccessMessage}</span>
              </div>
            )}

            <div className="space-y-3.5">
              {/* Product Selection */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Artículo de Destino</label>
                  <select
                    value={calcProductType}
                    onChange={(e) => setCalcProductType(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-violet-500 focus:outline-none cursor-pointer"
                  >
                    {productCosts.map(c => (
                      <option key={c.productType} value={c.productType}>{c.productType}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Costo Base Objeto ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={calcBlankPrice}
                    onChange={(e) => setCalcBlankPrice(Math.max(0, Number(e.target.value)))}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Printing & Overheads */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Papel, Tintas o DTF ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={calcPrintCost}
                    onChange={(e) => setCalcPrintCost(Math.max(0, Number(e.target.value)))}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:border-violet-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Empaque, Luz y Envío ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={calcOverheadUnit}
                    onChange={(e) => setCalcOverheadUnit(Math.max(0, Number(e.target.value)))}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:border-violet-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Labor Calculations */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-2.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase block pb-1 border-b border-slate-200">
                  🛠️ Mano de Obra (Tiempo de Diseño / Planchado)
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-bold text-slate-400">Tiempo de Trabajo (Horas)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={calcLaborTime}
                      onChange={(e) => setCalcLaborTime(Math.max(0, Number(e.target.value)))}
                      className="px-2 py-1 border border-slate-200 rounded text-xs bg-white focus:outline-none"
                    />
                    <span className="text-[8.5px] text-slate-400 font-medium">
                      {(calcLaborTime * 60).toFixed(0)} minutos
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[9px] font-bold text-slate-400">Valor de tu Hora ($/hr)</label>
                    <input
                      type="number"
                      step="100"
                      min="0"
                      value={calcHourlyRate}
                      onChange={(e) => setCalcHourlyRate(Math.max(0, Number(e.target.value)))}
                      className="px-2 py-1 border border-slate-200 rounded text-xs bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Desired Profit Margin Markup Slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-600 font-medium">Margen de Ganancia Deseado (Markup):</span>
                  <span className="font-bold text-violet-700">+{calcDesiredMargin}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="5"
                  value={calcDesiredMargin}
                  onChange={(e) => setCalcDesiredMargin(Number(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Math Outputs */}
              {(() => {
                const totalUnitCost = calcBlankPrice + calcPrintCost + (calcLaborTime * calcHourlyRate) + calcOverheadUnit;
                const calculatedSellingPrice = totalUnitCost * (1 + (calcDesiredMargin / 100));
                const calcProfitPerUnit = calculatedSellingPrice - totalUnitCost;

                return (
                  <div className="space-y-2.5 pt-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-slate-100 p-2 rounded-xl border border-slate-150">
                        <span className="text-[8.5px] font-bold text-slate-400 uppercase">Costo Producción</span>
                        <span className="font-extrabold text-xs text-slate-700 block mt-0.5">
                          {formatCurr(totalUnitCost)}
                        </span>
                      </div>
                      <div className="bg-violet-50 p-2 rounded-xl border border-violet-100">
                        <span className="text-[8.5px] font-bold text-violet-500 uppercase">Precio Sugerido</span>
                        <span className="font-black text-xs text-violet-700 block mt-0.5">
                          {formatCurr(calculatedSellingPrice)}
                        </span>
                      </div>
                      <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                        <span className="text-[8.5px] font-bold text-emerald-500 uppercase">Ganancia Neta</span>
                        <span className="font-extrabold text-xs text-emerald-600 block mt-0.5">
                          {formatCurr(calcProfitPerUnit)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyCalcToProduct(calcProductType, totalUnitCost, calculatedSellingPrice)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      Aplicar Costo y Precio de Venta a {calcProductType}s
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Break-even Point Simulator */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-violet-600" />
              Simulador: Punto de Equilibrio
            </h3>
            <p className="text-[10px] text-slate-400 mb-5 leading-normal">
              Calcula cuántas ventas necesitas realizar al mes para cubrir tus costos fijos del taller y empezar a obtener ganancias reales.
            </p>

            <div className="space-y-4">
              {/* Costos Fijos Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="font-semibold">Costos Fijos Mensuales:</span>
                  <span className="font-bold text-slate-800">{formatCurr(simFixedCosts)}</span>
                </div>
                <input
                  type="range"
                  min="20000"
                  max="400000"
                  step="10000"
                  value={simFixedCosts}
                  onChange={(e) => setSimFixedCosts(Number(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Precio de Venta Promedio Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="font-semibold">Precio de Venta Promedio:</span>
                  <span className="font-bold text-violet-700">{formatCurr(simSellingPrice)}</span>
                </div>
                <input
                  type="range"
                  min="1500"
                  max="30000"
                  step="500"
                  value={simSellingPrice}
                  onChange={(e) => setSimSellingPrice(Number(e.target.value))}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Costo Variable Unitario Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-600">
                  <span className="font-semibold">Costo Insumo Unitario Promedio:</span>
                  <span className="font-bold text-amber-700">{formatCurr(simUnitCost)}</span>
                </div>
                <input
                  type="range"
                  min="300"
                  max="15000"
                  step="100"
                  value={simUnitCost}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val < simSellingPrice) setSimUnitCost(val);
                  }}
                  className="w-full accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Simulated Break-even Output Card */}
              <div className="mt-4 p-4 bg-violet-50 border border-violet-100 rounded-2xl text-center">
                <span className="text-[10px] font-bold text-violet-500 uppercase tracking-wider block">Punto de Equilibrio Requerido</span>
                <span className="text-3xl font-black text-violet-700 mt-1 block">
                  {breakEvenQty} <span className="text-xs font-bold text-violet-500">Unidades / Mes</span>
                </span>
                <p className="text-[9.5px] text-violet-700 leading-normal mt-2 max-w-xs mx-auto">
                  Necesitas vender al menos <strong>{breakEvenQty} productos</strong> de promedio para cubrir {formatCurr(simFixedCosts)} de costos fijos mensuales. A partir del producto {breakEvenQty + 1}, cada venta genera <strong>{formatCurr(contributionMargin)}</strong> de ganancia pura.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
