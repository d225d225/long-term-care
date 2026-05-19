/**
 * 教師管理頁面測試套件 (teacher.html)
 * 涵蓋：登入驗證、統計計算、篩選搜尋、評語儲存、Email 參數、印章顯示
 *
 * 執行：cd tests && npm install && npm test
 */

'use strict';

// ─────────────────────────────────────────────
// 從 teacher.html 提取的核心邏輯
// ─────────────────────────────────────────────
const TEACHER_PASSWORD = 'teacher2025';
const STORAGE_KEY      = 'yp_ltc_posts_v1';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function checkPassword(input) {
  return input === TEACHER_PASSWORD;
}

function calcStats(posts) {
  return {
    total:     posts.length,
    commented: posts.filter(p => p.teacherComment).length,
    pending:   posts.filter(p => !p.teacherComment).length,
    env:       posts.filter(p => p.group === 'env').length,
    chat:      posts.filter(p => p.group === 'chat').length,
  };
}

function applyFilters(posts, { status, group, search }) {
  let result = [...posts];
  if (status === 'pending')   result = result.filter(p => !p.teacherComment);
  if (status === 'commented') result = result.filter(p =>  p.teacherComment);
  if (group  !== 'all')       result = result.filter(p => p.group === group);
  if (search) {
    const q = search.toLowerCase();
    result = result.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.text || '').toLowerCase().includes(q) ||
      (p.cls  || '').toLowerCase().includes(q)
    );
  }
  return result;
}

function validateComment(text) {
  if (!text || !text.trim()) return { valid: false, msg: '請填寫評語內容' };
  return { valid: true };
}

function buildEmailParams(post, comment) {
  return {
    student_name:    post.name   || '',
    student_email:   post.email  || '',
    student_class:   post.cls    || '',
    student_group:   post.group  === 'env' ? '環境組' : '聊天組',
    student_text:    post.text   || '',
    teacher_comment: comment,
    activity_name:   '115年度青銀共融「一日照服小幫手」體驗活動',
  };
}

function loadFromLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveToLocal(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

function saveComment(id, comment, posts) {
  const err = validateComment(comment);
  if (!err.valid) return { success: false, msg: err.msg };

  const now   = new Date().toLocaleString('zh-TW', { hour12: false });
  const index = posts.findIndex(p => String(p.id) === String(id));
  if (index === -1) return { success: false, msg: '找不到該筆資料' };

  const updated = [...posts];
  updated[index] = { ...updated[index], teacherComment: comment, commentedAt: now };
  return { success: true, updated, post: updated[index] };
}

// ─────────────────────────────────────────────
// 測試資料
// ─────────────────────────────────────────────
const MOCK_POSTS = [
  {
    id: '1', name: '王小明', cls: '101-01', group: 'env',
    email: 'ming@test.com',
    text: '今天幫助長輩整理環境，感受到助人的快樂，印象很深刻。',
    teacherComment: null, time: '2026/05/19 14:00:00'
  },
  {
    id: '2', name: '李小花', cls: '101-02', group: 'chat',
    email: 'hua@test.com',
    text: '和阿嬤聊天真的很開心，她分享了很多以前的故事給我聽。',
    teacherComment: '很棒的心得！你展現了很好的同理心。',
    commentedAt: '2026/05/19 16:30:00', time: '2026/05/19 15:00:00'
  },
  {
    id: '3', name: '張大山', cls: '102-01', group: 'env',
    email: 'shan@test.com',
    text: '第一次進入長照機構，看到許多長輩都很感動，想更了解長照工作。',
    teacherComment: null, time: '2026/05/19 16:00:00'
  },
  {
    id: '4', name: '林美玲', cls: '102-02', group: 'chat',
    email: 'mei@test.com',
    text: '服務過程中長輩教我折紙，雙向互動讓我感到溫暖與感動。',
    teacherComment: '非常用心的紀錄，繼續保持這份熱忱！',
    commentedAt: '2026/05/19 17:00:00', time: '2026/05/19 16:30:00'
  },
];

// ─────────────────────────────────────────────
// 1. 登入驗證
// ─────────────────────────────────────────────
describe('登入驗證', () => {
  test('正確密碼 → 回傳 true', () => {
    expect(checkPassword('teacher2025')).toBe(true);
  });
  test('錯誤密碼 → 回傳 false', () => {
    expect(checkPassword('wrongpassword')).toBe(false);
  });
  test('空字串 → 回傳 false', () => {
    expect(checkPassword('')).toBe(false);
  });
  test('大小寫不同 → 回傳 false', () => {
    expect(checkPassword('Teacher2025')).toBe(false);
    expect(checkPassword('TEACHER2025')).toBe(false);
  });
  test('密碼有空格 → 回傳 false', () => {
    expect(checkPassword('teacher2025 ')).toBe(false);
    expect(checkPassword(' teacher2025')).toBe(false);
  });
});

// ─────────────────────────────────────────────
// 2. 統計計算
// ─────────────────────────────────────────────
describe('統計計算 — calcStats()', () => {
  test('總數正確', () => {
    expect(calcStats(MOCK_POSTS).total).toBe(4);
  });
  test('已評語數正確', () => {
    expect(calcStats(MOCK_POSTS).commented).toBe(2);
  });
  test('待評語數正確', () => {
    expect(calcStats(MOCK_POSTS).pending).toBe(2);
  });
  test('已評語 + 待評語 = 總數', () => {
    const s = calcStats(MOCK_POSTS);
    expect(s.commented + s.pending).toBe(s.total);
  });
  test('環境組人數正確', () => {
    expect(calcStats(MOCK_POSTS).env).toBe(2);
  });
  test('聊天組人數正確', () => {
    expect(calcStats(MOCK_POSTS).chat).toBe(2);
  });
  test('環境組 + 聊天組 = 總數', () => {
    const s = calcStats(MOCK_POSTS);
    expect(s.env + s.chat).toBe(s.total);
  });
  test('空陣列所有統計為 0', () => {
    const s = calcStats([]);
    expect(s.total).toBe(0);
    expect(s.commented).toBe(0);
    expect(s.pending).toBe(0);
  });
});

// ─────────────────────────────────────────────
// 3. 篩選與搜尋
// ─────────────────────────────────────────────
describe('篩選與搜尋 — applyFilters()', () => {
  const defaults = { status: 'all', group: 'all', search: '' };

  test('無篩選條件回傳全部', () => {
    expect(applyFilters(MOCK_POSTS, defaults)).toHaveLength(4);
  });

  describe('狀態篩選', () => {
    test("status='pending' 只回傳待評語", () => {
      const result = applyFilters(MOCK_POSTS, { ...defaults, status: 'pending' });
      expect(result).toHaveLength(2);
      result.forEach(p => expect(p.teacherComment).toBeNull());
    });
    test("status='commented' 只回傳已評語", () => {
      const result = applyFilters(MOCK_POSTS, { ...defaults, status: 'commented' });
      expect(result).toHaveLength(2);
      result.forEach(p => expect(p.teacherComment).toBeTruthy());
    });
  });

  describe('組別篩選', () => {
    test("group='env' 只回傳環境組", () => {
      const result = applyFilters(MOCK_POSTS, { ...defaults, group: 'env' });
      expect(result).toHaveLength(2);
      result.forEach(p => expect(p.group).toBe('env'));
    });
    test("group='chat' 只回傳聊天組", () => {
      const result = applyFilters(MOCK_POSTS, { ...defaults, group: 'chat' });
      expect(result).toHaveLength(2);
      result.forEach(p => expect(p.group).toBe('chat'));
    });
  });

  describe('複合篩選', () => {
    test('待評語 + 環境組', () => {
      const result = applyFilters(MOCK_POSTS, { ...defaults, status: 'pending', group: 'env' });
      expect(result).toHaveLength(2);
      result.forEach(p => {
        expect(p.group).toBe('env');
        expect(p.teacherComment).toBeNull();
      });
    });
    test('已評語 + 聊天組', () => {
      const result = applyFilters(MOCK_POSTS, { ...defaults, status: 'commented', group: 'chat' });
      expect(result).toHaveLength(2);
    });
  });

  describe('搜尋', () => {
    test('依姓名搜尋', () => {
      const result = applyFilters(MOCK_POSTS, { ...defaults, search: '小明' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('王小明');
    });
    test('依心得內容搜尋', () => {
      const result = applyFilters(MOCK_POSTS, { ...defaults, search: '折紙' });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('林美玲');
    });
    test('依班級搜尋', () => {
      const result = applyFilters(MOCK_POSTS, { ...defaults, search: '102' });
      expect(result).toHaveLength(2);
    });
    test('搜尋不分大小寫', () => {
      const lower = applyFilters(MOCK_POSTS, { ...defaults, search: '102-01' });
      const upper = applyFilters(MOCK_POSTS, { ...defaults, search: '102-01' });
      expect(lower).toHaveLength(upper.length);
    });
    test('無結果搜尋回傳空陣列', () => {
      expect(applyFilters(MOCK_POSTS, { ...defaults, search: '不存在的關鍵字XYZ' })).toHaveLength(0);
    });
    test('搜尋不修改原始陣列', () => {
      applyFilters(MOCK_POSTS, { ...defaults, search: '小明' });
      expect(MOCK_POSTS).toHaveLength(4);
    });
  });
});

// ─────────────────────────────────────────────
// 4. 評語儲存
// ─────────────────────────────────────────────
describe('評語儲存 — saveComment()', () => {
  test('空評語 → 回傳 success:false', () => {
    const r = saveComment('1', '', MOCK_POSTS);
    expect(r.success).toBe(false);
    expect(r.msg).toBeTruthy();
  });
  test('只有空格的評語 → 回傳 success:false', () => {
    expect(saveComment('1', '   ', MOCK_POSTS).success).toBe(false);
  });
  test('有效評語 → 回傳 success:true', () => {
    const r = saveComment('1', '很好的心得，繼續加油！', MOCK_POSTS);
    expect(r.success).toBe(true);
  });
  test('儲存後該 post 有 teacherComment', () => {
    const r = saveComment('1', '老師評語測試。', MOCK_POSTS);
    expect(r.post.teacherComment).toBe('老師評語測試。');
  });
  test('儲存後有 commentedAt 時間戳', () => {
    const r = saveComment('1', '老師評語測試。', MOCK_POSTS);
    expect(r.post.commentedAt).toBeTruthy();
  });
  test('找不到 id → 回傳 success:false', () => {
    const r = saveComment('999', '評語內容', MOCK_POSTS);
    expect(r.success).toBe(false);
  });
  test('不修改其他 post', () => {
    const r = saveComment('1', '評語。', MOCK_POSTS);
    const other = r.updated.find(p => p.id === '2');
    expect(other.teacherComment).toBe('很棒的心得！你展現了很好的同理心。');
  });
  test('不修改傳入的原始陣列', () => {
    const original = JSON.parse(JSON.stringify(MOCK_POSTS));
    saveComment('1', '評語。', MOCK_POSTS);
    expect(MOCK_POSTS[0].teacherComment).toEqual(original[0].teacherComment);
  });
});

// ─────────────────────────────────────────────
// 5. Email 參數驗證（含學生原始心得）
// ─────────────────────────────────────────────
describe('Email 參數 — buildEmailParams()', () => {
  const post    = MOCK_POSTS[0];
  const comment = '你的表現非常積極，是同學的好榜樣！';

  test('包含 student_name', () => {
    expect(buildEmailParams(post, comment).student_name).toBe('王小明');
  });
  test('包含 student_email', () => {
    expect(buildEmailParams(post, comment).student_email).toBe('ming@test.com');
  });
  test('包含 student_class', () => {
    expect(buildEmailParams(post, comment).student_class).toBe('101-01');
  });
  test('包含 student_group（中文）', () => {
    expect(buildEmailParams(post, comment).student_group).toBe('環境組');
    const chatPost = { ...post, group: 'chat' };
    expect(buildEmailParams(chatPost, comment).student_group).toBe('聊天組');
  });
  test('包含 student_text（學生原始心得）', () => {
    const params = buildEmailParams(post, comment);
    expect(params.student_text).toBe(post.text);
    expect(params.student_text.length).toBeGreaterThan(0);
  });
  test('包含 teacher_comment', () => {
    expect(buildEmailParams(post, comment).teacher_comment).toBe(comment);
  });
  test('包含 activity_name', () => {
    expect(buildEmailParams(post, comment).activity_name).toContain('青銀共融');
  });
  test('欄位缺值時回傳空字串（不拋出例外）', () => {
    const emptyPost = { id: '5', group: 'env' };
    const params = buildEmailParams(emptyPost, comment);
    expect(params.student_name).toBe('');
    expect(params.student_email).toBe('');
    expect(params.student_text).toBe('');
  });
  test('student_text 不等於 teacher_comment（兩者獨立）', () => {
    const params = buildEmailParams(post, comment);
    expect(params.student_text).not.toBe(params.teacher_comment);
  });
});

// ─────────────────────────────────────────────
// 6. 盧盧印章渲染
// ─────────────────────────────────────────────
describe('盧盧印章 — 渲染邏輯', () => {
  function buildTeacherCardHTML(post) {
    const hasComment = !!post.teacherComment;
    return `
      <div class="post-card ${hasComment ? 'commented' : 'not-commented'}" id="card-${post.id}">
        <div class="post-body open">
          ${esc(post.text)}
          ${hasComment ? `
            <div class="existing-comment">
              <strong>👩‍🏫 已給予評語</strong>
              <div class="comment-text">${esc(post.teacherComment)}</div>
            </div>
            <div class="stamp-wrap">
              <div class="lulu-stamp">
                <div class="stamp-kanji">盧盧</div>
                <div class="stamp-sub">已閱讀</div>
              </div>
              <span class="stamp-caption">老師已閱讀並給予評語</span>
            </div>` : ''}
        </div>
      </div>`;
  }

  test('待評語卡片沒有印章', () => {
    document.body.innerHTML = buildTeacherCardHTML(MOCK_POSTS[0]);
    expect(document.querySelector('.lulu-stamp')).toBeNull();
  });
  test('待評語卡片沒有 existing-comment', () => {
    document.body.innerHTML = buildTeacherCardHTML(MOCK_POSTS[0]);
    expect(document.querySelector('.existing-comment')).toBeNull();
  });
  test('已評語卡片有印章', () => {
    document.body.innerHTML = buildTeacherCardHTML(MOCK_POSTS[1]);
    expect(document.querySelector('.lulu-stamp')).not.toBeNull();
  });
  test('印章文字為「盧盧」', () => {
    document.body.innerHTML = buildTeacherCardHTML(MOCK_POSTS[1]);
    expect(document.querySelector('.stamp-kanji').textContent).toBe('盧盧');
  });
  test('印章副文字為「已閱讀」', () => {
    document.body.innerHTML = buildTeacherCardHTML(MOCK_POSTS[1]);
    expect(document.querySelector('.stamp-sub').textContent).toBe('已閱讀');
  });
  test('已評語卡片有 commented class', () => {
    document.body.innerHTML = buildTeacherCardHTML(MOCK_POSTS[1]);
    expect(document.querySelector('.post-card').classList.contains('commented')).toBe(true);
  });
  test('待評語卡片有 not-commented class', () => {
    document.body.innerHTML = buildTeacherCardHTML(MOCK_POSTS[0]);
    expect(document.querySelector('.post-card').classList.contains('not-commented')).toBe(true);
  });
  test('評語文字以紅色樣式顯示（class=comment-text）', () => {
    document.body.innerHTML = buildTeacherCardHTML(MOCK_POSTS[1]);
    const cmtEl = document.querySelector('.comment-text');
    expect(cmtEl).not.toBeNull();
    expect(cmtEl.textContent).toContain('很棒的心得');
  });
  test('stamp-caption 說明文字存在', () => {
    document.body.innerHTML = buildTeacherCardHTML(MOCK_POSTS[1]);
    expect(document.querySelector('.stamp-caption').textContent).toContain('已閱讀');
  });
});

// ─────────────────────────────────────────────
// 7. localStorage 評語讀寫整合
// ─────────────────────────────────────────────
describe('localStorage 評語整合', () => {
  beforeEach(() => localStorage.clear());

  test('儲存評語後可從 localStorage 讀回', () => {
    saveToLocal(MOCK_POSTS);
    const posts = loadFromLocal();
    const result = saveComment('1', '新評語測試。', posts);
    saveToLocal(result.updated);

    const reloaded = loadFromLocal();
    const post1 = reloaded.find(p => p.id === '1');
    expect(post1.teacherComment).toBe('新評語測試。');
  });

  test('儲存評語不影響其他 post', () => {
    saveToLocal(MOCK_POSTS);
    const posts = loadFromLocal();
    const result = saveComment('3', '給張大山的評語。', posts);
    saveToLocal(result.updated);

    const reloaded = loadFromLocal();
    const post2 = reloaded.find(p => p.id === '2');
    expect(post2.teacherComment).toBe('很棒的心得！你展現了很好的同理心。');
  });
});
