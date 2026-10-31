import { Modal, type Editor } from "obsidian";
import { dataUrl, errorText, itemKey, pendingOldest, whenLabel, type FeedItem } from "./feed.ts";
import type { NoteTarget } from "./main.ts";
import type LentaPlugin from "./main.ts";

export class Picker extends Modal {
  private token = 0;
  private status: HTMLElement | null = null;

  constructor(
    private plugin: LentaPlugin,
    private editor: Editor,
    private view: NoteTarget,
  ) {
    super(plugin.app);
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

  private async paint() {
    const token = ++this.token;
    const root = this.contentEl;
    root.empty();
    root.createEl("h2", { text: "Лента" });
    const actions = root.createDiv({ cls: "lenta-actions" });
    const insert = actions.createEl("button", { text: "вставить новые" });
    insert.type = "button";
    insert.addEventListener("click", () => void this.insertPending());
    const close = actions.createEl("button", { text: "закрыть" });
    close.type = "button";
    close.addEventListener("click", () => this.close());
    this.status = root.createDiv({ cls: "lenta-status" });
    this.status.setText("гружу");
    const grid = root.createDiv({ cls: "lenta-grid" });
    let photos: FeedItem[];
    try {
      photos = await this.plugin.loadPhotos();
    } catch (err) {
      if (token !== this.token) return;
      this.status.setText(errorText(err));
      return;
    }
    if (token !== this.token) return;
    const pending = pendingOldest(photos, this.plugin.settings.inserted);
    insert.textContent = pending.length === 0 ? "новых фото нет" : "вставить новые (" + pending.length + ")";
    insert.disabled = pending.length === 0;
    this.status.setText(photos.length === 0 ? "пока пусто" : "");
    await Promise.all(photos.map((item) => this.cell(grid, item, token)));
  }

  private async cell(grid: HTMLElement, item: FeedItem, token: number) {
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
    const when = item.owner ? "от " + item.owner + ", " + whenLabel(item.created) : whenLabel(item.created);
    button.createEl("span", { text: when });
    if (this.plugin.settings.inserted.includes(itemKey(item))) {
      button.createEl("span", { text: "уже вставлял", cls: "lenta-mark" });
    }
  }

  private async insertPending() {
    const ok = await this.plugin.insertPending(this.editor, this.view);
    if (ok) this.close();
    else void this.paint();
  }

  private async insertOne(item: FeedItem) {
    if (this.plugin.busy) {
      this.status?.setText("уже вставляю");
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
}
