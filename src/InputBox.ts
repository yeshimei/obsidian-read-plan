import {App, Modal, Setting} from 'obsidian';

export class InputBox extends Modal {
	result: string;
	onSubmit: (result: string) => void;
  
	constructor(app: App, onSubmit: (result: string) => void) {
	  super(app);
	  this.onSubmit = onSubmit;
	}
  
	onOpen() {
	  	const { contentEl } = this;
	  
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
			  this.onSubmit(this.result);
			}));
	}
  
	onClose() {
	  let { contentEl } = this;
	  contentEl.empty();
	}
  }
