import { Router } from 'express';
import { 
  generateNewTrip, 
  getUserTrips, 
  getTripById, 
  updateTrip, 
  regenerateDay, 
  deleteTrip 
} from '../controllers/tripController';
import { protect } from '../middleware/auth';

const router = Router();

// Protect all routes in this router
router.use(protect as any);

router.post('/', generateNewTrip as any);
router.get('/', getUserTrips as any);
router.get('/:id', getTripById as any);
router.put('/:id', updateTrip as any);
router.post('/:id/regenerate-day', regenerateDay as any);
router.delete('/:id', deleteTrip as any);

export default router;
