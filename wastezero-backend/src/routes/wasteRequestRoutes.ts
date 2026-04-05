import { Router } from 'express';
import { authProtect } from '../middleware/authMiddleware';
import {
  createRequest,
  getAllRequests,
  getRequestsByCitizen,
  getRequestsByVolunteer,
  getAvailableRequests,
  updateRequestStatus
} from '../controllers/wasteRequestController';

const router = Router();

router.post('/', createRequest);
router.get('/', getAllRequests);
router.get('/available', authProtect, getAvailableRequests);
router.get('/citizen/:citizenId', getRequestsByCitizen);
router.get('/volunteer/:volunteerId', getRequestsByVolunteer);
router.patch('/:id/status', updateRequestStatus);

export default router;
