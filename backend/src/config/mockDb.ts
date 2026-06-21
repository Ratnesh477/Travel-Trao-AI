import fs from 'fs';
import path from 'path';

const MOCK_DB_FILE = path.join(__dirname, '../../mock_db.json');

interface MockState {
  users: any[];
  trips: any[];
}

let state: MockState = {
  users: [],
  trips: []
};

// Load data from file if it exists
const loadState = () => {
  try {
    if (fs.existsSync(MOCK_DB_FILE)) {
      const raw = fs.readFileSync(MOCK_DB_FILE, 'utf8');
      state = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to load mock database file, using empty memory state:', err);
  }
};

// Save data to file
const saveState = () => {
  try {
    fs.writeFileSync(MOCK_DB_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save mock database file:', err);
  }
};

// Initialize
loadState();

export const isMockDbEnabled = () => {
  return process.env.USE_MOCK_DB === 'true';
};

export const enableMockDb = () => {
  process.env.USE_MOCK_DB = 'true';
  console.log('⚠️ Mock Database is ENABLED. Data will be saved to mock_db.json');
};

export const MockUser = {
  findOne: async (query: { email?: string; id?: string }) => {
    if (query.email) {
      return state.users.find(u => u.email.toLowerCase() === query.email?.toLowerCase()) || null;
    }
    if (query.id) {
      return state.users.find(u => u.id === query.id) || null;
    }
    return null;
  },
  create: async (userData: any) => {
    const newUser = {
      id: Math.random().toString(36).substring(2, 11),
      _id: Math.random().toString(36).substring(2, 11),
      email: userData.email,
      password: userData.password,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.users.push(newUser);
    saveState();
    return newUser;
  }
};

export const MockTrip = {
  find: async (query: { userId: string }) => {
    return state.trips
      .filter(t => t.userId === query.userId)
      .map(t => ({ ...t, _id: t.id }));
  },
  findOne: async (query: { _id: string; userId: string }) => {
    const trip = state.trips.find(t => t.id === query._id && t.userId === query.userId);
    if (!trip) return null;
    
    // Add helper save method on the returned object to support document.save()
    return {
      ...trip,
      _id: trip.id,
      save: async function() {
        const idx = state.trips.findIndex(t => t.id === this.id);
        if (idx !== -1) {
          // Remove save function before storing
          const cleanTrip = { ...this };
          delete cleanTrip.save;
          state.trips[idx] = cleanTrip;
          saveState();
          return { ...cleanTrip, _id: cleanTrip.id };
        }
        return this;
      }
    };
  },
  create: async (tripData: any) => {
    const newTrip = {
      id: Math.random().toString(36).substring(2, 11),
      _id: Math.random().toString(36).substring(2, 11),
      ...tripData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    // Make sure id and _id are consistent
    newTrip._id = newTrip.id;
    state.trips.push(newTrip);
    saveState();
    return {
      ...newTrip,
      save: async function() {
        return this;
      }
    };
  },
  findOneAndDelete: async (query: { _id: string; userId: string }) => {
    const idx = state.trips.findIndex(t => t.id === query._id && t.userId === query.userId);
    if (idx === -1) return null;
    const deleted = state.trips.splice(idx, 1)[0];
    saveState();
    return { ...deleted, _id: deleted.id };
  }
};
