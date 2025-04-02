import React from 'react';
import ReactDOM from 'react-dom/client';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import 'bootstrap/dist/css/bootstrap.min.css';
import axios from 'axios';
axios.defaults.withCredentials = true;

const stripePromise = loadStripe('pk_test_51Qowe4R6XyVnHR5e9hSvN1crBUTZw2kQaP1sCSF8L9qZTpmrlUZOuChucDW5I6RoVBbDkcePdbP6ILWNosvUQ42A00j9o0t7kN');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Elements stripe={stripePromise}>
      <App />
    </Elements>
  </React.StrictMode>
);

reportWebVitals();