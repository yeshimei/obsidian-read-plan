import {App, Modal, Setting} from 'obsidian';

export class Confirm extends Modal {
    text: string
	onSubmit: (result: boolean) => void;
  
	constructor(app: App, text: string, onSubmit: (result: boolean) => void) {
	  super(app);
	  this.onSubmit = onSubmit;
      this.text = text
	}
  
	onOpen() {
	  	const { contentEl } = this;
	  
        contentEl.createEl('h2', { text: this.text})
	  	
		new Setting(contentEl)
            .addButton((btn) =>
            btn
                .setButtonText("确认")
                .setCta()
                .onClick(() => {
                this.close();
                this.onSubmit(true);
                }))
            .addButton((btn) =>
            btn
                .setButtonText("取消")
                .setCta()
                .onClick(() => {
                this.close();
                this.onSubmit(false);
                }));    
	}
  
	onClose() {
	  let { contentEl } = this;
	  contentEl.empty();
	}
  }
