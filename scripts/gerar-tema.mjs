// Gera apps/web/src/tema.gerado.css a partir de docs/design-system/tokens.json.
// Uso: node scripts/gerar-tema.mjs   (rode de novo sempre que os tokens mudarem; não edite o .css à mão)
import { readFileSync, writeFileSync } from 'node:fs';

const tok = JSON.parse(readFileSync('docs/design-system/tokens.json', 'utf8'));
const claro = [];
const escuro = [];
for (const t of tok.color.tokens) {
  const v = t.value;
  claro.push(`  --${t.name}: ${typeof v === 'string' ? v : v.claro};`);
  if (typeof v === 'object' && v.escuro) escuro.push(`  --${t.name}: ${v.escuro};`);
}
for (const fam of ['spacing', 'radius', 'tamanho']) {
  for (const t of tok[fam].tokens) claro.push(`  --${t.name}: ${t.value};`);
}
for (const t of tok.shadow.tokens) {
  claro.push(`  --${t.name}: ${t.value.claro};`);
  escuro.push(`  --${t.name}: ${t.value.escuro};`);
}
for (const [k, v] of Object.entries(tok.type.families)) claro.push(`  --font-${k}: ${v};`);

const css = `/* Gerado de docs/design-system/tokens.json por scripts/gerar-tema.mjs. Não edite à mão. */
:root {
${claro.join('\n')}
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-tema='claro']) {
${escuro.map((l) => '  ' + l).join('\n')}
    color-scheme: dark;
  }
}
:root[data-tema='escuro'] {
${escuro.join('\n')}
  color-scheme: dark;
}
`;
writeFileSync('apps/web/src/tema.gerado.css', css);
console.log('apps/web/src/tema.gerado.css gerado');
