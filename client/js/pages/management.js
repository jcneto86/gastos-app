const PAGE_SIZE = 20;

const ManagementPage = {
  template: `
    <div>
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h4 class="mb-0">Gerenciamento</h4>
        <div class="d-flex gap-2 align-items-center">
          <button class="btn btn-primary btn-sm" @click="openTxModal()">+ Nova Transação</button>
          <button class="btn btn-outline-secondary btn-sm" @click="openCatModal()">+ Nova Categoria</button>
          <label class="btn btn-outline-success btn-sm mb-0">
            Importar JSON
            <input type="file" accept=".json" hidden @change="onImport">
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
          <button class="btn btn-outline-danger btn-sm" @click="clearAll">
            Limpar Tudo
          </button>
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
              <button class="btn btn-outline-danger btn-sm w-100" @click="clearFilters" v-if="filters.search || filters.category || filters.month">
                Limpar filtros
              </button>
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
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th class="text-end">Valor</th>
                    <th class="text-center" style="width: 120px">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="transactions.length === 0">
                    <td colspan="5" class="text-center text-muted py-4">Nenhuma transação encontrada</td>
                  </tr>
                  <tr v-for="tx in transactions" :key="tx.id">
                    <td>{{ formatDate(tx.date) }}</td>
                    <td>{{ tx.description || '-' }}</td>
                    <td>
                      <span class="badge" :style="{ backgroundColor: getColor(tx.category), color: '#fff' }">
                        {{ tx.category }}
                      </span>
                    </td>
                    <td class="text-end fw-semibold">R$ {{ Number(tx.amount).toFixed(2) }}</td>
                    <td class="text-center">
                      <button class="btn btn-outline-primary btn-sm me-1" @click="openTxModal(tx)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10z"/>
                        </svg>
                      </button>
                      <button class="btn btn-outline-danger btn-sm" @click="deleteTx(tx.id)">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5l1-1h3l1 1h2.5a1 1 0 0 1 1 1v1z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Paginação -->
            <div v-if="totalPages > 1" class="d-flex justify-content-between align-items-center mt-3">
              <small class="text-muted">{{ totalItems }} transação(ns)</small>
              <nav>
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" :class="{ disabled: currentPage <= 1 }">
                    <a class="page-link" href="#" @click.prevent="goToPage(currentPage - 1)">«</a>
                  </li>
                  <li v-for="p in visiblePages" :key="p"
                      class="page-item" :class="{ active: p === currentPage }">
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

      <!-- Gerenciar Categorias -->
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <h5 class="card-title mb-3">Categorias</h5>
          <div class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th style="width: 40px"></th>
                  <th>Nome</th>
                  <th>Cor</th>
                  <th class="text-center" style="width: 120px">Ações</th>
                </tr>
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
              <div class="mb-3">
                <label class="form-label">Data</label>
                <input type="date" class="form-control" v-model="txForm.date">
              </div>
              <div class="mb-3">
                <label class="form-label">Valor (R$)</label>
                <input type="number" step="0.01" min="0" class="form-control" v-model.number="txForm.amount">
              </div>
              <div class="mb-3">
                <label class="form-label">Categoria</label>
                <select class="form-select" v-model="txForm.category">
                  <option value="">Selecione...</option>
                  <option v-for="c in allCategories" :key="c.id" :value="c.name">{{ c.name }}</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">Descrição</label>
                <input type="text" class="form-control" v-model="txForm.description" placeholder="Opcional">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showTxModal = false">Cancelar</button>
              <button type="button" class="btn btn-primary" @click="saveTx" :disabled="!txForm.date || !txForm.amount || !txForm.category">
                Salvar
              </button>
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
              <div class="mb-3">
                <label class="form-label">Nome</label>
                <input type="text" class="form-control" v-model="catForm.name">
              </div>
              <div class="mb-3">
                <label class="form-label">Cor</label>
                <input type="color" class="form-control form-control-color" v-model="catForm.color">
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" @click="showCatModal = false">Cancelar</button>
              <button type="button" class="btn btn-primary" @click="saveCat" :disabled="!catForm.name">Salvar</button>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showCatModal" class="modal-backdrop fade show"></div>

      <!-- Modal Confirmação -->
      <div class="modal fade" :class="{ show: showConfirmModal }" :style="{ display: showConfirmModal ? 'block' : 'none' }"
           @click.self="showConfirmModal = false" tabindex="-1">
        <div class="modal-dialog modal-sm">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Confirmar</h5>
              <button type="button" class="btn-close" @click="showConfirmModal = false"></button>
            </div>
            <div class="modal-body">
              <p class="mb-0">{{ confirmMessage }}</p>
            </div>
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

    const currentPage = Vue.ref(1);
    const totalItems = Vue.ref(0);
    const totalPages = Vue.computed(() => Math.max(1, Math.ceil(totalItems.value / PAGE_SIZE)));

    const visiblePages = Vue.computed(() => {
      const total = totalPages.value;
      const curr = currentPage.value;
      const pages = [];
      let start = Math.max(1, curr - 2);
      let end = Math.min(total, curr + 2);
      if (end - start < 4) {
        if (start === 1) end = Math.min(total, start + 4);
        else start = Math.max(1, end - 4);
      }
      for (let i = start; i <= end; i++) pages.push(i);
      return pages;
    });

    const showTxModal = Vue.ref(false);
    const showCatModal = Vue.ref(false);
    const showConfirmModal = Vue.ref(false);
    const showExportDropdown = Vue.ref(false);
    const confirmMessage = Vue.ref('');
    const confirmAction = Vue.ref(() => {});
    const editingTx = Vue.ref(null);
    const editingCat = Vue.ref(null);
    const txForm = Vue.ref({ date: '', amount: null, category: '', description: '' });
    const catForm = Vue.ref({ name: '', color: '#FF6384' });

    const MONTH_NAMES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    const availableMonths = Vue.computed(() => {
      const keys = new Set(transactions.value.map(t => t.date.substring(0, 7)));
      return [...keys].sort((a, b) => b.localeCompare(a));
    });

    let debounceTimer = null;
    function debouncedLoad() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => { currentPage.value = 1; loadData(); }, 300);
    }

    function onFilterChange() {
      currentPage.value = 1;
      loadData();
    }

    async function loadData() {
      loading.value = true;
      try {
        const params = { page: currentPage.value, limit: PAGE_SIZE };
        if (filters.value.category) params.category = filters.value.category;
        if (filters.value.month) params.month = filters.value.month;
        if (filters.value.search) params.search = filters.value.search;
        const [res, cat] = await Promise.all([
          API.transactions.list(params),
          API.categories.list(),
        ]);
        transactions.value = res.data;
        totalItems.value = res.total;
        allCategories.value = cat;
      } catch (e) { showToast('Erro ao carregar: ' + e.message, 'danger'); }
      loading.value = false;
    }

    function goToPage(page) {
      if (page < 1 || page > totalPages.value) return;
      currentPage.value = page;
      loadData();
    }

    function clearFilters() {
      filters.value = { search: '', category: '', month: '' };
      currentPage.value = 1;
      loadData();
    }

    function formatDate(d) {
      const dt = new Date(d + 'T12:00:00');
      return dt.getDate().toString().padStart(2, '0') + '/' + (dt.getMonth() + 1).toString().padStart(2, '0') + '/' + dt.getFullYear();
    }

    function getColor(name) { return ChartHelper.getColor(allCategories.value, name); }

    function openTxModal(tx = null) {
      editingTx.value = tx;
      if (tx) {
        txForm.value = { date: tx.date, amount: tx.amount, category: tx.category, description: tx.description };
      } else {
        txForm.value = { date: new Date().toISOString().split('T')[0], amount: null, category: '', description: '' };
      }
      showTxModal.value = true;
    }

    async function saveTx() {
      try {
        if (editingTx.value) {
          await API.transactions.update(editingTx.value.id, txForm.value);
          showToast('Transação atualizada!');
        } else {
          await API.transactions.create(txForm.value);
          showToast('Transação criada!');
        }
        showTxModal.value = false;
        loadData();
      } catch (e) { showToast('Erro: ' + e.message, 'danger'); }
    }

    function openConfirm(message, action) {
      confirmMessage.value = message;
      confirmAction.value = () => { showConfirmModal.value = false; action(); };
      showConfirmModal.value = true;
    }

    async function deleteTx(id) {
      openConfirm('Tem certeza que deseja deletar esta transação?', async () => {
        try {
          await API.transactions.delete(id);
          showToast('Transação deletada!');
          loadData();
        } catch (e) { showToast('Erro: ' + e.message, 'danger'); }
      });
    }

    function openCatModal(cat = null) {
      editingCat.value = cat;
      if (cat) {
        catForm.value = { name: cat.name, color: cat.color };
      } else {
        catForm.value = { name: '', color: '#FF6384' };
      }
      showCatModal.value = true;
    }

    async function saveCat() {
      try {
        if (editingCat.value) {
          await API.categories.update(editingCat.value.id, catForm.value);
          showToast('Categoria atualizada!');
        } else {
          await API.categories.create(catForm.value);
          showToast('Categoria criada!');
        }
        showCatModal.value = false;
        currentPage.value = 1;
        loadData();
      } catch (e) { showToast('Erro: ' + e.message, 'danger'); }
    }

    async function deleteCat(id) {
      openConfirm('Tem certeza que deseja deletar esta categoria?', async () => {
        try {
          await API.categories.delete(id);
          showToast('Categoria deletada!');
          currentPage.value = 1;
          loadData();
        } catch (e) { showToast('Erro: ' + e.message, 'danger'); }
      });
    }

    async function onImport(event) {
      const file = event.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const result = await API.importExport.import(data, 'merge');
        showToast(result.transactions + ' transações importadas!');
        currentPage.value = 1;
        loadData();
      } catch (e) { showToast('Erro ao importar: ' + e.message, 'danger'); }
      event.target.value = '';
    }

    async function onExport(month = '') {
      try {
        const data = await API.importExport.export(month || undefined);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = month ? `gastos_${month}.json` : 'gastos_pessoais.json';
        a.click();
        URL.revokeObjectURL(url);
        showToast('Exportado com sucesso!');
      } catch (e) { showToast('Erro ao exportar: ' + e.message, 'danger'); }
    }

    function clearAll() {
      openConfirm('Tem certeza que deseja apagar TODOS os dados? Essa ação não pode ser desfeita.', async () => {
        try {
          await API.importExport.clear();
          showToast('Todos os dados foram apagados!');
          currentPage.value = 1;
          loadData();
        } catch (e) { showToast('Erro: ' + e.message, 'danger'); }
      });
    }

    Vue.onMounted(() => {
      loadData();
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) showExportDropdown.value = false;
      });
    });

    return {
      transactions, allCategories, loading, filters, currentPage, totalItems, totalPages, visiblePages,
      showTxModal, showCatModal, showConfirmModal, confirmMessage, confirmAction,
      showExportDropdown,
      editingTx, editingCat, txForm, catForm,
      loadData, clearFilters, debouncedLoad, onFilterChange, goToPage, formatDate, getColor,
      openTxModal, saveTx, deleteTx,
      openCatModal, saveCat, deleteCat,
      onImport, onExport, clearAll,
    };
  },
};
