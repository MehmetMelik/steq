import { describe, it, expect, beforeEach } from 'vitest';
import { useTabsStore } from './tabs.store';

describe('tabs.store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useTabsStore.setState({
      tabs: [
        {
          id: 'tab-init',
          name: 'New Request',
          method: 'GET',
          requestId: null,
          dirty: false,
        },
      ],
      activeTabId: 'tab-init',
    });
  });

  it('initializes with one tab', () => {
    const state = useTabsStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].name).toBe('New Request');
    expect(state.activeTabId).toBe('tab-init');
  });

  it('addTab adds tab and makes it active', () => {
    const newId = useTabsStore.getState().addTab();
    const state = useTabsStore.getState();
    expect(state.tabs).toHaveLength(2);
    expect(state.activeTabId).toBe(newId);
    expect(state.tabs[1].name).toBe('New Request');
    expect(state.tabs[1].method).toBe('GET');
  });

  it('addTab with custom properties', () => {
    const newId = useTabsStore.getState().addTab({
      name: 'Custom Tab',
      method: 'POST',
      requestId: 'req-1',
      dirty: true,
    });
    const state = useTabsStore.getState();
    const tab = state.tabs.find((t) => t.id === newId)!;
    expect(tab.name).toBe('Custom Tab');
    expect(tab.method).toBe('POST');
    expect(tab.requestId).toBe('req-1');
    expect(tab.dirty).toBe(true);
  });

  it('closeTab removes tab and selects adjacent', () => {
    const secondId = useTabsStore.getState().addTab({ name: 'Second' });
    useTabsStore.getState().setActiveTab('tab-init');

    useTabsStore.getState().closeTab('tab-init');
    const state = useTabsStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.activeTabId).toBe(secondId);
  });

  it('closeTab does not remove last tab', () => {
    useTabsStore.getState().closeTab('tab-init');
    const state = useTabsStore.getState();
    expect(state.tabs).toHaveLength(1);
  });

  it('closeTab selects nearest remaining when closing active', () => {
    useTabsStore.getState().addTab({ name: 'Tab 2' });
    const thirdId = useTabsStore.getState().addTab({ name: 'Tab 3' });

    // Active is now thirdId, close it
    useTabsStore.getState().closeTab(thirdId);
    const state = useTabsStore.getState();
    expect(state.tabs).toHaveLength(2);
    // Should select the last remaining tab
    expect(state.activeTabId).toBe(state.tabs[state.tabs.length - 1].id);
  });

  it('setActiveTab changes active', () => {
    const secondId = useTabsStore.getState().addTab({ name: 'Second' });
    useTabsStore.getState().setActiveTab('tab-init');
    expect(useTabsStore.getState().activeTabId).toBe('tab-init');
    useTabsStore.getState().setActiveTab(secondId);
    expect(useTabsStore.getState().activeTabId).toBe(secondId);
  });

  it('updateTab modifies properties', () => {
    useTabsStore.getState().updateTab('tab-init', {
      name: 'Updated',
      method: 'DELETE',
      dirty: true,
    });
    const tab = useTabsStore.getState().tabs[0];
    expect(tab.name).toBe('Updated');
    expect(tab.method).toBe('DELETE');
    expect(tab.dirty).toBe(true);
    expect(tab.id).toBe('tab-init'); // id unchanged
  });
});
