/**
 * 學生頁面測試套件 (index.html)
 * 涵蓋：HTML 跳脫、表單驗證、資料儲存、心得牆渲染、篩選邏輯、老師評語顯示
 *
 * 執行：cd tests && npm install && npm test
 */

'use strict';

// ─────────────────────────────────────────────
// 從 index.html 提取的核心邏輯（保持與原始碼同步）
// ─────────────────────────────────────────────
const STORAGE_KEY = 'yp_ltc_posts_v1';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 對應 submitPost() 中的驗證邏輯
function validateForm({ name, group, email, text }) {
  if (!name || !name.trim())    return { error: 'empty_name',    msg: '請填寫姓名或暱稱' };
  if (!group)                   return { error: 'empty_group',   msg: '請選擇服務組別' };
  if (!email || !email.trim())  return { error: 'empty_email',   msg: '請填寫電子郵件，老師回饋後才能通知您' };
  if (!isValidEmail(email))     return { error: 'invalid_email', msg: '電子郵件格式不正確' };
  if (text.trim().length < 10)  return { error: 'text_too_short', msg: '心得至少 10 個字喔！' };
  return null;
}

function filterPosts(posts, groupFilter) {
  if (groupFilter === 'all') return posts;
  return posts.filter(p => p.group === groupFilter);
}

function loadFromLocal() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveToLocal(posts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
}

// ─────────────────────────────────────────────
// 測試資料
// ─────────────────────────────────────────────
const MOCK_POSTS = [
  {
    id: 1, name: '王小明', cls: '101-01', group: 'env',
    email: 'ming@test.com',
    text: '今天幫助長輩整理環境，感受到助人的快樂，印象很深刻。',
    teacherComment: null, time: '2026/05/19 14:00:00'
  },
  {
    id: 2, name: '李小花', cls: '101-02', group: 'chat',
    email: 'hua@test.com',
    text: '和阿嬤聊天真的很開心，她分享了很多以前的故事給我聽。',
    teacherComment: '很棒的心得！你展現了很好的同理心。',
    commentedAt: '2026/05/19 16:30:00',
    time: '2026/05/19 15:00:00'
  },
  {
    id: 3, name: '張大山', cls: '102-01', group: 'env',
    email: 'shan@test.com',
    text: '第一次進入長照機構，看到許多長輩都很感動，想更了解長照工作。',
    teacherComment: null, time: '2026/05/19 16:00:00'
  },
];

// ─────────────────────────────────────────────
// 1. esc() — HTML 跳脫函式
// ─────────────────────────────────────────────
describe('esc() — HTML 跳脫函式', () => {
  test('跳脫 & 符號', () => {
    expect(esc('a&b')).toBe('a&amp;b');
  });
  test('跳脫 < 符號', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
  });
  test('跳脫 > 符號', () => {
    expect(esc('a>b')).toBe('a&gt;b');
  });
  test('跳脫 " 符號', () => {
    expect(esc('"quoted"')).toBe('&quot;quoted&quot;');
  });
  test('同時跳脫多種字元', () => {
    expect(esc('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
  test('null 回傳空字串', () => {
    expect(esc(null)).toBe('');
  });
  test('undefined 回傳空字串', () => {
    expect(esc(undefined)).toBe('');
  });
  test('數字轉為字串', () => {
    expect(esc(42)).toBe('42');
  });
  test('一般文字原樣回傳', () => {
    expect(esc('hello world')).toBe('hello world');
  });
  test('防止 XSS 注入', () => {
    const xss = '<img src=x onerror="alert(1)">';
    expect(esc(xss)).not.toContain('<img');
    expect(esc(xss)).not.toContain('>');
  });
});

// ─────────────────────────────────────────────
// 2. isValidEmail() — Email 格式驗證
// ─────────────────────────────────────────────
describe('isValidEmail() — Email 格式驗證', () => {
  const valid = [
    'student@example.com',
    'user.name@school.edu.tw',
    'test+tag@gmail.com',
    'abc123@ntpc.gov.tw',
  ];
  const invalid = [
    '',
    'notanemail',
    '@nodomain.com',
    'missing@',
    'two@@ats.com',
    'spaces in@email.com',
  ];

  valid.forEach(email => {
    test(`有效 email：${email}`, () => {
      expect(isValidEmail(email)).toBe(true);
    });
  });
  invalid.forEach(email => {
    test(`無效 email：「${email}」`, () => {
      expect(isValidEmail(email)).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────
// 3. validateForm() — 表單欄位驗證
// ─────────────────────────────────────────────
describe('validateForm() — 表單欄位驗證', () => {
  const base = {
    name:  '測試同學',
    group: 'env',
    email: 'student@school.com',
    text:  '這是一段超過十個字的心得內容。',
  };

  test('所有欄位正確 → 回傳 null（通過）', () => {
    expect(validateForm(base)).toBeNull();
  });

  test('姓名為空 → 回傳 empty_name 錯誤', () => {
    expect(validateForm({ ...base, name: '' }).error).toBe('empty_name');
  });
  test('姓名只有空格 → 回傳 empty_name 錯誤', () => {
    expect(validateForm({ ...base, name: '   ' }).error).toBe('empty_name');
  });

  test('組別未選 → 回傳 empty_group 錯誤', () => {
    expect(validateForm({ ...base, group: '' }).error).toBe('empty_group');
  });

  test('Email 為空 → 回傳 empty_email 錯誤', () => {
    expect(validateForm({ ...base, email: '' }).error).toBe('empty_email');
  });
  test('Email 格式錯誤 → 回傳 invalid_email 錯誤', () => {
    expect(validateForm({ ...base, email: 'notanemail' }).error).toBe('invalid_email');
  });

  test('心得少於 10 字 → 回傳 text_too_short 錯誤', () => {
    expect(validateForm({ ...base, text: '太短了' }).error).toBe('text_too_short');
  });
  test('心得恰好 10 字 → 通過', () => {
    expect(validateForm({ ...base, text: '十個字的心得內容!!' })).toBeNull();
  });
  test('心得 500 字 → 通過', () => {
    expect(validateForm({ ...base, text: 'A'.repeat(500) })).toBeNull();
  });

  test('錯誤訊息文字不為空', () => {
    const result = validateForm({ ...base, name: '' });
    expect(result.msg).toBeTruthy();
    expect(result.msg.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────
// 4. filterPosts() — 心得牆篩選邏輯
// ─────────────────────────────────────────────
describe('filterPosts() — 心得牆篩選', () => {
  test("filter='all' 回傳所有文章", () => {
    expect(filterPosts(MOCK_POSTS, 'all')).toHaveLength(3);
  });
  test("filter='env' 只回傳環境組", () => {
    const result = filterPosts(MOCK_POSTS, 'env');
    expect(result).toHaveLength(2);
    result.forEach(p => expect(p.group).toBe('env'));
  });
  test("filter='chat' 只回傳聊天組", () => {
    const result = filterPosts(MOCK_POSTS, 'chat');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('李小花');
  });
  test('空陣列任何篩選都回傳空陣列', () => {
    expect(filterPosts([], 'env')).toHaveLength(0);
    expect(filterPosts([], 'all')).toHaveLength(0);
  });
  test('篩選不修改原始陣列', () => {
    const original = [...MOCK_POSTS];
    filterPosts(MOCK_POSTS, 'chat');
    expect(MOCK_POSTS).toHaveLength(original.length);
  });
});

// ─────────────────────────────────────────────
// 5. localStorage — 資料讀寫
// ─────────────────────────────────────────────
describe('localStorage — 心得資料讀寫', () => {
  beforeEach(() => localStorage.clear());

  test('空 localStorage 回傳空陣列', () => {
    expect(loadFromLocal()).toEqual([]);
  });
  test('存入後可正確讀回', () => {
    saveToLocal(MOCK_POSTS);
    expect(loadFromLocal()).toHaveLength(3);
  });
  test('讀回的資料內容正確', () => {
    saveToLocal(MOCK_POSTS);
    const loaded = loadFromLocal();
    expect(loaded[0].name).toBe('王小明');
    expect(loaded[0].email).toBe('ming@test.com');
    expect(loaded[0].group).toBe('env');
  });
  test('損毀的 JSON 回傳空陣列（不拋出例外）', () => {
    localStorage.setItem(STORAGE_KEY, '{ invalid json ===');
    expect(() => loadFromLocal()).not.toThrow();
    expect(loadFromLocal()).toEqual([]);
  });
  test('覆寫後讀到最新資料', () => {
    saveToLocal(MOCK_POSTS);
    const updated = [{ id: 99, name: '新同學', text: '新心得' }];
    saveToLocal(updated);
    const loaded = loadFromLocal();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].name).toBe('新同學');
  });
});

// ─────────────────────────────────────────────
// 6. 心得牆渲染邏輯
// ─────────────────────────────────────────────
describe('心得牆渲染 — 老師評語與印章顯示', () => {
  function buildCardHTML(post) {
    const hasComment = !!post.teacherComment;
    return `
      <div class="card" id="card-${post.id}">
        <div class="card-name">${esc(post.name)}</div>
        <span class="group-tag ${post.group === 'env' ? 'tag-env' : 'tag-chat'}">
          ${post.group === 'env' ? '🌿 環境組' : '💬 聊天組'}
        </span>
        <div class="card-body">${esc(post.text)}</div>
        ${hasComment ? `
          <div class="teacher-comment">
            <strong>👩‍🏫 老師評語</strong>
            <div class="cmt-text">${esc(post.teacherComment)}</div>
          </div>
          <div class="lulu-stamp">
            <div class="stamp-kanji">盧盧</div>
            <div class="stamp-sub">已閱讀</div>
          </div>` : ''}
      </div>`;
  }

  test('無評語的卡片不含 teacher-comment 元素', () => {
    document.body.innerHTML = buildCardHTML(MOCK_POSTS[0]);
    expect(document.querySelector('.teacher-comment')).toBeNull();
  });
  test('無評語的卡片不含盧盧印章', () => {
    document.body.innerHTML = buildCardHTML(MOCK_POSTS[0]);
    expect(document.querySelector('.lulu-stamp')).toBeNull();
  });
  test('有評語的卡片含有 teacher-comment 元素', () => {
    document.body.innerHTML = buildCardHTML(MOCK_POSTS[1]);
    expect(document.querySelector('.teacher-comment')).not.toBeNull();
  });
  test('老師評語文字在 .cmt-text 內正確顯示', () => {
    document.body.innerHTML = buildCardHTML(MOCK_POSTS[1]);
    const cmtText = document.querySelector('.cmt-text');
    expect(cmtText.textContent).toContain('很棒的心得');
  });
  test('有評語的卡片顯示盧盧印章', () => {
    document.body.innerHTML = buildCardHTML(MOCK_POSTS[1]);
    const stamp = document.querySelector('.lulu-stamp');
    expect(stamp).not.toBeNull();
    expect(stamp.querySelector('.stamp-kanji').textContent).toBe('盧盧');
    expect(stamp.querySelector('.stamp-sub').textContent).toBe('已閱讀');
  });
  test('環境組卡片有 tag-env class', () => {
    document.body.innerHTML = buildCardHTML(MOCK_POSTS[0]);
    expect(document.querySelector('.tag-env')).not.toBeNull();
  });
  test('聊天組卡片有 tag-chat class', () => {
    document.body.innerHTML = buildCardHTML(MOCK_POSTS[1]);
    expect(document.querySelector('.tag-chat')).not.toBeNull();
  });
  test('心得內容正確顯示（XSS 防護）', () => {
    const xssPost = { ...MOCK_POSTS[0], text: '<script>alert("xss")</script>' };
    document.body.innerHTML = buildCardHTML(xssPost);
    const body = document.querySelector('.card-body');
    expect(body.innerHTML).not.toContain('<script>');
    expect(body.textContent).toContain('alert');
  });
});

// ─────────────────────────────────────────────
// 7. 完整的心得提交流程
// ─────────────────────────────────────────────
describe('心得提交完整流程', () => {
  beforeEach(() => localStorage.clear());

  function simulateSubmit(formData) {
    const err = validateForm(formData);
    if (err) return { success: false, error: err };

    const posts = loadFromLocal();
    const post = {
      id: Date.now(),
      ...formData,
      teacherComment: null,
      time: new Date().toLocaleString('zh-TW', { hour12: false }),
    };
    posts.unshift(post);
    saveToLocal(posts);
    return { success: true, post };
  }

  test('有效表單成功儲存，回傳 success:true', () => {
    const result = simulateSubmit({
      name: '陳同學', cls: '103-05', group: 'chat',
      email: 'chen@school.edu.tw',
      text: '這次活動讓我學習到很多關於長照的知識與技能。',
    });
    expect(result.success).toBe(true);
  });
  test('成功儲存後可從 localStorage 讀回', () => {
    simulateSubmit({
      name: '陳同學', cls: '103-05', group: 'chat',
      email: 'chen@school.edu.tw',
      text: '這次活動讓我學習到很多關於長照的知識與技能。',
    });
    const saved = loadFromLocal();
    expect(saved).toHaveLength(1);
    expect(saved[0].name).toBe('陳同學');
    expect(saved[0].teacherComment).toBeNull();
  });
  test('新提交的心得排在最前面', () => {
    simulateSubmit({ name: '第一位', cls: '', group: 'env', email: 'a@b.com', text: '第一篇心得內容測試文字。' });
    simulateSubmit({ name: '第二位', cls: '', group: 'chat', email: 'c@d.com', text: '第二篇心得內容測試文字。' });
    const posts = loadFromLocal();
    expect(posts[0].name).toBe('第二位');
  });
  test('表單驗證失敗不儲存到 localStorage', () => {
    simulateSubmit({ name: '', group: 'env', email: 'a@b.com', text: '太短' });
    expect(loadFromLocal()).toHaveLength(0);
  });
});
