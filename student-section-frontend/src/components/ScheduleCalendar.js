import React, { useState, useEffect } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useNavigate } from "react-router-dom";

function ScheduleCalendar() {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedScheduleData, setSelectedScheduleData] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState("");
  const [availableEventTypes, setAvailableEventTypes] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  // New state for modal navigation
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const navigate = useNavigate();

  // Fetch aggregated schedules from /schedule/all endpoint on mount.
  useEffect(() => {
    axios
      .get("http://localhost:5000/schedule/all", { withCredentials: true })
      .then((res) => {
        setSchedules(res.data.schedules);
      })
      .catch((err) => console.error("Error fetching schedules:", err));
  }, []);

  // Auto-select a default school once schedules are loaded.
  useEffect(() => {
    if (schedules.length > 0 && !selectedSchool) {
      // Prefer "public" if available, else use the first available school.
      const defaultSchool =
        schedules.find((s) => s._id.toLowerCase() === "public")?._id ||
        schedules[0]._id;
      setSelectedSchool(defaultSchool);
    }
  }, [schedules, selectedSchool]);

  // Update available event types when the selected school changes.
  useEffect(() => {
    if (selectedSchool) {
      const schoolData = schedules.find((s) => s._id === selectedSchool);
      setSelectedScheduleData(schoolData);
      if (schoolData && schoolData.events) {
        const eventTypes = schoolData.events.map((event) => event.event_type);
        const uniqueTypes = Array.from(new Set(eventTypes));
        setAvailableEventTypes(uniqueTypes);
      } else {
        setAvailableEventTypes([]);
      }
    } else {
      setSelectedScheduleData(null);
      setAvailableEventTypes([]);
    }
    // Reset event type when school changes.
    setSelectedEventType("");
  }, [selectedSchool, schedules]);

  // Automatically fetch and format schedule data when filters change.
  useEffect(() => {
    if (selectedSchool) {
      fetchFilteredSchedule();
    }
  }, [selectedSchool, selectedEventType]);

  // Function to fetch and format events from the aggregated schedule.
  const fetchFilteredSchedule = () => {
    if (!selectedSchool) {
      setError("Please select a school.");
      return;
    }

    const schoolData = schedules.find((s) => s._id === selectedSchool);
    if (!schoolData) {
      setError("No schedule found for the selected school.");
      setEvents([]);
      return;
    }

    setSelectedScheduleData(schoolData);
    let eventData;
    if (selectedEventType) {
      // Find the single event matching the filter.
      eventData = schoolData.events.find(
        (ev) =>
          ev.event_type.toLowerCase() === selectedEventType.toLowerCase()
      );
      if (!eventData) {
        setError("No event found for the selected event type.");
        setEvents([]);
        return;
      }
      // Map over its games to include event_type.
      eventData = {
        games: eventData.games.map((game) => ({
          ...game,
          event_type: eventData.event_type,
        })),
      };
    } else {
      // When no event type is selected, combine games from all events,
      // attaching the event_type to each game.
      const combinedGames = schoolData.events.reduce((acc, ev) => {
        const gamesWithEventType = ev.games.map((game) => ({
          ...game,
          event_type: ev.event_type,
        }));
        return acc.concat(gamesWithEventType);
      }, []);
      eventData = { games: combinedGames };
    }

    // Format the events for FullCalendar.
    const formattedEvents = eventData.games.map((game) => {
      const title =
        String(selectedSchool).toLowerCase() === "public"
          ? game.event_type
          : game.opponent || game.event_type || "Unnamed Event";
      return {
        title,
        start: parseDateTime(game.date, game.time),
        extendedProps: {
          time: game.time || "TBD",
          location: game.location || "Unknown Location",
          additionalInfo: game.result || "",
        },
      };
    });

    setEvents(formattedEvents);
    setError("");
  };

  // New helper function to parse date and time strings together.
  const parseDateTime = (dateString, timeString) => {
    // Expecting dateString in "MM/DD/YYYY" format.
    if (!dateString) return new Date();
    const parts = dateString.split("/");
    if (parts.length !== 3) return new Date(dateString);

    const [month, day, year] = parts;
    
    // Default time values.
    let hour = 0;
    let minute = 0;

    if (timeString && typeof timeString === "string") {
      // Normalize time string.
      timeString = timeString.trim().toLowerCase();
      // Matches formats like "4:20pm", "4pm", "4:20 pm", etc.
      const timeRegex = /(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)/;
      const match = timeString.match(timeRegex);
      if (match) {
        hour = parseInt(match[1], 10);
        minute = match[2] ? parseInt(match[2], 10) : 0;
        const period = match[3];
        if (period === "pm" && hour !== 12) hour += 12;
        if (period === "am" && hour === 12) hour = 0;
      }
    }
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), hour, minute);
  };

  // Modal handlers for navigation.
  const closeModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleListTicket = () => {
    if (!selectedScheduleData) {
      alert("No schedule data available.");
      return;
    }
    const payload = {
      event_name: selectedEvent.title,
      event_date: selectedEvent.start.toISOString(),
      venue: selectedEvent.extendedProps.location,
      school_name: selectedSchool,
    };

    // For public events, call the /Attend endpoint.
    if (String(selectedSchool).toLowerCase() === "public") {
      axios
        .post("http://localhost:5000/Attend", payload, {
          withCredentials: true,
        })
        .then((res) => {
          alert("Attendance record created successfully. ID: " + res.data.attendance_id);
        })
        .catch((err) => {
          alert(
            "Error creating attendance record: " +
              (err.response?.data?.error || err.message)
          );
        });
      closeModal();
    } else {
      // For University events, redirect to the PostTicket component.
      navigate("/postticket", { state: { ...payload } });
      closeModal();
    }
  };

  const handlePurchaseTicket = () => {
    navigate("/marketplace", {
      state: {
        event_name: selectedEvent.title,
        event_date: selectedEvent.start.toISOString(),
      },
    });
    closeModal();
  };

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>Schedule Calendar</h2>

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

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ marginTop: "20px" }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={(info) => {
            setSelectedEvent(info.event);
            setShowModal(true);
          }}
          height="600px"
        />
      </div>

      {showModal && selectedEvent && (
        <div
          className="modal show"
          style={{
            display: "block",
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Event Options</h5>
                <button type="button" className="btn-close btn-close-white" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <p>
                  <strong>Event:</strong> {selectedEvent.title}
                </p>
                <p>
                  <strong>Date:</strong> {selectedEvent.start.toLocaleString()}
                </p>
                <p>
                  <strong>Location:</strong> {selectedEvent.extendedProps.location}
                </p>
              </div>
              <div className="modal-footer">
                {String(selectedSchool).toLowerCase() === "public" ? (
                  <button className="btn btn-primary" onClick={handleListTicket}>
                    Attend
                  </button>
                ) : (
                  <>
                    <button className="btn btn-primary" onClick={handleListTicket}>
                      List Ticket
                    </button>
                    <button className="btn btn-secondary" onClick={handlePurchaseTicket}>
                      Purchase Ticket
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleCalendar;
