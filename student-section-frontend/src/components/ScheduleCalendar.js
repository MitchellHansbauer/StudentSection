import React, { useState, useEffect } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";

function ScheduleCalendar() {
  const [schedules, setSchedules] = useState([]); // Aggregated schedules grouped by school
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [availableEventTypes, setAvailableEventTypes] = useState([]); // Available event types for the selected school
  const [events, setEvents] = useState([]); // Calendar events
  const [error, setError] = useState("");

  // Fetch aggregated schedules on component mount.
  useEffect(() => {
    axios
      .get("http://localhost:5000/schedule/all", { withCredentials: true })
      .then((res) => setSchedules(res.data.schedules))
      .catch((err) => console.error("Error fetching schedules:", err));
  }, []);

  // Update available event types when the selected school changes.
  useEffect(() => {
    if (selectedSchool) {
      const schoolData = schedules.find(s => s._id === selectedSchool);
      if (schoolData && schoolData.events) {
        // Extract unique event types.
        const eventTypes = schoolData.events.map(event => event.event_type);
        const uniqueTypes = Array.from(new Set(eventTypes));
        setAvailableEventTypes(uniqueTypes);
      } else {
        setAvailableEventTypes([]);
      }
    } else {
      setAvailableEventTypes([]);
    }
    // Reset the selected event type when school changes.
    setSelectedEventType("");
  }, [selectedSchool, schedules]);

  // Fetch and format schedule data based on selected school and event type.
  const fetchFilteredSchedule = () => {
    if (!selectedSchool) {
      setError("Please select a school.");
      return;
    }

    const schoolData = schedules.find(s => s._id === selectedSchool);
    if (!schoolData) {
      setError("No schedule found for the selected school.");
      return;
    }

    let eventData;
    if (selectedEventType) {
      // Find the event with the matching event type.
      eventData = schoolData.events.find(
        ev => ev.event_type.toLowerCase() === selectedEventType.toLowerCase()
      );
      if (!eventData) {
        setError("No event found for the selected event type.");
        setEvents([]);
        return;
      }
    } else {
      // If no event type is selected, combine games from all events.
      eventData = { games: schoolData.events.reduce((acc, ev) => acc.concat(ev.games), []) };
    }

    // Convert the games array into FullCalendar event format.
    const formattedEvents = eventData.games.map((game) => ({
      title: game.opponent || eventData.event_type || "Unnamed Event",
      start: parseDate(game.date),
      time: game.time || "TBD",
      location: game.location || "Unknown Location",
      additionalInfo: game.result || "",
    }));

    setEvents(formattedEvents);
    setError("");
  };

  // Helper function to parse MM/DD/YYYY date strings.
  const parseDate = (dateString) => {
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      }
    }
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
          <option key={index} value={schedule._id}>
            {schedule._id}
          </option>
        ))}
      </select>

      {/* Dropdown for Selecting Event Type (Populated Dynamically) */}
      <select
        value={selectedEventType}
        onChange={(e) => setSelectedEventType(e.target.value)}
        style={{ padding: "10px", marginRight: "10px" }}
      >
        <option value="">All Event Types</option>
        {availableEventTypes.map((type, index) => (
          <option key={index} value={type}>
            {type}
          </option>
        ))}
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
