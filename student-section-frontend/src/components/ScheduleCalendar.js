import React, { useState, useEffect } from "react";
import axios from "axios";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useNavigate } from "react-router-dom";

function ScheduleCalendar() {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedEventType, setSelectedEventType] = useState("");
  const [availableEventTypes, setAvailableEventTypes] = useState([]);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  // New state for modal navigation
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const navigate = useNavigate();

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
      const schoolData = schedules.find((s) => s._id === selectedSchool);
      if (schoolData && schoolData.events) {
        const eventTypes = schoolData.events.map((event) => event.event_type);
        const uniqueTypes = Array.from(new Set(eventTypes));
        setAvailableEventTypes(uniqueTypes);
      } else {
        setAvailableEventTypes([]);
      }
    } else {
      setAvailableEventTypes([]);
    }
    setSelectedEventType("");
  }, [selectedSchool, schedules]);

  // Fetch and format schedule data based on selected school and event type.
  const fetchFilteredSchedule = () => {
    if (!selectedSchool) {
      setError("Please select a school.");
      return;
    }

    const schoolData = schedules.find((s) => s._id === selectedSchool);
    if (!schoolData) {
      setError("No schedule found for the selected school.");
      return;
    }

    let eventData;
    if (selectedEventType) {
      eventData = schoolData.events.find(
        (ev) =>
          ev.event_type.toLowerCase() === selectedEventType.toLowerCase()
      );
      if (!eventData) {
        setError("No event found for the selected event type.");
        setEvents([]);
        return;
      }
    } else {
      eventData = {
        games: schoolData.events.reduce(
          (acc, ev) => acc.concat(ev.games),
          []
        ),
      };
    }

    const formattedEvents = eventData.games.map((game) => ({
      title: game.opponent || eventData.event_type || "Unnamed Event",
      start: parseDate(game.date),
      extendedProps: {
        time: game.time || "TBD",
        location: game.location || "Unknown Location",
        additionalInfo: game.result || "",
      },
    }));

    setEvents(formattedEvents);
    setError("");
  };

  const parseDate = (dateString) => {
    if (dateString.includes("/")) {
      const parts = dateString.split("/");
      if (parts.length === 3) {
        const [month, day, year] = parts;
        return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      }
    }
    const d = new Date(dateString);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  // Modal handlers for navigation.
  const closeModal = () => {
    setShowModal(false);
    setSelectedEvent(null);
  };

  const handleListTicket = () => {
    // Navigate to the PostTicket component with event details pre-populated.
    navigate("/postticket", { state: {
      event_name: selectedEvent.title,
      event_date: selectedEvent.start.toISOString(),
      venue: selectedEvent.extendedProps.location,
      school_name: selectedSchool
    }});
    closeModal();
  };

  const handlePurchaseTicket = () => {
    // Navigate to the marketplace, optionally passing filter data.
    navigate("/marketplace", { state: {
      event_name: selectedEvent.title,
      event_date: selectedEvent.start.toISOString()
    }});
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

      <button onClick={fetchFilteredSchedule} style={{ padding: "10px" }}>
        Load Schedule
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div style={{ marginTop: "20px" }}>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          eventClick={(info) => {
            // When an event is clicked, open the modal with event details.
            setSelectedEvent(info.event);
            setShowModal(true);
          }}
          height="600px"
        />
      </div>

      {showModal && selectedEvent && (
        <div className="modal show" style={{ display: "block", backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Event Options</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <p><strong>Event:</strong> {selectedEvent.title}</p>
                <p>
                  <strong>Date:</strong> {selectedEvent.start.toLocaleString()}
                </p>
                <p>
                  <strong>Location:</strong> {selectedEvent.extendedProps.location}
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={handleListTicket}>
                  List Ticket
                </button>
                <button className="btn btn-secondary" onClick={handlePurchaseTicket}>
                  Purchase Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduleCalendar;
