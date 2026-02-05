describe('Tab Management', () => {
  async function getTabButtons() {
    const allElements = await $$('[data-testid^="tab-"]');
    const tabButtons = [];
    for (const el of allElements) {
      const testId = await el.getAttribute('data-testid');
      if (testId && testId.startsWith('tab-') && testId !== 'tab-bar' && testId !== 'tab-close') {
        tabButtons.push(el);
      }
    }
    return tabButtons;
  }

  it('should have one default tab', async () => {
    const tabBar = await $('[data-testid="tab-bar"]');
    await tabBar.waitForExist({ timeout: 10_000 });

    const tabs = await getTabButtons();
    expect(tabs.length).toBe(1);
  });

  it('should create a new tab', async () => {
    const newTabBtn = await $('[data-testid="new-tab-button"]');
    await newTabBtn.click();

    // Wait for the new tab to appear
    await browser.pause(500);

    const tabs = await getTabButtons();
    expect(tabs.length).toBe(2);
  });

  it('should close a tab', async () => {
    // Ensure we have 2 tabs (previous test created one)
    let tabs = await getTabButtons();
    if (tabs.length < 2) {
      const newTabBtn = await $('[data-testid="new-tab-button"]');
      await newTabBtn.click();
      await browser.pause(500);
    }

    // Click the close button on one of the tabs
    const closeBtn = await $('[data-testid="tab-close"]');
    await closeBtn.click();
    await browser.pause(500);

    tabs = await getTabButtons();
    expect(tabs.length).toBe(1);
  });
});
