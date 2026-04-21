const express = require('express');
const app = express();

app.get('/callback', (req, res) => {
  console.log('👉 CODE:', req.query.code);
  res.send('OK! Bạn đã lấy được code. Xem terminal nhé!');
});

app.listen(3000, () => {
  console.log('🚀 Server chạy tại http://localhost:3000');
});