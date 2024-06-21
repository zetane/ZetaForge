
export class ServerError extends Error {
  public readonly statusCode: HttpStatus;
  public readonly cause: Error | undefined;
  constructor(message: string, statusCode: HttpStatus, cause: Error | undefined) {
    super(message);
    this.statusCode = statusCode;
    this.cause = cause;
  }
}

export enum HttpStatus {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  CONFLICT = 'CONFLICT',
  PRECONDITION_FAILED= 'PRECONDICTION_FAILED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',
  METHOD_NOT_SUPPORTED = 'METHOD_NOT_SUPPORTED',
  UNPROCESSABLE_CONTENT = 'UNPROCESSABLE_CONTENT',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS ',
  CLIENT_CLOSED_REQUEST = 'CLIENT_CLOSED_REQUEST ',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR ',
}

