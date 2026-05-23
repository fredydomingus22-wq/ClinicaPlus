type ToastKind = 'success' | 'error' | 'info';
type ToastPayload = { kind: ToastKind; message: string };

function emit(kind: ToastKind, message: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ToastPayload>('clinicaplus:toast', { detail: { kind, message } }));
}

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
};
