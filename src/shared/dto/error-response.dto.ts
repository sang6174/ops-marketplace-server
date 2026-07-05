export class ErrorProductionResponse {
  public requestId?: string;

  constructor(
    public statusCode: number,
    public code: string,
    public path: string,
    public message: string,
    public timestamp: string,
  ) {}

  toJSON() {
    return {
      success: false,
      statusCode: this.statusCode,
      code: this.code,
      path: this.path,
      message: this.message,
      timestamp: this.timestamp,
      ...(this.requestId && { requestId: this.requestId }),
    };
  }
}

export class ErrorDevelopmentResponse extends ErrorProductionResponse {
  constructor(
    public statusCode: number,
    public code: string,
    public path: string,
    public message: string,
    public timestamp: string,
    public context?: Record<string, unknown>,
    public cause?: Error,
  ) {
    super(statusCode, code, path, message, timestamp);
  }

  toJSON() {
    return {
      success: false,
      statusCode: this.statusCode,
      code: this.code,
      path: this.path,
      message: this.message,
      timestamp: this.timestamp,
      ...(this.requestId && { requestId: this.requestId }),
      ...(this.context && { context: this.context }),
      ...(this.cause && { cause: this.cause }),
    };
  }
}
