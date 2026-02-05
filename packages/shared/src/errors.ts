export class ReqtorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ReqtorError';
  }
}

export class IpcError extends ReqtorError {
  constructor(message: string) {
    super(message, 'IPC_ERROR');
    this.name = 'IpcError';
  }
}
