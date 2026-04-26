const express = require('express');
const { chromium } = require('playwright');
const fs = require('fs');

const app = express();
app.use(express.json());

app.post('/download', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }

  const browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    storageState: fs.existsSync('state.json') ? 'state.json' : undefined
  });

  const page = await context.newPage();

  // 🔐 LOGIN SEKALI
  if (!fs.existsSync('state.json')) {
    console.log('Login pertama...');

    await page.goto('https://login.mailchimp.com/');

    await page.fill('input[name="infratechtpa"]', process.env.MC_EMAIL);
    await page.fill('input[name="Tok0hkelan4@!06"]', process.env.MC_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await context.storageState({ path: 'state.json' });
    console.log('Session saved!');
  }

  console.log('Opening URL:', url);

  await page.goto(url);
  await page.waitForLoadState('networkidle');

  // tunggu tombol download muncul
  await page.waitForSelector('text=Download', { timeout: 15000 });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('text=Download')
  ]);

  const filename = download.suggestedFilename();
  const filepath = `./invoices/${filename}`;

  await download.saveAs(filepath);

  await browser.close();

  res.json({
    success: true,
    file: filepath
  });
});

app.listen(3000, () => {
  console.log('🚀 Mailchimp downloader running on port 3000');
});
