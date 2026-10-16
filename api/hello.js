// Vercel serverless function → GET /api/hello
export default function handler(req, res) {
  res.status(200).json({ ok: true })
}
