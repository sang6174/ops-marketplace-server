export { BaseException, ExceptionSeverity } from './base.exception';
export {
  ClientException,
  ValidationException,
  InvalidCredentialsException,
  TokenExpiredException,
  RateLimitExceededException,
} from './client.exception';
export {
  ServerException,
  ConfigurationException,
  SerializationException,
} from './server.exception';
export {
  DomainException,
  InsufficientStockException,
  InvalidOrderStatusException,
  CartEmptyException,
  ProductNotAvailableException,
  DuplicateEmailException,
} from './domain.exception';
export {
  DatabaseException,
  RecordNotFoundException,
  DuplicateRecordException,
  DatabaseConnectionException,
} from './database.exception';
export {
  ExternalServiceException,
  StripeException,
  EmailServiceException,
} from './external-service.exception';
