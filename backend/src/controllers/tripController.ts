import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Trip, IActivity, IItineraryDay, IPackingItem } from '../models/Trip';
import { isMockDbEnabled, MockTrip } from '../config/mockDb';

// Exponential backoff executor for external API resilience
async function fetchWithRetry(url: string, options: RequestInit, retries = 5, delay = 1000): Promise<any> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429 && retries > 0) {
        console.warn(`Gemini API 429 Rate Limit. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return fetchWithRetry(url, options, retries - 1, delay * 2);
      }
      const errText = await response.text();
      throw new Error(`External API Error: Status Code ${response.status}. Details: ${errText}`);
    }
    return await response.json();
  } catch (error) {
    if (retries > 0) {
      console.warn(`Request failed: ${(error as Error).message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Recalculates the total estimated budget based on breakdown
const recalculateTripBudget = (trip: any) => {
  let activitiesCost = 0;
  trip.itinerary.forEach((day: IItineraryDay) => {
    day.activities.forEach((act: IActivity) => {
      activitiesCost += act.estimatedCostUSD || 0;
    });
  });
  
  trip.estimatedBudget.activities = activitiesCost;
  trip.estimatedBudget.total = 
    (trip.estimatedBudget.transport || 0) +
    (trip.estimatedBudget.accommodation || 0) +
    (trip.estimatedBudget.food || 0) +
    activitiesCost;
};

// Generates a new Trip using Google Gemini API
export const generateNewTrip = async (req: AuthRequest, res: Response) => {
  try {
    const { destination, durationDays, budgetTier, interests } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!destination || !durationDays || !budgetTier) {
      return res.status(400).json({ message: 'Destination, durationDays, and budgetTier are required' });
    }

    const durationNum = parseInt(durationDays, 10);
    if (isNaN(durationNum) || durationNum <= 0 || durationNum > 30) {
      return res.status(400).json({ message: 'Duration must be between 1 and 30 days' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    let cleanResult;

    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not configured. Generating high-fidelity mock trip itinerary...');
      const mockDays = [];
      for (let i = 1; i <= durationNum; i++) {
        mockDays.push({
          dayNumber: i,
          activities: [
            { 
              title: `Explore ${destination} Highlights (Day ${i})`, 
              description: `Vibrant exploration of landmarks and local hidden gems in ${destination} matching ${(interests || []).join(', ') || 'travel'} interests.`, 
              estimatedCostUSD: budgetTier === 'Low' ? 15 : budgetTier === 'Medium' ? 40 : 100, 
              timeOfDay: 'Morning' 
            },
            { 
              title: `Culinary Experience at ${destination}`, 
              description: `Savor traditional flavors and local dishes aligned with a ${budgetTier} budget.`, 
              estimatedCostUSD: budgetTier === 'Low' ? 10 : budgetTier === 'Medium' ? 30 : 80, 
              timeOfDay: 'Afternoon' 
            }
          ]
        });
      }

      cleanResult = {
        itinerary: mockDays,
        hotels: [
          { name: `Hotel ${destination} Plaza`, tier: budgetTier === 'Low' ? 'Budget Friendly' : budgetTier === 'Medium' ? 'Mid-Range' : 'Luxury', estimatedCostNightUSD: budgetTier === 'Low' ? 50 : budgetTier === 'Medium' ? 120 : 350, rating: '4.6/5' },
          { name: `${destination} Boutique Suites`, tier: budgetTier === 'Low' ? 'Budget Friendly' : budgetTier === 'Medium' ? 'Mid-Range' : 'Luxury', estimatedCostNightUSD: budgetTier === 'Low' ? 65 : budgetTier === 'Medium' ? 140 : 420, rating: '4.8/5' }
        ],
        estimatedBudget: {
          transport: budgetTier === 'Low' ? 30 * durationNum : budgetTier === 'Medium' ? 70 * durationNum : 180 * durationNum,
          accommodation: (budgetTier === 'Low' ? 50 : budgetTier === 'Medium' ? 120 : 350) * durationNum,
          food: (budgetTier === 'Low' ? 20 : budgetTier === 'Medium' ? 45 : 110) * durationNum,
          activities: 0,
          total: 0
        },
        packingList: [
          { item: 'Passport & Travel Visa documents', category: 'Documents', isPacked: false },
          { item: 'Valid Photo Identification', category: 'Documents', isPacked: false },
          { item: budgetTier === 'Low' ? 'Comfortable Walking Sneakers' : 'Premium Walking Shoes', category: 'Gear', isPacked: false },
          { item: `Appropriate seasonal wear for ${destination}`, category: 'Clothing', isPacked: false },
          { item: 'Universal Power Adapter', category: 'Other', isPacked: false },
          { item: 'Compact Umbrella or Rain Jacket', category: 'Clothing', isPacked: false }
        ]
      };
    } else {
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });

      const prompt = `
        Create a detailed, beautiful, and customized travel plan for a ${durationNum}-day trip to ${destination}.
        Budget tier preference: ${budgetTier}.
        Interests are: ${(interests || []).join(', ')}.
        Current seasonal period is around ${currentMonth}.

        You must generate an itinerary covering exactly ${durationNum} days.
        For the "packingList", cross-reference the climate of ${destination} in ${currentMonth} and the selected activities to generate a highly customized packing checklist.
        Categorize the items into: "Documents", "Clothing", "Gear", or "Other". Include weather protection, appropriate clothing, and gear based on interests.

        You must output ONLY a valid JSON object matching this structure. Do not wrap in markdown code blocks:
        {
          "itinerary": [
            {
              "dayNumber": 1,
              "activities": [
                { "title": "Activity name", "description": "Brief description of where to go and what to do", "estimatedCostUSD": 20, "timeOfDay": "Morning" }
              ]
            }
          ],
          "hotels": [
            { "name": "Recommended Hotel Name", "tier": "Budget Friendly", "estimatedCostNightUSD": 85, "rating": "4.5/5" }
          ],
          "estimatedBudget": {
            "transport": 120,
            "accommodation": 300,
            "food": 150,
            "activities": 100,
            "total": 670
          },
          "packingList": [
            { "item": "Passport", "category": "Documents", "isPacked": false }
          ]
        }

        Ensure estimates reflect realistic costs for a ${budgetTier} budget in ${destination}.
      `;

      const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const requestPayload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      console.log(`Calling Gemini API (${modelName}) to generate trip to ${destination}...`);
      
      const data = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      const parsedResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!parsedResponseText) {
        throw new Error("Could not extract generation data from Gemini response.");
      }

      try {
        cleanResult = JSON.parse(parsedResponseText);
      } catch (parseErr) {
        console.error('Error parsing JSON from Gemini response. Text:', parsedResponseText);
        const matches = parsedResponseText.match(/\{[\s\S]*\}/);
        if (matches) {
          cleanResult = JSON.parse(matches[0]);
        } else {
          throw new Error("Failed to parse Gemini response as JSON.");
        }
      }
    }

    // Sanitize itinerary activities timeOfDay to match our Mongoose schema enum
    if (cleanResult && cleanResult.itinerary && Array.isArray(cleanResult.itinerary)) {
      cleanResult.itinerary.forEach((day: any) => {
        if (day.activities && Array.isArray(day.activities)) {
          day.activities.forEach((act: any) => {
            const validTimes = ['Morning', 'Afternoon', 'Evening'];
            if (!act.timeOfDay || !validTimes.includes(act.timeOfDay)) {
              if (typeof act.timeOfDay === 'string' && act.timeOfDay.toLowerCase().includes('morn')) {
                act.timeOfDay = 'Morning';
              } else if (typeof act.timeOfDay === 'string' && (act.timeOfDay.toLowerCase().includes('even') || act.timeOfDay.toLowerCase().includes('night'))) {
                act.timeOfDay = 'Evening';
              } else {
                act.timeOfDay = 'Afternoon';
              }
            }
          });
        }
      });
    }

    if (isMockDbEnabled()) {
      const savedTrip = await MockTrip.create({
        userId,
        destination,
        durationDays: durationNum,
        budgetTier,
        interests: interests || [],
        itinerary: cleanResult.itinerary,
        hotels: cleanResult.hotels,
        estimatedBudget: cleanResult.estimatedBudget,
        packingList: cleanResult.packingList
      });
      recalculateTripBudget(savedTrip);
      await savedTrip.save();
      return res.status(201).json(savedTrip);
    }

    const newTrip = new Trip({
      userId,
      destination,
      durationDays: durationNum,
      budgetTier,
      interests: interests || [],
      itinerary: cleanResult.itinerary,
      hotels: cleanResult.hotels,
      estimatedBudget: cleanResult.estimatedBudget,
      packingList: cleanResult.packingList
    });

    // Ensure budget total matches our recalculation rule initially
    recalculateTripBudget(newTrip);

    const savedTrip = await newTrip.save();
    return res.status(201).json(savedTrip);

  } catch (error) {
    console.error("Critical AI Generation Error:", error);
    return res.status(500).json({ 
      message: "Fail-safe: Gemini API encountered an error processing your trip. Please check your API key or try again." 
    });
  }
};

// Get all trips for the logged-in user (User isolation check)
export const getUserTrips = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (isMockDbEnabled()) {
      const trips = await MockTrip.find({ userId });
      return res.status(200).json(trips);
    }

    const trips = await Trip.find({ userId }).sort({ createdAt: -1 });
    return res.status(200).json(trips);
  } catch (error) {
    console.error('Fetch trips error:', error);
    return res.status(500).json({ message: 'Internal Server Error fetching trips' });
  }
};

// Get a single trip (User isolation check)
export const getTripById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (isMockDbEnabled()) {
      const trip = await MockTrip.findOne({ _id: id, userId });
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found or access denied' });
      }
      return res.status(200).json(trip);
    }

    const trip = await Trip.findOne({ _id: id, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found or access denied' });
    }

    return res.status(200).json(trip);
  } catch (error) {
    console.error('Fetch single trip error:', error);
    return res.status(500).json({ message: 'Internal Server Error fetching trip details' });
  }
};

// Update a trip (itinerary, packingList)
export const updateTrip = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const updateData = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (isMockDbEnabled()) {
      const trip = await MockTrip.findOne({ _id: id, userId });
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found or access denied' });
      }

      if (updateData.itinerary) trip.itinerary = updateData.itinerary;
      if (updateData.packingList) trip.packingList = updateData.packingList;

      recalculateTripBudget(trip);
      const updatedTrip = await trip.save();
      return res.status(200).json(updatedTrip);
    }

    const trip = await Trip.findOne({ _id: id, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found or access denied' });
    }

    // Update itinerary if provided
    if (updateData.itinerary) {
      trip.itinerary = updateData.itinerary;
    }

    // Update packing list if provided
    if (updateData.packingList) {
      trip.packingList = updateData.packingList;
    }

    // Recalculate estimated budget
    recalculateTripBudget(trip);

    const updatedTrip = await trip.save();
    return res.status(200).json(updatedTrip);
  } catch (error) {
    console.error('Update trip error:', error);
    return res.status(500).json({ message: 'Internal Server Error updating trip' });
  }
};

// Regenerate a specific Day in Itinerary
export const regenerateDay = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { dayNumber, instruction } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!dayNumber || !instruction) {
      return res.status(400).json({ message: 'dayNumber and instruction are required' });
    }

    const targetDayNumber = parseInt(dayNumber, 10);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY not configured. Generating mock single-day regenerated activities...');
      const trip = isMockDbEnabled() 
        ? await MockTrip.findOne({ _id: id, userId }) 
        : await Trip.findOne({ _id: id, userId });
      
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found or access denied' });
      }
      
      const dayIndex = trip.itinerary.findIndex((d: any) => d.dayNumber === targetDayNumber);
      if (dayIndex === -1) {
        return res.status(400).json({ message: `Day ${dayNumber} does not exist in this itinerary` });
      }

      trip.itinerary[dayIndex].activities = [
        { 
          title: `Custom ${instruction} Experience`, 
          description: `Enjoy personalized activities themed around: "${instruction}".`, 
          estimatedCostUSD: trip.budgetTier === 'Low' ? 15 : trip.budgetTier === 'Medium' ? 45 : 120, 
          timeOfDay: 'Morning' 
        },
        { 
          title: `Traditional lunch & Local sightseeing`, 
          description: `Savor culinary specialties and continue exploring interests: "${instruction}".`, 
          estimatedCostUSD: trip.budgetTier === 'Low' ? 10 : trip.budgetTier === 'Medium' ? 30 : 90, 
          timeOfDay: 'Afternoon' 
        }
      ];

      recalculateTripBudget(trip);
      const updatedTrip = await trip.save();
      return res.status(200).json(updatedTrip);
    }

    if (isMockDbEnabled()) {
      const trip = await MockTrip.findOne({ _id: id, userId });
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found or access denied' });
      }

      const dayIndex = trip.itinerary.findIndex((d: any) => d.dayNumber === targetDayNumber);
      if (dayIndex === -1) {
        return res.status(400).json({ message: `Day ${dayNumber} does not exist in this itinerary` });
      }

      const prompt = `
        You are an expert travel assistant. The user wants to update Day ${dayNumber} of their trip to ${trip.destination}.
        Original Trip Interests: ${trip.interests.join(', ')}.
        Budget Preference: ${trip.budgetTier}.

        Current activities for Day ${dayNumber} are:
        ${JSON.stringify(trip.itinerary[dayIndex].activities)}

        User Instruction for changing this day: "${instruction}"

        Based on this instruction, regenerate the activities list for Day ${dayNumber}. Keep the budget tier (${trip.budgetTier}) in mind for costs.
        
        You must output ONLY a valid JSON array of activities conforming to this format. Do not wrap in markdown code blocks:
        [
          { "title": "Activity name", "description": "Brief description", "estimatedCostUSD": 20, "timeOfDay": "Morning" }
        ]
      `;

      const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const requestPayload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      };

      console.log(`Calling Gemini API to regenerate Day ${dayNumber} of trip to ${trip.destination}...`);
      
      const data = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      const parsedResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!parsedResponseText) {
        throw new Error("Could not extract regeneration data from Gemini response.");
      }

      let newActivities: IActivity[];
      try {
        newActivities = JSON.parse(parsedResponseText);
      } catch (parseErr) {
        const matches = parsedResponseText.match(/\[[\s\S]*\]/);
        if (matches) {
          newActivities = JSON.parse(matches[0]);
        } else {
          throw new Error("Failed to parse Gemini response as activities array.");
        }
      }

      if (newActivities && Array.isArray(newActivities)) {
        newActivities.forEach((act: any) => {
          const validTimes = ['Morning', 'Afternoon', 'Evening'];
          if (!act.timeOfDay || !validTimes.includes(act.timeOfDay)) {
            if (typeof act.timeOfDay === 'string' && act.timeOfDay.toLowerCase().includes('morn')) {
              act.timeOfDay = 'Morning';
            } else if (typeof act.timeOfDay === 'string' && (act.timeOfDay.toLowerCase().includes('even') || act.timeOfDay.toLowerCase().includes('night'))) {
              act.timeOfDay = 'Evening';
            } else {
              act.timeOfDay = 'Afternoon';
            }
          }
        });
      }

      trip.itinerary[dayIndex].activities = newActivities;
      recalculateTripBudget(trip);
      const updatedTrip = await trip.save();
      return res.status(200).json(updatedTrip);
    }

    const trip = await Trip.findOne({ _id: id, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found or access denied' });
    }

    const dayIndex = trip.itinerary.findIndex(d => d.dayNumber === targetDayNumber);
    if (dayIndex === -1) {
      return res.status(400).json({ message: `Day ${dayNumber} does not exist in this itinerary` });
    }

    const prompt = `
      You are an expert travel assistant. The user wants to update Day ${dayNumber} of their trip to ${trip.destination}.
      Original Trip Interests: ${trip.interests.join(', ')}.
      Budget Preference: ${trip.budgetTier}.

      Current activities for Day ${dayNumber} are:
      ${JSON.stringify(trip.itinerary[dayIndex].activities)}

      User Instruction for changing this day: "${instruction}"

      Based on this instruction, regenerate the activities list for Day ${dayNumber}. Keep the budget tier (${trip.budgetTier}) in mind for costs.
      
      You must output ONLY a valid JSON array of activities conforming to this format. Do not wrap in markdown code blocks:
      [
        { "title": "Activity name", "description": "Brief description", "estimatedCostUSD": 20, "timeOfDay": "Morning" }
      ]
    `;

    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const requestPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    console.log(`Calling Gemini API to regenerate Day ${dayNumber} of trip to ${trip.destination}...`);
    
    const data = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload)
    });

    const parsedResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!parsedResponseText) {
      throw new Error("Could not extract regeneration data from Gemini response.");
    }

    let newActivities: IActivity[];
    try {
      newActivities = JSON.parse(parsedResponseText);
    } catch (parseErr) {
      const matches = parsedResponseText.match(/\[[\s\S]*\]/);
      if (matches) {
        newActivities = JSON.parse(matches[0]);
      } else {
        throw new Error("Failed to parse Gemini response as activities array.");
      }
    }

    if (newActivities && Array.isArray(newActivities)) {
      newActivities.forEach((act: any) => {
        const validTimes = ['Morning', 'Afternoon', 'Evening'];
        if (!act.timeOfDay || !validTimes.includes(act.timeOfDay)) {
          if (typeof act.timeOfDay === 'string' && act.timeOfDay.toLowerCase().includes('morn')) {
            act.timeOfDay = 'Morning';
          } else if (typeof act.timeOfDay === 'string' && (act.timeOfDay.toLowerCase().includes('even') || act.timeOfDay.toLowerCase().includes('night'))) {
            act.timeOfDay = 'Evening';
          } else {
            act.timeOfDay = 'Afternoon';
          }
        }
      });
    }

    // Apply the regenerated activities to that specific day
    trip.itinerary[dayIndex].activities = newActivities;

    // Recalculate overall trip budget
    recalculateTripBudget(trip);

    const updatedTrip = await trip.save();
    return res.status(200).json(updatedTrip);

  } catch (error) {
    console.error("Day Regeneration Error:", error);
    return res.status(500).json({ 
      message: "Fail-safe: Gemini API encountered an error regenerating this day. Please try again." 
    });
  }
};

// Delete a Trip (User isolation check)
export const deleteTrip = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (isMockDbEnabled()) {
      const trip = await MockTrip.findOneAndDelete({ _id: id, userId });
      if (!trip) {
        return res.status(404).json({ message: 'Trip not found or access denied' });
      }
      return res.status(200).json({ message: 'Trip deleted successfully' });
    }

    const trip = await Trip.findOneAndDelete({ _id: id, userId });
    if (!trip) {
      return res.status(404).json({ message: 'Trip not found or access denied' });
    }

    return res.status(200).json({ message: 'Trip deleted successfully' });
  } catch (error) {
    console.error('Delete trip error:', error);
    return res.status(500).json({ message: 'Internal Server Error deleting trip' });
  }
};

