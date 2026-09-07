export class AppError extends Error {
  public readonly statusCode: number;
  public readonly detalhes?: any;

  constructor(message: string, statusCode: number = 400, detalhes?: any) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.detalhes = detalhes;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
