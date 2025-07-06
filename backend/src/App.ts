import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import teamRoutes from './routes/teamRoutes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/teams', teamRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running!' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});