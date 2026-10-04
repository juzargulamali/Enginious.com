import type { ContentType, Field } from "@/lib/cms/schema";

export interface MediaOption { id: string; alt: string; kind: string; status: string; visibility: string; thumb: string | null; title: string }
export interface RefOption { slug: string; title: string; status: string }
export type RefMap = Partial<Record<ContentType, RefOption[]>>;
export type Errors = Record<string, string>;

export interface FieldProps {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  /** Errors for nested keys, keyed by full path (for records). */
  errors: Errors;
  path: string;
  media: MediaOption[];
  refs: RefMap;
}
