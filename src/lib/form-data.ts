export function formDataToObject(
  formData: FormData,
): Record<string, FormDataEntryValue> {
  const object: Record<string, FormDataEntryValue> = {};

  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$ACTION_")) {
      continue;
    }

    object[key] = value;
  }

  return object;
}

export function getFormDataString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

export function getFormDataStringArray(
  formData: FormData,
  key: string,
): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}

export function getOptionalFormDataString(
  formData: FormData,
  key: string,
): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}
