import React, { useState } from 'react';
import axios from 'axios';

function UploadSchedule() {
  const [scheduleUrl, setScheduleUrl] = useState('');
  const [scheduleFile, setScheduleFile] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setScheduleFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!scheduleFile && !scheduleUrl) {
      setError('Please select a file or enter a URL.');
      return;
    }

    setError('');
    setMessage('');

    if (scheduleFile) {
      // Upload file
      const formData = new FormData();
      formData.append('file', scheduleFile);

      try {
        const response = await axios.post('http://localhost:5000/schedule/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setMessage(response.data.message);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to upload schedule.');
      }
    } else if (scheduleUrl) {
      // Fetch from URL
      try {
        const response = await axios.post('http://localhost:5000/schedule/upload', { url: scheduleUrl });
        setMessage(response.data.message);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch schedule from URL.');
      }
    }
  };

  return (
    <div>
      <h2>Upload Schedule</h2>
      
      <div>
        <h3>Upload HTML File</h3>
        <input type="file" accept=".html" onChange={handleFileChange} />
      </div>

      <div>
        <h3>Or Enter Schedule URL</h3>
        <input
          type="text"
          placeholder="Enter schedule URL..."
          value={scheduleUrl}
          onChange={(e) => setScheduleUrl(e.target.value)}
        />
      </div>

      <button onClick={handleUpload}>Upload</button>

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default UploadSchedule;
