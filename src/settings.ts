import { App, Component, PluginSettingTab, Setting } from "obsidian";
import Toolbox from "../main";

export interface ToolboxSettings {
    watchFolder: string
    watchTimeout: number
    watchDelayTime: number
    filpRevise: number
    createNoteToFolder: string
    readingNoteToFolder: string
    readingNoteTag: string
    isBlockId: boolean
    isOutlink: boolean
    isFrontmatter: boolean
    isFilp: boolean
    isWatch: boolean
    isReadingNote: boolean
    isDailyQuite: boolean
    dailyQuiteFrom: string
    dailyQuiteTo: string
    toPolysemyFolder: string
    isPolysemyTo: boolean
}

export const DEFAULT_SETTINGS: ToolboxSettings = {
    watchFolder: "书库",
    watchTimeout: 1000 * 60 * 5,
    watchDelayTime: 1000 * 3,
    filpRevise: -80,
    createNoteToFolder: "卡片盒",
    readingNoteToFolder: "书库/读书笔记",
    readingNoteTag: "book",
    isBlockId: true,
    isOutlink: true,
    isFrontmatter: true,
    isFilp: true,
    isWatch: true,
    isDailyQuite: true,
    isReadingNote: true,
    isPolysemyTo: true,
    dailyQuiteFrom: "主题盒/收藏夹：句子",
    dailyQuiteTo: "主页",
    toPolysemyFolder: "卡片盒"
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

        new Setting(containerEl)
        .setName("跟踪阅读时间及时长")
        .addToggle((text) =>
            text
                .setValue(this.plugin.settings.isWatch)
                .onChange(async (value) => {
                    this.plugin.settings.isWatch = value
                    await this.plugin.saveSettings();
                })
        ) 

        new Setting(containerEl)
        .setName("翻页")
        .addToggle((text) =>
            text
                .setValue(this.plugin.settings.isFilp)
                .onChange(async (value) => {
                    this.plugin.settings.isFilp = value
                    await this.plugin.saveSettings();
                })
        ) 

        new Setting(containerEl)
        .setName("读书笔记")
        .addToggle((text) =>
            text
                .setValue(this.plugin.settings.isReadingNote)
                .onChange(async (value) => {
                    this.plugin.settings.isReadingNote = value
                    await this.plugin.saveSettings();
                })
        )

        new Setting(containerEl)
        .setName("每日一句")
        .addToggle((text) =>
            text
                .setValue(this.plugin.settings.isDailyQuite)
                .onChange(async (value) => {
                    this.plugin.settings.isDailyQuite = value
                    await this.plugin.saveSettings();
                })
        )

        new Setting(containerEl)
        .setName("多义笔记转跳")
        .setDesc("在 yaml 中声明 `to: [[实义笔记名]]`，打开声明笔记将自动转跳至实义笔记")
        .addToggle((text) =>
            text
                .setValue(this.plugin.settings.isPolysemyTo)
                .onChange(async (value) => {
                    this.plugin.settings.isPolysemyTo = value
                    await this.plugin.saveSettings();
                })
        )


        containerEl.createEl('h1', { text: "阅读时长及进度"})
        
        new Setting(containerEl)
        .setName("跟踪哪个文件夹")
        .addText((text) =>
            text
                .setPlaceholder('书库')
                .setValue(this.plugin.settings.watchFolder)
                .onChange(async (value) => {
                    this.plugin.settings.watchFolder = value;
                    await this.plugin.saveSettings();
                })
        );

        new Setting(containerEl)
        .setName("超时")
        .setDesc("未点击屏幕超过多少秒后暂停跟踪阅读时长及进度，已获得准确的跟踪记录")
        .addText((text) =>
            text
                .setValue("" + this.plugin.settings.watchTimeout / 1000)
                .onChange(async (value) => {
                    this.plugin.settings.watchTimeout = Number(value) * 1000
                    await this.plugin.saveSettings();
                })
        )

        new Setting(containerEl)
        .setName("延迟")
        .setDesc("延迟多少秒写入跟踪数据，提升在阅读器上的流畅性")
        .addText((text) =>
            text
                .setValue("" + this.plugin.settings.watchDelayTime / 1000)
                .onChange(async (value) => {
                    this.plugin.settings.watchDelayTime = Number(value) * 1000
                    await this.plugin.saveSettings();
                })
        )

        containerEl.createEl('h1', { text: "翻页 "})

        new Setting(containerEl)
            .setName("修正值")
            .addText((text) =>
                text
                    .setValue("" + this.plugin.settings.filpRevise)
                    .onChange(async (value) => {
                        this.plugin.settings.filpRevise = Number(value)
                        await this.plugin.saveSettings();
                    })
            )
        

        containerEl.createEl('h1', { text: "同步读书笔记 "})


        new Setting(containerEl)
            .setName("读书笔记同步至哪个文件夹")
            .addText((text) =>
                text
                    .setValue("" + this.plugin.settings.readingNoteToFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.readingNoteToFolder = value
                        await this.plugin.saveSettings();
                    })
            ) 
            
        new Setting(containerEl)
        .setName("同步指定标签")
        .addText((text) =>
            text
                .setValue("" + this.plugin.settings.readingNoteTag)
                .onChange(async (value) => {
                    this.plugin.settings.readingNoteTag = value
                    await this.plugin.saveSettings();
                })
        )  

        new Setting(containerEl)
        .setName("同步出链")
        .addToggle((text) =>
            text
                .setValue(this.plugin.settings.isOutlink)
                .onChange(async (value) => {
                    this.plugin.settings.isOutlink = value
                    await this.plugin.saveSettings();
                })
        )  

        new Setting(containerEl)
        .setName("同步元字段")
        .setDesc('书库的书添加划线数量，想法数量，出链数量的元字段')
        .addToggle((text) =>
            text
                .setValue(this.plugin.settings.isOutlink)
                .onChange(async (value) => {
                    this.plugin.settings.isOutlink = value
                    await this.plugin.saveSettings();
                })
        )  
                
        new Setting(containerEl)
        .setName("添加块id")
        .setDesc("开启后，为每条笔记添加块id，划线内容不更改的情况下，同步读书笔记块id不变。因此，可以在其他地方进行引用")
        .addToggle((text) =>
            text
                .setValue(this.plugin.settings.isBlockId)
                .onChange(async (value) => {
                    this.plugin.settings.isBlockId = value
                    await this.plugin.saveSettings();
                })
        ) 

        containerEl.createEl('h1', { text: "每日一句"})


        new Setting(containerEl)
            .setName("来源")
            .setDesc("指定一篇笔记，作为每日一句的来源，每一个句子用换行分割")
            .addText((text) =>
                text
                    .setValue("" + this.plugin.settings.dailyQuiteFrom)
                    .onChange(async (value) => {
                        this.plugin.settings.dailyQuiteFrom = value
                        await this.plugin.saveSettings();
                    })
            )  

        new Setting(containerEl)
        .setName("目标")
        .setDesc("每日一句添加到哪个笔记的元数据上，推荐使用 viewdata 插件显式在笔记里")
        .addText((text) =>
            text
                .setValue("" + this.plugin.settings.dailyQuiteTo)
                .onChange(async (value) => {
                    this.plugin.settings.dailyQuiteTo = value
                    await this.plugin.saveSettings();
                })
        )     

        containerEl.createEl('h1', { text: "多义笔记转跳"})


        new Setting(containerEl)
            .setName("指定多义笔记转跳的文件夹")
            .addText((text) =>
                text
                    .setValue("" + this.plugin.settings.toPolysemyFolder)
                    .onChange(async (value) => {
                        this.plugin.settings.toPolysemyFolder = value
                        await this.plugin.saveSettings();
                    })
            )

            containerEl.createEl('h1', { text: "其他"})


            new Setting(containerEl)
                .setName("创建卡片笔记放至哪个文件夹")
                .addText((text) =>
                    text
                        .setValue("" + this.plugin.settings.createNoteToFolder)
                        .onChange(async (value) => {
                            this.plugin.settings.createNoteToFolder = value
                            await this.plugin.saveSettings();
                        })
                )
    }
}