import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import TicketsList from './components/TicketsList';
import Marketplace from './components/Marketplace';
import Navbar from './components/Navbar';

function App() {
  return (
    <Router>
      <div>
        <Navbar />
        <Switch>
          <Route exact path="/" component={TicketsList} />
          <Route path="/marketplace" component={Marketplace} />
          {/* Future routes for login, signup, etc. */}
        </Switch>
      </div>
    </Router>
  );
}

export default App;