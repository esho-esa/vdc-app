import { getDB } from '@/lib/db';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

export async function GET(request) {
  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permitted = await hasPermission(user.role, 'expenses', 'view');
    if (!permitted) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = getDB();

    // 1. Fetch treatments, prescriptions, payments, expenses, and categories in parallel
    const [
      { data: prescriptions, error: rxError },
      { data: treatments, error: txError },
      { data: payments, error: payError },
      { data: expenses, error: expError },
      { data: categories, error: catError }
    ] = await Promise.all([
      supabase.from('prescriptions').select('total_amount, date'),
      supabase.from('treatments').select('cost, date'),
      supabase.from('payments').select('amount, payment_date'),
      supabase.from('expenses').select('*, expense_categories(name, color, budget)'),
      supabase.from('expense_categories').select('*')
    ]);

    let stockTxs = [];
    try {
      const { data, error: stockErr } = await supabase
        .from('stock_transactions')
        .select('quantity, created_at, inventory_items(purchase_price)')
        .eq('transaction_type', 'OUT');
      if (!stockErr && data) {
        stockTxs = data;
      }
    } catch (e) {
      console.warn('[Profit Stats API] Failed to query stock_transactions:', e.message);
    }

    if (rxError) throw rxError;
    if (txError) throw txError;
    
    const rxRows = prescriptions || [];
    const txRows = treatments || [];
    const payRows = payments || [];
    const expRows = expenses || [];
    const catRows = categories || [];

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7); // YYYY-MM
    const prevMonthDate = new Date();
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
    const prevMonth = prevMonthDate.toISOString().substring(0, 7); // YYYY-MM

    // --- REVENUE CALCULATIONS ---
    let totalBilled = 0;
    let currentMonthBilled = 0;
    let prevMonthBilled = 0;

    rxRows.forEach(rx => {
      const amt = parseFloat(rx.total_amount) || 0;
      totalBilled += amt;
      if (rx.date && rx.date.substring(0, 7) === currentMonth) currentMonthBilled += amt;
      if (rx.date && rx.date.substring(0, 7) === prevMonth) prevMonthBilled += amt;
    });

    txRows.forEach(tx => {
      const cost = parseFloat(tx.cost) || 0;
      totalBilled += cost;
      if (tx.date && tx.date.substring(0, 7) === currentMonth) currentMonthBilled += cost;
      if (tx.date && tx.date.substring(0, 7) === prevMonth) prevMonthBilled += cost;
    });

    let totalCollected = 0;
    let currentMonthCollected = 0;
    let prevMonthCollected = 0;
    const monthlyRevenueBuckets = {};

    payRows.forEach(p => {
      const amt = parseFloat(p.amount) || 0;
      totalCollected += amt;
      const monthKey = p.payment_date ? p.payment_date.substring(0, 7) : 'unknown';
      if (monthKey !== 'unknown') {
        monthlyRevenueBuckets[monthKey] = (monthlyRevenueBuckets[monthKey] || 0) + amt;
      }
      if (p.payment_date && p.payment_date.substring(0, 7) === currentMonth) currentMonthCollected += amt;
      if (p.payment_date && p.payment_date.substring(0, 7) === prevMonth) prevMonthCollected += amt;
    });

    // --- EXPENSES CALCULATIONS ---
    let totalExpenses = 0;
    let currentMonthExpenses = 0;
    let prevMonthExpenses = 0;
    const monthlyExpensesBuckets = {};
    const categoryTotals = {};
    const currentMonthCategoryTotals = {};

    expRows.forEach(exp => {
      const amt = parseFloat(exp.amount) || 0;
      totalExpenses += amt;
      const monthKey = exp.expense_date ? exp.expense_date.substring(0, 7) : 'unknown';
      if (monthKey !== 'unknown') {
        monthlyExpensesBuckets[monthKey] = (monthlyExpensesBuckets[monthKey] || 0) + amt;
      }

      const catId = exp.category_id;
      categoryTotals[catId] = (categoryTotals[catId] || 0) + amt;

      if (exp.expense_date && exp.expense_date.substring(0, 7) === currentMonth) {
        currentMonthExpenses += amt;
        currentMonthCategoryTotals[catId] = (currentMonthCategoryTotals[catId] || 0) + amt;
      }
      if (exp.expense_date && exp.expense_date.substring(0, 7) === prevMonth) {
        prevMonthExpenses += amt;
      }
    });

    // --- MATERIAL COST CALCULATIONS ---
    let totalMaterialCost = 0;
    let currentMonthMaterialCost = 0;
    let prevMonthMaterialCost = 0;
    const monthlyMaterialCostBuckets = {};

    stockTxs.forEach(tx => {
      const qty = Math.abs(tx.quantity) || 0;
      const price = parseFloat(tx.inventory_items?.purchase_price) || 0;
      const cost = qty * price;
      
      totalMaterialCost += cost;

      const dateStr = tx.created_at || '';
      const monthKey = dateStr ? dateStr.substring(0, 7) : 'unknown';
      if (monthKey !== 'unknown') {
        monthlyMaterialCostBuckets[monthKey] = (monthlyMaterialCostBuckets[monthKey] || 0) + cost;
      }

      if (dateStr && dateStr.substring(0, 7) === currentMonth) {
        currentMonthMaterialCost += cost;
      }
      if (dateStr && dateStr.substring(0, 7) === prevMonth) {
        prevMonthMaterialCost += cost;
      }
    });

    // --- CORE profit KPI METRICS ---
    // We use Collected cash revenue as the default standard for Profit (real cash-flow)
    const netProfit = totalCollected - totalExpenses - totalMaterialCost;
    const profitMargin = totalCollected > 0 ? (netProfit / totalCollected) * 100 : 0;
    const outstandingReceivables = Math.max(0, totalBilled - totalCollected);

    // Accrual-based profit metrics for comparative insights
    const accrualNetProfit = totalBilled - totalExpenses;
    const accrualProfitMargin = totalBilled > 0 ? (accrualNetProfit / totalBilled) * 100 : 0;

    // --- CHART DATA GENERATION (LAST 12 MONTHS) ---
    const monthLabels = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().substring(0, 7);
      monthLabels.push(key);
    }

    const revenueVsExpensesChart = monthLabels.map(key => {
      const label = new Date(key + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const revenue = monthlyRevenueBuckets[key] || 0;
      const expenses = monthlyExpensesBuckets[key] || 0;
      const materialCost = monthlyMaterialCostBuckets[key] || 0;
      return {
        month: key,
        label,
        revenue,
        expenses,
        materialCost,
        profit: revenue - expenses - materialCost
      };
    });

    const monthlyProfitTrendChart = revenueVsExpensesChart.map(item => ({
      month: item.month,
      label: item.label,
      profit: item.profit
    }));

    // --- CATEGORY BREAKDOWN ---
    const expenseCategoryBreakdown = catRows.map(cat => {
      const totalSpent = categoryTotals[cat.id] || 0;
      const pct = totalExpenses > 0 ? (totalSpent / totalExpenses) * 100 : 0;
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color || '#8e8e93',
        budget: cat.budget || 0,
        amount: totalSpent,
        percentage: Math.round(pct * 10) / 10
      };
    }).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    const topExpenseCategories = expenseCategoryBreakdown.slice(0, 5);

    // --- INSIGHTS ---
    let mostExpensiveCategory = 'N/A';
    let mostExpensiveAmount = 0;
    if (expenseCategoryBreakdown.length > 0) {
      mostExpensiveCategory = expenseCategoryBreakdown[0].name;
      mostExpensiveAmount = expenseCategoryBreakdown[0].amount;
    }

    // Average daily profit (past 30 days)
    const currentMonthNetProfit = currentMonthCollected - currentMonthExpenses;
    const avgDailyProfit = currentMonthNetProfit / 30; // standard month divisor

    // Growth rates
    const revenueGrowth = prevMonthCollected > 0 
      ? ((currentMonthCollected - prevMonthCollected) / prevMonthCollected) * 100 
      : 0;
    const expenseGrowth = prevMonthExpenses > 0 
      ? ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 
      : 0;

    // --- ALERTS ENGINE ---
    const alerts = [];
    
    // 1. Expenses exceed revenue alert
    if (currentMonthExpenses > currentMonthCollected && currentMonthCollected > 0) {
      alerts.push({
        id: 'alt-exceed-rev',
        type: 'danger',
        title: 'Monthly Deficit Warning',
        message: `Current month expenses (₹${currentMonthExpenses.toLocaleString()}) have exceeded collected revenue (₹${currentMonthCollected.toLocaleString()}) by ₹${(currentMonthExpenses - currentMonthCollected).toLocaleString()}!`
      });
    }

    // 2. Budget limits alert
    catRows.forEach(cat => {
      const spent = currentMonthCategoryTotals[cat.id] || 0;
      const budget = parseFloat(cat.budget) || 0;
      if (budget > 0 && spent > budget) {
        alerts.push({
          id: `alt-budget-${cat.id}`,
          type: 'warning',
          title: 'Category Budget Exceeded',
          message: `Category "${cat.name}" monthly expenses (₹${spent.toLocaleString()}) have exceeded its limit threshold of ₹${budget.toLocaleString()} by ₹${(spent - budget).toLocaleString()}!`
        });
      }
    });

    // 3. Large unusual expenses check
    const threshold = 25000;
    expRows.forEach(exp => {
      const amt = parseFloat(exp.amount) || 0;
      const expDate = new Date(exp.expense_date);
      // Only trigger for current month expenses
      if (amt >= threshold && exp.expense_date.substring(0, 7) === currentMonth) {
        alerts.push({
          id: `alt-large-${exp.id}`,
          type: 'info',
          title: 'Unusual Outlay Detected',
          message: `Large expense of ₹${amt.toLocaleString()} recorded for category "${exp.expense_categories?.name || 'Other'}" to vendor "${exp.vendor_name || 'Unknown'}" on ${exp.expense_date}.`
        });
      }
    });

    return NextResponse.json({
      // Aggregates
      totalRevenue: totalCollected, // cash flow focus
      totalExpenses,
      totalMaterialCost,
      netProfit,
      profitMargin,
      outstandingReceivables,
      
      // Accrual alternatives
      accrualRevenue: totalBilled,
      accrualNetProfit: totalBilled - totalExpenses - totalMaterialCost,
      accrualProfitMargin,

      // Current month details
      currentMonthCollected,
      currentMonthExpenses,
      currentMonthMaterialCost,
      currentMonthNetProfit: currentMonthCollected - currentMonthExpenses - currentMonthMaterialCost,

      // Charts
      revenueVsExpensesChart,
      monthlyProfitTrendChart,
      
      // Grouping breakdowns
      expenseCategoryBreakdown,
      topExpenseCategories,

      // Insights
      insights: {
        mostExpensiveCategory,
        mostExpensiveAmount,
        avgDailyProfit,
        revenueGrowthPercentage: Math.round(revenueGrowth * 10) / 10,
        expenseGrowthPercentage: Math.round(expenseGrowth * 10) / 10
      },

      // Alerts list
      alerts
    });

  } catch (error) {
    console.error('[Profit Stats API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
