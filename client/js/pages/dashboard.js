const DashboardPage = {
  template: `
    <div>
      <div class="row mb-4 align-items-center">
        <div class="col-md-4">
          <label class="form-label fw-semibold">Filtrar por período</label>
          <select class="form-select" v-model="selectedPeriod" @change="loadData">
            <option value="all">Todos os meses</option>
            <option value="last6">Últimos 6 meses</option>
            <option v-for="m in availableMonths" :key="m.key" :value="m.key">{{ m.label }}</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary"></div>
      </div>

      <template v-else-if="transactions.length > 0">
        <div class="row g-3 mb-4">
          <div class="col-md-3">
            <div class="card shadow-sm stat-card total animate-in">
              <div class="card-body py-3">
                <div class="text-muted small">Total Gasto</div>
                <div class="fs-4 fw-bold">R$ {{ totalSpent.toFixed(2) }}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card shadow-sm stat-card avg animate-in delay-1">
              <div class="card-body py-3">
                <div class="text-muted small">Média/Mês</div>
                <div class="fs-4 fw-bold">R$ {{ avgPerMonth.toFixed(2) }}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card shadow-sm stat-card count animate-in delay-2">
              <div class="card-body py-3">
                <div class="text-muted small">Transações</div>
                <div class="fs-4 fw-bold">{{ transactions.length }}</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card shadow-sm stat-card months animate-in delay-3">
              <div class="card-body py-3">
                <div class="text-muted small">Meses</div>
                <div class="fs-4 fw-bold">{{ monthCount }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-6">
            <div class="card shadow-sm h-100 animate-in delay-1">
              <div class="card-body d-flex align-items-center justify-content-center" style="min-height: 320px;">
                <div ref="pieChart" style="width: 100%; height: 300px;"></div>
              </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="card shadow-sm h-100 animate-in delay-2">
              <div class="card-body" style="max-height: 340px; overflow-y: auto;">
                <h5 class="card-title mb-3">Categorias</h5>
                <ul class="list-group list-group-flush">
                  <li v-for="cat in sortedCategories" :key="cat.name"
                      class="list-group-item category-item d-flex justify-content-between align-items-center"
                      :class="{ active: selectedCategory === cat.name }"
                      @click="selectedCategory = selectedCategory === cat.name ? null : cat.name; drawAll()">
                    <div class="d-flex align-items-center gap-2">
                      <span class="color-dot" :style="{ backgroundColor: getColor(cat.name) }"></span>
                      <span>{{ cat.name }}</span>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                      <span class="badge bg-secondary rounded-pill">{{ cat.percent }}%</span>
                      <span class="fw-semibold">R$ {{ cat.total.toFixed(2) }}</span>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-md-8">
            <div class="card shadow-sm h-100 animate-in delay-3">
              <div class="card-body">
                <h5 class="card-title mb-3">Evolução Mensal</h5>
                <div ref="monthlyChart" style="width: 100%; height: 280px;"></div>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card shadow-sm h-100 animate-in delay-4">
              <div class="card-body">
                <h5 class="card-title mb-3">Top 5 Maiores Gastos</h5>
                <div ref="top5Chart" style="width: 100%; height: 280px;"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-4 mb-4">
          <div class="col-12">
            <div class="card shadow-sm animate-in delay-5">
              <div class="card-body">
                <h5 class="card-title mb-3">Gasto Diário</h5>
                <div ref="dailyChart" style="width: 100%; height: 220px;"></div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- Orçamentos -->
      <div v-if="budgetStatus.length > 0" class="row g-3 mb-4">
        <div class="col-12">
          <div class="card shadow-sm animate-in delay-5">
            <div class="card-body">
              <h5 class="card-title mb-3">Orçamento vs Gasto ({{ currentMonthLabel }})</h5>
              <div v-for="b in budgetStatus" :key="b.id" class="mb-2">
                <div class="d-flex justify-content-between small mb-1">
                  <span class="fw-semibold">{{ b.category }}</span>
                  <span :class="b.percent > 100 ? 'text-danger fw-bold' : b.percent > 80 ? 'text-warning fw-bold' : ''">
                    R$ {{ b.spent.toFixed(2) }} / R$ {{ b.limit_amount.toFixed(2) }} ({{ b.percent }}%)
                  </span>
                </div>
                <div class="progress" style="height:10px">
                  <div class="progress-bar" :class="b.percent > 100 ? 'bg-danger' : b.percent > 80 ? 'bg-warning' : 'bg-success'"
                       role="progressbar" :style="{ width: Math.min(b.percent, 100) + '%' }">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-5">
        <p class="fs-4 text-muted">Nenhum dado encontrado</p>
        <p class="text-muted">Importe dados na página de Gerenciamento ou execute npm run seed</p>
      </div>
    </div>
  `,
  setup() {
    const transactions = Vue.ref([]);
    const categories = Vue.ref([]);
    const allMonths = Vue.ref([]);
    const selectedPeriod = Vue.ref('all');
    const selectedCategory = Vue.ref(null);
    const loading = Vue.ref(true);
    const budgetStatus = Vue.ref([]);
    const charts = { pie: null, monthly: null, top5: null, daily: null };

    const pieChart = Vue.ref(null);
    const monthlyChart = Vue.ref(null);
    const top5Chart = Vue.ref(null);
    const dailyChart = Vue.ref(null);

    const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    const currentMonthLabel = Vue.computed(() => {
      const d = new Date();
      return MONTH_NAMES[d.getMonth()] + '/' + d.getFullYear();
    });

    const availableMonths = Vue.computed(() => {
      const keys = new Set(allMonths.value);
      return [...keys].sort((a, b) => b.localeCompare(a)).map(k => ({
        key: k,
        label: MONTH_NAMES[parseInt(k.split('-')[1]) - 1] + '/' + k.split('-')[0],
      }));
    });

    const totalSpent = Vue.computed(() => transactions.value.reduce((s, t) => s + t.amount, 0));
    const monthCount = Vue.computed(() => {
      const keys = new Set(transactions.value.map(t => t.date.substring(0, 7)));
      return keys.size;
    });
    const avgPerMonth = Vue.computed(() => monthCount.value > 0 ? totalSpent.value / monthCount.value : 0);

    const categoryTotals = Vue.computed(() => {
      const t = {};
      for (const tx of transactions.value) t[tx.category] = (t[tx.category] || 0) + tx.amount;
      return t;
    });

    const sortedCategories = Vue.computed(() => {
      return Object.entries(categoryTotals.value).sort((a, b) => b[1] - a[1]).map(([name, total]) => ({
        name, total,
        percent: totalSpent.value > 0 ? ((total / totalSpent.value) * 100).toFixed(1) : '0.0',
      }));
    });

    const monthTotals = Vue.computed(() => {
      const m = {};
      for (const tx of transactions.value) {
        const key = tx.date.substring(0, 7);
        if (!m[key]) m[key] = { total: 0, cats: {} };
        m[key].total += tx.amount;
        m[key].cats[tx.category] = (m[key].cats[tx.category] || 0) + tx.amount;
      }
      return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0])).map(([key, v]) => {
        let topCat = '', max = 0;
        for (const [c, val] of Object.entries(v.cats)) { if (val > max) { max = val; topCat = c; } }
        return {
          key, total: v.total, topCategory: topCat,
          label: MONTH_NAMES[parseInt(key.split('-')[1]) - 1] + '/' + key.split('-')[0].slice(2),
        };
      });
    });

    const top5Transactions = Vue.computed(() => [...transactions.value].sort((a, b) => b.amount - a.amount).slice(0, 5));

    const dailyTotals = Vue.computed(() => {
      const d = {};
      for (const tx of transactions.value) d[tx.date] = (d[tx.date] || 0) + tx.amount;
      return Object.entries(d).sort((a, b) => a[0].localeCompare(b[0]));
    });

    function getColor(name) { return ChartHelper.getColor(categories.value, name); }

    async function loadBudgets() {
      try {
        const month = new Date().toISOString().slice(0, 7);
        budgetStatus.value = await API.budgets.status(month);
      } catch (e) { /* silencioso */ }
    }

    async function loadData() {
      loading.value = true;
      charts.pie = null; charts.monthly = null; charts.top5 = null; charts.daily = null;
      try {
        const [allTx, cat] = await Promise.all([
          API.transactions.list(),
          API.categories.list(),
          loadBudgets(),
        ]);
        categories.value = cat;

        const monthSet = new Set(allTx.map(t => t.date.substring(0, 7)));
        allMonths.value = [...monthSet];

        if (selectedPeriod.value === 'all') {
          transactions.value = allTx;
        } else if (selectedPeriod.value === 'last6') {
          const sorted = [...monthSet].sort((a, b) => b.localeCompare(a)).slice(0, 6);
          transactions.value = allTx.filter(t => sorted.includes(t.date.substring(0, 7)));
        } else {
          transactions.value = allTx.filter(t => t.date.substring(0, 7) === selectedPeriod.value);
        }
      } catch (e) { showToast('Erro ao carregar: ' + e.message, 'danger'); }
      loading.value = false;
      setTimeout(() => {
        drawEmpty();
        setTimeout(() => drawWithData(), 50);
      }, 50);
    }

    function drawAll() {
      drawWithData();
    }

    function drawEmpty() {
      ChartHelper.drawPie(pieChart.value, {}, categories.value, null, charts);
      ChartHelper.drawMonthly(monthlyChart.value, [], categories.value, charts);
      ChartHelper.drawTop5(top5Chart.value, [], categories.value, charts);
      ChartHelper.drawDaily(dailyChart.value, [], charts);
    }

    function drawWithData() {
      ChartHelper.drawPie(pieChart.value, categoryTotals.value, categories.value, selectedCategory.value, charts);
      ChartHelper.drawMonthly(monthlyChart.value, monthTotals.value, categories.value, charts);
      ChartHelper.drawTop5(top5Chart.value, top5Transactions.value, categories.value, charts);
      ChartHelper.drawDaily(dailyChart.value, dailyTotals.value, charts);
    }

    Vue.onMounted(() => { loadData(); });

    return {
      transactions, categories, selectedPeriod, selectedCategory, loading,
      availableMonths, totalSpent, monthCount, avgPerMonth, sortedCategories,
      pieChart, monthlyChart, top5Chart, dailyChart,
      budgetStatus, currentMonthLabel,
      getColor, loadData, drawAll,
    };
  },
};
