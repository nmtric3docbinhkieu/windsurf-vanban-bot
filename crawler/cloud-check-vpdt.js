const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const BOT_DIR = path.join(__dirname, '..');

require('dotenv').config({ path: path.join(BOT_DIR, '.env') });
const { notifyNewVanBan } = require('../integrations/telegram-notify');

const USERNAME = process.env.VPDT_USERNAME;
const PASSWORD = process.env.VPDT_PASSWORD;
const STATE_FILE = path.join(BOT_DIR, 'state', 'known-vanban.json');

function ensureStateFile() {
  const stateDir = path.dirname(STATE_FILE);
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  if (!fs.existsSync(STATE_FILE)) {
    const initialState = {
      last_check_at: null,
      known_so_hieu: []
    };
    fs.writeFileSync(STATE_FILE, JSON.stringify(initialState, null, 2), 'utf8');
  }
}

function loadState() {
  ensureStateFile();
  const raw = fs.readFileSync(STATE_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    last_check_at: parsed.last_check_at || null,
    known_so_hieu: Array.isArray(parsed.known_so_hieu) ? parsed.known_so_hieu : []
  };
}

function saveState(knownSoHieu) {
  const data = {
    last_check_at: new Date().toISOString(),
    known_so_hieu: [...new Set(knownSoHieu)].sort()
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function loginVpdt(page) {
  await page.goto('https://vpdt.dongthap.gov.vn', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  await page.evaluate(({ username, password }) => {
    const allInputs = document.querySelectorAll('input');
    let userInput = null;
    let passInput = null;

    for (const input of allInputs) {
      const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
      if (!userInput && (placeholder.includes('công dân') || placeholder.includes('cong dan') || placeholder.includes('tài khoản') || placeholder.includes('tai khoan'))) {
        userInput = input;
      }
      if (!passInput && input.type === 'password') {
        passInput = input;
      }
    }

    if (userInput) {
      userInput.focus();
      userInput.value = username;
      userInput.dispatchEvent(new Event('input', { bubbles: true }));
      userInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (passInput) {
      passInput.focus();
      passInput.value = password;
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const submit = document.querySelector('button[type="submit"], input[type="submit"]');
    if (submit) {
      submit.click();
      return;
    }

    const buttons = Array.from(document.querySelectorAll('button'));
    const loginBtn = buttons.find(btn => {
      const text = (btn.textContent || '').toLowerCase();
      return text.includes('đăng nhập') || text.includes('dang nhap') || text.includes('login');
    });

    if (loginBtn) {
      loginBtn.click();
    }
  }, { username: USERNAME, password: PASSWORD });

  await page.waitForURL(/vpdt\.dongthap\.gov\.vn/, { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 });
  await page.waitForTimeout(3000);
}

async function extractVanBan(page) {
  return page.evaluate(() => {
    const rows = document.querySelectorAll('.mat-mdc-row, .mat-row, [role="row"], table tr');
    const found = [];
    const seen = new Set();

    for (const row of rows) {
      const rowText = (row.textContent || '').replace(/\s+/g, ' ').trim();
      if (!rowText) {
        continue;
      }

      let soHieuMatch = rowText.match(/\d+\/[A-ZÀ-Ỵa-zà-ỵ0-9._-]+-[A-ZÀ-Ỵa-zà-ỵ0-9._-]+/u);
      if (!soHieuMatch) {
        soHieuMatch = rowText.match(/\d+\/[A-ZÀ-Ỵa-zà-ỵ0-9._-]+/u);
      }
      if (!soHieuMatch) {
        continue;
      }

      const soHieu = soHieuMatch[0];
      if (seen.has(soHieu)) {
        continue;
      }

      const cells = row.querySelectorAll('.mat-mdc-cell, .mat-cell, td, th');
      let trichYeu = '';
      let ngayBanHanh = '';
      let coQuan = '';

      for (const cell of cells) {
        const text = (cell.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) {
          continue;
        }

        const dateMatch = text.match(/\d{2}\/\d{2}\/\d{4}/);
        if (dateMatch && !ngayBanHanh) {
          ngayBanHanh = dateMatch[0];
        }

        if (!coQuan && (text.includes('Sở Giáo dục') || text.includes('SGDĐT'))) {
          coQuan = text;
        }

        const link = cell.querySelector('a');
        if (!trichYeu && link) {
          const linkText = (link.textContent || '').replace(/\s+/g, ' ').trim();
          if (linkText && !linkText.includes(soHieu)) {
            trichYeu = linkText;
          }
        }
      }

      if (!trichYeu) {
        const candidates = Array.from(cells)
          .map(cell => (cell.textContent || '').replace(/\s+/g, ' ').trim())
          .filter(text => text.length > 18)
          .filter(text => !text.includes(soHieu))
          .filter(text => !/^\d{2}\/\d{2}\/\d{4}$/.test(text))
          .filter(text => !text.includes('Sở Giáo dục'));

        trichYeu = candidates[0] || 'Khong xac dinh';
      }

      seen.add(soHieu);
      found.push({
        so_hieu: soHieu,
        trich_yeu: trichYeu,
        ngay_ban_hanh: ngayBanHanh || 'Khong xac dinh',
        co_quan_ban_hanh: coQuan || 'Sở Giáo dục và Đào tạo Tỉnh Đồng Tháp'
      });
    }

    return found;
  });
}

async function run() {
  if (!USERNAME || !PASSWORD) {
    throw new Error('Thieu VPDT_USERNAME hoac VPDT_PASSWORD trong bien moi truong');
  }

  const state = loadState();
  const knownSet = new Set(state.known_so_hieu);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  try {
    console.log('Dang dang nhap vpdt.dongthap.gov.vn ...');
    await loginVpdt(page);

    console.log('Dang quet danh sach van ban den ...');
    const allVanBan = await extractVanBan(page);
    console.log(`Phat hien ${allVanBan.length} dong van ban trong danh sach.`);

    const newVanBan = allVanBan.filter(vb => !knownSet.has(vb.so_hieu));

    if (newVanBan.length === 0) {
      console.log('Khong co van ban moi.');
    } else {
      console.log(`Co ${newVanBan.length} van ban moi. Dang gui Telegram ...`);

      for (const vb of newVanBan) {
        await notifyNewVanBan(vb);
        knownSet.add(vb.so_hieu);
      }
    }

    saveState(Array.from(knownSet));
    console.log('Cap nhat state thanh cong:', STATE_FILE);
  } finally {
    await context.close();
    await browser.close();
  }
}

run().catch(error => {
  console.error('Loi cloud-check-vpdt:', error.message);
  process.exitCode = 1;
});