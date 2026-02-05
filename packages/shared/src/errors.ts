export class SteqError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'SteqError';
  }
}

export class IpcError extends SteqError {
  constructor(message: string) {
    super(message, 'IPC_ERROR');
    this.name = 'IpcError';
  }
}
