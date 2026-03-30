import express from 'express';

const router = express.Router();

router.get('/hello', (req, res) => {
  res.json({ message: 'hello' });
});
router.get('/', (req, res) => {
    res.json({ message: 'get' });
  });
  router.post('/', (req, res) => {
    res.json({ message: 'post' });
  });
  router.delete('/', (req, res) => {
    res.json({ message: 'delete' });
  });
export default router;
