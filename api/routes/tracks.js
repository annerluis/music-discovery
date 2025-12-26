import { Router } from 'express';
import { importTrack } from '../utils/tracks-controller.js';

const router = Router();

//router.get('/:id', tracksController.getTrack);
router.post('/import', importTrack);

export default router;