import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// 学生对话 JSON 的存放目录（由 AI 学习伙伴写入，本接口只读）
const NOTE_LOG_DIR = path.resolve(process.cwd(), 'note-logs');
const NOTE_IDS = new Set(['1', '2', '3']);

// API 路由示例
router.get('/api/hello', (req, res) => {
  res.json({
    message: 'Hello from Express + Vite!',
    timestamp: new Date().toISOString(),
  });
});

router.post('/api/data', (req, res) => {
  const requestData = req.body;
  res.json({
    success: true,
    data: requestData,
    receivedAt: new Date().toISOString(),
  });
});

/**
 * 研究笔记的学生对话记录（自动化批分用）
 * GET /note-log/1 | /note-log/2 | /note-log/3 → 返回 note-logs/note-{x}.json 的内容
 * 尚未生成（学生还没完成该笔记）→ 404
 */
router.get('/note-log/:x', (req, res) => {
  const x = req.params.x;
  if (!NOTE_IDS.has(x)) {
    res.status(400).json({ error: '笔记编号只支持 1 / 2 / 3' });
    return;
  }
  const file = path.join(NOTE_LOG_DIR, `note-${x}.json`);
  if (!fs.existsSync(file)) {
    res.status(404).json({ error: `note-logs/note-${x}.json 尚未生成` });
    return;
  }
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[note-log] 读取 note-${x}.json 失败：${message}`);
    res.status(500).json({ error: `note-logs/note-${x}.json 不是合法 JSON` });
  }
});

// 健康检查接口
router.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.COZE_PROJECT_ENV,
    timestamp: new Date().toISOString(),
  });
});

export default router;
