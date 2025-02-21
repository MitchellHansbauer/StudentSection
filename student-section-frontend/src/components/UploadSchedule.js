import React, { useState } from 'react';
import axios from 'axios';

function ScheduleBuilder() {
  const [schoolName, setSchoolName] = useState('');
  const [year, setYear] = useState('');
  const [eventType, setEventType] = useState('');
  const [events, setEvents] = useState([
    {
      // date, time, location are REQUIRED
      date: '',
      time: '',
      location: '',
      // at, opponent, result are optional
      at: '',
      opponent: '',
      result: '',
    },
  ]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Add a new, empty row
  const addEventRow = () => {
    setEvents((prev) => [
      ...prev,
      {
        date: '',
        time: '',
        location: '',
        at: '',
        opponent: '',
        result: '',
      },
    ]);
  };

  // Update a field in a specific event row
  const updateEventField = (index, field, value) => {
    const newEvents = [...events];
    newEvents[index][field] = value;
    setEvents(newEvents);
  };

  // Build the HTML schedule <pre> string
  const buildHtmlSchedule = () => {
    // The parser's expected header line
    const headerLine = 'Date  Time  At  Opponent  Location  Result';

    // Convert each event into a row, with empty columns allowed for optional fields
    const eventLines = events.map((ev) => {
      return `${ev.date}  ${ev.time}  ${ev.at}  ${ev.opponent}  ${ev.location}  ${ev.result}`;
    });

    // The lines inside the <pre> tag:
    // 1) schoolName
    // 2) year
    // 3) eventType
    // 4) header line
    // 5+) each event line
    const lines = [
      schoolName,
      year,
      eventType,
      headerLine,
      ...eventLines,
    ].join('\n');

    // Wrap in a <pre> for schedule_parser.py
    return `<html><body><pre>${lines}</pre></body></html>`;
  };

  const handleUpload = async () => {
    setError('');
    setMessage('');

    // Check top-level fields
    if (!schoolName.trim() || !year.trim() || !eventType.trim()) {
      setError('School Name, Year, and Event Type are required.');
      return;
    }

    // Check each event row for required fields: date, time, location
    for (let i = 0; i < events.length; i++) {
      const { date, time, location } = events[i];
      if (!date.trim() || !time.trim() || !location.trim()) {
        setError(`Event #${i + 1} missing required Date, Time, or Location.`);
        return;
      }
    }

    // Build and send
    const htmlString = buildHtmlSchedule();
    try {
      const response = await axios.post('http://localhost:5000/schedule/upload', {
        html: htmlString,
      });
      setMessage(response.data.message || 'Schedule uploaded successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed.');
    }
  };

  return (
    <div style={{ border: '1px solid #aaa', padding: '1rem', marginTop: '1rem' }}>
      <h3>Schedule Builder</h3>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {message && <div style={{ color: 'green' }}>{message}</div>}

      <div style={{ marginBottom: '1rem' }}>
        <label>School Name (required): </label>
        <input
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Year (required, e.g. 2023): </label>
        <input
          type="text"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Event Type (required): </label>
        <input
          type="text"
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
        />
      </div>

      <h4>Events</h4>
      <p>
        For each event, <strong>Date</strong>, <strong>Time</strong>, and <strong>Location</strong> are required.
        “At,” “Opponent,” and “Result” are optional.
      </p>

      {events.map((ev, index) => (
        <div
          key={index}
          style={{
            border: '1px solid #ddd',
            padding: '0.75rem',
            marginBottom: '0.75rem',
          }}
        >
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Date (required): </label>
            <input
              type="text"
              placeholder="MM/DD/YYYY"
              value={ev.date}
              onChange={(e) => updateEventField(index, 'date', e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Time (required): </label>
            <input
              type="text"
              placeholder="7:00PM"
              value={ev.time}
              onChange={(e) => updateEventField(index, 'time', e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>At (optional, e.g. Home, Away): </label>
            <input
              type="text"
              value={ev.at}
              onChange={(e) => updateEventField(index, 'at', e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Opponent (optional): </label>
            <input
              type="text"
              value={ev.opponent}
              onChange={(e) => updateEventField(index, 'opponent', e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Location (required): </label>
            <input
              type="text"
              placeholder="Nippert Stadium"
              value={ev.location}
              onChange={(e) => updateEventField(index, 'location', e.target.value)}
            />
          </div>
          <div style={{ marginBottom: '0.5rem' }}>
            <label>Result (optional): </label>
            <input
              type="text"
              value={ev.result}
              onChange={(e) => updateEventField(index, 'result', e.target.value)}
            />
          </div>
        </div>
      ))}

      <button onClick={addEventRow} style={{ marginRight: '1rem' }}>
        Add Another Event
      </button>

      <button onClick={handleUpload}>Build &amp; Upload Schedule</button>
    </div>
  );
}


export default function UploadSchedule() {
  const [scheduleFile, setScheduleFile] = useState(null);
  const [scheduleUrl, setScheduleUrl] = useState('');
  const [customSchedule, setCustomSchedule] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [updatedFields, setUpdatedFields] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);

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

    try {
      // If the user chose a file
      if (scheduleFile) {
        const formData = new FormData();
        formData.append('file', scheduleFile);

        const response = await axios.post('http://localhost:5000/schedule/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        handleServerResponse(response);
      }
      // If they provided a direct URL
      else if (scheduleUrl) {
        payload = { url: scheduleUrl };
        const response = await axios.post('http://localhost:5000/schedule/upload', payload);
        handleServerResponse(response);
      }
      // If we have customSchedule
      else if (customSchedule) {
        payload = { custom_schedule: customSchedule };
        const response = await axios.post('http://localhost:5000/schedule/upload', payload);
        handleServerResponse(response);
      }
    } catch (err) {
      handleServerError(err);
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
        custom_schedule: updatedSchedule,
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
        <h3>Upload HTML/File</h3>
        <input type="file" accept=".html" onChange={handleFileChange} />
        <h4>Or Enter Schedule URL</h4>
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
              <input
                type="text"
                onChange={(e) => handleFieldChange('school_name', e.target.value)}
              />
            </div>
          )}
          {missingFields.includes('year') && (
            <div>
              <label>Year: </label>
              <input
                type="text"
                onChange={(e) => handleFieldChange('year', e.target.value)}
              />
            </div>
          )}
          {missingFields.includes('event_type') && (
            <div>
              <label>Event Type: </label>
              <input
                type="text"
                onChange={(e) => handleFieldChange('event_type', e.target.value)}
              />
            </div>
          )}
          <button onClick={handleResubmit}>Submit Missing Data</button>
        </div>
      )}

      <hr />
      {/* "Sub-link" to open or hide the custom ScheduleBuilder */}
      <button onClick={() => setShowBuilder(!showBuilder)}>
        {showBuilder ? 'Hide' : 'Show'} Schedule Builder
      </button>

      {showBuilder && <ScheduleBuilder />}
    </div>
  );
}
