import { describe, it, expect, beforeEach } from 'vitest';
import { useResponseStore } from './response.store';
import type { ExecutionResult } from '@reqtor/domain';

const mockResult: ExecutionResult = {
  status: 200,
  status_text: 'OK',
  headers: [{ key: 'content-type', value: 'application/json', enabled: true }],
  body: '{"success":true}',
  size_bytes: 16,
  timing: {
    dns_ms: null,
    connect_ms: null,
    tls_ms: null,
    first_byte_ms: 50,
    total_ms: 100,
  },
  error: null,
};

describe('response.store', () => {
  beforeEach(() => {
    useResponseStore.setState({ responses: new Map() });
  });

  it('getResponse returns empty for unknown tab', () => {
    const response = useResponseStore.getState().getResponse('unknown');
    expect(response.result).toBeNull();
    expect(response.loading).toBe(false);
  });

  it('setResult stores result, sets loading=false', () => {
    useResponseStore.getState().setLoading('tab-1', true);
    useResponseStore.getState().setResult('tab-1', mockResult);
    const response = useResponseStore.getState().getResponse('tab-1');
    expect(response.result).toEqual(mockResult);
    expect(response.loading).toBe(false);
  });

  it('setLoading updates loading without clearing result', () => {
    useResponseStore.getState().setResult('tab-1', mockResult);
    useResponseStore.getState().setLoading('tab-1', true);
    const response = useResponseStore.getState().getResponse('tab-1');
    expect(response.loading).toBe(true);
    expect(response.result).toEqual(mockResult);
  });

  it('clearTab resets to null', () => {
    useResponseStore.getState().setResult('tab-1', mockResult);
    useResponseStore.getState().clearTab('tab-1');
    const response = useResponseStore.getState().getResponse('tab-1');
    expect(response.result).toBeNull();
    expect(response.loading).toBe(false);
  });

  it('removeTab deletes entry', () => {
    useResponseStore.getState().setResult('tab-1', mockResult);
    useResponseStore.getState().removeTab('tab-1');
    expect(useResponseStore.getState().responses.has('tab-1')).toBe(false);
    // getResponse still returns default
    const response = useResponseStore.getState().getResponse('tab-1');
    expect(response.result).toBeNull();
  });
});
