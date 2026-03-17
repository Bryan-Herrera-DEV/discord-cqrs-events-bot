export class ApplicationError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  public constructor(message: string, code = "APPLICATION_ERROR", details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends ApplicationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", details);
  }
}

export class AuthorizationError extends ApplicationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, "AUTHORIZATION_ERROR", details);
  }
}

export class NotFoundError extends ApplicationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, "NOT_FOUND", details);
  }
}

export class ConflictError extends ApplicationError {
  public constructor(message: string, details?: Record<string, unknown>) {
    super(message, "CONFLICT", details);
  }
}
