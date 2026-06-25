export const FIELD_TYPES = [
  'text',
  'email',
  'phone',
  'number',
  'textarea',
  'date',
  'url',
  'select',
  'radio',
  'checkbox',
  'multiselect',
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export interface FieldCondition {
  fieldId: string;
  op: 'eq' | 'neq' | 'in' | 'notEmpty';
  value?: unknown;
}

export interface FormFieldSchema {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  pattern?: string;
  min?: number;
  max?: number;
  minSelected?: number;
  maxSelected?: number;
  options?: { value: string; label: string }[];
  showIf?: FieldCondition;
}

export interface FormSectionSchema {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldSchema[];
  showIf?: FieldCondition;
}

export interface FormSchema {
  sections: FormSectionSchema[];
}

export function isPatternSafe(pattern: string | undefined): boolean {
  if (!pattern || pattern.length > 200) return false;
  if (/\([^)]*[+*][^)]*\)\s*[+*]/.test(pattern)) return false;
  if (/\(\.[+*]\)\s*[+*]/.test(pattern)) return false;
  return true;
}

export function assertFormSchema(raw: unknown): FormSchema {
  if (!raw || typeof raw !== 'object') throw new Error('Schema debe ser un objeto');
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.sections) || obj.sections.length === 0)
    throw new Error('Schema debe tener al menos una sección');
  const sections = obj.sections.map((s, si) => assertSection(s, si));
  return { sections };
}

function assertSection(raw: unknown, index: number): FormSectionSchema {
  if (!raw || typeof raw !== 'object') throw new Error(`Sección ${index}: debe ser un objeto`);
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== 'string' || !s.id.trim()) throw new Error(`Sección ${index}: id requerido`);
  if (typeof s.title !== 'string' || !s.title.trim()) throw new Error(`Sección ${index}: título requerido`);
  if (!Array.isArray(s.fields)) throw new Error(`Sección ${index}: fields debe ser un array`);
  const fields = s.fields.map((f, fi) => assertField(f, index, fi));
  return {
    id: s.id,
    title: s.title,
    description: typeof s.description === 'string' ? s.description : undefined,
    fields,
    showIf: s.showIf ? assertCondition(s.showIf) : undefined,
  };
}

function assertField(raw: unknown, si: number, fi: number): FormFieldSchema {
  if (!raw || typeof raw !== 'object') throw new Error(`Campo ${si}.${fi}: debe ser un objeto`);
  const f = raw as Record<string, unknown>;
  if (typeof f.id !== 'string' || !f.id.trim()) throw new Error(`Campo ${si}.${fi}: id requerido`);
  if (typeof f.type !== 'string' || !(FIELD_TYPES as readonly string[]).includes(f.type))
    throw new Error(`Campo ${si}.${fi}: tipo inválido`);
  if (typeof f.label !== 'string' || !f.label.trim()) throw new Error(`Campo ${si}.${fi}: label requerido`);
  const type = f.type as FieldType;
  const needsOptions = type === 'select' || type === 'radio' || type === 'multiselect';
  let options: { value: string; label: string }[] | undefined;
  if (needsOptions) {
    if (!Array.isArray(f.options) || f.options.length === 0)
      throw new Error(`Campo ${si}.${fi}: requiere opciones`);
    options = f.options.map((o) => {
      const oo = o as Record<string, unknown>;
      if (typeof oo.value !== 'string' || typeof oo.label !== 'string')
        throw new Error(`Campo ${si}.${fi}: opciones mal formadas`);
      return { value: oo.value, label: oo.label };
    });
  }
  return {
    id: f.id,
    type,
    label: f.label,
    required: Boolean(f.required),
    placeholder: typeof f.placeholder === 'string' ? f.placeholder : undefined,
    pattern: typeof f.pattern === 'string' ? f.pattern : undefined,
    min: typeof f.min === 'number' ? f.min : undefined,
    max: typeof f.max === 'number' ? f.max : undefined,
    minSelected: typeof f.minSelected === 'number' ? f.minSelected : undefined,
    maxSelected: typeof f.maxSelected === 'number' ? f.maxSelected : undefined,
    options,
    showIf: f.showIf ? assertCondition(f.showIf) : undefined,
  };
}

function assertCondition(raw: unknown): FieldCondition {
  if (!raw || typeof raw !== 'object') throw new Error('Condición debe ser un objeto');
  const c = raw as Record<string, unknown>;
  if (typeof c.fieldId !== 'string') throw new Error('Condición: fieldId requerido');
  if (c.op !== 'eq' && c.op !== 'neq' && c.op !== 'in' && c.op !== 'notEmpty')
    throw new Error('Condición: operador inválido');
  return { fieldId: c.fieldId, op: c.op, value: c.value };
}

export function evaluateCondition(
  cond: FieldCondition | undefined,
  values: Record<string, unknown>,
): boolean {
  if (!cond) return true;
  const v = values[cond.fieldId];
  switch (cond.op) {
    case 'eq':
      return v === cond.value;
    case 'neq':
      return v !== cond.value;
    case 'in':
      return Array.isArray(cond.value) && (cond.value as unknown[]).includes(v);
    case 'notEmpty':
      return v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0);
  }
}

export function validateFormData(
  schema: FormSchema,
  values: Record<string, unknown>,
): { fieldId: string; message: string }[] {
  const errors: { fieldId: string; message: string }[] = [];
  for (const section of schema.sections) {
    if (!evaluateCondition(section.showIf, values)) continue;
    for (const field of section.fields) {
      if (!evaluateCondition(field.showIf, values)) continue;
      const raw = values[field.id];
      const isEmpty =
        raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);
      if (field.required && isEmpty) {
        errors.push({ fieldId: field.id, message: 'Campo requerido' });
        continue;
      }
      if (isEmpty) continue;
      switch (field.type) {
        case 'email':
          if (typeof raw !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw))
            errors.push({ fieldId: field.id, message: 'Email inválido' });
          break;
        case 'url':
          if (typeof raw !== 'string' || !/^https?:\/\//.test(raw))
            errors.push({ fieldId: field.id, message: 'URL inválida' });
          break;
        case 'number': {
          const n = typeof raw === 'number' ? raw : Number(raw);
          if (isNaN(n)) {
            errors.push({ fieldId: field.id, message: 'Número inválido' });
          } else {
            if (field.min != null && n < field.min)
              errors.push({ fieldId: field.id, message: `Mínimo ${field.min}` });
            if (field.max != null && n > field.max)
              errors.push({ fieldId: field.id, message: `Máximo ${field.max}` });
          }
          break;
        }
        case 'text':
        case 'textarea':
        case 'phone':
          if (typeof raw !== 'string') {
            errors.push({ fieldId: field.id, message: 'Texto inválido' });
          } else if (field.pattern && isPatternSafe(field.pattern)) {
            const trimmed = raw.length > 2000 ? raw.slice(0, 2000) : raw;
            try {
              if (!new RegExp(field.pattern).test(trimmed))
                errors.push({ fieldId: field.id, message: 'Formato inválido' });
            } catch {}
          }
          break;
        case 'date':
          if (typeof raw !== 'string' || isNaN(Date.parse(raw)))
            errors.push({ fieldId: field.id, message: 'Fecha inválida' });
          break;
        case 'select':
        case 'radio':
          if (!field.options?.some((o) => o.value === raw))
            errors.push({ fieldId: field.id, message: 'Opción inválida' });
          break;
        case 'multiselect':
          if (!Array.isArray(raw)) {
            errors.push({ fieldId: field.id, message: 'Debe ser una lista' });
          } else {
            const valid = new Set((field.options ?? []).map((o) => o.value));
            if (!raw.every((v) => valid.has(String(v))))
              errors.push({ fieldId: field.id, message: 'Opción inválida' });
            if (field.minSelected != null && raw.length < field.minSelected)
              errors.push({ fieldId: field.id, message: `Elegí al menos ${field.minSelected}` });
            if (field.maxSelected != null && raw.length > field.maxSelected)
              errors.push({ fieldId: field.id, message: `Elegí como máximo ${field.maxSelected}` });
          }
          break;
        case 'checkbox':
          if (typeof raw !== 'boolean')
            errors.push({ fieldId: field.id, message: 'Debe ser true/false' });
          break;
      }
    }
  }
  return errors;
}
