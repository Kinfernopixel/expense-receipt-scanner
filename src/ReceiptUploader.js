import React, { useState } from "react";
import Tesseract from "tesseract.js";

function ReceiptUploader({ onImageUpload }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setOcrText(""); // reset
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
        // Optionally, you can add progress here
        // console.log(m);
      },
    })
      .then(({ data: { text } }) => {
        setOcrText(text);
        setLoading(false);
      })
      .catch((err) => {
        setOcrText("Failed to extract text.");
        setLoading(false);
      });
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setOcrText("");
    if (onImageUpload) onImageUpload(null);
  };

  return (
    <div style={{ margin: "2rem auto", textAlign: "center" }}>
      <h2>Upload Receipt Image</h2>
      <input
        type="file"
        accept="image/*"
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
    </div>
  );
}

export default ReceiptUploader;
