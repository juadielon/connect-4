import { describe, expect, it, vi } from 'vitest';
import { initialiseApp } from './bootstrap';

describe('initialiseApp', () => {
  it('mounts the application into the supplied target', () => {
    const target = { id: 'app' };
    const mountApplication = vi.fn();

    initialiseApp(target, mountApplication);

    expect(mountApplication).toHaveBeenCalledOnce();
    expect(mountApplication).toHaveBeenCalledWith(target);
  });

  it('rejects a missing target without attempting to mount', () => {
    const mountApplication = vi.fn();

    expect(() => initialiseApp(null, mountApplication)).toThrow(
      'App target element was not found',
    );
    expect(mountApplication).not.toHaveBeenCalled();
  });
});
