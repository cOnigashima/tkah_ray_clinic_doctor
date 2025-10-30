import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['lib/**/*.ts', 'src/**/*.tsx'],
      exclude: ['**/*.test.ts', '**/*.d.ts', 'scripts/**']
    }
  },
  resolve: {
    alias: {
      '@raycast/api': path.resolve(__dirname, '__mocks__/@raycast/api.ts')
    }
  }
});
