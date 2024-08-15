import { App, Component, PluginSettingTab, Setting } from "obsidian";
import Toolbox from "./main";

export interface ToolboxSettings {
	watch: boolean;
	folder: string;
	timeout: number;
	delayTime: number;
	filp: boolean;
	filpRevise: number;
	readingNotes: boolean;
	readingNotesToFolder: string;
	outlink: boolean;
	blockId: boolean;
	frontmatter: boolean;
	dailyQuite: boolean;
	dailyQuiteTo: string;
	polysemy: boolean;
	polysemyFolder: string;
	createNoteToFolder: string;
	strictProgress: boolean;
}

export const DEFAULT_SETTINGS: ToolboxSettings = {
	watch: true,
	folder: "书库",
	timeout: 1000 * 60 * 5,
	delayTime: 1000 * 3,
	filp: true,
	filpRevise: -80,
	readingNotes: true,
	readingNotesToFolder: "书库/读书笔记",
	outlink: true,
	blockId: true,
	frontmatter: true,
	dailyQuite: true,
	dailyQuiteTo: "主页",
	polysemy: true,
	polysemyFolder: "卡片盒",
	createNoteToFolder: "卡片盒",
	strictProgress: true,
};

export class ToolboxSettingTab extends PluginSettingTab {
	plugin: Toolbox;

	constructor(app: App, plugin: Toolbox) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display() {
		let { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: this.plugin.manifest.name });

		new Setting(containerEl)
			.setName("⏱ 跟踪阅读时长、进度及状态")
			.setDesc(
				"- 每本书都是单个 markdown 文件，不建议拆分章节，不超过 2mb \n- 放至指定的跟踪根目录 \n- 设置 book 标签"
			)
			.addToggle((cd) =>
				cd
					.setValue(this.plugin.settings.watch)
					.onChange(async (value) => {
						this.plugin.settings.watch = value;
						await this.plugin.saveSettings();
						this.display();
					})
			);

		if (this.plugin.settings.watch) {
			new Setting(containerEl).setName("跟踪目录").addText((cd) =>
				cd
					.setValue(this.plugin.settings.folder)
					.onChange(async (value) => {
						this.plugin.settings.folder = value;
						await this.plugin.saveSettings();
					})
			);

			new Setting(containerEl)
				.setName("超时")
				.setDesc(`超过一段时间未翻页将暂停跟踪，以获得更准确的数据。`)
				.addText((cd) =>
					cd
						.setValue("" + this.plugin.settings.timeout / 1000)
						.onChange(async (value) => {
							this.plugin.settings.timeout = Number(value) * 1000;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("跟踪数据延迟更新")
				.setDesc(
					"在某些老旧水墨屏设备或者单文件体积过大，每次更新跟踪数据都会导致翻页明显滞后，设置延迟以大幅提升翻页流畅性"
				)
				.addText((text) =>
					text
						.setValue("" + this.plugin.settings.delayTime / 1000)
						.onChange(async (value) => {
							this.plugin.settings.delayTime =
								Number(value) * 1000;
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl)
			.setName("启动严格进度")
			.setDesc(
				"超过一定进度不会被记录。例如，查看脚注会翻页到底部，这种情况下不会被记录进度"
			)
			.addToggle((cd) =>
				cd
					.setValue(this.plugin.settings.strictProgress)
					.onChange(async (value) => {
						this.plugin.settings.strictProgress = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl).setName("👇🏼 翻页").addToggle((cd) =>
			cd.setValue(this.plugin.settings.filp).onChange(async (value) => {
				this.plugin.settings.filp = value;
				await this.plugin.saveSettings();
				this.display();
			})
		);

		if (this.plugin.settings.filp) {
			new Setting(containerEl).setName("修正值").addText((cd) =>
				cd
					.setValue("" + this.plugin.settings.filpRevise)
					.onChange(async (value) => {
						this.plugin.settings.filpRevise = Number(value);
						await this.plugin.saveSettings();
					})
			);
		}

		new Setting(containerEl).setName("📓 读书笔记").addToggle((cd) =>
			cd
				.setValue(this.plugin.settings.readingNotes)
				.onChange(async (value) => {
					this.plugin.settings.readingNotes = value;
					await this.plugin.saveSettings();
					this.display();
				})
		);

		if (this.plugin.settings.readingNotes) {
			new Setting(containerEl).setName("同步至哪个目录").addText((cd) =>
				cd
					.setValue("" + this.plugin.settings.readingNotesToFolder)
					.onChange(async (value) => {
						this.plugin.settings.readingNotesToFolder = value;
						await this.plugin.saveSettings();
					})
			);

			new Setting(containerEl).setName("同步出链").addToggle((cd) =>
				cd
					.setValue(this.plugin.settings.outlink)
					.onChange(async (value) => {
						this.plugin.settings.outlink = value;
						await this.plugin.saveSettings();
					})
			);

			new Setting(containerEl)
				.setName("同步元字段")
				.setDesc("每本书添加划线，想法和出链数量元字段")
				.addToggle((cd) =>
					cd
						.setValue(this.plugin.settings.frontmatter)
						.onChange(async (value) => {
							this.plugin.settings.frontmatter = value;
							await this.plugin.saveSettings();
						})
				);

			new Setting(containerEl)
				.setName("添加块id")
				.setDesc(
					"在每条读书笔记句尾添加块id。划线内容不更改，id也不会更改。因此，可以在其他地方引用读书笔记"
				)
				.addToggle((cd) =>
					cd
						.setValue(this.plugin.settings.blockId)
						.onChange(async (value) => {
							this.plugin.settings.blockId = value;
							await this.plugin.saveSettings();
						})
				);
		}

		new Setting(containerEl).setName("🎗️ 展厅").addToggle((cd) =>
			cd
				.setValue(this.plugin.settings.dailyQuite)
				.onChange(async (value) => {
					this.plugin.settings.dailyQuite = value;
					await this.plugin.saveSettings();
					this.display();
				})
		);

		if (this.plugin.settings.dailyQuite) {
			new Setting(containerEl).setName("指定笔记").addText((cd) =>
				cd
					.setValue("" + this.plugin.settings.dailyQuiteTo)
					.onChange(async (value) => {
						this.plugin.settings.dailyQuiteTo = value;
						await this.plugin.saveSettings();
					})
			);
		}

		new Setting(containerEl).setName("🔗 多义笔记转跳").addToggle((cd) =>
			cd
				.setValue(this.plugin.settings.polysemy)
				.onChange(async (value) => {
					this.plugin.settings.polysemy = value;
					await this.plugin.saveSettings();
					this.display();
				})
		);

		if (this.plugin.settings.polysemy) {
			new Setting(containerEl).setName("指定目录").addText((cd) =>
				cd
					.setValue("" + this.plugin.settings.polysemyFolder)
					.onChange(async (value) => {
						this.plugin.settings.polysemyFolder = value;
						await this.plugin.saveSettings();
					})
			);
		}

		containerEl.createEl("h2", { text: "指令" });

		new Setting(containerEl)
			.setName("创建卡片笔记放至哪个文件夹")
			.addText((text) =>
				text
					.setValue("" + this.plugin.settings.createNoteToFolder)
					.onChange(async (value) => {
						this.plugin.settings.createNoteToFolder = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
