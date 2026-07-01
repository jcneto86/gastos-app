const PAGE_SIZE = 20;

const ManagementPage = {
  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <h4 class="mb-0">Gerenciamento</h4>
        <div class="d-flex gap-2 align-items-center flex-wrap">
          <button class="btn btn-primary btn-sm" @click="openTxModal()">+ Nova Transação</button>
          <button class="btn btn-outline-secondary btn-sm" @click="openCatModal()">+ Nova Categoria</button>
          <label class="btn btn-outline-success btn-sm mb-0">
            Importar JSON
            <input type="file" accept=".json" hidden @change="onImport">
          </label>
          <label class="btn btn-outline-success btn-sm mb-0">
            Importar CSV
            <input type="file" accept=".csv,.txt" hidden @change="onImportCSV">
          </label>
          <div class="dropdown position-relative">
            <button class="btn btn-outline-info btn-sm" @click="showExportDropdown = !showExportDropdown">
              Exportar JSON ▾
            </button>
            <ul v-if="showExportDropdown" class="dropdown-menu dropdown-menu-end show" style="position: absolute;">
              <li><a class="dropdown-item" href="#" @click.prevent="onExport(''); showExportDropdown = false">Todos os meses</a></li>
              <li><hr class="dropdown-divider"></li>
              <li v-for="m in availableMonths" :key="m">
                <a class="dropdown-item" href="#" @click.prevent="onExport(m); showExportDropdown = false">{{ m }}</a>
              </li>
            </ul>
          </div>
          <button class="btn btn-outline-danger btn-sm" @click="clearAll">Limpar Tudo</button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="card shadow-sm mb-4">
        <div class="card-body py-3">
          <div class="row g-3">
            <div class="col-md-4">
              <input type="text" class="form-control form-control-sm" placeholder="Buscar descrição..."
                     v-model="filters.search" @input="debouncedLoad">
            </div>
            <div class="col-md-3">
              <select class="form-select form-select-sm" v-model="filters.category" @change="onFilterChange">
                <option value="">Todas categorias</option>
                <option v-for="c in allCategories" :key="c.id" :value="c.name">{{ c.name }}</option>
              </select>
            </div>
            <div class="col-md-3">
              <select class="form-select form-select-sm" v-model="filters.month" @change="onFilterChange">
                <option value="">Todos meses</option>
                <option v-for="m in availableMonths" :key="m" :value="m">{{ m }}</option>
              </select>
            </div>
            <div class="col-md-2">
              <button class="btn btn-outline-danger btn-sm w-100" @click="clearFilters" v-if="filters.search || filters.category || filters.month">Limpar filtros</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tabela de Transações -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div v-if="loading" class="text-center py-4">
            <div class="spinner-border text-primary"></div>
          </div>
          <template v-else>
            <div class="table-responsive">
              <table class="table table-hover align-middle mb-0">
                <thead class="table-light">
                  <tr>
                    <th @click="setSort('date')" style="cursor:pointer; user-select:none;">
                      Data <span v-if="sortKey==='date'">{{ sortDir==='asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th @click="setSort('description')" style="cursor:pointer; user-select:none;">
                      Descrição <span v-if="sortKey==='description'">{{ sortDir==='asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th @click="setSort('category')" style="cursor:pointer; user-select:none;">
                      Categoria <span v-if="sortKey==='category'">{{ sortDir==='asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th @click="setSort('amount')" class="text-end" style="cursor:pointer; user-select:none;">
                      Valor <span v-if="sortKey==='amount'">{{ sortDir==='asc' ? '▲' : '▼' }}</span>
                    </th>
                    <th class="text-center" style="width: 120px">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="sortedTransactions.length === 0">
                    <td colspan="5" class="text-center text-muted py-4">Nenhuma transação encontrada</td>
                  </tr>
                  <tr v-for="tx in sortedTransactions" :key="tx.id">
                    <td>{{ formatDate(tx.date) }}</td>
                    <td>{{ tx.description || '-' }}</td>
                    <td>
                      <span class="badge" :style="{ backgroundColor: getColor(tx.category), color: '#fff' }">{{ tx.category }}</span>
                    </td>
                    <td class="text-end fw-semibold">R$ {{ Number(tx.amount).toFixed(2) }}</td>
                    <td class="text-center">
                      <button class="btn btn-outline-primary btn-sm me-1" @click="openTxModal(tx)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10z"/></svg>
                      </button>
                      <button class="btn btn-outline-danger btn-sm" @click="deleteTx(tx.id)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/><path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5l1-1h3l1 1h2.5a1 1 0 0 1 1 1v1z"/></svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div v-if="totalPages > 1" class="d-flex justify-content-between align-items-center mt-3">
              <small class="text-muted">{{ totalItems }} transação(ns)</small>
              <nav>
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" :class="{ disabled: currentPage <= 1 }">
                    <a class="page-link" href="#" @click.prevent="goToPage(currentPage - 1)">«</a>
                  </li>
                  <li v-for="p in visiblePages" :key="p" class="page-item" :class="{ active: p === currentPage }">
                    <a class="page-link" href="#" @click.prevent="goToPage(p)">{{ p }}</a>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage >= totalPages }">
                    <a class="page-link" href="#" @click.prevent="goToPage(currentPage + 1)">»</a>
                  </li>
                </ul>
              </nav>
            </div>
          </template>
        </div>
      </div>

      <!-- Categorias -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title mb-3">Categorias</h5>
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead class="table-light">
                <tr><th style="width:40px"></th><th>Nome</th><th>Cor</th><th class="text-center" style="width:120px">Ações</th></tr>
              </thead>
              <tbody>
                <tr v-for="cat in allCategories" :key="cat.id">
                  <td><span class="color-dot" :style="{ backgroundColor: cat.color }"></span></td>
                  <td>{{ cat.name }}</td>
                  <td><code>{{ cat.color }}</code></td>
                  <td class="text-center">
                    <button class="btn btn-outline-primary btn-sm me-1" @click="openCatModal(cat)">Editar</button>
                    <button class="btn btn-outline-danger btn-sm" @click="deleteCat(cat.id)">Deletar</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Transações Recorrentes -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-title mb-0">Transações Recorrentes</h5>
            <button class="btn btn-primary btn-sm" @click="openRecModal()">+ Nova</button>
          </div>
          <div v-if="recurringLoading" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary"></div>
          </div>
          <div v-else-if="recurringItems.length === 0" class="text-muted small">Nenhuma transação recorrente cadastrada.</div>
          <div class="table-responsive" v-else>
            <table class="table table-sm align-middle mb-0">
              <thead class="table-light">
                <tr><th>Descrição</th><th>Categoria</th><th class="text-end">Valor</th><th class="text-center">Dia</th><th class="text-center">Ativo</th><th style="width:80px"></th></tr>
              </thead>
              <tbody>
                <tr v-for="r in recurringItems" :key="r.id">
                  <td>{{ r.description }}</td>
                  <td><span class="badge" :style="{ backgroundColor: getColor(r.category), color: '#fff' }">{{ r.category }}</span></td>
                  <td class="text-end">R$ {{ Number(r.amount).toFixed(2) }}</td>
                  <td class="text-center">Dia {{ r.day }}</td>
                  <td class="text-center">
                    <span class="badge" :class="r.active ? 'bg-success' : 'bg-secondary'">{{ r.active ? 'Sim' : 'Não' }}</span>
                  </td>
                  <td>
                    <button class="btn btn-outline-primary btn-sm me-1" @click="openRecModal(r)">Editar</button>
                    <button class="btn btn-outline-danger btn-sm" @click="deleteRec(r.id)">×</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Orçamentos -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="card-title mb-0">Orçamentos do Mês</h5>
            <div class="d-flex gap-2 align-items-center">
              <input type="month" class="form-control form-control-sm" style="width:160px" v-model="budgetMonth" @change="loadBudgets">
              <button class="btn btn-primary btn-sm" @click="openBudgetModal()">+ Novo</button>
            </div>
          </div>
          <div v-if="budgetsLoading" class="text-center py-3">
            <div class="spinner-border spinner-border-sm text-primary"></div>
          </div>
          <div v-else-if="budgetStatus.length === 0" class="text-muted small">Nenhum orçamento definido para este mês.</div>
          <div v-else>
            <div v-for="b in budgetStatus" :key="b.id" class="mb-2">
              <div class="d-flex justify-content-between small mb-1">
                <span class="fw-semibold">{{ b.category }}</span>
                <span :class="b.percent > 100 ? 'text-danger fw-bold' : b.percent > 80 ? 'text-warning fw-bold' : ''">
                  R$ {{ b.spent.toFixed(2) }} / R$ {{ b.limit_amount.toFixed(2) }} ({{ b.percent }}%)
                </span>
              </div>
              <div class="progress" style="height:8px">
                <div class="progress-bar" :class="b.percent > 100 ? 'bg-danger' : b.percent > 80 ? 'bg-warning' : 'bg-success'"
                     role="progressbar" :style="{ width: Math.min(b.percent, 100) + '%' }">
                </div>
              </div>
              <button class="btn btn-sm btn-outline-danger mt-1" @click="deleteBudget(b.id)" style="font-size:10px; line-height:1">Remover</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Transação -->
      <div class="modal fade" :class="{ show: showTxModal }" :style="{ display: showTxModal ? 'block' : 'none' }"
           @click.self="showTxModal = false" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ editingTx ? 'Editar' : 'Nova' }} Transação</h5>
              <button type="button" class="btn-close" @click="showTxModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3"><label class="form-label">Data</label><input type="date" class="form-control" v-model="txForm.date"></div>
              <div class="mb-3"><label class="form-label">Valor (R$)</label><input type="number" step="0.01" min="0" class="form-control" v-model.number="txForm.amount"></div>
              <div class="mb-3"><label class="form-label">Categoria</label>
                <select class="form-select" v-model="txForm.category">
                  <option value="">Selecione...</option>
                  <option v-for="c in allCategories" :key="c.id" :value="c.name">{{ c.name }}</option>
                </select>
              </div>
              <div class="mb-3"><label class="form-label">Descrição</label><input type="text" class="form-control" v-model="txForm.description" placeholder="Opcional"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showTxModal = false">Cancelar</button>
              <button type="button" class="btn btn-primary" @click="saveTx" :disabled="!txForm.date || !txForm.amount || !txForm.category">Salvar</button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showTxModal" class="modal-backdrop fade show"></div>

      <!-- Modal Categoria -->
      <div class="modal fade" :class="{ show: showCatModal }" :style="{ display: showCatModal ? 'block' : 'none' }"
           @click.self="showCatModal = false" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ editingCat ? 'Editar' : 'Nova' }} Categoria</h5>
              <button type="button" class="btn-close" @click="showCatModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3"><label class="form-label">Nome</label><input type="text" class="form-control" v-model="catForm.name"></div>
              <div class="mb-3"><label class="form-label">Cor</label><input type="color" class="form-control form-control-color" v-model="catForm.color"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showCatModal = false">Cancelar</button>
              <button type="button" class="btn btn-primary" @click="saveCat" :disabled="!catForm.name">Salvar</button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showCatModal" class="modal-backdrop fade show"></div>

      <!-- Modal Recorrente -->
      <div class="modal fade" :class="{ show: showRecModal }" :style="{ display: showRecModal ? 'block' : 'none' }"
           @click.self="showRecModal = false" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">{{ editingRec ? 'Editar' : 'Nova' }} Transação Recorrente</h5>
              <button type="button" class="btn-close" @click="showRecModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3"><label class="form-label">Descrição</label><input type="text" class="form-control" v-model="recForm.description"></div>
              <div class="mb-3"><label class="form-label">Valor (R$)</label><input type="number" step="0.01" min="0" class="form-control" v-model.number="recForm.amount"></div>
              <div class="mb-3"><label class="form-label">Categoria</label>
                <select class="form-select" v-model="recForm.category">
                  <option value="">Selecione...</option>
                  <option v-for="c in allCategories" :key="c.id" :value="c.name">{{ c.name }}</option>
                </select>
              </div>
              <div class="mb-3"><label class="form-label">Dia do mês</label>
                <select class="form-select" v-model.number="recForm.day">
                  <option v-for="d in 31" :key="d" :value="d">{{ d }}</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Ativo</label>
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" v-model="recForm.active">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showRecModal = false">Cancelar</button>
              <button type="button" class="btn btn-primary" @click="saveRec" :disabled="!recForm.description || !recForm.amount || !recForm.category">Salvar</button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showRecModal" class="modal-backdrop fade show"></div>

      <!-- Modal Orçamento -->
      <div class="modal fade" :class="{ show: showBudgetModal }" :style="{ display: showBudgetModal ? 'block' : 'none' }"
           @click.self="showBudgetModal = false" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Novo Orçamento</h5>
              <button type="button" class="btn-close" @click="showBudgetModal = false"></button>
            </div>
            <div class="modal-body">
              <div class="mb-3"><label class="form-label">Categoria</label>
                <select class="form-select" v-model="budgetForm.category">
                  <option value="">Selecione...</option>
                  <option v-for="c in allCategories" :key="c.id" :value="c.name">{{ c.name }}</option>
                </select>
              </div>
              <div class="mb-3"><label class="form-label">Limite (R$)</label><input type="number" step="0.01" min="0" class="form-control" v-model.number="budgetForm.limit_amount"></div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showBudgetModal = false">Cancelar</button>
              <button type="button" class="btn btn-primary" @click="saveBudget" :disabled="!budgetForm.category || !budgetForm.limit_amount">Salvar</button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showBudgetModal" class="modal-backdrop fade show"></div>

      <!-- Modal Confirmação -->
      <div class="modal fade" :class="{ show: showConfirmModal }" :style="{ display: showConfirmModal ? 'block' : 'none' }"
           @click.self="showConfirmModal = false" tabindex="-1">
        <div class="modal-dialog modal-sm">
          <div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">Confirmar</h5><button type="button" class="btn-close" @click="showConfirmModal = false"></button></div>
            <div class="modal-body"><p class="mb-0">{{ confirmMessage }}</p></div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" @click="showConfirmModal = false">Cancelar</button>
              <button type="button" class="btn btn-danger btn-sm" @click="confirmAction">Deletar</button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showConfirmModal" class="modal-backdrop fade show"></div>
    </div>
  `,
  setup() {
    const transactions = Vue.ref([]);
    const allCategories = Vue.ref([]);
    const loading = Vue.ref(false);
    const filters = Vue.ref({ search: '', category: '', month: '' });
    const sortKey = Vue.ref('date');
    const sortDir = Vue.ref('desc');

    const currentPage = Vue.ref(1);
    const totalItems = Vue.ref(0);
    const totalPages = Vue.computed(() => Math.max(1, Math.ceil(totalItems.value / PAGE_SIZE)));

    const visiblePages = Vue.computed(() => {
      const total = totalPages.value, curr = currentPage.value, pages = [];
      let start = Math.max(1, curr - 2), end = Math.min(total, curr + 2);
      if (end - start < 4) { if (start === 1) end = Math.min(total, start + 4); else start = Math.max(1, end - 4); }
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    });

    const sortedTransactions = Vue.computed(() => {
      const arr = [...transactions.value];
      const key = sortKey.value, dir = sortDir.value === 'asc' ? 1 : -1;
      arr.sort((a, b) => {
        let cmp = 0;
        if (key === 'amount') cmp = a.amount - b.amount;
        else if (key === 'date') cmp = a.date.localeCompare(b.date);
        else if (key === 'category') cmp = a.category.localeCompare(b.category);
        else if (key === 'description') cmp = (a.description||'').localeCompare(b.description||'');
        return cmp * dir;
      });
      return arr;
    });

    function setSort(key) {
      if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
      else { sortKey.value = key; sortDir.value = 'asc'; }
    }

    const showTxModal = Vue.ref(false);
    const showCatModal = Vue.ref(false);
    const showRecModal = Vue.ref(false);
    const showBudgetModal = Vue.ref(false);
    const showConfirmModal = Vue.ref(false);
    const showExportDropdown = Vue.ref(false);
    const confirmMessage = Vue.ref('');
    const confirmAction = Vue.ref(() => {});
    const editingTx = Vue.ref(null);
    const editingCat = Vue.ref(null);
    const editingRec = Vue.ref(null);
    const txForm = Vue.ref({ date: '', amount: null, category: '', description: '' });
    const catForm = Vue.ref({ name: '', color: '#FF6384' });
    const recForm = Vue.ref({ description: '', amount: null, category: '', day: 1, active: true });

    // Recorrentes
    const recurringItems = Vue.ref([]);
    const recurringLoading = Vue.ref(false);
    async function loadRecurring() {
      recurringLoading.value = true;
      try { recurringItems.value = await API.recurring.list(); }
      catch (e) { showToast('Erro ao carregar recorrentes: ' + e.message, 'danger'); }
      recurringLoading.value = false;
    }
    function openRecModal(r = null) {
      editingRec.value = r;
      if (r) recForm.value = { description: r.description, amount: r.amount, category: r.category, day: r.day, active: !!r.active };
      else recForm.value = { description: '', amount: null, category: '', day: 1, active: true };
      showRecModal.value = true;
    }
    async function saveRec() {
      try {
        if (editingRec.value) { await API.recurring.update(editingRec.value.id, recForm.value); showToast('Recorrente atualizada!'); }
        else { await API.recurring.create(recForm.value); showToast('Recorrente criada!'); }
        showRecModal.value = false; loadRecurring();
      } catch (e) { showToast('Erro: ' + e.message, 'danger'); }
    }
    async function deleteRec(id) {
      openConfirm('Deletar transação recorrente?', async () => {
        try { await API.recurring.delete(id); showToast('Recorrente deletada!'); loadRecurring(); }
        catch (e) { showToast('Erro: ' + e.message, 'danger'); }
      });
    }

    // Orçamentos
    const budgetMonth = Vue.ref(new Date().toISOString().slice(0, 7));
    const budgetStatus = Vue.ref([]);
    const budgetsLoading = Vue.ref(false);
    const showBudgetForm = Vue.ref(false);
    const budgetForm = Vue.ref({ category: '', limit_amount: null });
    async function loadBudgets() {
      budgetsLoading.value = true;
      try { budgetStatus.value = await API.budgets.status(budgetMonth.value); }
      catch (e) { showToast('Erro ao carregar orçamentos: ' + e.message, 'danger'); }
      budgetsLoading.value = false;
    }
    function openBudgetModal() { budgetForm.value = { category: '', limit_amount: null }; showBudgetModal.value = true; }
    async function saveBudget() {
      try {
        await API.budgets.save({ ...budgetForm.value, month: budgetMonth.value });
        showToast('Orçamento salvo!'); showBudgetModal.value = false; loadBudgets();
      } catch (e) { showToast('Erro: ' + e.message, 'danger'); }
    }
    async function deleteBudget(id) {
      openConfirm('Remover este orçamento?', async () => {
        try { await API.budgets.delete(id); showToast('Orçamento removido!'); loadBudgets(); }
        catch (e) { showToast('Erro: ' + e.message, 'danger'); }
      });
    }

    const availableMonths = Vue.computed(() => {
      const keys = new Set(transactions.value.map(t => t.date.substring(0, 7)));
      return [...keys].sort((a, b) => b.localeCompare(a));
    });

    let debounceTimer = null;
    function debouncedLoad() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { currentPage.value = 1; loadData(); }, 300);
    }
    function onFilterChange() { currentPage.value = 1; loadData(); }

    async function loadData() {
      loading.value = true;
      try {
        const params = { page: currentPage.value, limit: PAGE_SIZE };
        if (filters.value.category) params.category = filters.value.category;
        if (filters.value.month) params.month = filters.value.month;
        if (filters.value.search) params.search = filters.value.search;
        const [res, cat] = await Promise.all([API.transactions.list(params), API.categories.list()]);
        transactions.value = res.data;
        totalItems.value = res.total;
        allCategories.value = cat;
      } catch (e) { showToast('Erro ao carregar: ' + e.message, 'danger'); }
      loading.value = false;
    }

    function goToPage(page) { if (page >= 1 && page <= totalPages.value) { currentPage.value = page; loadData(); } }

    function clearFilters() { filters.value = { search: '', category: '', month: '' }; currentPage.value = 1; loadData(); }

    function formatDate(d) {
      const dt = new Date(d + 'T12:00:00');
      return dt.getDate().toString().padStart(2, '0') + '/' + (dt.getMonth()+1).toString().padStart(2, '0') + '/' + dt.getFullYear();
    }

    function getColor(name) { return ChartHelper.getColor(allCategories.value, name); }

    function openTxModal(tx = null) {
      editingTx.value = tx;
      if (tx) txForm.value = { date: tx.date, amount: tx.amount, category: tx.category, description: tx.description };
      else txForm.value = { date: new Date().toISOString().split('T')[0], amount: null, category: '', description: '' };
      showTxModal.value = true;
    }

    async function saveTx() {
      try {
        if (editingTx.value) { await API.transactions.update(editingTx.value.id, txForm.value); showToast('Transação atualizada!'); }
        else { await API.transactions.create(txForm.value); showToast('Transação criada!'); }
        showTxModal.value = false; loadData();
      } catch (e) { showToast('Erro: ' + e.message, 'danger'); }
    }

    function openConfirm(msg, fn) { confirmMessage.value = msg; confirmAction.value = () => { showConfirmModal.value = false; fn(); }; showConfirmModal.value = true; }

    async function deleteTx(id) {
      openConfirm('Tem certeza que deseja deletar esta transação?', async () => {
        try { await API.transactions.delete(id); showToast('Transação deletada!'); loadData(); }
        catch (e) { showToast('Erro: ' + e.message, 'danger'); }
      });
    }

    function openCatModal(cat = null) {
      editingCat.value = cat;
      if (cat) catForm.value = { name: cat.name, color: cat.color };
      else catForm.value = { name: '', color: '#FF6384' };
      showCatModal.value = true;
    }

    async function saveCat() {
      try {
        if (editingCat.value) { await API.categories.update(editingCat.value.id, catForm.value); showToast('Categoria atualizada!'); }
        else { await API.categories.create(catForm.value); showToast('Categoria criada!'); }
        showCatModal.value = false; currentPage.value = 1; loadData();
      } catch (e) { showToast('Erro: ' + e.message, 'danger'); }
    }

    async function deleteCat(id) {
      openConfirm('Tem certeza que deseja deletar esta categoria?', async () => {
        try { await API.categories.delete(id); showToast('Categoria deletada!'); currentPage.value = 1; loadData(); }
        catch (e) { showToast('Erro: ' + e.message, 'danger'); }
      });
    }

    async function onImport(event) {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await API.importExport.import(data);
        showToast(result.transactions + ' transações importadas!');
        currentPage.value = 1; loadData();
      } catch (e) { showToast('Erro ao importar: ' + e.message, 'danger'); }
      event.target.value = '';
    }

    async function onImportCSV(event) {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const csv = await file.text();
        const result = await API.importExport.importCSV(csv);
        showToast(result.imported + ' transações importadas via CSV!');
        currentPage.value = 1; loadData();
      } catch (e) { showToast('Erro ao importar CSV: ' + e.message, 'danger'); }
      event.target.value = '';
    }

    async function onExport(month = '') {
      try {
        const data = await API.importExport.export(month || undefined);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = month ? `gastos_${month}.json` : 'gastos_pessoais.json';
        a.click(); URL.revokeObjectURL(url); showToast('Exportado com sucesso!');
      } catch (e) { showToast('Erro ao exportar: ' + e.message, 'danger'); }
    }

    function clearAll() {
      openConfirm('Tem certeza que deseja apagar TODOS os dados?', async () => {
        try { await API.importExport.clear(); showToast('Todos os dados foram apagados!'); currentPage.value = 1; loadData(); }
        catch (e) { showToast('Erro: ' + e.message, 'danger'); }
      });
    }

    Vue.onMounted(() => {
      loadData(); loadRecurring(); loadBudgets();
      document.addEventListener('click', (e) => { if (!e.target.closest('.dropdown')) showExportDropdown.value = false; });
    });

    return {
      transactions, allCategories, loading, filters, currentPage, totalItems, totalPages, visiblePages,
      sortKey, sortDir, sortedTransactions, setSort,
      showTxModal, showCatModal, showRecModal, showBudgetModal, showConfirmModal, confirmMessage, confirmAction, showExportDropdown,
      editingTx, editingCat, editingRec, txForm, catForm, recForm,
      recurringItems, recurringLoading,
      budgetMonth, budgetStatus, budgetsLoading, budgetForm,
      loadData, loadBudgets, clearFilters, debouncedLoad, onFilterChange, goToPage, formatDate, getColor,
      openTxModal, saveTx, deleteTx, openCatModal, saveCat, deleteCat,
      openRecModal, saveRec, deleteRec,
      openBudgetModal, saveBudget, deleteBudget,
      onImport, onImportCSV, onExport, clearAll,
    };
  },
};
