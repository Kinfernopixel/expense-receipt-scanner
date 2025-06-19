import React, { useState } from "react";

function ReceiptUploader({ onImageUpload }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Handle file selection
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      // Pass the file to parent component if needed
      if (onImageUpload) onImageUpload(file);
    }
  };

  // Optionally, add a reset button
  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
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
            style={{ maxWidth: "300px", margin: "1rem 0", border: "1px solid #ccc", borderRadius: "8px" }}
          />
          <div>
            <button onClick={handleReset} style={{ marginTop: "1rem" }}>
              Remove Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReceiptUploader;
