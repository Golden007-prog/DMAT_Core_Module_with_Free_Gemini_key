/** Gemini's `responseSchema` is an OpenAPI subset, not JSON Schema: `type` is a
 *  proto enum and ANY key the `Schema` proto does not declare is a hard 400 at
 *  the transcoding layer, before the key is even checked
 *  (`Unknown name "additionalProperties" … Cannot find field`). So prompts stay
 *  authored as readable lowercase JSON Schema and this is the single place that
 *  speaks Gemini's dialect. Verified against the v1beta discovery doc
 *  (revision 20260709) on 2026-07-11. */

/** Every field v1beta `Schema` declares. Anything else is dropped, not passed. */
const SCHEMA_FIELDS = new Set([
  'type',
  'format',
  'title',
  'description',
  'nullable',
  'default',
  'enum',
  'example',
  'items',
  'minItems',
  'maxItems',
  'properties',
  'required',
  'propertyOrdering',
  'minProperties',
  'maxProperties',
  'minLength',
  'maxLength',
  'pattern',
  'minimum',
  'maximum',
  'anyOf',
]);

type JsonObject = Record<string, unknown>;

const isObject = (v: unknown): v is JsonObject =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The transcoder's enum parsing happens to be case-insensitive, but the declared
 *  enum is uppercase — emit the canonical form so a future strict parser cannot
 *  break every AI feature at once. A `['string','null']` union collapses to the
 *  concrete type plus `nullable`, which is how the proto expresses the same idea. */
function normalizeType(value: unknown): { type?: string; nullable: boolean } {
  const names = (Array.isArray(value) ? value : [value])
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.toUpperCase());
  if (names.length === 0) return { nullable: false };
  const concrete = names.filter((n) => n !== 'NULL');
  return {
    type: concrete[0] ?? names[0],
    nullable: concrete.length > 0 && names.length > concrete.length,
  };
}

function normalize(node: JsonObject): JsonObject {
  const out: JsonObject = {};
  for (const [key, value] of Object.entries(node)) {
    if (!SCHEMA_FIELDS.has(key)) continue;
    switch (key) {
      case 'type': {
        const { type, nullable } = normalizeType(value);
        if (type !== undefined) out.type = type;
        if (nullable) out.nullable = true;
        break;
      }
      case 'nullable':
        // only ever widen: a union type may already have set this true
        if (value === true) out.nullable = true;
        break;
      case 'items':
        if (isObject(value)) out.items = normalize(value);
        break;
      case 'properties':
        if (isObject(value)) {
          const props: JsonObject = {};
          for (const [name, sub] of Object.entries(value)) {
            if (isObject(sub)) props[name] = normalize(sub);
          }
          out.properties = props;
        }
        break;
      case 'anyOf':
        if (Array.isArray(value)) out.anyOf = value.filter(isObject).map(normalize);
        break;
      default:
        out[key] = value;
    }
  }
  return out;
}

/** Normalise an authored JSON Schema into what v1beta `responseSchema` accepts.
 *  Root arrays are fine — the discovery doc allows objects, primitives and arrays
 *  — so nothing is wrapped and callers get back exactly the shape they asked for. */
export function toGeminiSchema(schema: object): object {
  return isObject(schema) ? normalize(schema) : {};
}
