import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SubmitSource from './pages/SubmitSource';

function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
      <div className="max-w-3xl px-6 py-10 rounded-3xl bg-slate-900/80 shadow-2xl shadow-slate-900/60 border border-slate-800">
        <p className="text-xs font-semibold tracking-[0.25em] text-emerald-400 uppercase mb-3">
          NFL Wire
        </p>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Daily NFL team briefings, built with React + Vite.
        </h1>
        <p className="text-sm sm:text-base text-slate-300 mb-6">
          Task 1 is wired up: the frontend app is running on a modern React +
          Vite + TypeScript stack, ready for Tailwind-powered UI work.
        </p>
        <p className="text-xs text-slate-400 mb-4">
          Next up: Supabase, schema, and newsletter magic.
        </p>
        <Link
          to="/submit-source"
          className="inline-flex items-center rounded-lg border border-emerald-400 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-400/10 transition-colors"
        >
          Submit a source
        </Link>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/submit-source" element={<SubmitSource />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

