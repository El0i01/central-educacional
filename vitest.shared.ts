// Configuração comum do Vitest: resolve os pacotes @central/* direto do código-fonte (sem build).
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { conditions: ['@central/source'] },
  ssr: { resolve: { conditions: ['@central/source'] } },
});
