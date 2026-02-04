export class ApiaryError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ApiaryError';
  }
}

export class IpcError extends ApiaryError {
  constructor(message: string) {
    super(message, 'IPC_ERROR');
    this.name = 'IpcError';
  }
}
