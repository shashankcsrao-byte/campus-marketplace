import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(cleanup);

// jsdom has no object URLs; the image uploader uses them for previews.
let n = 0;
URL.createObjectURL ??= () => `blob:test/${++n}`;
URL.revokeObjectURL ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
