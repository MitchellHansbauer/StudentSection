import React, { useState } from 'react';
import axios from 'axios';

function ScheduleBuilder() {
  const [schoolName, setSchoolName] = useState('');
  const [year, setYear] = useState('');
  const [eventType, setEventType] = useState('');

  // Option toggles for optional fields:
  const [includeAt, setIncludeAt] = useState(true);
  const [includeOpponent, setIncludeOpponent] = useState(true);
  const [includeResult, setIncludeResult] = useState(true);

  const [events, setEvents] = useState([
    {
      date: '',
      time: '',
      location: '',
      at: '',
      opponent: '',
      result: '',
    },
  ]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  const updateEventField = (index, field, value) => {
    const newEvents = [...events];
    newEvents[index][field] = value;
    setEvents(newEvents);
  };

  // Dynamically build the header line based on toggles:
  const buildHeaderLine = () => {
    // Always required:
    const columns = ['Date', 'Time', 'Location'];

    // If user wants to include them, push them in the order you prefer:
    // e.g. "At" before "Opponent," etc.
    // The parser expects them in some order if you’re using the “full” header.
    if (includeAt) columns.splice(2, 0, 'At'); // Insert "At" before "Location"
    if (includeOpponent) columns.splice(includeAt ? 3 : 2, 0, 'Opponent');
    if (includeResult) columns.push('Result');

    return columns.join('  ');
  };

  // Build the final HTML schedule <pre> string
  const buildHtmlSchedule = () => {
    const headerLine = buildHeaderLine();

    // For each event row, build columns dynamically too
    const eventLines = events.map((ev) => {
      // Start with date, time, location:
      let rowParts = [ev.date, ev.time, ev.location];

      // If we’re including "At," insert it before location
      // So we need to build them in the right order
      // The simplest approach: always build an array in the final correct order
      // depending on toggles:
      // Example:
      let dynamicParts = [];
      if (includeAt) dynamicParts.push(ev.at);
      if (includeOpponent) dynamicParts.push(ev.opponent);
      // location always goes at the end of these optional columns
      dynamicParts.push(ev.location);

      // We actually inserted location into dynamicParts, so remove it from rowParts
      // to avoid duplication. Let’s restructure for clarity:

      // We'll always start rowParts with [date, time]
      rowParts = [ev.date, ev.time];

      // Then add the dynamic columns that might include at, opponent, location:
      let optionalForRow = [];
      if (includeAt) optionalForRow.push(ev.at || '');
      if (includeOpponent) optionalForRow.push(ev.opponent || '');
      // location is definitely last in the optional chain
      optionalForRow.push(ev.location || '');
      
      // Combine them:
      rowParts = [...rowParts, ...optionalForRow];

      if (includeResult) {
        rowParts.push(ev.result || '');
      }

      // Finally, join them with double spaces
      return rowParts.join('  ');
    });

    // The lines inside the <pre> tag:
    // 1) schoolName
    // 2) year
    // 3) eventType
    // 4) header line
    // 5+) each event line
    const lines = [schoolName, year, eventType, headerLine, ...eventLines].join('\n');

    // Wrap in <pre> for parse_html_schedule or your endpoint
    return `<html><body><pre>${lines}</pre></body></html>`;
  };

  const handleUpload = async () => {
    setError('');
    setMessage('');

    // Still enforce basic requirements for year/eventType, etc.
    if (!year.trim() || !eventType.trim()) {
      setError('Year and Event Type are required.');
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

    const htmlString = buildHtmlSchedule();
    try {
      const response = await axios.post('http://localhost:5000/schedule/upload', {
        custom_schedule: htmlString,
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
        <label>School Name (optional): </label>
        <input
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <label>Year (required, e.g. 2025): </label>
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

      {/* Toggles for optional columns */}
      <div style={{ marginBottom: '1rem' }}>
        <label>
          <input
            type="checkbox"
            checked={includeAt}
            onChange={() => setIncludeAt(!includeAt)}
          />
          Include "At" (Home/Away)?
        </label>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>
          <input
            type="checkbox"
            checked={includeOpponent}
            onChange={() => setIncludeOpponent(!includeOpponent)}
          />
          Include "Opponent"?
        </label>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>
          <input
            type="checkbox"
            checked={includeResult}
            onChange={() => setIncludeResult(!includeResult)}
          />
          Include "Result"?
        </label>
      </div>

      <h4>Events</h4>
      <p>
        For each event, <strong>Date</strong>, <strong>Time</strong>, and <strong>Location</strong> are required.
        “At,” “Opponent,” and “Result” are optional if the toggles are on.
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
              placeholder="Month Day"
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

          {includeAt && (
            <div style={{ marginBottom: '0.5rem' }}>
              <label>At (optional, e.g. Home, Away): </label>
              <input
                type="text"
                value={ev.at}
                onChange={(e) => updateEventField(index, 'at', e.target.value)}
              />
            </div>
          )}

          {includeOpponent && (
            <div style={{ marginBottom: '0.5rem' }}>
              <label>Opponent (optional): </label>
              <input
                type="text"
                value={ev.opponent}
                onChange={(e) => updateEventField(index, 'opponent', e.target.value)}
              />
            </div>
          )}

          <div style={{ marginBottom: '0.5rem' }}>
            <label>Location (required): </label>
            <input
              type="text"
              placeholder="Nippert Stadium"
              value={ev.location}
              onChange={(e) => updateEventField(index, 'location', e.target.value)}
            />
          </div>

          {includeResult && (
            <div style={{ marginBottom: '0.5rem' }}>
              <label>Result (optional): </label>
              <input
                type="text"
                value={ev.result}
                onChange={(e) => updateEventField(index, 'result', e.target.value)}
              />
            </div>
          )}
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
