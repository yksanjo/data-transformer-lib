// Data Transformer Types

export type TransformType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';

export interface FieldMapping {
  source: string;
  target: string;
  transform?: TransformFunction;
  default?: unknown;
}

export interface TransformFunction {
  type: 'uppercase' | 'lowercase' | 'trim' | 'parseInt' | 'parseFloat' | 'toBoolean' | 'toDate' | 'custom';
  params?: Record<string, unknown>;
  fn?: (value: unknown) => unknown;
}

export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: TransformType;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean;
}

export interface TransformOptions {
  skipInvalid?: boolean;
  partial?: boolean;
}

export interface TransformResult<T = unknown> {
  success: boolean;
  data?: T;
  errors: TransformError[];
}

export interface TransformError {
  field: string;
  message: string;
  value?: unknown;
}

export interface Schema {
  fields: Record<string, FieldDefinition>;
}

export interface FieldDefinition {
  type: TransformType;
  required?: boolean;
  default?: unknown;
  validation?: ValidationRule[];
}

export interface Logger {
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
  debug: (message: string, meta?: Record<string, unknown>) => void;
}
