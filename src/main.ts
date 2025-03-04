import { Plugin, MarkdownView, Editor, Notice, TFile } from "obsidian";
import { today, getBlock, sure } from "./helpers";

import {
	ToolboxSettings,
	DEFAULT_SETTINGS,
	ToolboxSettingTab,
} from "./settings";
import { InputBox } from "./InputBox";
import { md5 } from "js-md5";
import { Confirm } from "./Confirm";

const OUTLINK_EXP = /\[\[(?!.*\.)[^\]]+\]\]/g;
const PREVIEW_VIEW_CLASS = ".markdown-preview-view";

/**
 * - 跟踪阅读时长
 * - 跟踪阅读进度
 * - 转跳至阅读进度位置
 * - 翻页
 * - 划线，写想法，创建卡片笔记
 * - 读书笔记同步
 * - 元数据同步
 * - 每日一句
 * - 多义笔记转跳
 */

export default class Toolbox extends Plugin {
	timer: number;
	settings: ToolboxSettings;
	itemEl: HTMLElement;
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ToolboxSettingTab(this.app, this));

		this.itemEl = this.addStatusBarItem().createEl("span", { text: "" });

		this.registerEvent(
			this.app.workspace.on("file-open", (file) => {
				if (!file || file.extension !== "md") return;

				if (file.path === this.settings.dailyQuiteTo + ".md")
					this.dailyQuite();

				if (file.parent.path === this.settings.folder) {
					let startTime = Date.now();
					const view = this.getView();
					const viewEl = this.getviewEl(view);
					let { readingTime = 0, readingProgress = 0 } =
						this.app.metadataCache.getFileCache(file).frontmatter ||
						{};
					this.updateStatusBar(readingTime, readingProgress);
					this.setReadingDate(file);
					this.setCompletionDate(file);
					viewEl.onclick = () => {
						if (view.getMode() === "source") return;
						this.filp(viewEl);
						if (!this.settings.watch) return;
						clearTimeout(this.timer);
						this.timer = window.setTimeout(() => {
							this.app.fileManager.processFrontMatter(
								file,
								(frontmatter) => {
									if (!frontmatter.readingTime)
										frontmatter.readingTime = 0;
									if (!frontmatter.readingProgress)
										frontmatter.readingProgress = 0;
									frontmatter.readingTime += Math.min(
										this.settings.timeout,
										Date.now() - startTime
									);
									startTime = Date.now();
									frontmatter.readingTimeFormat = this.msTo(
										frontmatter.readingTime
									);
									readingProgress = Number(
										(
											((viewEl.scrollTop +
												viewEl.clientHeight) /
												viewEl.scrollHeight) *
											100
										).toFixed(2)
									);

									if (
										viewEl.scrollHeight > 0 &&
										frontmatter.readingProgress <=
											readingProgress
									)
										if (
											readingProgress -
												frontmatter.readingProgress <=
												(viewEl.clientHeight /
													viewEl.scrollHeight) *
													200 ||
											!this.settings.strictProgress
										) {
											frontmatter.readingProgress =
												readingProgress;
											this.setCompletionDate(file);
											this.updateStatusBar(
												frontmatter.readingTime,
												frontmatter.readingProgress
											);
										} else {
											this.notice("您已启用严格进度");
										}
								}
							);
						}, this.settings.delayTime);
					};
				} else {
					this.clearStatusBar();
				}
			})
		);

		this.settings.readingNotes &&
			this.addCommand({
				id: "划线",
				name: "划线",
				icon: "brush",
				editorCallback: (editor, view: MarkdownView) =>
					this.highlight(editor, view),
			});

		this.settings.readingNotes &&
			this.addCommand({
				id: "创建笔记",
				name: "创建笔记",
				icon: "book",
				editorCallback: (editor, view: MarkdownView) =>
					this.selectionByCreateNote(editor, view),
			});

		this.settings.watch &&
			this.addCommand({
				id: "转跳至阅读进度位置",
				name: "转跳至阅读进度位置",
				icon: "album",
				callback: () => this.toReadingProgress(),
			});

		this.settings.readingNotes &&
			this.addCommand({
				id: "同步读书笔记",
				name: "同步读书笔记",
				icon: "activity",
				callback: () =>
					this.app.vault
						.getMarkdownFiles()
						.filter(
							(file) =>
								file?.parent?.path === this.settings.folder
						)
						.filter((file) =>
							this.app.metadataCache
								.getFileCache(file)
								?.frontmatter?.tags?.contains("book")
						)
						.forEach((file) => this.syncNote(file)),
			});
	}

	getviewEl(view: MarkdownView): HTMLElement {
		return view.contentEl.querySelector(PREVIEW_VIEW_CLASS);
	}

	getView() {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}

	async syncNote(file: TFile) {
		if (
			(file && file.extension !== "md") ||
			file.parent.path !== this.settings.folder
		)
			return;
		let content = "---\ntags: 读书笔记\n---";
		let markdown = await this.app.vault.cachedRead(file);

		// 出链
		if (this.settings.outlink) {
			let outlinks = markdown.match(OUTLINK_EXP);
			outlinks && (content += `\n\n# 出链 \n\n${outlinks.join(" / ")}`);
		}

		// 书评
		let bookReview =
			this.app.metadataCache.getFileCache(file)?.frontmatter?.bookReview;
		bookReview &&
			(content += `\n\n# 书评 \n\n > [!tip] ${bookReview}${
				this.settings.blockId ? " ^" + md5(bookReview) : ""
			}`);

		// 划线
		let reslut = []
			.concat(markdown.match(/#(.*)|==(.+?)==/g))
			.filter(Boolean)
			.map((p: string) => {
				if (/#.*/g.test(p)) return p;
				let id = /%%\^(.*)\^%%/g.exec(p);
				let text = /==(.+?)(%%💬|%%\^)/g.exec(p);
				let idea = p.match(/%%💬(.+?)💬%%/g);
				return {
					id: id && id[1],
					text: text && text[1],
					idea: idea && idea.map((t) => t.replace(/%%💬|💬%%/g, "")),
				};
			});

		// 删除空标题
		reslut = sure(reslut);
		reslut = sure(reslut);
		reslut = sure(reslut);

		reslut.length && (content += "\n\n# 划线 \n\n");
		reslut.forEach((o: any, i: number) => {
			if (typeof o === "string") {
				content += o + "\n\n";
			} else {
				content += `> [!quote] [${o.text}](${file.path}#^${o.id}) ${
					o.idea ? "\n> 💬 " + o.idea.join("\n > 💬 ") : ""
				}${this.settings.blockId ? " ^" + md5(o.text) : ""}\n\n`;
			}
		});

		const readingNotePath =
			this.settings.readingNotesToFolder + "/" + file.name;
		const readingNoteFile =
			this.app.vault.getAbstractFileByPath(readingNotePath);

		if (readingNoteFile) {
			const sourceContent = await this.app.vault.cachedRead(
				readingNoteFile as TFile
			);
			if (sourceContent !== content) {
				this.app.vault.modify(readingNoteFile as TFile, content);
				this.updateMetadata(file);
				this.notice(file.name + " - 已同步");
			}
		} else {
			this.app.vault.create(readingNotePath, content);
			this.updateMetadata(file);
			this.notice(file.name + " - 已同步");
		}
	}

	setReadingDate(file: TFile) {
		let readingDate =
			this.app.metadataCache.getFileCache(file).frontmatter?.readingDate;
		if (readingDate || !this.settings.watch) return;
		new Confirm(
			this.app,
			`《${file.basename}》未过读，是否标记在读？`,
			(res) => {
				res && this.updateFrontmatter(file, "readingDate", today());
			}
		).open();
	}

	setCompletionDate(file: TFile) {
		let { readingProgress = 0, completionDate } =
			this.app.metadataCache.getFileCache(file).frontmatter || {};
		if (readingProgress < 100 || completionDate || !this.settings.watch)
			return;
		new Confirm(
			this.app,
			`《${file.basename}》进度 100%，是否标记读完？`,
			(res) => {
				res && this.updateFrontmatter(file, "completionDate", today());
			}
		).open();
	}

	updateMetadata(file: TFile) {
		if (this.settings.frontmatter) {
			this.updateOutlinkes(file);
			this.updateHighlightsAndThinks(file);
		}
	}

	updateFrontmatter(file: TFile, key: string, value: string | number) {
		this.app.fileManager.processFrontMatter(file, (frontmatter) => {
			frontmatter[key] = value;
		});
	}

	updateStatusBar(duration: number, progress: number) {
		this.itemEl.textContent = `${this.msTo(duration)} ⏱️ ${progress}% ⏳`;
	}

	msTo(t: number) {
		const seconds = Math.floor((t / 1000) % 60);
		const minutes = Math.floor((t / (1000 * 60)) % 60);
		const hours = Math.floor(t / (1000 * 60 * 60));
		return `${hours ? hours + "h" : ""}${minutes ? minutes + "m" : ""}${
			seconds ? seconds + "s" : ""
		}`;
	}

	async updateOutlinkes(file: TFile) {
		let content = await this.app.vault.cachedRead(file);
		let outlinks = content.match(OUTLINK_EXP) || [];
		this.updateFrontmatter(file, "outlinks", outlinks.length);
	}

	async updateHighlightsAndThinks(file: TFile) {
		let content = await this.app.vault.cachedRead(file);
		let highlights = content.match(/==(.+?)==/g) || [];
		let thinks = highlights
			.map((highlight) => highlight.match(/%%💬(.+?)💬%%/g)?.length)
			.filter(Boolean)
			.reduce((a, b) => a + b, 0);
		this.updateFrontmatter(file, "highlights", highlights.length);
		this.updateFrontmatter(file, "thinks", thinks);
	}

	clearStatusBar() {
		this.itemEl.textContent = "";
	}

	filp(el: HTMLElement) {
		this.settings.filp &&
			(el.scrollTop += el.clientHeight + this.settings.filpRevise);
	}

	highlight(editor: Editor, view: MarkdownView) {
		let selection = editor.getSelection();
		let blockId = getBlock(this.app, editor, view.file);
		new InputBox(this.app, selection, async (res) => {
			res = res ? `%%💬${res}💬%%` : "";
			editor.replaceSelection(`==${selection}${res}%%^${blockId}^%%==`);
		}).open();
	}

	toReadingProgress() {
		const view = this.getView();
		if (!view) return;
		const file = view.file;
		const readingProgress =
			file &&
			this.app.metadataCache.getFileCache(file)?.frontmatter
				?.readingProgress;
		const viewEl = this.getviewEl(view);
		if (readingProgress) {
			viewEl.scrollTo({
				top: (viewEl.scrollHeight * readingProgress) / 100,
			});
			this.notice(`已转跳至 ${readingProgress} %`);
		}
	}

	async selectionByCreateNote(editor: Editor, view: MarkdownView) {
		const filename = editor.getSelection();
		const filepath =
			this.settings.createNoteToFolder + "/" + filename + ".md";
		editor.replaceSelection(`[[${filename}|${filename}]]`);
		this.app.vault.create(filepath, "---\nempty: true\n---");
	}

	notice(text: string) {
		new Notice(text);
	}

	async dailyQuite() {
		const file = this.openFile(this.settings.dailyQuiteTo + ".md");
		let content = await this.app.vault.cachedRead(file);
		const params = content?.match(/%%(.*)%%/)?.[1]?.split("|");
		let files: TFile[] = [];

		if (params[0] !== "quote") return;
		let sentences = (
			await Promise.all(
				this.app.vault
					.getMarkdownFiles()
					.filter(
						(file) =>
							file.parent.path ===
							this.settings.readingNotesToFolder
					)
					.map((file) => {
						files.push(file);
						return this.app.vault.cachedRead(file);
					})
			)
		)
			.map((content, i) => ({
				text:
					content.match(/> \[!quote\] \[.*?\]\(.*?\.md#\^.*?\)/gm) ||
					[],
				file: files[i],
			}))
			.filter(({ text }) => text.length)
			.map(({ text, file }) => text.map((text) => ({ text, file })))
			.flat(1);

		const text = this.pick(sentences, Number(params[1]) || 1)
			.map(({ text, file }) =>
				text.replace(
					"> [!quote]",
					`> [!quote] [《${file.basename}》](${file.path}) \n>`
				)
			)
			.join("\n\n");
		content = content.replace(
			/(%%quote\|\d%%).*(%%quote-end%%)/gs,
			"$1\n\n" + text + "\n\n $2"
		);
		this.app.vault.modify(file, content);
	}

	pick<T>(arr: T[], n: number = 1): T[] {
		if (n >= arr.length) {
			return arr;
		}
		let result: T[] = [];
		let picked: Set<number> = new Set();
		for (let i = 0; i < n; i++) {
			let index = Math.floor(Math.random() * arr.length);
			while (picked.has(index)) {
				index = Math.floor(Math.random() * arr.length);
			}
			picked.add(index);
			result.push(arr[index]);
		}
		return result;
	}

	openFile(path: string) {
		return this.app.vault.getAbstractFileByPath(path) as TFile;
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
