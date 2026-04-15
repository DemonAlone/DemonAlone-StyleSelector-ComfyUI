# DemonAlone-StyleSelector-ComfyUI

> 🎨 **Prompt Style Selector** with Preview, Multiple Selecting, Search and Local Base for ComfyUI.
<img width="1118" height="1112" alt="1" src="https://github.com/user-attachments/assets/198c3b57-6466-498a-8f16-2f44754011a3" />

<div align="center">

[🚧 In Development]

</div>

## 📖 About

This ComfyUI extension allows you to manage local style presets directly within the interface. It features a real-time preview, multi-select functionality, search capabilities, and integration with your local prompt base files.

**⚠️ Status:** This extension is still in progress. Features and UI may change in upcoming updates.

---

## 🛠 How to Add Your Own Style

To add custom styles, you need to configure two specific elements: the `styles.json` file and the image preview folder.

### 1. Edit `styles.json`
Add a record to your `styles.json` file using the following JSON structure:

```json
{
    "name": "The name of your style",
    "positive": "A positive for the style",
    "negative_prompt": "Negative for this style"
}
```

### 2. Add Preview Images
Add an image to the styles folder (e.g., style/).

Supported formats: .png, .jpg, .jpeg, .webp.
Resolution: Dimensions and proportions do not matter. I suggest creating images of 256x256 dimensions in JPG format.
Naming: The image name must match the name field in styles.json exactly (including capitalization).
💡 Tip: You can put multiple files with the same name (e.g., style.png, slyle.jpg) to create duplicate previews for the same style.

### 3. Reload
After editing and adding files, you must reload the node:

Restart ComfyUI OR refresh the browser poge is not necessery page but reloading will reset the node size to default (this bug is being worked on).

🚫 Troubleshooting
If your image does not show a tooltip with prompts, or if you see an error message in the console:

DA_StyleSelector: Style 'YOUR STYLE NAME' not found in styles.json

Ensure capitalization matches exactly (e.g., Cyberpunk vs cyberpunk).

## ⚠️ Important Warning for Upcoming Updates
Please make a backup of your files!
This includes your custom styles.json and any added images in the styles folder. I plan to improve compatibility features in future versions, but currently, updates may overwrite your local configuration or revert the node state. Backing up prevents accidental data loss.

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
