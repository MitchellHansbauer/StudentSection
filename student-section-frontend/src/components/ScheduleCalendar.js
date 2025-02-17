import React, { useState, useEffect } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

function ScheduleCalendar() {
  const [schedules, setSchedules] = useState([]); // Store all available schedules
  const [selectedSchool, setSelectedSchool] = useState(""); // Selected school
  const [selectedEventType, setSelectedEventType] = useState(""); // Selected event type
  const [events, setEvents] = useState([]); // Calendar events
  const [error, setError] = useState("");

  // Fetch all schedules for dropdown
  useEffect(() => {
    axios
      .get("http://localhost:5000/schedule/all")
      .then((res) => setSchedules(res.data.schedules))
      .catch((err) => console.error("Error fetching schedules:", err));
  }, []);

  // Fetch filtered schedule when user selects a school/event type
  const fetchFilteredSchedule = () => {
    if (!selectedSchool) {
      setError("Please select a school.");
      return;
    }

    const queryParams = new URLSearchParams();
    queryParams.append("school_name", selectedSchool);
    if (selectedEventType) {
      queryParams.append("event_type", selectedEventType);
    }

    axios
      .get(`http://localhost:5000/schedule/retrieve?${queryParams.toString()}`)
      .then((res) => {
        const schedule = res.data.schedules[0];
        if (!schedule || !schedule.games) {
          setEvents([]);
          setError("No events found for the selected schedule.");
          return;
        }

        // Convert schedule data into FullCalendar format
        const formattedEvents = schedule.games.map((game) => ({
          title: game.opponent || game.event_name || "Unnamed Event",
          start: parseDate(game.date),
          time: game.time || "TBD",
          location: game.location || "Unknown Location",
          additionalInfo: game.result || "", // Flexible for different event types
        }));

        setEvents(formattedEvents);
        setError("");
      })
      .catch((err) => {
        setEvents([]);
        setError("No schedules found for the selected filters.");
        console.error("Error fetching filtered schedule:", err);
      });
  };

  // Updated helper function to parse dates in MM/DD/YYYY format.
  const parseDate = (dateString) => {
    // If dateString is in MM/DD/YYYY format, split and construct the Date.
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      }
    }
    // Fallback: try to construct a Date directly.
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Schedule Calendar</h2>

      {/* Dropdown for Selecting School */}
      <select
        value={selectedSchool}
        onChange={(e) => setSelectedSchool(e.target.value)}
        style={{ padding: "10px", marginRight: "10px" }}
      >
        <option value="">Select School</option>
        {schedules.map((schedule, index) => (
          <option key={index} value={schedule.school_name}>
            {schedule.school_name}
          </option>
        ))}
      </select>

      {/* Dropdown for Selecting Event Type (Optional) */}
      <select
        value={selectedEventType}
        onChange={(e) => setSelectedEventType(e.target.value)}
        style={{ padding: "10px", marginRight: "10px" }}
      >
        <option value="">All Event Types</option>
        <option value="Football">Football</option>
        <option value="Basketball">Basketball</option>
        <option value="Music Concert">Music Concert</option>
        <option value="Theater">Theater</option>
        <option value="Conference">Conference</option>
      </select>

      {/* Button to Fetch Filtered Schedule */}
      <button onClick={fetchFilteredSchedule} style={{ padding: "10px" }}>
        Load Schedule
      </button>

      {/* Error Message */}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Display Calendar if Events Exist */}
      <div style={{ marginTop: "20px" }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={(info) =>
            alert(
              `Details:\n${info.event.title}\nLocation: ${info.event.extendedProps.location}\nTime: ${info.event.extendedProps.time}\nInfo: ${info.event.extendedProps.additionalInfo}`
            )
          }
          height="600px"
        />
      </div>
    </div>
  );
}

export default ScheduleCalendar;
