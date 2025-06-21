import React, { useState } from "react";
import Tesseract from "tesseract.js";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

// --- OLLAMA LLM CLASSIFIER ---
async function classifyWithOllama(text) {
    const prompt = `Classify the following receipt into one and only one of these categories: 
  - Food & Drink
  - Groceries
  - Travel
  - Shopping
  - Gas
  - Utilities
  - Health
  - Other

  Give ONLY the category name, nothing else.

  Receipt text:
  ${text}

  Category:`;

  console.log("Sending prompt to Ollama:", prompt);

  try {
    const response = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "llama3",
        prompt: prompt,
        stream: false
      }
    );
    console.log("Ollama response:", response.data);
    return response.data.response ? response.data.response.trim() : "";
  } catch (error) {
    console.error("Ollama error:", error);
    return ""; // fallback will happen in runOCR
  }
}

// --- Categorization helper (fallback) ---
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

  // --- Category (fallback, overwritten by LLM if working) ---
  const category = getCategory({ merchant, ocrText: text });

  return { total, date, merchant, category };
}

const COLORS = ["#8884d8", "#5ad1b0", "#ffc658", "#f89253", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

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
  const [receipts, setReceipts] = useState([]);

  // --- Handle file selection ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setOcrText("");
      setParsedFields({ total: "", date: "", merchant: "", category: "" });
      if (onImageUpload) onImageUpload(file);
      runOCR(file);
    }
  };

  // --- OCR + LLM ---
  const runOCR = async (file) => {
    setLoading(true);
    try {
      const { data: { text } } = await Tesseract.recognize(file, "eng");
      setOcrText(text);
      const parsed = parseReceiptFields(text);
      let aiCategory = parsed.category;
      try {
        aiCategory = await classifyWithOllama(text);
        console.log("Category from Ollama:", aiCategory);
      } catch (e) {
        console.error("Falling back to rule-based category");
      }
      setParsedFields({ ...parsed, category: aiCategory });
      setLoading(false);
    } catch (err) {
      setOcrText("Failed to extract text.");
      setParsedFields({ total: "", date: "", merchant: "", category: "" });
      setLoading(false);
    }
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

  // Fancy Styles
  const glassCard = {
    background: "rgba(255, 255, 255, 0.88)",
    boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.10)",
    borderRadius: "1.5rem",
    padding: "2.2rem",
    margin: "2rem auto",
    maxWidth: 530,
    border: "1.5px solid rgba(255, 255, 255, 0.18)"
  };

  const fancyButton = {
    background: "linear-gradient(90deg, #7f7fd5 0%, #86a8e7 100%)",
    color: "#fff",
    padding: "0.65rem 2rem",
    fontWeight: 700,
    border: "none",
    borderRadius: "1.25rem",
    cursor: "pointer",
    marginTop: "1.2rem",
    fontSize: "1rem",
    boxShadow: "0 2px 8px rgba(120,130,255,0.13)",
    transition: "background 0.2s"
  };

  const uploadLabel = {
    display: "inline-block",
    background: "linear-gradient(90deg, #a18cd1 0%, #fbc2eb 100%)",
    color: "#222",
    fontWeight: 600,
    padding: "0.85rem 2rem",
    borderRadius: "2rem",
    cursor: "pointer",
    boxShadow: "0 2px 6px rgba(220, 220, 255, 0.13)",
    fontSize: "1.1rem",
    letterSpacing: "0.05rem"
  };

  const inputHidden = { display: "none" };

return (
  <div style={{
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    fontFamily: "'Inter', 'Poppins', sans-serif",
    padding: "0 0 3rem 0"
  }}>
    <div style={glassCard}>
      <h2 style={{ fontWeight: 800, fontSize: "2rem", marginBottom: "1.7rem", letterSpacing: "0.01em" }}>
        📸 Smart Receipt Uploader
      </h2>
      {/* Upload input */}
      <label htmlFor="receipt-upload" style={uploadLabel}>
        {selectedImage ? "Change Receipt Image" : "Upload Receipt Image"}
      </label>
      <input
        type="file"
        id="receipt-upload"
        accept="image/png, image/jpeg, image/jpg"
        style={inputHidden}
        onChange={handleImageChange}
      />
      {/* Image Preview */}
      {previewUrl && (
        <div style={{ margin: "1.5rem 0 1rem 0" }}>
          <img
            src={previewUrl}
            alt="Receipt Preview"
            style={{
              maxWidth: "90%",
              boxShadow: "0 4px 22px rgba(150, 150, 255, 0.15)",
              border: "1.5px solid #eee",
              borderRadius: "1rem",
            }}
          />
          <div>
            <button onClick={handleReset} style={{ ...fancyButton, background: "#fff", color: "#7f7fd5", border: "1px solid #aaa", marginTop: "1.2rem" }}>
              ❌ Remove Image
            </button>
          </div>
        </div>
      )}
      {loading && (
        <div style={{ margin: "2rem auto" }}>
          <div className="loader" style={{
            width: "48px", height: "48px", border: "6px solid #f3f3f3", borderTop: "6px solid #8884d8",
            borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto"
          }} />
          <style>{`@keyframes spin { 0% {transform:rotate(0deg);} 100% {transform:rotate(360deg);} }`}</style>
          <div style={{ marginTop: "1rem", color: "#8884d8", fontWeight: 600 }}>
            Extracting text, please wait...
          </div>
        </div>
      )}
      {/* Extracted Text */}
      {ocrText && (
        <div style={{
          background: "#f4f8fb", borderRadius: "0.8rem", margin: "1.5rem auto 1rem auto",
          boxShadow: "0 1px 8px #e9e9fc", padding: "1.1rem", maxWidth: "400px"
        }}>
          <h3 style={{ fontWeight: 700, color: "#6569b7" }}>Extracted Text</h3>
          <pre style={{
            background: "#f9f9fe", color: "#222", fontSize: "0.98rem", padding: "0.6rem",
            borderRadius: "0.5rem", whiteSpace: "pre-wrap", overflowX: "auto"
          }}>
            {ocrText}
          </pre>
        </div>
      )}
      {/* Parsed Fields */}
      {(parsedFields.total || parsedFields.date || parsedFields.merchant) && (
        <div style={{
          background: "#f8faff",
          borderRadius: "1rem",
          padding: "1rem 1.3rem",
          boxShadow: "0 1px 8px #e9e9fc",
          margin: "1.8rem 0 1.2rem 0"
        }}>
          <h3 style={{ fontWeight: 700, color: "#6e6edb" }}>Parsed Fields</h3>
          <div style={{ margin: "0.6rem 0" }}><b>Merchant:</b> {parsedFields.merchant || "Not found"}</div>
          <div style={{ margin: "0.6rem 0" }}><b>Date:</b> {parsedFields.date || "Not found"}</div>
          <div style={{ margin: "0.6rem 0" }}><b>Total:</b> {parsedFields.total || "Not found"}</div>
          <div style={{ margin: "0.6rem 0" }}><b>Category:</b> <span style={{ color: "#6e6edb" }}>{parsedFields.category || "Other"}</span></div>
          <button
            style={fancyButton}
            onClick={() => {
              setReceipts([...receipts, parsedFields]);
              handleReset();
            }}
          >
            💾 Save Receipt
          </button>
        </div>
      )}
    </div>

    {/* Receipts Table */}
    {receipts.length > 0 && (
      <div style={{ ...glassCard, maxWidth: 740 }}>
        <h2 style={{ fontWeight: 700, fontSize: "1.4rem", marginBottom: "1.2rem" }}>Saved Receipts</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "1rem", borderRadius: "1rem", overflow: "hidden" }}>
            <thead>
              <tr style={{ background: "#ececff", color: "#666" }}>
                <th style={{ padding: "0.7rem" }}>Merchant</th>
                <th>Date</th>
                <th>Total</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {receipts.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#f8faff" : "#f3f4fa" }}>
                  <td style={{ padding: "0.7rem" }}>{r.merchant}</td>
                  <td>{r.date}</td>
                  <td>${r.total}</td>
                  <td><span style={{
                    background: "#ececff", color: "#7f7fd5", padding: "0.3rem 0.8rem",
                    borderRadius: "1rem", fontWeight: 600
                  }}>{r.category}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* Bar Chart */}
    {receipts.length > 0 && (
      <div style={{ ...glassCard, maxWidth: 560, background: "rgba(255,255,255,0.95)" }}>
        <h2 style={{ fontWeight: 700, color: "#5252be", fontSize: "1.2rem" }}>Spending by Category</h2>
        <ResponsiveContainer width="100%" height={270}>
          <BarChart data={data}>
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip wrapperStyle={{ borderRadius: "0.7rem", background: "#f6f8ff", color: "#333" }} />
            <Legend />
            <Bar dataKey="total">
              {data.map((entry, idx) => (
                <Cell key={`cell-bar-${idx}`} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )}

    {/* Pie Chart */}
    {receipts.length > 0 && (
      <div style={{ ...glassCard, maxWidth: 400 }}>
        <h2 style={{ fontWeight: 700, color: "#5252be", fontSize: "1.2rem" }}>Spending Distribution</h2>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={85}
              label
              isAnimationActive
            >
              {data.map((entry, idx) => (
                <Cell key={`cell-pie-${idx}`} fill={COLORS[idx % COLORS.length]} />
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
