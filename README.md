# 🧾 Expense Receipt Scanner

A free, private, and AI-powered web app for fast expense tracking.  
**Snap, scan, and instantly categorize your receipts using local LLMs (Ollama) and OCR.**

---

## 🚀 Features

- **📸 Image Upload & Preview**  
  Upload or drag-and-drop receipt images (JPG, PNG).

- **🔎 Optical Character Recognition (OCR)**  
  Uses Tesseract.js to extract text from receipt images right in your browser (no server needed).

- **🤖 AI Receipt Categorization with Ollama**  
  - Integrates with [Ollama](https://ollama.com/) to use local LLMs (e.g., Llama 3) for smart, private receipt classification.
  - Prompts the AI to classify each receipt into one of:  
    `Food & Drink, Groceries, Shopping, Travel, Gas, Utilities, Health, Other`.
  - No data ever leaves your computer.

- **🛡️ Rule-Based Fallback**  
  If LLM isn’t running, falls back to reliable keyword-based category detection.

- **📋 Parsed Receipt Details**  
  Automatically extracts and displays:
  - **Merchant Name**
  - **Date**
  - **Total Amount**
  - **AI-Detected Category**

- **💾 Save Receipts & View History**  
  - Save parsed receipts to a session list.
  - See all receipts in a sortable table (merchant, date, amount, category).

- **📊 Interactive Analytics Dashboard**
  - **Bar Chart:** Spending by category.
  - **Pie Chart:** Spending distribution (visual breakdown).

- **🔐 100% Free & Local**  
  - No API costs, no cloud backend, no data ever leaves your device.

---

## 🦙 How AI Integration Works

- After extracting receipt text via OCR, the app sends the text to your local Ollama server (using the Llama 3 model by default).
- Ollama’s LLM returns the best-fit category for the receipt based on the merchant, items, and total.
- If Ollama is not running, a built-in rules engine classifies the receipt.
