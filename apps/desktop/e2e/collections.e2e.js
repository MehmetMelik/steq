describe('Collections & Settings', () => {
  it('should create a new collection', async () => {
    const newCollectionBtn = await $('[data-testid="new-collection-button"]');
    await newCollectionBtn.waitForExist({ timeout: 10_000 });
    await newCollectionBtn.click();

    const dialog = await $('[data-testid="create-collection-dialog"]');
    await dialog.waitForExist({ timeout: 5_000 });
    expect(await dialog.isDisplayed()).toBe(true);

    const nameInput = await $('[data-testid="collection-name-input"]');
    await nameInput.setValue('Test Collection');

    const submitBtn = await $('[data-testid="create-collection-submit"]');
    await submitBtn.click();
    await browser.pause(1000);

    // Dialog should be closed
    const dialogAfter = await $('[data-testid="create-collection-dialog"]');
    expect(await dialogAfter.isExisting()).toBe(false);

    // The sidebar should no longer show the empty state
    const emptyState = await $('[data-testid="collections-empty"]');
    expect(await emptyState.isExisting()).toBe(false);
  });

  it('should toggle theme', async () => {
    const themeToggle = await $('[data-testid="theme-toggle"]');
    await themeToggle.waitForExist({ timeout: 10_000 });

    const textBefore = await themeToggle.getText();
    await themeToggle.click();
    await browser.pause(500);

    const textAfter = await themeToggle.getText();
    // Theme button text should change (LGT <-> DRK)
    expect(textAfter).not.toBe(textBefore);
  });
});
