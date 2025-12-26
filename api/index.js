if (process.env.NODE_ENV !== 'production') {
  await import('dotenv/config'); // harmless if .env not present
}

import express from 'express';
import dotenv from 'dotenv';
import tracksRouter from './routes/tracks.js';
import recommendationsRouter from './routes/recommendations.js';
//import healthRouter from './routes/health.js';
//import coListeningRouter from './routes/colistening.js';

dotenv.config();

const app = express();
app.use(express.json());

// health check
app.get('/api/healthcheck', (req, res) => {
  res.send('API is running');
});

// routes
app.use('/api/tracks', tracksRouter);
app.use('/api/recommendations', recommendationsRouter);
//app.use('/api/health', healthRouter);
//app.use('/api/colistening', coListeningRouter);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));