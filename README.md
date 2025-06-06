# Check Please!

An [Obsidian](https://obsidian.md) plugin that enables interactive checkboxes within table cells, supporting multiple checkboxes per cell.

## Features

- ✅ **Interactive checkboxes in tables** - Click to toggle checkbox states directly in Reading mode and Live Preview
- ✅ **Multiple checkboxes per cell** - Support for multiple checkboxes within a single table cell
- ✅ **Smart targeting** - Each checkbox toggles independently without affecting others
- ✅ **No annotations required** - Clean markdown without additional syntax
- ✅ **Works in all modes** - Reading mode and Normal mode (Live Preview) support

## Usage

Simply add standard Markdown checkboxes (`[x]` or `[ ]`) anywhere in your table cells. No special syntax or annotations needed.

### Single checkbox per cell:
```markdown
| Task                | Status | Priority |
|---------------------|--------|----------|
| Write documentation | [x]    | High     |
| Fix bugs            | [ ]    | Medium   |
| Review code         | [x]    | High     |
```

### Multiple checkboxes per cell:
```markdown
| Category | Items                           |
|----------|---------------------------------|
| Shopping | [x] Milk [x] Bread [ ] Eggs    |
| Coding   | [x] Commit [x] Push [ ] Deploy |
```

## How It Works

The plugin automatically detects checkboxes in table cells and makes them interactive:

- **Reading Mode**: All checkboxes in tables become clickable and update the underlying markdown
- **Normal Mode (Live Preview)**: Checkboxes become interactive when editing focused cells
- **Smart Matching**: Uses context-aware matching to ensure each checkbox toggles the correct one in the source markdown

## Supported Formats

The plugin recognizes these checkbox formats:
- `[ ]` - Unchecked
- `[x]` - Checked
- `[X]` - Checked (uppercase)

## Installation

### Download from GitHub Releases (Recommended)
1. Go to the [Releases section](../../releases) on the right side of this GitHub page
2. Download the latest release zip file
3. Extract the zip file
4. Copy the extracted folder to your `.obsidian/plugins/` directory in your vault
5. Restart Obsidian or reload the plugins
6. Enable "Check Please!" in Settings → Community Plugins

**Note**: Make sure the plugin folder is located at: `YourVault/.obsidian/plugins/obsidian-check-please/`

## Compatibility

- Works with standard Markdown table syntax
- No special annotations or syntax required
- Portable - your markdown files remain clean and readable in other editors

