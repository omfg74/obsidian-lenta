export type FeedItem = {
  id: string;
  name: string;
  mime: string;
  created: string;
  owner?: string;
};

export type LentaSettings = {
  base: string;
  user: string;
  password: string;
  inserted: string[];
};

export type Edit = {
  fromLine: number;
  fromCh: number;
  toLine: number;
  toCh: number;
  text: string;
  cursorLine: number;
  cursorCh: number;
};

const viewableMime = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

export function freshSettings(): LentaSettings {
  return { base: "", user: "", password: "", inserted: [] };
}

export function settingsFrom(saved: unknown): LentaSettings {
  if (saved == null) return freshSettings();
  if (!isRecord(saved)) throw new Error("настройки ленты повреждены");
  return {
    base: optionalString(saved, "base"),
    user: optionalString(saved, "user"),
    password: optionalString(saved, "password"),
    inserted: insertedFrom(saved),
  };
}

export function configured(settings: LentaSettings): boolean {
  return settings.base.trim() !== "" && settings.user !== "" && settings.password !== "";
}

export function viewable(mime: string): boolean {
  return viewableMime.has(mime);
}

export function itemKey(item: FeedItem): string {
  if (item.owner) return item.owner + "/" + item.id;
  return item.id;
}

export function readItems(value: unknown, shared: boolean): FeedItem[] {
  if (!Array.isArray(value)) throw new Error("лента прислала не список");
  return value.map((row) => readItem(row, shared));
}

export function photosNewest(own: FeedItem[], shared: FeedItem[]): FeedItem[] {
  return [...own, ...shared]
    .filter((item) => viewable(item.mime))
    .sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
}

export function pendingOldest(photos: FeedItem[], inserted: readonly string[]): FeedItem[] {
  const done = new Set(inserted);
  return photos
    .filter((item) => !done.has(itemKey(item)))
    .sort((a, b) => Date.parse(a.created) - Date.parse(b.created));
}

export function arrivalText(count: number): string {
  if (count < 1) throw new Error("нет новых фото");
  if (count === 1) return "в ленте новое фото";
  return "в ленте " + count + " новых фото";
}

export function endpoint(base: string, path: string): string {
  const trimmed = base.trim().replace(/\/+$/, "");
  if (trimmed === "") throw new Error("укажи адрес ленты");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch (err) {
    throw new Error("адрес ленты не разбирается: " + errorText(err));
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("адрес ленты должен быть http или https");
  }
  if (url.username !== "" || url.password !== "") {
    throw new Error("логин и пароль пиши в полях, не в адресе");
  }
  if (!path.startsWith("/")) throw new Error("путь ленты битый");
  return trimmed + path;
}

export function basicHeader(user: string, password: string): string {
  if (user === "" || password === "") throw new Error("укажи логин и пароль");
  const bytes = new TextEncoder().encode(user + ":" + password);
  return "Basic " + btoa(binary(bytes));
}

export function attachmentName(name: string): string {
  const slash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
  const base = slash >= 0 ? name.slice(slash + 1) : name;
  if (base === "" || base === "." || base === "..") throw new Error("у фото нет имени");
  return base;
}

export function embedOf(link: string): string {
  if (link === "") throw new Error("пустая ссылка на фото");
  if (link.startsWith("!")) return link;
  return "!" + link;
}

export function insertion(line: string, lineNo: number, embeds: string[]): Edit {
  if (embeds.length === 0) throw new Error("нет фото для вставки");
  for (const embed of embeds) {
    if (embed === "") throw new Error("пустая ссылка на фото");
  }
  const block = embeds.join("\n") + "\n";
  if (line.trim() === "") {
    return {
      fromLine: lineNo,
      fromCh: 0,
      toLine: lineNo,
      toCh: line.length,
      text: block,
      cursorLine: lineNo + embeds.length,
      cursorCh: 0,
    };
  }
  return {
    fromLine: lineNo,
    fromCh: line.length,
    toLine: lineNo,
    toCh: line.length,
    text: "\n" + block,
    cursorLine: lineNo + embeds.length + 1,
    cursorCh: 0,
  };
}

export function whenLabel(created: string): string {
  const date = new Date(created);
  if (Number.isNaN(date.getTime())) throw new Error("лента прислала битое время");
  return date.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function accountName(value: unknown): string {
  if (!isRecord(value)) throw new Error("лента прислала битый ответ");
  const name = value.name;
  if (typeof name !== "string" || name === "") throw new Error("лента прислала битый ответ");
  return name;
}

export function errorText(err: unknown): string {
  if (err instanceof Error) {
    if (err.message === "") return "ошибка без текста";
    return err.message;
  }
  if (typeof err === "string" && err !== "") return err;
  return "ошибка без текста";
}

export function httpError(status: number, text: string): Error {
  const detail = text.trim().slice(0, 200);
  if (detail === "") return new Error("лента ответила " + status);
  return new Error("лента ответила " + status + ": " + detail);
}

export function dataUrl(mime: string, bytes: ArrayBuffer): string {
  if (bytes.byteLength === 0) throw new Error("лента отдала пустое фото");
  return "data:" + mime + ";base64," + btoa(binary(new Uint8Array(bytes)));
}

function readItem(value: unknown, shared: boolean): FeedItem {
  if (!isRecord(value)) throw new Error("лента прислала битую запись");
  const id = requiredString(value, "id");
  const name = requiredString(value, "name");
  const mime = requiredString(value, "mime");
  const created = requiredString(value, "created");
  if (id === "" || name === "") throw new Error("лента прислала битую запись");
  if (Number.isNaN(Date.parse(created))) throw new Error("лента прислала битое время");
  const item: FeedItem = { id, name, mime, created };
  if (!shared) return item;
  const owner = requiredString(value, "owner");
  if (owner === "") throw new Error("лента прислала битую запись");
  item.owner = owner;
  return item;
}

function requiredString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error("лента прислала битую запись");
  return value;
}

function optionalString(row: Record<string, unknown>, key: string): string {
  if (!hasOwn(row, key)) return "";
  const value = row[key];
  if (typeof value !== "string") throw new Error("настройки ленты повреждены");
  return value;
}

function insertedFrom(row: Record<string, unknown>): string[] {
  if (!hasOwn(row, "inserted")) return [];
  if (!Array.isArray(row.inserted)) throw new Error("пометки вставки повреждены");
  const ids: string[] = [];
  for (const id of row.inserted) {
    if (typeof id !== "string") throw new Error("пометки вставки повреждены");
    ids.push(id);
  }
  return ids;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(row: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(row, key);
}

function binary(bytes: Uint8Array): string {
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}
