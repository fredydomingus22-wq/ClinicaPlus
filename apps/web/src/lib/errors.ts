export class OfflineError extends Error {
  constructor(message = 'Esta operação requer ligação à internet.') {
    super(message);
    this.name = 'OfflineError';
  }
}
