import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { loadConnectAndInitialize } from '@stripe/connect-js';
import { useNavigate } from 'react-router-dom';

export default function ConnectStripe() {
  const [error, setError] = useState('');
  const [instance, setInstance] = useState(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // 1) Initialize Stripe Connect instance
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1a) Get current user
        const { data: me } = await axios.get(
          'http://localhost:5000/users/me',
          { withCredentials: true }
        );

        // 1b) Fetch or create Stripe account ID
        const { data: { profile } } = await axios.get(
          `http://localhost:5000/users/${me.user_id}/profile`,
          { withCredentials: true }
        );
        let accountId = profile.third_party_account?.stripe_account_id;
        if (!accountId) {
          const { data } = await axios.post(
            'http://localhost:5000/users/stripe_account',
            {},
            { withCredentials: true }
          );
          accountId = data.account;
        }
        if (!mounted) return;

        // 1c) Load Connect.js
        const inst = loadConnectAndInitialize({
          publishableKey: process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY,
          fetchClientSecret: async () => {
            const { data } = await axios.post(
              'http://localhost:5000/users/stripe_account_session',
              { account: accountId },
              { withCredentials: true }
            );
            return data.client_secret;
          },
          appearance: { overlays: 'none' },
        });
        if (!mounted) return;
        setInstance(inst);
      } catch (err) {
        console.error(err);
        const msg = err.response?.data?.error || err.message || 'Error initializing Stripe Connect';
        if (mounted) setError(msg);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  // 2) Once instance is ready, create and mount the onboarding element
  useEffect(() => {
    if (!instance) return;
    let mounted = true;
    let onboardingElement;
    (async () => {
      try {
        onboardingElement = await instance.create('account-onboarding', {
          onExit: () => navigate('/profile'),
        });
        if (mounted && containerRef.current) {
          containerRef.current.appendChild(onboardingElement);
        }
      } catch (err) {
        console.error('Error mounting Stripe onboarding:', err);
        if (mounted) setError(err.message || 'Error mounting Stripe onboarding');
      }
    })();
    return () => {
      mounted = false;
      if (instance && onboardingElement) {
        try {
          instance.unmount(onboardingElement);
        } catch {}
      }
    };
  }, [instance, navigate]);

  return (
    <div className="container mt-4">
      <h2>Stripe Onboarding</h2>
      {error && <div className="alert alert-danger">{error}</div>}
      <div
        ref={containerRef}
        style={{ minHeight: '300px' }}
      >
        {!instance && !error && <p>Loading Stripe onboarding…</p>}
      </div>
    </div>
  );
}
