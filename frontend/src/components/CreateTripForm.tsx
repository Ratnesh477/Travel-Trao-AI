'use client';

import React, { useState } from 'react';
import { Compass, Calendar, DollarSign, Heart, Sparkles, Loader2 } from 'lucide-react';

interface CreateTripFormProps {
  onSubmit: (tripData: {
    destination: string;
    durationDays: number;
    budgetTier: 'Low' | 'Medium' | 'High';
    interests: string[];
  }) => Promise<void>;
  loading: boolean;
}

const INTERESTS_OPTIONS = [
  { id: 'Food', label: '🍔 Food & Culinary' },
  { id: 'Culture', label: '🏺 Culture & Arts' },
  { id: 'Adventure', label: '🧗 Adventure & Outdoors' },
  { id: 'Shopping', label: '🛍️ Shopping & Boutiques' },
  { id: 'Nightlife', label: '🌃 Nightlife & Bars' },
  { id: 'History', label: '🏰 History & Landmarks' },
  { id: 'Nature', label: '🌲 Nature & Parks' },
  { id: 'Relaxation', label: '🧘 Spa & Relaxation' }
];

export default function CreateTripForm({ onSubmit, loading }: CreateTripFormProps) {
  const [destination, setDestination] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [budgetTier, setBudgetTier] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Dynamic loading phase text
  const [loadingPhase, setLoadingPhase] = useState(0);

  React.useEffect(() => {
    if (!loading) {
      setLoadingPhase(0);
      return;
    }
    const phases = [
      'Consulting Trao AI travel specialists...',
      'Mapping custom route paths for destination climate...',
      'Drafting realistic food, activity & transport ledgers...',
      'Matching lodging facilities with budget profiles...',
      'Drafting climate packing checklists...'
    ];
    const interval = setInterval(() => {
      setLoadingPhase(prev => (prev + 1) % phases.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [loading]);

  const toggleInterest = (id: string) => {
    if (interests.includes(id)) {
      setInterests(interests.filter(item => item !== id));
    } else {
      setInterests([...interests, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError('Please provide a destination');
      return;
    }
    if (durationDays < 1 || durationDays > 30) {
      setError('Duration must be between 1 and 30 days');
      return;
    }

    setError(null);
    try {
      await onSubmit({
        destination,
        durationDays,
        budgetTier,
        interests
      });
    } catch (err: any) {
      setError(err.message || 'Failed to generate itinerary. Please try again.');
    }
  };

  const loadingMessages = [
    'Consulting Trao AI travel specialists...',
    'Mapping custom route paths for destination climate...',
    'Drafting realistic food, activity & transport ledgers...',
    'Matching lodging facilities with budget profiles...',
    'Drafting climate packing checklists...'
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-xl max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-6 w-6 text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Create New Travel Vault</h2>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-200 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex flex-col justify-center items-center text-center">
          <Loader2 className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
          <p className="text-base font-bold text-white transition-all duration-300">
            {loadingMessages[loadingPhase]}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            This might take up to 25 seconds as Gemini generates detailed JSON records.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Destination */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Where to? (Destination)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                <Compass className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Tokyo, Paris, Mount Fuji"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
                required
              />
            </div>
          </div>

          {/* Duration & Budget Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Trip Duration (Days)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value, 10))}
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
                  required
                />
              </div>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Budget Tier
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Low', 'Medium', 'High'] as const).map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setBudgetTier(tier)}
                    className={`py-3 rounded-xl text-xs font-semibold border transition duration-200 cursor-pointer ${
                      budgetTier === tier
                        ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-md'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Select Interests
            </label>
            <div className="grid grid-cols-2 gap-2">
              {INTERESTS_OPTIONS.map((opt) => {
                const selected = interests.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleInterest(opt.id)}
                    className={`p-3 rounded-xl text-xs text-left border transition duration-200 flex items-center gap-2 cursor-pointer ${
                      selected
                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                        : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-bold py-3.5 rounded-xl transition duration-200 shadow-lg shadow-indigo-500/25 flex justify-center items-center gap-2 cursor-pointer text-sm"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate Custom Itinerary</span>
          </button>
        </form>
      )}
    </div>
  );
}
