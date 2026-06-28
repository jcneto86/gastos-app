const toastState = Vue.reactive({ show: false, message: '', type: 'success' });

function showToast(message, type = 'success') {
  toastState.show = true;
  toastState.message = message;
  toastState.type = type;
  setTimeout(() => { toastState.show = false; }, 3000);
}
