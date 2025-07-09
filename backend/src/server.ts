import app from './app';
import importRoutes from './routes/importRoute';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  app.use('/api/import', importRoutes);
});