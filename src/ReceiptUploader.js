import React, { useState } from "react";
import Tesseract from "tesseract.js";

function getCategory({ merchant, ocrText }) {
  // Lowercase all for easy matching
  const text = `${merchant} ${ocrText}`.toLowerCase();
  if (text.match(/uber|lyft|taxi|bus|train|flight|airlines|transport|taxi/i)) return "Travel";
  if (text.match(/starbucks|coffee|cafe|restaurant|bar|diner|pizza|food|eat|burger|sandwich|grill|mcdonald|subway|kfc|popeyes|noodle|bistro|tea|drink/i)) return "Food & Drink";
  if (text.match(/walmart|costco|supermarket|grocery|target|aldi|kroger|groceries|market/i)) return "Groceries";
  if (text.match(/hotel|motel|inn|airbnb|hostel/i)) return "Lodging";
  if (text.match(/pharmacy|medic|drugstore|walgreens|rite aid|cvs/i)) return "Pharmacy/Health";
  if (text.match(/amazon|shopping|clothes|apparel|shoes|fashion|store|mall/i)) return "Shopping";
  if (text.match(/gas|petrol|fuel|shell|chevron|exxon/i)) return "Gas/Transport";
  if (text.match(/utility|electric|water|bill|internet|cable|comcast|at&t|verizon/i)) return "Utilities";
  return "Other";
}

// Helper function to parse total, date, and merchant from OCR text
function parseReceiptFields(text) {
  // Split into lines, clean up whitespace
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // --- Total ---
  let total = "";
    // First, look for a line with 'total', 'amount', or 'balance' and a currency/number
    for (const line of lines) {
    if (/(total|amount|balance|grand total|subtotal)/i.test(line)) {
        // Get the last number in the line (usually the total is last)
        const matches = [...line.matchAll(/([\d]+[\d.,]*)/g)];
        if (matches.length) {
        total = matches[matches.length - 1][1];
        break;
        }
    }
    }

    // Fallback: pick the largest number between $1 and $1000 (most receipts)
    if (!total) {
    const amounts = lines.flatMap(line =>
        Array.from(line.matchAll(/([\d]+[\d.,]+)/g), m =>
        parseFloat(m[1].replace(/,/g, ''))
        )
    ).filter(num => num >= 1 && num <= 1000); // Filter sensible totals
    if (amounts.length) total = Math.max(...amounts).toFixed(2);
    }

  // --- Date ---
  let date = "";
  for (const line of lines) {
    const match = line.match(
      /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/
    );
    if (match) {
      date = match[0];
      break;
    }
  }

  // --- Merchant ---
  let merchant = lines.length > 0 ? lines[0] : "";
  if (lines.length > 1 && lines[1].length < 30) merchant += " " + lines[1];

  // --- Category ---
  const category = getCategory({ merchant, ocrText: text });

  return { total, date, merchant, category };
}

function ReceiptUploader({ onImageUpload }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsedFields, setParsedFields] = useState({
    total: "",
    date: "",
    merchant: "",
    category: "",
  });

  // Handle file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setOcrText(""); // reset
      setParsedFields({ total: "", date: "", merchant: "" }); // reset
      if (onImageUpload) onImageUpload(file);

      // Run OCR on the image
      runOCR(file);
    }
  };

  // OCR function using Tesseract.js
  const runOCR = (file) => {
    setLoading(true);
    Tesseract.recognize(file, "eng", {
      logger: (m) => {
        // You could show progress here if desired
      },
    })
      .then(({ data: { text } }) => {
        setOcrText(text);
        // Parse fields after OCR
        const parsed = parseReceiptFields(text);
        setParsedFields(parsed);
        setLoading(false);
      })
      .catch((err) => {
        setOcrText("Failed to extract text.");
        setParsedFields({ total: "", date: "", merchant: "" });
        setLoading(false);
      });
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setOcrText("");
    setParsedFields({ total: "", date: "", merchant: "" });
    if (onImageUpload) onImageUpload(null);
  };

  return (
    <div style={{ margin: "2rem auto", textAlign: "center" }}>
      <h2>Upload Receipt Image</h2>
      <input
        type="file"
        accept="image/png, image/jpeg, image/jpg"
        onChange={handleImageChange}
        style={{ margin: "1rem 0" }}
      />
      {previewUrl && (
        <div>
          <img
            src={previewUrl}
            alt="Receipt Preview"
            style={{
              maxWidth: "300px",
              margin: "1rem 0",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          />
          <div>
            <button onClick={handleReset} style={{ marginTop: "1rem" }}>
              Remove Image
            </button>
          </div>
        </div>
      )}
      {loading && <p>Extracting text, please wait...</p>}
      {ocrText && (
        <div style={{ marginTop: "1.5rem" }}>
          <h3>Extracted Text:</h3>
          <pre
            style={{
              background: "#f8f8f8",
              padding: "1rem",
              textAlign: "left",
              borderRadius: "6px",
              maxWidth: "400px",
              margin: "0 auto",
              overflowX: "auto",
            }}
          >
            {ocrText}
          </pre>
        </div>
      )}
      {(parsedFields.total || parsedFields.date || parsedFields.merchant) && (
        <div style={{ marginTop: "1.5rem" }}>
            <h3>Parsed Fields:</h3>
            <div>
            <b>Merchant:</b> {parsedFields.merchant || "Not found"}
            </div>
            <div>
            <b>Date:</b> {parsedFields.date || "Not found"}
            </div>
            <div>
            <b>Total:</b> {parsedFields.total || "Not found"}
            </div>
            <div>
            <b>Category:</b> {parsedFields.category || "Other"}
            </div>
        </div>
        )}
    </div>
  );
}

export default ReceiptUploader;
