import React, { useState } from "react";
import Tesseract from "tesseract.js";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

// --- Categorization helper ---
function getCategory({ merchant, ocrText }) {
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

// --- Receipt field parser ---
function parseReceiptFields(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // --- Total ---
  let total = "";
  for (const line of lines) {
    if (/(total|amount|balance|grand total|subtotal)/i.test(line)) {
      const matches = [...line.matchAll(/([\d]+[\d.,]*)/g)];
      if (matches.length) {
        total = matches[matches.length - 1][1];
        break;
      }
    }
  }
  if (!total) {
    const amounts = lines.flatMap(line =>
      Array.from(line.matchAll(/([\d]+[\d.,]+)/g), m =>
        parseFloat(m[1].replace(/,/g, ''))
      )
    ).filter(num => num >= 1 && num <= 1000);
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

  // NEW: State for all saved receipts
  const [receipts, setReceipts] = useState([]);

  // Handle file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setOcrText(""); // reset
      setParsedFields({ total: "", date: "", merchant: "", category: "" }); // reset
      if (onImageUpload) onImageUpload(file);
      runOCR(file);
    }
  };

  // OCR function using Tesseract.js
  const runOCR = (file) => {
    setLoading(true);
    Tesseract.recognize(file, "eng", {
      logger: (m) => {},
    })
      .then(({ data: { text } }) => {
        setOcrText(text);
        const parsed = parseReceiptFields(text);
        setParsedFields(parsed);
        setLoading(false);
      })
      .catch((err) => {
        setOcrText("Failed to extract text.");
        setParsedFields({ total: "", date: "", merchant: "", category: "" });
        setLoading(false);
      });
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setOcrText("");
    setParsedFields({ total: "", date: "", merchant: "", category: "" });
    if (onImageUpload) onImageUpload(null);
  };

  // --- Chart Data ---
  const categoryTotals = receipts.reduce((acc, receipt) => {
    const cat = receipt.category || "Other";
    const amt = parseFloat(receipt.total) || 0;
    if (!acc[cat]) acc[cat] = 0;
    acc[cat] += amt;
    return acc;
  }, {});

  const data = Object.entries(categoryTotals).map(([category, total]) => ({
    category,
    total: Number(total.toFixed(2)),
  }));

  // Pie chart colors
  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <div style={{ margin: "2rem auto", textAlign: "center", maxWidth: 800 }}>
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
          <button
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.5rem",
              fontWeight: "bold",
              background: "#8884d8",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
            }}
            onClick={() => {
              setReceipts([...receipts, parsedFields]);
              handleReset();
            }}
          >
            Save Receipt
          </button>
        </div>
      )}

      {/* Saved Receipts Table */}
      {receipts.length > 0 && (
        <div style={{ maxWidth: 700, margin: "2rem auto" }}>
          <h2>Saved Receipts</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", margin: "1rem auto" }}>
            <thead>
              <tr style={{ background: "#f2f2f2" }}>
                <th>Merchant</th>
                <th>Date</th>
                <th>Total</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r, i) => (
                <tr key={i}>
                  <td>{r.merchant}</td>
                  <td>{r.date}</td>
                  <td>{r.total}</td>
                  <td>{r.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Bar Chart */}
      {receipts.length > 0 && (
        <div style={{ maxWidth: 500, margin: "2rem auto" }}>
          <h2>Spending by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Optional: Pie Chart */}
      {receipts.length > 0 && (
        <div style={{ maxWidth: 400, margin: "2rem auto" }}>
          <h2>Spending Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label
              >
                {data.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default ReceiptUploader;
