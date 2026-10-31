import { MarkdownView, Notice, Plugin, PluginSettingTab, Setting, TFile, requestUrl, type App, type Editor } from "obsidian";

export type NoteTarget = { readonly file: TFile | null };
import {
  accountName,
  arrivalText,
  attachmentName,
  basicHeader,
  configured,
  embedOf,
  endpoint,
  errorText,
  httpError,
  insertion,
  itemKey,
  pendingOldest,
  photosNewest,
  readItems,
  settingsFrom,
  type FeedItem,
  type LentaSettings,
} from "./feed.ts";
import { Picker } from "./picker.ts";

const pollMs = 3000;

export default class LentaPlugin extends Plugin {
  settings: LentaSettings = settingsFrom(null);
  broken = "";
  primed = false;
  pollFailed = false;
  busy = false;
  seen = new Set<string>();
  picker: Picker | null = null;

  async onload() {
    try {
      this.settings = settingsFrom(await this.loadData());
    } catch (err) {
      this.broken = errorText(err);
      new Notice(this.broken);
    }
    this.addCommand({
      id: "insert-new",
      name: "Вставить новые",
      icon: "image-plus",
      editorCallback: (editor, view) => void this.insertPending(editor, view),
    });
    this.addCommand({
      id: "pick",
      name: "Выбрать фото",
      icon: "images",
      editorCallback: (editor, view) => this.openPicker(editor, view),
    });
    this.addRibbonIcon("image-plus", "Лента", () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) {
        new Notice("открой заметку");
        return;
      }
      this.openPicker(view.editor, view);
    });
    this.addSettingTab(new LentaSettingTab(this.app, this));
    this.registerInterval(window.setInterval(() => void this.poll(), pollMs));
  }

  openPicker(editor: Editor, view: NoteTarget) {
    if (!this.ready()) return;
    this.picker?.close();
    this.picker = new Picker(this, editor, view);
    this.picker.open();
  }

  ready(): boolean {
    if (this.broken !== "") {
      new Notice(this.broken);
      return false;
    }
    if (!configured(this.settings)) {
      new Notice("укажи адрес, логин и пароль ленты в настройках");
      return false;
    }
    return true;
  }

  async insertPending(editor: Editor, view: NoteTarget): Promise<boolean> {
    if (this.busy) {
      new Notice("уже вставляю");
      return false;
    }
    if (!this.ready()) return false;
    this.busy = true;
    try {
      const pending = pendingOldest(await this.loadPhotos(), this.settings.inserted);
      if (pending.length === 0) {
        new Notice("новых фото нет");
        return false;
      }
      for (const item of pending) await this.place(editor, view, item);
      return true;
    } catch (err) {
      new Notice(errorText(err));
      return false;
    } finally {
      this.busy = false;
    }
  }

  async place(editor: Editor, view: NoteTarget, item: FeedItem) {
    const file = view.file;
    if (!file) throw new Error("сначала сохрани заметку");
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

  async loadPhotos(): Promise<FeedItem[]> {
    const own = await this.getJSON("/api/items");
    const shared = await this.getJSON("/api/shared");
    return photosNewest(readItems(own, false), readItems(shared, true));
  }

  async bytes(item: FeedItem): Promise<ArrayBuffer> {
    const path = item.owner
      ? "/api/shared/" + encodeURIComponent(item.owner) + "/" + encodeURIComponent(item.id)
      : "/api/items/" + encodeURIComponent(item.id);
    const res = await requestUrl({
      url: endpoint(this.settings.base, path),
      method: "GET",
      headers: { Authorization: basicHeader(this.settings.user, this.settings.password) },
      throw: false,
    });
    if (res.status !== 200) throw httpError(res.status, res.text);
    if (res.arrayBuffer.byteLength === 0) throw new Error("лента отдала пустое фото");
    return res.arrayBuffer;
  }

  async check(): Promise<string> {
    return accountName(await this.getJSON("/api/me"));
  }

  async mark(key: string) {
    if (this.settings.inserted.includes(key)) return;
    this.settings.inserted.push(key);
    await this.saveData(this.settings);
  }

  private async getJSON(path: string): Promise<unknown> {
    const res = await requestUrl({
      url: endpoint(this.settings.base, path),
      method: "GET",
      headers: { Authorization: basicHeader(this.settings.user, this.settings.password) },
      throw: false,
    });
    if (res.status !== 200) throw httpError(res.status, res.text);
    return res.json;
  }

  private async poll() {
    if (this.broken !== "" || !configured(this.settings)) return;
    let photos: FeedItem[];
    try {
      photos = await this.loadPhotos();
    } catch (err) {
      if (!this.pollFailed) {
        this.pollFailed = true;
        new Notice(errorText(err));
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
    new Notice(arrivalText(fresh.length));
    this.picker?.reload();
  }
}

class LentaSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: LentaPlugin,
  ) {
    super(app, plugin);
  }

  display() {
    const root = this.containerEl;
    root.empty();
    const result = root.createDiv({ cls: "lenta-status" });
    new Setting(root).setName("Адрес").addText((text) => {
      text.setPlaceholder("https://").setValue(this.plugin.settings.base);
      text.onChange((value) => void this.save({ base: value.trim() }));
    });
    new Setting(root).setName("Логин").addText((text) => {
      text.setValue(this.plugin.settings.user);
      text.onChange((value) => void this.save({ user: value.trim() }));
    });
    new Setting(root).setName("Пароль").addText((text) => {
      text.inputEl.type = "password";
      text.setValue(this.plugin.settings.password);
      text.onChange((value) => void this.save({ password: value }));
    });
    new Setting(root).addButton((button) => {
      button.setButtonText("Проверить");
      button.onClick(() => void this.check(result));
    });
  }

  private async save(patch: Partial<LentaSettings>) {
    if (this.plugin.broken !== "") {
      new Notice(this.plugin.broken);
      return;
    }
    this.plugin.settings = { ...this.plugin.settings, ...patch };
    this.plugin.primed = false;
    this.plugin.pollFailed = false;
    await this.plugin.saveData(this.plugin.settings);
  }

  private async check(result: HTMLElement) {
    if (!this.plugin.ready()) return;
    result.setText("проверяю");
    try {
      result.setText("вход выполнен: " + (await this.plugin.check()));
    } catch (err) {
      result.setText(errorText(err));
    }
  }
}

async function ensureParent(app: App, path: string) {
  const slash = path.lastIndexOf("/");
  if (slash <= 0) return;
  const parent = path.slice(0, slash);
  const found = app.vault.getAbstractFileByPath(parent);
  if (found instanceof TFile) throw new Error("вместо папки вложений файл: " + parent);
  if (found) return;
  await app.vault.createFolder(parent);
}
