import assert from "node:assert/strict";
import test from "node:test";
import {
  accountName,
  arrivalText,
  attachmentName,
  basicHeader,
  embedOf,
  endpoint,
  httpError,
  insertion,
  itemKey,
  pendingOldest,
  photosNewest,
  readItems,
  settingsFrom,
  type FeedItem,
} from "./feed.ts";

const older: FeedItem = { id: "a", name: "a.jpg", mime: "image/jpeg", created: "2026-11-01T10:00:00Z" };
const newer: FeedItem = { id: "b", name: "b.png", mime: "image/png", created: "2026-11-01T10:05:00Z" };
const shared: FeedItem = { id: "a", name: "c.webp", mime: "image/webp", created: "2026-11-01T10:03:00Z", owner: "ann" };

test("список ленты разбирается", () => {
  const items = readItems([older], false);
  assert.equal(items[0]?.id, "a");
  assert.equal(items[0]?.owner, undefined);
});

test("чужой снимок требует владельца", () => {
  const items = readItems([{ ...shared }], true);
  assert.equal(itemKey(items[0]!), "ann/a");
  assert.throws(() => readItems([older], true), /битую запись/);
});

test("битый список и битое время не проходят", () => {
  assert.throws(() => readItems({}, false), /не список/);
  assert.throws(() => readItems([{ ...older, created: "вчера" }], false), /битое время/);
});

test("в сетке только картинки, новые сверху", () => {
  const note: FeedItem = { id: "t", name: "t.txt", mime: "text/plain", created: "2026-11-01T12:00:00Z" };
  const heic: FeedItem = { id: "h", name: "h.heic", mime: "image/heic", created: "2026-11-01T11:00:00Z" };
  const photos = photosNewest([older, note, newer], [shared, heic]);
  assert.deepEqual(photos.map(itemKey), ["b", "ann/a", "a"]);
});

test("новые вставляются от старых к новым и пропускают уже вставленные", () => {
  const photos = photosNewest([older, newer], [shared]);
  const pending = pendingOldest(photos, ["ann/a"]);
  assert.deepEqual(pending.map(itemKey), ["a", "b"]);
});

test("пустая строка заменяется кадрами, текст остаётся над ними", () => {
  const empty = insertion("  ", 4, ["![[a.jpg]]", "![[b.jpg]]"]);
  assert.equal(empty.text, "![[a.jpg]]\n![[b.jpg]]\n");
  assert.equal(empty.fromCh, 0);
  assert.equal(empty.toCh, 2);
  assert.deepEqual([empty.cursorLine, empty.cursorCh], [6, 0]);

  const text = insertion("абзац", 2, ["![[a.jpg]]"]);
  assert.equal(text.text, "\n![[a.jpg]]\n");
  assert.equal(text.fromCh, 5);
  assert.deepEqual([text.cursorLine, text.cursorCh], [4, 0]);
});

test("ссылка становится вложением", () => {
  assert.equal(embedOf("[[a.jpg]]"), "![[a.jpg]]");
  assert.equal(embedOf("![a](a.jpg)"), "![a](a.jpg)");
  assert.throws(() => insertion("x", 0, []), /нет фото/);
});

test("адрес и basic", () => {
  assert.equal(endpoint("https://box.example/ ", "/api/items"), "https://box.example/api/items");
  assert.throws(() => endpoint("ftp://box.example", "/api/items"), /http или https/);
  assert.throws(() => endpoint("https://ann:secret@box.example", "/api/items"), /не в адресе/);
  const header = basicHeader("ann", "пароль12");
  const raw = Uint8Array.from(atob(header.slice("Basic ".length)), (char) => char.charCodeAt(0));
  assert.equal(new TextDecoder().decode(raw), "ann:пароль12");
});

test("имя файла без каталога", () => {
  assert.equal(attachmentName("папка/кадр.jpg"), "кадр.jpg");
  assert.throws(() => attachmentName(".."), /нет имени/);
});

test("настройки", () => {
  assert.deepEqual(settingsFrom(null), { base: "", user: "", password: "", inserted: [] });
  assert.deepEqual(settingsFrom({ base: "https://box", user: "ann" }).inserted, []);
  assert.throws(() => settingsFrom({ inserted: [1] }), /пометки вставки повреждены/);
  assert.throws(() => settingsFrom({ password: null }), /настройки ленты повреждены/);
  assert.equal(accountName({ name: "ann", admin: false }), "ann");
  assert.throws(() => accountName({}), /битый ответ/);
});

test("текст прибытия и ошибки HTTP", () => {
  assert.equal(arrivalText(1), "в ленте новое фото");
  assert.equal(arrivalText(3), "в ленте 3 новых фото");
  assert.equal(httpError(401, " нужен вход ").message, "лента ответила 401: нужен вход");
  assert.equal(httpError(500, "  ").message, "лента ответила 500");
});
