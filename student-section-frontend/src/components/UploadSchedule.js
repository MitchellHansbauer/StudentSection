import React, { useState } from 'react';
import axios from 'axios';

function UploadSchedule() {
  const [scheduleUrl, setScheduleUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFetchSchedule = async () => {
    if (!scheduleUrl) {
      setError('Please enter a schedule URL.');
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/proxy/schedule', { url: scheduleUrl });

      setMessage(response.data.message || 'Schedule fetched and stored successfully!');
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.response?.data?.error || 'Failed to fetch schedule.');
    }
  };

  return (
    <div>
      <h2>Fetch Schedule from URL</h2>
      <input
        type="text"
        placeholder="Enter schedule URL..."
        value={scheduleUrl}
        onChange={(e) => setScheduleUrl(e.target.value)}
        style={{ width: '80%', padding: '10px', margin: '10px 0' }}
      />
      <button onClick={handleFetchSchedule} style={{ padding: '10px 20px' }}>
        Fetch Schedule
      </button>

      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default UploadSchedule;
