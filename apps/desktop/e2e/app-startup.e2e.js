describe('App Startup', () => {
  it('should display the app window', async () => {
    const title = await browser.getTitle();
    expect(title).toBe('Apiary');
  });

  it('should show the initial UI layout', async () => {
    const header = await $('[data-testid="header"]');
    await header.waitForExist({ timeout: 10_000 });
    expect(await header.isDisplayed()).toBe(true);

    const headerText = await header.getText();
    expect(headerText).toContain('Apiary');

    const tabBar = await $('[data-testid="tab-bar"]');
    expect(await tabBar.isDisplayed()).toBe(true);

    // Should have exactly one tab on startup
    const tabs = await $$('[data-testid^="tab-"]');
    const visibleTabs = [];
    for (const tab of tabs) {
      const testId = await tab.getAttribute('data-testid');
      // Filter out tab-bar and tab-close, keep actual tabs
      if (testId && testId.startsWith('tab-') && testId !== 'tab-bar' && testId !== 'tab-close') {
        visibleTabs.push(tab);
      }
    }
    expect(visibleTabs.length).toBe(1);

    const sidebar = await $('[data-testid="sidebar"]');
    expect(await sidebar.isDisplayed()).toBe(true);

    const collectionsTab = await $('[data-testid="sidebar-tab-collections"]');
    expect(await collectionsTab.isDisplayed()).toBe(true);
  });
});
