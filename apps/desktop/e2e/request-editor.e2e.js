describe('Request Editor', () => {
  it('should change HTTP method', async () => {
    const methodSelector = await $('[data-testid="method-selector"]');
    await methodSelector.waitForExist({ timeout: 10_000 });

    await methodSelector.selectByAttribute('value', 'POST');
    const selectedValue = await methodSelector.getValue();
    expect(selectedValue).toBe('POST');
  });

  it('should type a URL', async () => {
    const urlInput = await $('[data-testid="url-input"]');
    await urlInput.waitForExist({ timeout: 10_000 });

    await urlInput.setValue('https://api.example.com/users');
    const value = await urlInput.getValue();
    expect(value).toBe('https://api.example.com/users');
  });

  it('should switch editor tabs', async () => {
    const headersTab = await $('[data-testid="editor-tab-headers"]');
    await headersTab.waitForExist({ timeout: 10_000 });
    await headersTab.click();
    await browser.pause(300);

    // Verify Headers tab is active (has accent underline)
    const headersClass = await headersTab.getAttribute('class');
    expect(headersClass).toContain('text-text-primary');

    const bodyTab = await $('[data-testid="editor-tab-body"]');
    await bodyTab.click();
    await browser.pause(300);

    const bodyClass = await bodyTab.getAttribute('class');
    expect(bodyClass).toContain('text-text-primary');
  });
});
