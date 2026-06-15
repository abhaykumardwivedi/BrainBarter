require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const aiRoutes = require('./routes/ai')
const authRoutes = require('./routes/auth')
const paymentRoutes = require('./routes/payment')

const app = express()

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'https://brain-barter-zeta.vercel.app',
      /\.vercel\.app$/  // allow all Vercel preview URLs
    ]
    if (!origin || allowedOrigins.some(o => o instanceof RegExp ? o.test(origin) : o === origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))
app.use(express.json())

app.get('/health', (_, res) => res.json({ status: 'ok' }))
app.use('/api/ai', aiRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/payment', paymentRoutes)

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
