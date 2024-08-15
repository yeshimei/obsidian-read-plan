import { App, Editor, TFile } from "obsidian";

export function today(): string {
	let date = new Date();
	let year = date.getFullYear().toString();
	let month = (date.getMonth() + 1).toString();
	let day = date.getDate().toString();
	if (month.length < 2) {
		month = "0" + month;
	}
	if (day.length < 2) {
		day = "0" + day;
	}

	let formattedDate = year + "-" + month + "-" + day;
	return formattedDate;
}

export function sure(obj: any) {
	return obj.filter((o: any, i: any) => {
		if (typeof o === "string") {
			let d = obj[i + 1];
			if (i + 1 >= obj.length) return;
			if (typeof d === "string") {
				if (o.match(/(#*)/)[1].length < d.match(/(#*)/)[1].length) {
					return true;
				}
			} else {
				return true;
			}
		} else {
			return true;
		}
	});
}

export function getBlock(app: App, editor: Editor, file: TFile) {
	const cursor = editor.getCursor("to");
	const fileCache = app.metadataCache.getFileCache(file);
	let block: any = (
		(fileCache === null || fileCache === void 0
			? void 0
			: fileCache.sections) || []
	).find((section) => {
		return (
			section.position.start.line <= cursor.line &&
			section.position.end.line >= cursor.line
		);
	});
	if ((block === null || block === void 0 ? void 0 : block.type) === "list") {
		block = (
			(fileCache === null || fileCache === void 0
				? void 0
				: fileCache.listItems) || []
		).find((item) => {
			return (
				item.position.start.line <= cursor.line &&
				item.position.end.line >= cursor.line
			);
		});
	} else if (
		(block === null || block === void 0 ? void 0 : block.type) === "heading"
	) {
		block = fileCache.headings.find((heading) => {
			return heading.position.start.line === block.position.start.line;
		});
	}

	let blockId = block.id;
	if (!blockId) {
		const sectionEnd = block.position.end;
		const end = {
			ch: sectionEnd.col,
			line: sectionEnd.line,
		};
		const id = generateId();
		const spacer = shouldInsertAfter(block) ? "\n\n" : " ";
		editor.replaceRange(`${spacer}^${id}`, end);
		blockId = id;
	}
	return blockId;
}

function generateId() {
	return Math.random().toString(36).substr(2, 6);
}

function shouldInsertAfter(block: any) {
	if (block.type) {
		return [
			"blockquote",
			"code",
			"table",
			"comment",
			"footnoteDefinition",
		].includes(block.type);
	}
}
