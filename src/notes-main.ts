// ABOUTME: 研究笔记独立页入口（/notes.html）：加载样式并渲染笔记本页面
import './index.css';
import { renderNotesPage } from './notes/notes-page';

// 笔记页使用米黄纸面底色（与主站冰蓝底色区分）
document.body.classList.add('notes-body');

const app = document.getElementById('app');
if (app) {
  renderNotesPage(app);
} else {
  console.error('App element not found');
}
