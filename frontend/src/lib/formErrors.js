/** Range les erreurs [{field,message}] par champ ; celles sans champ connu vont dans _form. */
export function groupErrors(errors, knownFields, fallback = '') {
  const out = {};
  let general = fallback;
  for (const { field, message } of errors) {
    if (knownFields.includes(field)) out[field] = message;
    else general = general ? `${general} ${message}` : message;
  }
  if (general) out._form = general;
  return out;
}
