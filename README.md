# DemonAlone-StyleSelector-ComfyUI

> 🎨 **Prompt Style Selector** with Preview, Multiple Selecting, Search and Local Base for ComfyUI.
<img width="990" height="988" alt="1" src="https://github.com/user-attachments/assets/b250a062-5670-459d-8184-79db3f554715" />

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
Resolution: Dimensions and proportions do not matter. Suggested size: 256x256. Format JPG is recommended.
Naming: The image filename must match the name field in `styles.json` exactly (case-sensitive). For example: `Cyberpunk.jpg`.

### 4. Load and Refresh Changes
After editing styles.json or adding new images, you need to refresh the node:

* Update List & Previews: Press the "Refresh style list" button inside the ComfyUI interface. This will update both the dropdown menu and the preview images instantly.
* New Base (First Time): When creating a brand new base for the very first time, press "Refresh style list", then perform a full page reload (F5 or Ctrl+R) to ensure the new base appears in the ComfyUI dropdown menu.

## ⚠️ Cleanup & Behavior Notes
* Deleting Previews: If you delete an image from the previews folder, the style will remain in the node's "Selected" area. To remove it from the selection list entirely, you must press the "Clear selected style" button.
* Multiple Databases: You cannot use styles from different base folders simultaneously within a single node instance.
* Workaround for Multiple Prompts: If you need to combine prompts from different bases, you can duplicate the node in your workflow and place them next to each other connected by a concat node to merge the final prompt.

## 🚧 Troubleshooting
If your image does not show a tooltip with prompts, or if you see an error message in the console:

    DA_StyleSelector: Style 'YOUR STYLE NAME' not found in styles.json
* Ensure capitalization matches exactly (e.g., Cyberpunk vs cyberpunk).
* Verify the JSON syntax is correct and valid.

### Page Reload Behavior
While simple refresh works for most updates, remember that the initial registration of a new database folder may require a browser reload after pressing "Refresh style list".

## 🏛 Credits & Acknowledgments
This extension is built upon existing open-source projects:

Image Gallery Loader logic based on [ComfyUi-ImageGalleryLoader](https://github.com/BigStationW/ComfyUi-ImageGalleryLoader).

Easy-use Style Selector node inspired by the Insired [Easy-use](https://github.com/yolain/ComfyUI-Easy-Use) Style selector.
Base styles (styles.json) derived from sdxl_styles_sai.json and sdxl_styles_twri.json from [sdxl_prompt_styler](https://github.com/twri/sdxl_prompt_styler).
## 🤖 AI Assistance
This project was created with significant assistance from AI models:

Google Gemini / Gemma
Qwen 3.5
DeepSeek v3

### 🖼️ The images were made on vanilla SDXL 1.0
