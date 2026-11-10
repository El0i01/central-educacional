export interface ConfigApi {
  porta: number;
  databaseUrl: string;
  jwtSegredo: string;
  /** Validade do token, no formato do jsonwebtoken (ex.: '8h'). */
  jwtValidade: string;
  /** Origens autorizadas a chamar a API de fora (APK), separadas por vírgula. */
  corsOrigens: string[];
}

export function lerConfig(env: NodeJS.ProcessEnv): ConfigApi {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL não definida.');

  const jwtSegredo = env.JWT_SECRET;
  if (!jwtSegredo || jwtSegredo.length < 32 || jwtSegredo === 'troque-isto') {
    throw new Error('JWT_SECRET ausente ou fraco: use pelo menos 32 caracteres aleatórios.');
  }

  return {
    porta: Number(env.PORT ?? 3000),
    databaseUrl,
    jwtSegredo,
    jwtValidade: env.JWT_VALIDADE ?? '8h',
    corsOrigens: (env.CORS_ORIGENS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  };
}
