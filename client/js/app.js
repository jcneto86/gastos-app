const routes = [
  { path: '/', component: DashboardPage },
  { path: '/gerenciamento', component: ManagementPage },
];

const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes,
});

function mountApp() {
  const app = Vue.createApp({
    setup() {
      const toast = Vue.reactive({ show: false, message: '', type: 'success' });
      let timer = null;

      function showToast(message, type = 'success') {
        toast.show = true;
        toast.message = message;
        toast.type = type;
        clearTimeout(timer);
        timer = setTimeout(() => { toast.show = false; }, 3000);
      }

      Vue.provide('showToast', showToast);
      window.showToast = showToast;

      return { toast };
    },
  });

  app.use(router);
  app.mount('#app');
}

google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(mountApp);
