'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { tripApi } from '../../utils/api';
import { Trip, Activity, PackingItem, ItineraryDay } from '../../types';
import CreateTripForm from '../../components/CreateTripForm';
import { 
  Compass, LogOut, Plus, Trash2, Calendar, MapPin, 
  DollarSign, CheckSquare, Square, Info, Hotel as HotelIcon, 
  Briefcase, CloudSun, Sparkles, RefreshCw, Send, X, ArrowLeft, Loader2
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  
  // App state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  
  // Action states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Activity Inline Form state
  const [newActivityTitle, setNewActivityTitle] = useState('');
  const [newActivityDesc, setNewActivityDesc] = useState('');
  const [newActivityCost, setNewActivityCost] = useState(0);
  const [newActivityTime, setNewActivityTime] = useState<'Morning' | 'Afternoon' | 'Evening'>('Morning');
  const [addingActivityDay, setAddingActivityDay] = useState<number | null>(null);
  
  // Packing Inline form state
  const [newPackingItemName, setNewPackingItemName] = useState('');
  const [newPackingItemCategory, setNewPackingItemCategory] = useState<'Documents' | 'Clothing' | 'Gear' | 'Other'>('Other');
  const [packingFilter, setPackingFilter] = useState<string>('All');
  
  // Single Day Regeneration state
  const [regenDayNum, setRegenDayNum] = useState<number | null>(null);
  const [regenInstruction, setRegenInstruction] = useState('');
  const [regenerationLoading, setRegenerationLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token) {
      router.push('/login');
      return;
    }
    if (userStr) {
      try {
        const parsedUser = JSON.parse(userStr);
        setUserEmail(parsedUser.email);
      } catch (e) {}
    }
    fetchTrips();
  }, [router]);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const data = await tripApi.list();
      setTrips(data);
      if (data.length > 0) {
        setSelectedTrip(data[0]);
      } else {
        setSelectedTrip(null);
        setShowCreateForm(true);
      }
    } catch (err) {
      console.error('Failed to fetch trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTrip = async (tripData: any) => {
    try {
      setGenerating(true);
      const newTrip = await tripApi.create(tripData);
      setTrips(prev => [newTrip, ...prev]);
      setSelectedTrip(newTrip);
      setShowCreateForm(false);
    } catch (err) {
      console.error('Error generating trip:', err);
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteTrip = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this trip itinerary? This action is permanent.')) {
      return;
    }

    try {
      await tripApi.delete(id);
      const updatedTrips = trips.filter(t => t._id !== id);
      setTrips(updatedTrips);
      if (selectedTrip?._id === id) {
        if (updatedTrips.length > 0) {
          setSelectedTrip(updatedTrips[0]);
        } else {
          setSelectedTrip(null);
          setShowCreateForm(true);
        }
      }
    } catch (err) {
      console.error('Failed to delete trip:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Add Dynamic Activity
  const handleAddActivity = async (dayNumber: number) => {
    if (!newActivityTitle.trim() || !selectedTrip) return;

    const updatedItinerary = selectedTrip.itinerary.map((day) => {
      if (day.dayNumber === dayNumber) {
        const newAct: Activity = {
          title: newActivityTitle,
          description: newActivityDesc.trim() || 'Added by traveler',
          estimatedCostUSD: Number(newActivityCost) || 0,
          timeOfDay: newActivityTime
        };
        return {
          ...day,
          activities: [...day.activities, newAct]
        };
      }
      return day;
    });

    try {
      const data = await tripApi.update(selectedTrip._id, { itinerary: updatedItinerary });
      setSelectedTrip(data);
      // Reset form
      setNewActivityTitle('');
      setNewActivityDesc('');
      setNewActivityCost(0);
      setNewActivityTime('Morning');
      setAddingActivityDay(null);
      
      // Update list state
      setTrips(trips.map(t => t._id === data._id ? data : t));
    } catch (err) {
      console.error('Failed to add activity:', err);
    }
  };

  // Remove Activity
  const handleRemoveActivity = async (dayNumber: number, activityIndex: number) => {
    if (!selectedTrip) return;

    const updatedItinerary = selectedTrip.itinerary.map((day) => {
      if (day.dayNumber === dayNumber) {
        const newActivities = [...day.activities];
        newActivities.splice(activityIndex, 1);
        return {
          ...day,
          activities: newActivities
        };
      }
      return day;
    });

    try {
      const data = await tripApi.update(selectedTrip._id, { itinerary: updatedItinerary });
      setSelectedTrip(data);
      setTrips(trips.map(t => t._id === data._id ? data : t));
    } catch (err) {
      console.error('Failed to remove activity:', err);
    }
  };

  // Toggle Packing Item
  const handleTogglePacking = async (itemId: string) => {
    if (!selectedTrip) return;

    const updatedPacking = selectedTrip.packingList.map((item) => {
      if (item._id === itemId) {
        return { ...item, isPacked: !item.isPacked };
      }
      return item;
    });

    try {
      const data = await tripApi.update(selectedTrip._id, { packingList: updatedPacking });
      setSelectedTrip(data);
      setTrips(trips.map(t => t._id === data._id ? data : t));
    } catch (err) {
      console.error('Failed to toggle packing checklist:', err);
    }
  };

  const handleFilterChange = (cat: string) => {
    setPackingFilter(cat);
    if (cat !== 'All') {
      setNewPackingItemCategory(cat as any);
    }
  };

  // Add custom Packing Item
  const handleAddPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPackingItemName.trim() || !selectedTrip) return;

    const targetCategory = newPackingItemCategory;

    const newPacking: PackingItem = {
      item: newPackingItemName.trim(),
      category: targetCategory,
      isPacked: false
    };

    const updatedPacking = [...(selectedTrip.packingList || []), newPacking];

    try {
      const data = await tripApi.update(selectedTrip._id, { packingList: updatedPacking });
      setSelectedTrip(data);
      setNewPackingItemName('');
      setPackingFilter(targetCategory);
      setNewPackingItemCategory(targetCategory);
      setTrips(trips.map(t => t._id === data._id ? data : t));
    } catch (err) {
      console.error('Failed to add custom packing item:', err);
    }
  };

  // Single Day Regeneration
  const handleRegenerateDay = async () => {
    if (!selectedTrip || regenDayNum === null || !regenInstruction.trim()) return;

    setRegenerationLoading(true);
    try {
      const data = await tripApi.regenerateDay(selectedTrip._id, regenDayNum, regenInstruction);
      setSelectedTrip(data);
      setTrips(trips.map(t => t._id === data._id ? data : t));
      
      // Reset forms
      setRegenDayNum(null);
      setRegenInstruction('');
    } catch (err) {
      alert('Failed to regenerate this day. Please check your instructions and try again.');
      console.error('Failed to regenerate day:', err);
    } finally {
      setRegenerationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center">
        <Compass className="h-10 w-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide animate-pulse">Accessing secure travel enclave...</p>
      </div>
    );
  }

  // Filter packing items
  const filteredPacking = selectedTrip?.packingList?.filter(item => {
    if (packingFilter === 'All') return true;
    return item.category === packingFilter;
  }) || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="bg-slate-900/60 border-b border-slate-900 sticky top-0 z-20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-xl">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-wider bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              TRAO AI
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400 hidden sm:inline-block bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/20">
              🔑 Vault Connected: {userEmail}
            </span>
            <button
              onClick={handleLogout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition duration-200 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Navigation, Vault, Budgets */}
        <div className="space-y-6">
          
          {/* Trip Selector & Launcher */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">Active Travel Vaults</h2>
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white p-1.5 rounded-lg text-xs font-bold transition duration-200 cursor-pointer"
                title="Create a new trip"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {trips.length === 0 ? (
              <p className="text-xs text-slate-500 py-4">No trips configured. Launch a new vault to begin!</p>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {trips.map((trip) => {
                  const isActive = selectedTrip?._id === trip._id;
                  return (
                    <div
                      key={trip._id}
                      onClick={() => {
                        setSelectedTrip(trip);
                        setShowCreateForm(false);
                      }}
                      className={`w-full text-left p-4 rounded-xl transition duration-200 cursor-pointer border flex justify-between items-center group ${
                        isActive
                          ? 'bg-blue-600/10 border-blue-500/50 text-white'
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold truncate text-sm ${isActive ? 'text-blue-300' : ''}`}>{trip.destination}</p>
                        <p className="text-[11px] opacity-75 mt-0.5">
                          {trip.durationDays} Days &bull; {trip.budgetTier} Budget
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteTrip(trip._id, e)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer"
                        title="Delete travel record"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Budget Cost Ledger */}
          {selectedTrip && !showCreateForm && (
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
              
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span>Financial Ledger</span>
              </h2>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Transit & Logistics:</span>
                  <span className="font-semibold text-slate-200">${selectedTrip.estimatedBudget.transport}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Accommodations:</span>
                  <span className="font-semibold text-slate-200">${selectedTrip.estimatedBudget.accommodation}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Culinary & Food:</span>
                  <span className="font-semibold text-slate-200">${selectedTrip.estimatedBudget.food}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Activities & Sightseeing:</span>
                  <span className="font-semibold text-slate-200">${selectedTrip.estimatedBudget.activities}</span>
                </div>
                
                <div className="border-t border-slate-800 pt-3 flex justify-between items-center font-bold text-sm text-white">
                  <span>Grand Total Estimated Budget:</span>
                  <span className="text-emerald-400">${selectedTrip.estimatedBudget.total}</span>
                </div>
              </div>
            </div>
          )}

          {/* Hotel Recommendations */}
          {selectedTrip && !showCreateForm && (
            <div className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-4 flex items-center gap-2">
                <HotelIcon className="h-4 w-4 text-indigo-400" />
                <span>Hotel Recommendations</span>
              </h2>

              <div className="space-y-3">
                {selectedTrip.hotels && selectedTrip.hotels.length > 0 ? (
                  selectedTrip.hotels.map((hotel, index) => (
                    <div key={index} className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col justify-between gap-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="font-bold text-xs text-white truncate max-w-[180px]">{hotel.name}</span>
                        <span className="text-[10px] bg-indigo-900/30 text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                          {hotel.tier}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 mt-1">
                        <span>Est: ${hotel.estimatedCostNightUSD}/night</span>
                        <span className="text-yellow-500 font-semibold">&bull; {hotel.rating}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500">No hotel suggestions loaded.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Core Content workspace */}
        <div className="lg:col-span-2 space-y-6">
          
          {showCreateForm ? (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                {trips.length > 0 && (
                  <button 
                    onClick={() => setShowCreateForm(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-900 transition cursor-pointer"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <span className="text-xs text-slate-400">Back to Board</span>
              </div>
              <CreateTripForm onSubmit={handleCreateTrip} loading={generating} />
            </div>
          ) : selectedTrip ? (
            <div className="space-y-6 animate-fade-in">
              
              {/* Trip Title Banner */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2.5 text-xs text-indigo-400 font-semibold uppercase tracking-wider">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{selectedTrip.destination}</span>
                  </div>
                  <h1 className="text-2xl font-extrabold text-white mt-1">
                    Day-by-Day Timeline
                  </h1>
                </div>

                <div className="flex gap-2">
                  <span className="text-xs bg-slate-900/80 border border-slate-800 text-slate-300 px-3.5 py-1.5 rounded-xl font-medium">
                    🗓️ {selectedTrip.durationDays} Days
                  </span>
                  <span className="text-xs bg-slate-900/80 border border-slate-800 text-slate-300 px-3.5 py-1.5 rounded-xl font-medium">
                    💰 {selectedTrip.budgetTier} Budget
                  </span>
                </div>
              </div>

              {/* Day-by-Day Itinerary Board */}
              <div className="glass-panel rounded-2xl p-6">
                <h2 className="text-base font-bold text-white border-b border-slate-800 pb-4 mb-6">
                  Itinerary Schedule
                </h2>

                <div className="space-y-6">
                  {selectedTrip.itinerary.map((day) => (
                    <div key={day.dayNumber} className="border-l-2 border-indigo-500 pl-6 relative">
                      <div className="absolute -left-[9px] top-1 w-4 h-4 bg-indigo-500 rounded-full border-4 border-slate-950" />
                      
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-extrabold text-slate-200">Day {day.dayNumber}</h3>
                        
                        {/* Regenerate Specific Day Trigger */}
                        <button
                          onClick={() => {
                            setRegenDayNum(regenDayNum === day.dayNumber ? null : day.dayNumber);
                            setRegenInstruction('');
                          }}
                          className="text-slate-400 hover:text-indigo-400 px-2.5 py-1 rounded-lg hover:bg-indigo-500/10 text-xs font-semibold flex items-center gap-1.5 transition duration-200 cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Regenerate Day</span>
                        </button>
                      </div>

                      {/* Day Regeneration slide-down prompt inputs */}
                      {regenDayNum === day.dayNumber && (
                        <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 mb-4 space-y-3 animate-fade-in">
                          <p className="text-[11px] text-slate-400">
                            Provide instructions on how to regenerate Day {day.dayNumber} (e.g. "Change this day to a outdoor nature hiking activities near Mount Fuji instead of shopping").
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={regenInstruction}
                              onChange={(e) => setRegenInstruction(e.target.value)}
                              placeholder="e.g. Include outdoor hikes instead of shopping..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-indigo-500"
                              disabled={regenerationLoading}
                            />
                            <button
                              onClick={handleRegenerateDay}
                              disabled={regenerationLoading || !regenInstruction.trim()}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              {regenerationLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              <span>Apply</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Activities */}
                      <div className="space-y-3 mb-4">
                        {day.activities && day.activities.length > 0 ? (
                          day.activities.map((act, index) => (
                            <div 
                              key={index} 
                              className="bg-slate-900/40 border border-slate-800/80 p-4 rounded-xl flex justify-between items-start gap-4 hover:border-slate-700/60 transition duration-200 group"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-white">{act.title}</span>
                                  <span className="text-[9px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-semibold">
                                    {act.timeOfDay}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{act.description}</p>
                                <span className="text-[10px] text-emerald-400 font-semibold block mt-1">
                                  Est Cost: ${act.estimatedCostUSD}
                                </span>
                              </div>
                              <button
                                onClick={() => handleRemoveActivity(day.dayNumber, index)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer"
                                title="Remove activity"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-slate-500 italic py-1">No activities planned for this day. Append one below!</p>
                        )}
                      </div>

                      {/* Add Activity Controls */}
                      {addingActivityDay === day.dayNumber ? (
                        <div className="bg-slate-900/30 border border-slate-800/60 rounded-xl p-4 space-y-3 max-w-md">
                          <h4 className="text-xs font-bold text-slate-200">Inject Activity Details</h4>
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={newActivityTitle}
                              onChange={(e) => setNewActivityTitle(e.target.value)}
                              placeholder="Activity Title..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-indigo-500"
                              required
                            />
                            <textarea
                              value={newActivityDesc}
                              onChange={(e) => setNewActivityDesc(e.target.value)}
                              placeholder="Brief description..."
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 focus:outline-none focus:border-indigo-500 min-h-[50px] resize-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Time of Day</label>
                                <select
                                  value={newActivityTime}
                                  onChange={(e: any) => setNewActivityTime(e.target.value)}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs p-2 focus:outline-none focus:border-indigo-500 text-slate-200"
                                >
                                  <option value="Morning">Morning</option>
                                  <option value="Afternoon">Afternoon</option>
                                  <option value="Evening">Evening</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Est. Cost (USD)</label>
                                <input
                                  type="number"
                                  min={0}
                                  value={newActivityCost}
                                  onChange={(e) => setNewActivityCost(Number(e.target.value))}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs p-2 focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={() => setAddingActivityDay(null)}
                              className="px-3 py-1.5 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-900 transition text-xs font-semibold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAddActivity(day.dayNumber)}
                              disabled={!newActivityTitle.trim()}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setAddingActivityDay(day.dayNumber);
                            setNewActivityTitle('');
                            setNewActivityDesc('');
                            setNewActivityCost(0);
                            setNewActivityTime('Morning');
                          }}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-400 text-xs font-semibold transition mt-1 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Append activity...</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Creative Weather-Aware Packing Checklist Component */}
              <div className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-1">
                  <CloudSun className="h-5 w-5 text-sky-400" />
                  <h3 className="text-base font-bold text-white">
                    AI Weather-Aware Packing Assistant
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Based on target activity checklists and forecasted climate zones for {selectedTrip.destination}, pack these items:
                </p>

                {/* Filters */}
                <div className="flex gap-1.5 overflow-x-auto pb-4 mb-4 border-b border-slate-800/80">
                  {['All', 'Documents', 'Clothing', 'Gear', 'Other'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleFilterChange(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition duration-200 cursor-pointer ${
                        packingFilter === cat
                          ? 'bg-sky-600/20 border border-sky-500 text-sky-300'
                          : 'bg-slate-900/50 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* List Container */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {filteredPacking.length > 0 ? (
                    filteredPacking.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => handleTogglePacking(item._id!)}
                        className="flex items-center gap-3 p-3 bg-slate-900/30 border border-slate-800/80 rounded-xl cursor-pointer hover:bg-slate-900 transition group"
                      >
                        <button className="text-slate-500 group-hover:text-slate-400 transition cursor-pointer">
                          {item.isPacked ? (
                            <CheckSquare className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-600" />
                          )}
                        </button>
                        <span className={`text-xs ${item.isPacked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {item.item}
                        </span>
                        <span className="ml-auto text-[9px] uppercase bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-semibold font-mono">
                          {item.category}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500 col-span-2 italic py-2">No packing items found in this category.</p>
                  )}
                </div>

                {/* Add Custom packing item inline form */}
                <form onSubmit={handleAddPackingItem} className="flex flex-col sm:flex-row gap-2.5 max-w-xl">
                  <input
                    type="text"
                    placeholder="Inject custom packing item..."
                    value={newPackingItemName}
                    onChange={(e) => setNewPackingItemName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 w-full focus:outline-none focus:border-sky-500"
                    required
                  />
                  <div className="flex gap-2">
                    <select
                      value={newPackingItemCategory}
                      onChange={(e: any) => setNewPackingItemCategory(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg text-xs p-2 focus:outline-none focus:border-sky-500 text-slate-300"
                    >
                      <option value="Documents">Documents</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Gear">Gear</option>
                      <option value="Other">Other</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!newPackingItemName.trim()}
                      className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg px-4 py-2 text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                </form>
              </div>

            </div>
          ) : (
            <div className="flex flex-col justify-center items-center h-[400px] bg-slate-900/20 border border-slate-800/80 rounded-2xl text-center p-6">
              <Compass className="h-16 w-16 text-slate-700 animate-pulse mb-4" />
              <p className="text-slate-400 font-bold mb-1">Travel Board Empty</p>
              <p className="text-xs text-slate-500 max-w-sm mb-6">
                Create a new travel itinerary vault or choose a trip to begin your planning.
              </p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-indigo-500/25 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Launch First Vault</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
