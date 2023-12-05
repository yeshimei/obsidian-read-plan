import {App, Modal, Setting} from 'obsidian'

export class InputBox extends Modal {
	result: string
	text: string
	onSubmit: (result: string) => void
  
	constructor(app: App, text: string, onSubmit: (result: string) => void) {
	  super(app)
	  this.onSubmit = onSubmit
	  this.text = text
	}
  
	onOpen() {
	  	const { contentEl } = this
	  
	  	new Setting(contentEl)
		  	.setDesc(this.text)
		new Setting(contentEl)	
			.addText((text) =>
		  		text.onChange((value) => {
				this.result = value
		  	}))
		new Setting(contentEl)		
			.addButton((btn) =>
			btn
				.setButtonText("写想法")
				.setCta()
				.onClick(() => {
				this.close();
				this.onSubmit(this.result)
				}))
	}
  
	onClose() {
	  let { contentEl } = this
	  contentEl.empty()
	}
  }
