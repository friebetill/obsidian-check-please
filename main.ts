import {
	Editor,
	Plugin,
	TFile
} from "obsidian";

import {
	RangeSetBuilder
} from "@codemirror/state";

import {
	syntaxTree
} from "@codemirror/language";

import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
	WidgetType
} from "@codemirror/view";

class CheckboxWidget extends WidgetType {
	checked: boolean;
	view: EditorView;
	start: number;
	end: number;

	constructor(checked: boolean, view: EditorView, start: number, end: number) {
		super();
		this.checked = checked;
		this.view = view;
		this.start = start;
		this.end = end;
	}

	toDOM() {
		const input = document.createElement("input");
		input.type = "checkbox";
		input.checked = this.checked;
		input.style.cursor = "pointer";
		input.style.margin = "0 4px 0 0";

		input.addEventListener('click', (e) => {
			e.stopPropagation();

			// Update the checkbox in the editor
			this.view.dispatch(
				this.view.state.update({
					changes: {
						from: this.start + 1, // Position of the checkbox state character (after [)
						to: this.start + 2,
						insert: input.checked ? "x" : " "
					}
				})
			);
		});

		return input;
	}
}

class CheckPleaseViewPlugin implements PluginValue {
	decorations: DecorationSet;

	constructor(view: EditorView) {
		this.decorations = this.buildDecorations(view);
	}

	update(update: ViewUpdate) {
		if (update.docChanged || update.viewportChanged) {
			this.decorations = this.buildDecorations(update.view);
		}
	}

	buildDecorations(view: EditorView) {
		// Check if this looks like source mode by examining the document structure
		const fullDoc = view.state.doc.toString();

		// In Live Preview (Normal mode), we need to handle two cases:
		// 1. Cell editing mode (isolated cell content)
		// 2. Full document mode (complete table structure)
		const hasTableContent = fullDoc.includes('|');
		const isCellEditingMode = !hasTableContent && fullDoc.includes('[');

		const builder = new RangeSetBuilder<Decoration>();
		let totalDecorationsAdded = 0;

		if (isCellEditingMode) {
			// Cell editing mode - process visible ranges for direct checkbox content
			for (const { from, to } of view.visibleRanges) {
				const content = view.state.doc.slice(from, to).toString();
				const beforeCount = totalDecorationsAdded;
				this.processCheckboxesInContent(content, from, builder, view);
				totalDecorationsAdded = beforeCount; // We'll count this in the process function
			}
		} else if (hasTableContent) {
			// Full document mode - process entire document to avoid range issues
			totalDecorationsAdded = this.processCheckboxesInTable(fullDoc, 0, view.state.doc.length, builder, view);
		}

		const decorationSet = builder.finish();
		return decorationSet;
	}

	processCheckboxesInContent(content: string, offset: number, builder: RangeSetBuilder<Decoration>, view: EditorView) {
		const checkboxRegex = /\[[ xX]\]/g;
		let match;

		while ((match = checkboxRegex.exec(content)) !== null) {
			const isChecked = match[0] === '[x]' || match[0] === '[X]';
			const start = offset + match.index;
			const end = start + match[0].length;

			// Only skip if cursor is exactly inside the checkbox characters
			const cursorPos = view.state.selection.main.head;
			if (cursorPos > start && cursorPos < end) {
				continue;
			}

			builder.add(
				start,
				end,
				Decoration.replace({
					widget: new CheckboxWidget(isChecked, view, start, end),
				})
			);
		}
	}

	processCheckboxesInTable(content: string, from: number, to: number, builder: RangeSetBuilder<Decoration>, view: EditorView) {
		// Collect all checkbox decorations first, then sort them
		const checkboxDecorations: Array<{start: number, end: number, decoration: Decoration}> = [];

		// Use syntax tree to find table rows and then look for checkboxes
		let nodeCount = 0;
		let tableRowCount = 0;

		syntaxTree(view.state).iterate({
			from,
			to,
			enter(node: any) {
				nodeCount++;

				if (node.type.name.includes("table-row")) {
					tableRowCount++;
					const rowContent = view.state.doc.slice(node.from, node.to).toString();

					// Look for checkboxes in this table row
					const checkboxRegex = /\[[ xX]\]/g;
					let match;

					while ((match = checkboxRegex.exec(rowContent)) !== null) {
						const isChecked = match[0] === '[x]' || match[0] === '[X]';
						const start = node.from + match.index;
						const end = start + match[0].length;

						// Only skip if cursor is exactly inside the checkbox characters
						const cursorPos = view.state.selection.main.head;
						if (cursorPos > start && cursorPos < end) {
							continue;
						}

						// Collect decoration instead of adding immediately
						checkboxDecorations.push({
							start: start,
							end: end,
							decoration: Decoration.replace({
								widget: new CheckboxWidget(isChecked, view, start, end),
							})
						});
					}
				}
			},
		});

		// Sort decorations by start position and add them to builder
		checkboxDecorations.sort((a, b) => a.start - b.start);

		checkboxDecorations.forEach((deco, index) => {
			builder.add(deco.start, deco.end, deco.decoration);
		});

		return checkboxDecorations.length;
	}
}

export default class CheckPlease extends Plugin {
	onload() {
		// Register the CodeMirror extension for Normal mode (Live Preview)
		this.registerEditorExtension([
			ViewPlugin.fromClass(
				CheckPleaseViewPlugin,
				{
					decorations: (value: CheckPleaseViewPlugin) => value.decorations
				}
			)
		]);

		// Register markdown post-processor for Reading mode
		this.registerMarkdownPostProcessor((element, context) => {
			// Find all table cells that contain checkboxes
			const tableCells = element.querySelectorAll('td, th');

			tableCells.forEach((cell, cellIndex) => {
				const cellText = cell.textContent || '';

				// Look for checkbox patterns in the cell text
				const checkboxRegex = /\[[ xX]\]/g;
				let match;
				let hasCheckboxes = false;

				while ((match = checkboxRegex.exec(cellText)) !== null) {
					hasCheckboxes = true;
				}

				if (hasCheckboxes) {
					// Get the row context for unique identification
					const row = cell.closest('tr');
					const rowText = row ? row.textContent || '' : '';
					const cellPosition = Array.from(row?.children || []).indexOf(cell);

					// Replace text content with interactive checkboxes
					let newHTML = cellText;

					// Reset regex
					checkboxRegex.lastIndex = 0;

					// Replace each checkbox with an actual input element
					newHTML = newHTML.replace(/\[[ xX]\]/g, (checkboxMatch, offset) => {
						const isChecked = checkboxMatch === '[x]' || checkboxMatch === '[X]';

						// Create unique context using row text + cell position + checkbox position within cell
						const contextKey = `ROW:${rowText}|CELL:${cellPosition}|OFFSET:${offset}|CHECKBOX:${checkboxMatch}`;

						// Create the checkbox HTML with event handling
						return `<input type="checkbox" ${isChecked ? 'checked' : ''}
							style="cursor: pointer; margin: 0 4px 0 0;"
							data-context="${encodeURIComponent(contextKey)}"
							data-original="${checkboxMatch}"
							onchange="this.dispatchEvent(new CustomEvent('obsidian-checkbox-change', {
								bubbles: true,
								detail: {
									checked: this.checked,
									originalText: this.getAttribute('data-original'),
									contextKey: decodeURIComponent(this.getAttribute('data-context'))
								}
							}))">`;
					});

					cell.innerHTML = newHTML;
				}
			});

			// Listen for checkbox changes
			element.addEventListener('obsidian-checkbox-change', (event: CustomEvent) => {
				const { checked, originalText, contextKey } = event.detail;
				const newCheckboxText = checked ? '[x]' : '[ ]';

				// Parse the context key to get row and position info
				const contextParts = contextKey.split('|');
				const rowText = contextParts[0].replace('ROW:', '');
				const cellPosition = parseInt(contextParts[1].replace('CELL:', ''));
				const offset = parseInt(contextParts[2].replace('OFFSET:', ''));
				const originalCheckbox = contextParts[3].replace('CHECKBOX:', '');

				// Find the source file and update it
				const sourceFile = this.app.workspace.getActiveFile();
				if (sourceFile) {
					this.app.vault.read(sourceFile).then(content => {
						// Find the line that contains this row's identifying text and checkbox
						const lines = content.split('\n');
						let targetLineIndex = -1;

						// Extract key words from row text for matching
						const cleanRowText = rowText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
						const keyWords = cleanRowText.split(' ').filter((word: string) =>
							word.length > 2 &&
							!['[x]', '[ ]'].includes(word) &&
							!word.match(/^\d+$/) // exclude pure numbers
						);

						// Find all potential matches and score them
						const potentialMatches: Array<{lineIndex: number, line: string, matchScore: number, matchedWords: string[]}> = [];

						for (let i = 0; i < lines.length; i++) {
							const line = lines[i];

							// Check if this line is a table row with the checkbox
							if (line.includes('|') && line.includes(originalCheckbox)) {
								// Try to match key words from the row context
								const lineWords = line.toLowerCase().split(/[\s|]+/).filter(w => w.length > 2);
								const matchedWords = keyWords.filter((word: string) =>
									lineWords.some(lineWord =>
										lineWord.includes(word.toLowerCase()) ||
										word.toLowerCase().includes(lineWord)
									)
								);

								if (matchedWords.length > 0) {
									// Double-check by verifying cell position and checkbox
									const lineCells = line.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell !== '');

									if (cellPosition < lineCells.length) {
										const targetCell = lineCells[cellPosition];
										if (targetCell.includes(originalCheckbox)) {
											potentialMatches.push({
												lineIndex: i,
												line: line,
												matchScore: matchedWords.length,
												matchedWords: matchedWords
											});
										}
									}
								}
							}
						}

						// Select the best match (highest score, or if tied, prefer exact matches)
						if (potentialMatches.length > 0) {
							// Sort by match score (descending), then by line index (ascending for consistency)
							potentialMatches.sort((a, b) => {
								if (a.matchScore !== b.matchScore) {
									return b.matchScore - a.matchScore; // Higher score first
								}
								return a.lineIndex - b.lineIndex; // Earlier line if tied
							});

							const bestMatch = potentialMatches[0];
							targetLineIndex = bestMatch.lineIndex;
						}

						if (targetLineIndex >= 0) {
							const targetLine = lines[targetLineIndex];

							// For precise replacement, we need to find the correct checkbox by position
							const lineCells = targetLine.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell !== '');

							if (cellPosition < lineCells.length) {
								const targetCell = lineCells[cellPosition];

								// Find all checkboxes in this cell to determine which one to replace
								const checkboxMatches = Array.from(targetCell.matchAll(/\[[ xX]\]/g));

								if (checkboxMatches.length > 1) {
									// Multiple checkboxes in cell - find the one at the correct offset
									let replacementMade = false;
									let updatedCell = targetCell;

									// Find the checkbox at the correct offset (with some tolerance)
									for (const match of checkboxMatches) {
										if (match.index !== undefined &&
											Math.abs(match.index - offset) <= 2 &&
											match[0] === originalCheckbox) {

											// Replace this specific checkbox
											updatedCell = targetCell.substring(0, match.index) +
														newCheckboxText +
														targetCell.substring(match.index + 3);
											replacementMade = true;
											break;
										}
									}

									if (replacementMade) {
										// Rebuild the line with the updated cell
										lineCells[cellPosition] = updatedCell;
										const updatedLine = '| ' + lineCells.join(' | ') + ' |';

										lines[targetLineIndex] = updatedLine;
										const updatedContent = lines.join('\n');
										this.app.vault.modify(sourceFile, updatedContent);
									} else {
										// Fallback to simple replacement
										const updatedLine = targetLine.replace(originalCheckbox, newCheckboxText);
										if (updatedLine !== targetLine) {
											lines[targetLineIndex] = updatedLine;
											const updatedContent = lines.join('\n');
											this.app.vault.modify(sourceFile, updatedContent);
										}
									}
								} else {
									// Single checkbox in cell - safe to use simple replacement
									const updatedLine = targetLine.replace(originalCheckbox, newCheckboxText);

									if (updatedLine !== targetLine) {
										lines[targetLineIndex] = updatedLine;
										const updatedContent = lines.join('\n');
										this.app.vault.modify(sourceFile, updatedContent);
									}
								}
							}
						} else {
							// Fallback to simple replacement
							const updatedContent = content.replace(originalCheckbox, newCheckboxText);
							if (updatedContent !== content) {
								this.app.vault.modify(sourceFile, updatedContent);
							}
						}
					});
				}
			});
		});

		// Clean up annotations when files are opened
		this.registerEvent(
			this.app.workspace.on(
				"file-open",
				(file: TFile) => {
					if (!file || file.extension !== "md") {
						return;
					}

					const editor = this.app.workspace.activeEditor?.editor;
					if (!editor) {
						return;
					}

					// Clean up any existing annotations from previous plugin versions
					this.cleanupAnnotations(editor);
				}
			)
		);
	}

	// Clean up any existing annotations from previous plugin versions
	cleanupAnnotations(editor: Editor) {
		const content = editor.getValue();

		// Remove annotation patterns like {4}{11} but keep the checkboxes
		const cleanedContent = content.replace(/\{\d+\}\{\d+\}/g, '');

		if (cleanedContent !== content) {
			editor.setValue(cleanedContent);
		}
	}
}