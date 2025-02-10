import React, { useState } from 'react';
import axios from 'axios';

function UploadSchedule() {
  const [scheduleUrl, setScheduleUrl] = useState('');
  const [scheduleFile, setScheduleFile] = useState(null);
  const [customSchedule, setCustomSchedule] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [updatedFields, setUpdatedFields] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setScheduleFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!scheduleFile && !scheduleUrl && !customSchedule) {
      setError('Please select a file, enter a URL, or create a schedule.');
      return;
    }

    setError('');
    setMessage('');
    setMissingFields([]);
    setUpdatedFields({});

    let payload = {};

    if (scheduleFile) {
      const formData = new FormData();
      formData.append('file', scheduleFile);

      try {
        const response = await axios.post('http://localhost:5000/schedule/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        handleServerResponse(response);
      } catch (err) {
        handleServerError(err);
      }
    } else if (scheduleUrl) {
      payload = { url: scheduleUrl };
    } else if (customSchedule) {
      payload = { custom_schedule: customSchedule };
    }

    if (!scheduleFile) {
      try {
        const response = await axios.post('http://localhost:5000/schedule/upload', payload);
        handleServerResponse(response);
      } catch (err) {
        handleServerError(err);
      }
    }
  };

  const handleServerResponse = (response) => {
    if (response.data.missing_fields) {
      setMissingFields(response.data.missing_fields);
      setCustomSchedule(response.data.schedule_data);
      setError('Some required fields are missing.');
    } else {
      setMessage(response.data.message);
    }
  };

  const handleServerError = (err) => {
    if (err.response?.data?.missing_fields) {
      setMissingFields(err.response.data.missing_fields);
      setCustomSchedule(err.response.data.schedule_data);
      setError('Some required fields are missing.');
    } else {
      setError(err.response?.data?.error || 'Failed to upload schedule.');
    }
  };

  const handleFieldChange = (field, value) => {
    setUpdatedFields({ ...updatedFields, [field]: value });
  };

  const handleResubmit = async () => {
    if (!customSchedule) {
      setError('No schedule data available to update.');
      return;
    }

    let updatedSchedule = { ...customSchedule };

    if (missingFields.includes('school_name')) {
      updatedSchedule.school_name = updatedFields.school_name;
    }
    if (missingFields.includes('year')) {
      updatedSchedule.year = updatedFields.year;
    }
    if (missingFields.includes('event_type')) {
      updatedSchedule.games.forEach((game) => {
        if (!game.event_type) {
          game.event_type = updatedFields.event_type || 'Football';
        }
      });
    }

    try {
      const response = await axios.post('http://localhost:5000/schedule/upload', {
        custom_schedule: updatedSchedule
      });

      setMessage(response.data.message);
      setMissingFields([]);
      setUpdatedFields({});
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm schedule update.');
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

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      {missingFields.length > 0 && (
        <div>
          <h3>Missing Fields</h3>
          {missingFields.includes('school_name') && (
            <div>
              <label>School Name: </label>
              <input type="text" onChange={(e) => handleFieldChange('school_name', e.target.value)} />
            </div>
          )}
          {missingFields.includes('year') && (
            <div>
              <label>Year: </label>
              <input type="text" onChange={(e) => handleFieldChange('year', e.target.value)} />
            </div>
          )}
          {missingFields.includes('event_type') && (
            <div>
              <label>Event Type: </label>
              <input type="text" onChange={(e) => handleFieldChange('event_type', e.target.value)} />
            </div>
          )}
          <button onClick={handleResubmit}>Submit Missing Data</button>
        </div>
      )}
    </div>
  );
}

export default UploadSchedule;
