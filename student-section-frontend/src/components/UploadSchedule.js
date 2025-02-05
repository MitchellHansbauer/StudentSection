import React, { useState } from 'react';
import axios from 'axios';

function UploadSchedule() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');

  // Handle file selection
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  // Handle upload button click
  const handleUpload = () => {
    if (!selectedFile) {
      setUploadMessage("Please select an HTML file to upload.");
      return;
    }
    // Create a FormData object and append the file
    const formData = new FormData();
    formData.append('file', selectedFile);

    axios.post('http://localhost:5000/api/upload_schedule', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    .then(response => {
      setUploadMessage(response.data.message);
    })
    .catch(error => {
      // Handle errors (e.g., missing file or wrong file type)
      setUploadMessage(
        error.response && error.response.data && error.response.data.error
          ? error.response.data.error
          : "Upload failed. Please try again."
      );
    });
  };

  return (
    <div>
      <h2>Upload Schedule</h2>
      <input 
        type="file" 
        accept=".html"
        onChange={handleFileChange} 
      />
      <button onClick={handleUpload}>Upload</button>
      {uploadMessage && <p>{uploadMessage}</p>}
    </div>
  );
}

export default UploadSchedule;
