export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Non autorisé') {
    super(401, 'UNAUTHORIZED', message)
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable') {
    super(404, 'NOT_FOUND', message)
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflit de données') {
    super(409, 'CONFLICT', message)
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Données invalides') {
    super(400, 'VALIDATION_ERROR', message)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Accès refusé') {
    super(403, 'FORBIDDEN', message)
  }
}
