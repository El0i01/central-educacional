import { mergeConfig } from 'vitest/config';
import compartilhada from '../../vitest.shared.ts';

// Os testes de integração usam o mesmo banco: um arquivo por vez.
export default mergeConfig(compartilhada, { test: { fileParallelism: false } });
