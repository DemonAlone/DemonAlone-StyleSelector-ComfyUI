
# DemonAlone-StyleSelector-ComfyUI

> 🎨 **Prompt Style Selector** with Preview, Multiple Selecting, Search and Local Base for ComfyUI.
<img width="873" height="785" alt="1111" src="https://github.com/user-attachments/assets/bf36e901-d4b6-4363-bc4d-9bb06848b69d" />

## 📖 About

This ComfyUI extension allows you to manage local style presets directly within the interface. It features a real-time preview, multi-select functionality, search capabilities, and integration with your local prompt base files.

---

## 🛠 How to Add Your Own Style

To use custom styles or databases, follow this new directory structure and configuration method:

### 1. Create Base Directory
Create a folder named after your database (e.g., `MyStyleBase`) inside the `style_databases` folder in your ComfyUI user directory (`ComfyUI/custom_nodes/DemonAlone-StyleSelector-ComfyUI/...`.

**Path Structure:**

```text
style_databases/
└── [YourBaseName]/
    ├── styles.json
    └── previews/
        ├── style_name_1.jpg
        └── style_name_2.png
```
### 2. Edit styles.json
The styles.json file must be placed directly inside your specific base folder. Add a record using the following JSON structure:

```json
{
    "name": "The name of your style",
    "positive": "A positive for the style",
    "negative_prompt": "Negative for this style"
}
```

### 3. Add Preview Images
Images must be stored inside the previews subfolder of your base directory.

Supported formats: .png, .jpg, .jpeg, .webp
Resolution: Dimensions and proportions do not matter. Suggested size: 256x256. JPG is recommended  for performance.
Naming Rule (Strict): The image filename (without extension) must match the name field in `styles.json` exactly (case-sensitive). For example: `Cyberpunk.jpg`.

## ⚠️ File Naming Constraints
To ensure compatibility across all operating systems (Windows, macOS, Linux), please adhere to the following rules when naming styles and preview images:

*   **Allowed Characters:** Use only standard alphanumeric characters (`a-z`, `A-Z`, `0-9`) and basic symbols like underscores (`_`) or hyphens (`-`).
*   **Forbidden Symbols:** Avoid special characters such as forward slashes (`/`), backslashes (`\`), colons (`:`), asterisks (`*`), question marks (`?`), and quotation marks. These may cause errors depending on your file system.
*   **Matching Names:** Ensure that the `name` field in `styles.json` exactly matches the preview image filename (case-sensitive).

### Recommended Naming Format:
**Example:** `Cyberpunk_Street.jpg` or `Cyberpunk-Street.png`
**Avoid:** `Cyberpunk/Street.jpg` or `Cyberpunk:City.jpg`


### 4. Load and Refresh Changes
After editing styles.json or adding new images, you need to refresh the node:

* Update List & Previews: Press the "Refresh style list and previews" button inside the ComfyUI interface. This will update both the dropdown menu and the preview images instantly.
* New Base (First Time): When creating a brand new base for the very first time, press "Refresh style list", then perform a full page reload (F5 or Ctrl+R) to ensure the new base appears in the ComfyUI dropdown menu.

## ⚠️ Cleanup & Behavior Notes
Deleting Previews: If you delete an image from the previews folder, the style will remain in the node's "Selected" area until you clear it. However, the preview image will disappear.
Removing Styles: To completely remove a style from the selection list, you must delete its entry from styles.json and then press the "Refresh" button.

## 🚧 Troubleshooting
If your image does not show up, or if you see an error message in the console:
Check Console Logs: Look for [DA_StyleSelector] messages in the ComfyUI terminal.
Verify JSON Syntax: Ensure styles.json is valid JSON. A missing comma or bracket will prevent the entire database from loading.
Case Sensitivity: Ensure capitalization matches exactly between styles.json name field and the image filename.
Error example: DA_StyleSelector: Style 'YOUR STYLE NAME' not found in styles.json
    DA_StyleSelector: Style 'YOUR STYLE NAME' not found in styles.json
* Ensure capitalization matches exactly (e.g., Cyberpunk vs cyberpunk).
* Verify the JSON syntax is correct and valid.

### Page Reload Behavior
While simple refresh works for most updates, remember that the initial registration of a new database folder may require a browser reload after pressing "Refresh style list".

## 🏛 Credits & Acknowledgments
This extension is built upon existing open-source projects:

Inspired by **Style Selector** node from [Easy-use](https://github.com/yolain/ComfyUI-Easy-Use) and **Image Gallery Loader** from [ComfyUi-ImageGalleryLoader](https://github.com/BigStationW/ComfyUi-ImageGalleryLoader).
Base styles (styles.json) derived from sdxl_styles_sai.json and sdxl_styles_twri.json from [sdxl_prompt_styler](https://github.com/twri/sdxl_prompt_styler). Few styles based on [EnragedAntelope's gallery](https://enragedantelope.github.io/Styles-FluxDev) and other sources.
## 🤖 AI Assistance
This project was created with significant assistance from AI models:

**Google Gemini / Gemma**, **Qwen**, **DeepSeek**.

### 🖼️ The images for default were made on vanilla SDXL 1.0. The images for modern were made on vanilla Flux2 Klein 9b and z-image turbo.
