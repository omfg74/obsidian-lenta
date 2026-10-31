"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => LentaPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/feed.ts
var viewableMime = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
function freshSettings() {
  return { base: "", user: "", password: "", inserted: [] };
}
function settingsFrom(saved) {
  if (saved == null) return freshSettings();
  if (!isRecord(saved)) throw new Error("\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043B\u0435\u043D\u0442\u044B \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B");
  return {
    base: optionalString(saved, "base"),
    user: optionalString(saved, "user"),
    password: optionalString(saved, "password"),
    inserted: insertedFrom(saved)
  };
}
function configured(settings) {
  return settings.base.trim() !== "" && settings.user !== "" && settings.password !== "";
}
function viewable(mime) {
  return viewableMime.has(mime);
}
function itemKey(item) {
  if (item.owner) return item.owner + "/" + item.id;
  return item.id;
}
function readItems(value, shared) {
  if (!Array.isArray(value)) throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u043D\u0435 \u0441\u043F\u0438\u0441\u043E\u043A");
  return value.map((row) => readItem(row, shared));
}
function photosNewest(own, shared) {
  return [...own, ...shared].filter((item) => viewable(item.mime)).sort((a, b) => Date.parse(b.created) - Date.parse(a.created));
}
function pendingOldest(photos, inserted) {
  const done = new Set(inserted);
  return photos.filter((item) => !done.has(itemKey(item))).sort((a, b) => Date.parse(a.created) - Date.parse(b.created));
}
function arrivalText(count) {
  if (count < 1) throw new Error("\u043D\u0435\u0442 \u043D\u043E\u0432\u044B\u0445 \u0444\u043E\u0442\u043E");
  if (count === 1) return "\u0432 \u043B\u0435\u043D\u0442\u0435 \u043D\u043E\u0432\u043E\u0435 \u0444\u043E\u0442\u043E";
  return "\u0432 \u043B\u0435\u043D\u0442\u0435 " + count + " \u043D\u043E\u0432\u044B\u0445 \u0444\u043E\u0442\u043E";
}
function endpoint(base, path) {
  const trimmed = base.trim().replace(/\/+$/, "");
  if (trimmed === "") throw new Error("\u0443\u043A\u0430\u0436\u0438 \u0430\u0434\u0440\u0435\u0441 \u043B\u0435\u043D\u0442\u044B");
  let url;
  try {
    url = new URL(trimmed);
  } catch (err) {
    throw new Error("\u0430\u0434\u0440\u0435\u0441 \u043B\u0435\u043D\u0442\u044B \u043D\u0435 \u0440\u0430\u0437\u0431\u0438\u0440\u0430\u0435\u0442\u0441\u044F: " + errorText(err));
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("\u0430\u0434\u0440\u0435\u0441 \u043B\u0435\u043D\u0442\u044B \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C http \u0438\u043B\u0438 https");
  }
  if (url.username !== "" || url.password !== "") {
    throw new Error("\u043B\u043E\u0433\u0438\u043D \u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u043F\u0438\u0448\u0438 \u0432 \u043F\u043E\u043B\u044F\u0445, \u043D\u0435 \u0432 \u0430\u0434\u0440\u0435\u0441\u0435");
  }
  if (!path.startsWith("/")) throw new Error("\u043F\u0443\u0442\u044C \u043B\u0435\u043D\u0442\u044B \u0431\u0438\u0442\u044B\u0439");
  return trimmed + path;
}
function basicHeader(user, password) {
  if (user === "" || password === "") throw new Error("\u0443\u043A\u0430\u0436\u0438 \u043B\u043E\u0433\u0438\u043D \u0438 \u043F\u0430\u0440\u043E\u043B\u044C");
  const bytes = new TextEncoder().encode(user + ":" + password);
  return "Basic " + btoa(binary(bytes));
}
function attachmentName(name) {
  const slash = Math.max(name.lastIndexOf("/"), name.lastIndexOf("\\"));
  const base = slash >= 0 ? name.slice(slash + 1) : name;
  if (base === "" || base === "." || base === "..") throw new Error("\u0443 \u0444\u043E\u0442\u043E \u043D\u0435\u0442 \u0438\u043C\u0435\u043D\u0438");
  return base;
}
function embedOf(link) {
  if (link === "") throw new Error("\u043F\u0443\u0441\u0442\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0444\u043E\u0442\u043E");
  if (link.startsWith("!")) return link;
  return "!" + link;
}
function insertion(line, lineNo, embeds) {
  if (embeds.length === 0) throw new Error("\u043D\u0435\u0442 \u0444\u043E\u0442\u043E \u0434\u043B\u044F \u0432\u0441\u0442\u0430\u0432\u043A\u0438");
  for (const embed of embeds) {
    if (embed === "") throw new Error("\u043F\u0443\u0441\u0442\u0430\u044F \u0441\u0441\u044B\u043B\u043A\u0430 \u043D\u0430 \u0444\u043E\u0442\u043E");
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
      cursorCh: 0
    };
  }
  return {
    fromLine: lineNo,
    fromCh: line.length,
    toLine: lineNo,
    toCh: line.length,
    text: "\n" + block,
    cursorLine: lineNo + embeds.length + 1,
    cursorCh: 0
  };
}
function whenLabel(created) {
  const date = new Date(created);
  if (Number.isNaN(date.getTime())) throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0431\u0438\u0442\u043E\u0435 \u0432\u0440\u0435\u043C\u044F");
  return date.toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}
function accountName(value) {
  if (!isRecord(value)) throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0431\u0438\u0442\u044B\u0439 \u043E\u0442\u0432\u0435\u0442");
  const name = value.name;
  if (typeof name !== "string" || name === "") throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0431\u0438\u0442\u044B\u0439 \u043E\u0442\u0432\u0435\u0442");
  return name;
}
function errorText(err) {
  if (err instanceof Error) {
    if (err.message === "") return "\u043E\u0448\u0438\u0431\u043A\u0430 \u0431\u0435\u0437 \u0442\u0435\u043A\u0441\u0442\u0430";
    return err.message;
  }
  if (typeof err === "string" && err !== "") return err;
  return "\u043E\u0448\u0438\u0431\u043A\u0430 \u0431\u0435\u0437 \u0442\u0435\u043A\u0441\u0442\u0430";
}
function httpError(status, text) {
  const detail = text.trim().slice(0, 200);
  if (detail === "") return new Error("\u043B\u0435\u043D\u0442\u0430 \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 " + status);
  return new Error("\u043B\u0435\u043D\u0442\u0430 \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430 " + status + ": " + detail);
}
function dataUrl(mime, bytes) {
  if (bytes.byteLength === 0) throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043E\u0442\u0434\u0430\u043B\u0430 \u043F\u0443\u0441\u0442\u043E\u0435 \u0444\u043E\u0442\u043E");
  return "data:" + mime + ";base64," + btoa(binary(new Uint8Array(bytes)));
}
function readItem(value, shared) {
  if (!isRecord(value)) throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0431\u0438\u0442\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C");
  const id = requiredString(value, "id");
  const name = requiredString(value, "name");
  const mime = requiredString(value, "mime");
  const created = requiredString(value, "created");
  if (id === "" || name === "") throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0431\u0438\u0442\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C");
  if (Number.isNaN(Date.parse(created))) throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0431\u0438\u0442\u043E\u0435 \u0432\u0440\u0435\u043C\u044F");
  const item = { id, name, mime, created };
  if (!shared) return item;
  const owner = requiredString(value, "owner");
  if (owner === "") throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0431\u0438\u0442\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C");
  item.owner = owner;
  return item;
}
function requiredString(row, key) {
  const value = row[key];
  if (typeof value !== "string") throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043F\u0440\u0438\u0441\u043B\u0430\u043B\u0430 \u0431\u0438\u0442\u0443\u044E \u0437\u0430\u043F\u0438\u0441\u044C");
  return value;
}
function optionalString(row, key) {
  if (!hasOwn(row, key)) return "";
  const value = row[key];
  if (typeof value !== "string") throw new Error("\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043B\u0435\u043D\u0442\u044B \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B");
  return value;
}
function insertedFrom(row) {
  if (!hasOwn(row, "inserted")) return [];
  if (!Array.isArray(row.inserted)) throw new Error("\u043F\u043E\u043C\u0435\u0442\u043A\u0438 \u0432\u0441\u0442\u0430\u0432\u043A\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B");
  const ids = [];
  for (const id of row.inserted) {
    if (typeof id !== "string") throw new Error("\u043F\u043E\u043C\u0435\u0442\u043A\u0438 \u0432\u0441\u0442\u0430\u0432\u043A\u0438 \u043F\u043E\u0432\u0440\u0435\u0436\u0434\u0435\u043D\u044B");
    ids.push(id);
  }
  return ids;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOwn(row, key) {
  return Object.prototype.hasOwnProperty.call(row, key);
}
function binary(bytes) {
  let out = "";
  const chunk = 32768;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return out;
}

// src/picker.ts
var import_obsidian = require("obsidian");
var Picker = class extends import_obsidian.Modal {
  constructor(plugin, editor, view) {
    super(plugin.app);
    this.plugin = plugin;
    this.editor = editor;
    this.view = view;
    this.token = 0;
    this.status = null;
  }
  onOpen() {
    this.modalEl.addClass("lenta-modal");
    void this.paint();
  }
  onClose() {
    this.token += 1;
    if (this.plugin.picker === this) this.plugin.picker = null;
    this.contentEl.empty();
  }
  reload() {
    void this.paint();
  }
  async paint() {
    const token = ++this.token;
    const root = this.contentEl;
    root.empty();
    root.createEl("h2", { text: "\u041B\u0435\u043D\u0442\u0430" });
    const actions = root.createDiv({ cls: "lenta-actions" });
    const insert = actions.createEl("button", { text: "\u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043D\u043E\u0432\u044B\u0435" });
    insert.type = "button";
    insert.addEventListener("click", () => void this.insertPending());
    const close = actions.createEl("button", { text: "\u0437\u0430\u043A\u0440\u044B\u0442\u044C" });
    close.type = "button";
    close.addEventListener("click", () => this.close());
    this.status = root.createDiv({ cls: "lenta-status" });
    this.status.setText("\u0433\u0440\u0443\u0436\u0443");
    const grid = root.createDiv({ cls: "lenta-grid" });
    let photos;
    try {
      photos = await this.plugin.loadPhotos();
    } catch (err) {
      if (token !== this.token) return;
      this.status.setText(errorText(err));
      return;
    }
    if (token !== this.token) return;
    const pending = pendingOldest(photos, this.plugin.settings.inserted);
    insert.textContent = pending.length === 0 ? "\u043D\u043E\u0432\u044B\u0445 \u0444\u043E\u0442\u043E \u043D\u0435\u0442" : "\u0432\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043D\u043E\u0432\u044B\u0435 (" + pending.length + ")";
    insert.disabled = pending.length === 0;
    this.status.setText(photos.length === 0 ? "\u043F\u043E\u043A\u0430 \u043F\u0443\u0441\u0442\u043E" : "");
    await Promise.all(photos.map((item) => this.cell(grid, item, token)));
  }
  async cell(grid, item, token) {
    const button = grid.createEl("button", { cls: "lenta-cell" });
    button.type = "button";
    button.addEventListener("click", () => void this.insertOne(item));
    try {
      const bytes = await this.plugin.bytes(item);
      if (token !== this.token) return;
      const img = button.createEl("img");
      img.alt = item.name;
      img.src = dataUrl(item.mime, bytes);
    } catch (err) {
      if (token !== this.token) return;
      button.createEl("span", { text: errorText(err) });
    }
    if (token !== this.token) return;
    const when = item.owner ? "\u043E\u0442 " + item.owner + ", " + whenLabel(item.created) : whenLabel(item.created);
    button.createEl("span", { text: when });
    if (this.plugin.settings.inserted.includes(itemKey(item))) {
      button.createEl("span", { text: "\u0443\u0436\u0435 \u0432\u0441\u0442\u0430\u0432\u043B\u044F\u043B", cls: "lenta-mark" });
    }
  }
  async insertPending() {
    const ok = await this.plugin.insertPending(this.editor, this.view);
    if (ok) this.close();
    else void this.paint();
  }
  async insertOne(item) {
    var _a;
    if (this.plugin.busy) {
      (_a = this.status) == null ? void 0 : _a.setText("\u0443\u0436\u0435 \u0432\u0441\u0442\u0430\u0432\u043B\u044F\u044E");
      return;
    }
    this.plugin.busy = true;
    try {
      await this.plugin.place(this.editor, this.view, item);
      this.close();
    } catch (err) {
      if (this.status) this.status.setText(errorText(err));
    } finally {
      this.plugin.busy = false;
    }
  }
};

// src/main.ts
var pollMs = 3e3;
var LentaPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.settings = settingsFrom(null);
    this.broken = "";
    this.primed = false;
    this.pollFailed = false;
    this.busy = false;
    this.seen = /* @__PURE__ */ new Set();
    this.picker = null;
  }
  async onload() {
    try {
      this.settings = settingsFrom(await this.loadData());
    } catch (err) {
      this.broken = errorText(err);
      new import_obsidian2.Notice(this.broken);
    }
    this.addCommand({
      id: "insert-new",
      name: "\u0412\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043D\u043E\u0432\u044B\u0435",
      icon: "image-plus",
      editorCallback: (editor, view) => void this.insertPending(editor, view)
    });
    this.addCommand({
      id: "pick",
      name: "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0444\u043E\u0442\u043E",
      icon: "images",
      editorCallback: (editor, view) => this.openPicker(editor, view)
    });
    this.addRibbonIcon("image-plus", "\u041B\u0435\u043D\u0442\u0430", () => {
      const view = this.app.workspace.getActiveViewOfType(import_obsidian2.MarkdownView);
      if (!view) {
        new import_obsidian2.Notice("\u043E\u0442\u043A\u0440\u043E\u0439 \u0437\u0430\u043C\u0435\u0442\u043A\u0443");
        return;
      }
      this.openPicker(view.editor, view);
    });
    this.addSettingTab(new LentaSettingTab(this.app, this));
    this.registerInterval(window.setInterval(() => void this.poll(), pollMs));
  }
  openPicker(editor, view) {
    var _a;
    if (!this.ready()) return;
    (_a = this.picker) == null ? void 0 : _a.close();
    this.picker = new Picker(this, editor, view);
    this.picker.open();
  }
  ready() {
    if (this.broken !== "") {
      new import_obsidian2.Notice(this.broken);
      return false;
    }
    if (!configured(this.settings)) {
      new import_obsidian2.Notice("\u0443\u043A\u0430\u0436\u0438 \u0430\u0434\u0440\u0435\u0441, \u043B\u043E\u0433\u0438\u043D \u0438 \u043F\u0430\u0440\u043E\u043B\u044C \u043B\u0435\u043D\u0442\u044B \u0432 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445");
      return false;
    }
    return true;
  }
  async insertPending(editor, view) {
    if (this.busy) {
      new import_obsidian2.Notice("\u0443\u0436\u0435 \u0432\u0441\u0442\u0430\u0432\u043B\u044F\u044E");
      return false;
    }
    if (!this.ready()) return false;
    this.busy = true;
    try {
      const pending = pendingOldest(await this.loadPhotos(), this.settings.inserted);
      if (pending.length === 0) {
        new import_obsidian2.Notice("\u043D\u043E\u0432\u044B\u0445 \u0444\u043E\u0442\u043E \u043D\u0435\u0442");
        return false;
      }
      for (const item of pending) await this.place(editor, view, item);
      return true;
    } catch (err) {
      new import_obsidian2.Notice(errorText(err));
      return false;
    } finally {
      this.busy = false;
    }
  }
  async place(editor, view, item) {
    const file = view.file;
    if (!file) throw new Error("\u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438 \u0437\u0430\u043C\u0435\u0442\u043A\u0443");
    const bytes = await this.bytes(item);
    const path = await this.app.fileManager.getAvailablePathForAttachment(attachmentName(item.name), file.path);
    await ensureParent(this.app, path);
    const saved = await this.app.vault.createBinary(path, bytes);
    const link = embedOf(this.app.fileManager.generateMarkdownLink(saved, file.path));
    const cursor = editor.getCursor();
    const plan = insertion(editor.getLine(cursor.line), cursor.line, [link]);
    editor.replaceRange(plan.text, { line: plan.fromLine, ch: plan.fromCh }, { line: plan.toLine, ch: plan.toCh });
    const next = { line: plan.cursorLine, ch: plan.cursorCh };
    editor.setCursor(next);
    editor.scrollIntoView({ from: next, to: next }, true);
    editor.focus();
    await this.mark(itemKey(item));
  }
  async loadPhotos() {
    const own = await this.getJSON("/api/items");
    const shared = await this.getJSON("/api/shared");
    return photosNewest(readItems(own, false), readItems(shared, true));
  }
  async bytes(item) {
    const path = item.owner ? "/api/shared/" + encodeURIComponent(item.owner) + "/" + encodeURIComponent(item.id) : "/api/items/" + encodeURIComponent(item.id);
    const res = await (0, import_obsidian2.requestUrl)({
      url: endpoint(this.settings.base, path),
      method: "GET",
      headers: { Authorization: basicHeader(this.settings.user, this.settings.password) },
      throw: false
    });
    if (res.status !== 200) throw httpError(res.status, res.text);
    if (res.arrayBuffer.byteLength === 0) throw new Error("\u043B\u0435\u043D\u0442\u0430 \u043E\u0442\u0434\u0430\u043B\u0430 \u043F\u0443\u0441\u0442\u043E\u0435 \u0444\u043E\u0442\u043E");
    return res.arrayBuffer;
  }
  async check() {
    return accountName(await this.getJSON("/api/me"));
  }
  async mark(key) {
    if (this.settings.inserted.includes(key)) return;
    this.settings.inserted.push(key);
    await this.saveData(this.settings);
  }
  async getJSON(path) {
    const res = await (0, import_obsidian2.requestUrl)({
      url: endpoint(this.settings.base, path),
      method: "GET",
      headers: { Authorization: basicHeader(this.settings.user, this.settings.password) },
      throw: false
    });
    if (res.status !== 200) throw httpError(res.status, res.text);
    return res.json;
  }
  async poll() {
    var _a;
    if (this.broken !== "" || !configured(this.settings)) return;
    let photos;
    try {
      photos = await this.loadPhotos();
    } catch (err) {
      if (!this.pollFailed) {
        this.pollFailed = true;
        new import_obsidian2.Notice(errorText(err));
      }
      return;
    }
    this.pollFailed = false;
    if (!this.primed) {
      this.primed = true;
      this.seen = new Set(photos.map((item) => itemKey(item)));
      return;
    }
    const fresh = photos.filter((item) => !this.seen.has(itemKey(item)) && !this.settings.inserted.includes(itemKey(item)));
    for (const item of photos) this.seen.add(itemKey(item));
    if (fresh.length === 0) return;
    new import_obsidian2.Notice(arrivalText(fresh.length));
    (_a = this.picker) == null ? void 0 : _a.reload();
  }
};
var LentaSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const root = this.containerEl;
    root.empty();
    const result = root.createDiv({ cls: "lenta-status" });
    new import_obsidian2.Setting(root).setName("\u0410\u0434\u0440\u0435\u0441").addText((text) => {
      text.setPlaceholder("https://").setValue(this.plugin.settings.base);
      text.onChange((value) => void this.save({ base: value.trim() }));
    });
    new import_obsidian2.Setting(root).setName("\u041B\u043E\u0433\u0438\u043D").addText((text) => {
      text.setValue(this.plugin.settings.user);
      text.onChange((value) => void this.save({ user: value.trim() }));
    });
    new import_obsidian2.Setting(root).setName("\u041F\u0430\u0440\u043E\u043B\u044C").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(this.plugin.settings.password);
      text.onChange((value) => void this.save({ password: value }));
    });
    new import_obsidian2.Setting(root).addButton((button) => {
      button.setButtonText("\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C");
      button.onClick(() => void this.check(result));
    });
  }
  async save(patch) {
    if (this.plugin.broken !== "") {
      new import_obsidian2.Notice(this.plugin.broken);
      return;
    }
    this.plugin.settings = { ...this.plugin.settings, ...patch };
    this.plugin.primed = false;
    this.plugin.pollFailed = false;
    await this.plugin.saveData(this.plugin.settings);
  }
  async check(result) {
    if (!this.plugin.ready()) return;
    result.setText("\u043F\u0440\u043E\u0432\u0435\u0440\u044F\u044E");
    try {
      result.setText("\u0432\u0445\u043E\u0434 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D: " + await this.plugin.check());
    } catch (err) {
      result.setText(errorText(err));
    }
  }
};
async function ensureParent(app, path) {
  const slash = path.lastIndexOf("/");
  if (slash <= 0) return;
  const parent = path.slice(0, slash);
  const found = app.vault.getAbstractFileByPath(parent);
  if (found instanceof import_obsidian2.TFile) throw new Error("\u0432\u043C\u0435\u0441\u0442\u043E \u043F\u0430\u043F\u043A\u0438 \u0432\u043B\u043E\u0436\u0435\u043D\u0438\u0439 \u0444\u0430\u0439\u043B: " + parent);
  if (found) return;
  await app.vault.createFolder(parent);
}
