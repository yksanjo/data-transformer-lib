// Data Transformer - Pure data transformation library

import {
  FieldMapping,
  TransformOptions,
  TransformResult,
  TransformError,
  ValidationRule,
  TransformFunction,
  Logger
} from './types';

export class DataTransformer {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Transform data using field mappings
   */
  transform<T = Record<string, unknown>>(
    data: unknown,
    mappings: FieldMapping[],
    options?: TransformOptions
  ): TransformResult<T> {
    const errors: TransformError[] = [];
    
    if (typeof data !== 'object' || data === null) {
      return { success: false, errors: [{ field: 'root', message: 'Invalid data type' }] };
    }

    const source = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const mapping of mappings) {
      const value = this.getNestedValue(source, mapping.source);
      
      if (value === undefined || value === null) {
        if (mapping.default !== undefined) {
          result[mapping.target] = mapping.default;
        } else if (options?.skipInvalid) {
          continue;
        } else {
          errors.push({ field: mapping.source, message: 'Value is required', value });
        }
        continue;
      }

      try {
        const transformed = mapping.transform 
          ? this.applyTransform(value, mapping.transform)
          : value;
        result[mapping.target] = transformed;
      } catch (error) {
        errors.push({ 
          field: mapping.source, 
          message: (error as Error).message, 
          value 
        });
      }
    }

    const success = options?.skipInvalid ? errors.length === 0 : errors.length === 0;
    
    return { success, data: result as T, errors };
  }

  /**
   * Validate data against rules
   */
  validate(data: unknown, rules: ValidationRule[]): TransformResult {
    const errors: TransformError[] = [];
    
    if (typeof data !== 'object' || data === null) {
      return { success: false, errors: [{ field: 'root', message: 'Invalid data type' }] };
    }

    const record = data as Record<string, unknown>;

    for (const rule of rules) {
      const value = this.getNestedValue(record, rule.field);

      if (value === undefined || value === null) {
        if (rule.required) {
          errors.push({ field: rule.field, message: 'Field is required' });
        }
        continue;
      }

      // Type validation
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push({ field: rule.field, message: `Expected ${rule.type}, got ${actualType}`, value });
        }
      }

      // Min/Max for numbers
      if (rule.type === 'number' && typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push({ field: rule.field, message: `Value must be at least ${rule.min}`, value });
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push({ field: rule.field, message: `Value must be at most ${rule.max}`, value });
        }
      }

      // Pattern for strings
      if (rule.pattern && typeof value === 'string') {
        if (!rule.pattern.test(value)) {
          errors.push({ field: rule.field, message: 'Value does not match required pattern', value });
        }
      }

      // Custom validation
      if (rule.custom && !rule.custom(value)) {
        errors.push({ field: rule.field, message: 'Custom validation failed', value });
      }
    }

    return { success: errors.length === 0, errors };
  }

  /**
   * Flatten nested object
   */
  flatten(data: unknown, prefix = ''): Record<string, unknown> {
    if (typeof data !== 'object' || data === null) {
      return { [prefix || 'value']: data };
    }

    const result: Record<string, unknown> = {};

    if (Array.isArray(data)) {
      data.forEach((item, index) => {
        const key = prefix ? `${prefix}[${index}]` : `[${index}]`;
        Object.assign(result, this.flatten(item, key));
      });
    } else {
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        Object.assign(result, this.flatten(value, newKey));
      }
    }

    return result;
  }

  /**
   * Unflatten object
   */
  unflatten(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      this.setNestedValue(result, key, value);
    }

    return result;
  }

  /**
   * Merge multiple objects
   */
  merge(...objects: unknown[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const obj of objects) {
      if (typeof obj !== 'object' || obj === null) continue;
      
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (typeof value === 'object' && !Array.isArray(value)) {
          result[key] = this.merge(result[key] as Record<string, unknown>, value);
        } else {
          result[key] = value;
        }
      }
    }

    return result;
  }

  // Private helpers

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  private applyTransform(value: unknown, transform: TransformFunction): unknown {
    switch (transform.type) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'parseInt':
        return parseInt(String(value), 10);
      case 'parseFloat':
        return parseFloat(String(value));
      case 'toBoolean':
        return Boolean(value);
      case 'toDate':
        return new Date(String(value)).toISOString();
      case 'custom':
        return transform.fn ? transform.fn(value) : value;
      default:
        return value;
    }
  }
}
