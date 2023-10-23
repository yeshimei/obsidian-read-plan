import {Plugin, MarkdownView, Editor, Notice, TFile} from 'obsidian';
import { getBlock, sure } from './helpers';

import {
    ToolboxSettings,
    DEFAULT_SETTINGS,
    ToolboxSettingTab,
} from "./settings";
import { InputBox } from './InputBox';
import { md5 } from 'js-md5';


const OUTLINK_EXP = /\[\[(?!.*\.)[^\]]+\]\]/g
const PREVIEW_VIEW_CLASS = '.markdown-preview-view'

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
	timer: NodeJS.Timeout
	settings: ToolboxSettings;
	itemEl: HTMLElement
	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ToolboxSettingTab(this.app, this))
		
    	this.itemEl = this.addStatusBarItem().createEl("span", { text: "" })

		this.registerEvent(this.app.workspace.on('file-open', file => {
			if (!file || file.extension !== 'md') return
			
			// 每日一句
			if (file.path === this.settings.dailyQuiteTo + '.md') {
				this.dailyQuite()
			}

			// 多义笔记转跳
			if (file.parent.path === this.settings.toPolysemyFolder) {
				this.toPolysemy(file)
			}

			if(file.parent.path === this.settings.watchFolder) {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView)
				const targetEl: HTMLElement = view.contentEl.querySelector(PREVIEW_VIEW_CLASS)
				let { readingTime = 0, readingProgress = 0 } = this.app.metadataCache.getFileCache(file).frontmatter || {}
				let startTime = Date.now()
				this.updateStatusBar(readingTime, readingProgress)
				targetEl.onclick = () => {
					if (view.getMode() === 'source') return
					this.filp(targetEl)
					if (!this.settings.isWatch) return
					// 延迟写入跟踪数据以提升阅读器上的翻页流畅性。
					clearTimeout(this.timer)
					this.timer = setTimeout(() => {
						this.app.fileManager.processFrontMatter(file, frontmatter => {
							if (!frontmatter.readingTime) frontmatter.readingTime = 0
							if (!frontmatter.readingProgress) frontmatter.readingProgress = 0
							frontmatter.readingTime += Math.min(this.settings.watchTimeout, Date.now()  - startTime)
							frontmatter.readingTimeFormat = this.msTo(frontmatter.readingTime)
							readingProgress = Number(((targetEl.scrollTop + targetEl.clientHeight) / targetEl.scrollHeight * 100).toFixed(2))
							if (targetEl.scrollHeight > 0 && frontmatter.readingProgress <= readingProgress) frontmatter.readingProgress = readingProgress
							startTime = Date.now()
							this.updateStatusBar(frontmatter.readingTime, frontmatter.readingProgress)
						})
					}, this.settings.watchDelayTime)
				}
			} else {
				this.clearStatusBar()
			}
		}))

		this.settings.isReadingNote && this.addCommand({
			id: '划线',
			name: '划线',
			icon: 'brush',
			editorCallback: (editor, view: MarkdownView) => this.highlight(editor, view)
		})

		this.settings.isReadingNote && this.addCommand({
			id: '创建笔记',
			name: '创建笔记',
			icon: 'book',
			editorCallback: (editor, view: MarkdownView) => this.selectionByCreateNote(editor, view)
		})

		this.settings.isWatch && this.addCommand({
			id: '转跳至阅读进度位置',
			name: '转跳至阅读进度位置',
			icon: 'album',
			callback: () => this.toReadingProgress() 
		})

		this.settings.isReadingNote && this.addCommand({
			id: '同步读书笔记',
			name: '同步读书笔记',
			icon: 'activity',
			callback: () => this.app.vault.getMarkdownFiles().filter(file => file?.parent?.path === this.settings.watchFolder).filter(file => this.app.metadataCache.getFileCache(file)?.frontmatter?.tags?.contains(this.settings.readingNoteTag)).forEach(file => this.syncNote(file))
		})
	}

	async syncNote (file: TFile) {
		if (file && file.extension === 'md' && file.parent.path === this.settings.watchFolder) {
			let content = '---\ntags: 读书笔记\n---'
			let markdown = await this.app.vault.cachedRead(file)

			// 出链
			if (this.settings.isOutlink) {
				let outlinks = markdown.match(OUTLINK_EXP)
				outlinks && (content += `\n\n# 出链 \n\n${outlinks.join(' / ')}`)		
			}

			// 书评
			let bookReview = this.app.metadataCache.getFileCache(file)?.frontmatter?.bookReview
			bookReview && (content += `\n\n# 书评 \n\n > [!tip] ${bookReview}${this.settings.isBlockId ? " ^" + md5(bookReview) : ''}`)

			// 划线
			let reslut = []
				.concat(markdown.match(/#(.*)|==(.+?)==/g))
				.filter(Boolean)
				.map((p: string) => {
					if (/#.*/g.test(p)) return p
					let id = /%%\^(.*)\^%%/g.exec(p)
					let text = /==(.+?)(%%💬|%%\^)/g.exec(p)
					let idea = p.match(/%%💬(.+?)💬%%/g)
					return {
						id: id && id[1],
						text: text && text[1],
						idea: idea && idea.map(t => t.replace(/%%💬|💬%%/g, ""))
					}
				})
			
			// 删除空标题
			reslut = sure(reslut)
			reslut = sure(reslut)
			reslut = sure(reslut)
			
			reslut.length && (content += '\n\n# 划线 \n\n')
			reslut.forEach((o: any, i: number) => {
				if (typeof o === 'string' ) {
					content += o + '\n\n'
				} else {
					content += `> [!quote] [${o.text}](${file.path}#^${o.id}) ${o.idea ? "\n> 💬 " + o.idea.join("\n > 💬 ") : ""}${this.settings.isBlockId ? " ^" + md5(o.text) : ''}\n\n`
				}
			})

			
			const readingNotePath = this.settings.readingNoteToFolder + '/' + file.name
			const readingNoteFile = this.app.vault.getAbstractFileByPath(readingNotePath)

			if (readingNoteFile) {
				const sourceContent = await this.app.vault.cachedRead(readingNoteFile as TFile)
				if (sourceContent !== content) {
					this.app.vault.modify(readingNoteFile as TFile, content)
					this.updateMetadata(file)
					this.notice(file.name + ' - 已同步')
				}
			} else {
				this.app.vault.create(readingNotePath, content)
				this.updateMetadata(file)
				this.notice(file.name + ' - 已同步')
			}
		}
	}

	toPolysemy (file: TFile) {
		if (!this.settings.isPolysemyTo) return
		const to = this.app.metadataCache.getFileCache(file)?.frontmatter?.to
		if (to) {
			let filiname = to.match(/\[\[(.*)\]\]/)?.[1]
			let targetFile = this.openFile(this.settings.toPolysemyFolder + '/' + filiname + '.md')
			if (targetFile) {
				const view = this.app.workspace.getLeaf()
				const LastOpenFiles = this.app.workspace.getLastOpenFiles()
				if (LastOpenFiles[1] !== file.path) {
					view.openFile(targetFile)
					this.notice(`《${file.basename}》是一篇多义笔记，已转跳至《${filiname}》 `)
				}
			}
		}
	}

	updateMetadata (file: TFile) {
		if (this.settings.isFrontmatter) {
			this.updateOutlinkes(file)
			this.updateHighlightsAndThinks(file)
		}
	}

	updateFrontmatter (file: TFile, key: string, value: string | number) {
		this.app.fileManager.processFrontMatter(file, frontmatter => {
			frontmatter[key] = value
		})
	}
	
	updateStatusBar (duration: number, progress: number) {
		this.itemEl.textContent =  `${this.msTo(duration)} ⏱️ ${progress}% ⏳`
	}

	msTo (t: number) {
		const seconds = Math.floor((t / 1000) % 60);
		const minutes = Math.floor((t / (1000 * 60)) % 60);
		const hours = Math.floor((t / (1000 * 60 * 60)));
		return `${hours ? hours +"h" : ""}${minutes ? minutes +"m" : ""}${seconds ? seconds +"s" : ""}`
	}


	async updateOutlinkes (file: TFile) {
		let content = await this.app.vault.cachedRead(file)
		let outlinks = content.match(OUTLINK_EXP) || []
		this.updateFrontmatter(file, 'outlinks', outlinks.length)
	}

	async updateHighlightsAndThinks (file: TFile) {
		let content = await this.app.vault.cachedRead(file)
		let highlights = content.match(/==(.+?)==/g) || []
		let thinks = highlights.map(highlight => highlight.match(/%%💬(.+?)💬%%/g)?.length).filter(Boolean).reduce((a, b) => a + b, 0)
		this.updateFrontmatter(file, 'highlights', highlights.length)
		this.updateFrontmatter(file, 'thinks', thinks)
	}

	clearStatusBar () {
		this.itemEl.textContent = ''
	}

	filp (el: HTMLElement) {
		this.settings.isFilp && (el.scrollTop += el.clientHeight + this.settings.filpRevise)
	}

	highlight (editor: Editor, view: MarkdownView) {
		let selection = editor.getSelection()
		let blockId = getBlock(this.app, editor, view.file)
		new InputBox(this.app, async res => {
				res = res ? `%%💬${res}💬%%` : ""
				editor.replaceSelection(`==${selection}${res}%%^${blockId}^%%==`)
			}).open()
	}

	toReadingProgress () {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView)
		if (!view) return
		const file = view.file
		const readingProgress = file && this.app.metadataCache.getFileCache(file)?.frontmatter?.readingProgress
		const targetEl = view.contentEl.querySelector(PREVIEW_VIEW_CLASS)
		if (readingProgress) {
			targetEl.scrollTo({ top: targetEl.scrollHeight * readingProgress / 100})
			this.notice(`已转跳至 ${readingProgress} %`)
		} 
	}

	async selectionByCreateNote (editor: Editor, view: MarkdownView) {
		const filename = editor.getSelection()
		const filepath = this.settings.createNoteToFolder + '/' + filename + '.md'
		editor.replaceSelection( `[[${filename}|${filename}]]`)
		this.app.vault.create(filepath, '---\nempty: true\n---')
	}

	notice (text: string) {
		new Notice(text)
	}

	async dailyQuite () {
		if (!this.settings.isDailyQuite) return

		const form = this.openFile(this.settings.dailyQuiteFrom + '.md')
		const to = this.openFile(this.settings.dailyQuiteTo + '.md')

		if (!form || !to) return
		const content = (await this.app.vault.cachedRead(form)).replace(/---.*?---/gms, '')
		const dailyQuites = content.match(/(?<=^\s*)\S.*\S(?=\s*$)/gm)
		const index = Math.floor(Math.random() * dailyQuites.length)
		const dailyQuite = dailyQuites[index].split('——')
		this.updateFrontmatter(to, 'dailyQuiteText', dailyQuite[0])
		this.updateFrontmatter(to, 'dailyQuiteAuthor', dailyQuite[1])
	}

	openFile (path: string) {
		return this.app.vault.getAbstractFileByPath(path) as TFile
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




