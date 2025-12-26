import { Router } from 'express';
import { getSimilarTracks } from '../utils/recommendations-controller.js';

const router = Router();

router.get('/:id/similar-tracks', getSimilarTracks);

export default router;