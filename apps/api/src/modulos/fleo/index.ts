// M03 FLEO Digital: registro do módulo. Única porta de entrada (docs/modulos.md, seção 6).
// As rotas da ficha entram na Fase 2 (docs/funcionalidades.md, UC-F01 a UC-F33).

import { Router } from 'express';
import type { RegistroModulo } from '../../plataforma/modulos.js';

export const fleo: RegistroModulo = {
  codigo: 'fleo',
  nome: 'FLEO Digital',
  schema: 'fleo',
  caminho: '/fleo',
  perfis: ['professor', 'coordenacao', 'equipe_pedagogica', 'gestor'],
  rotas: () => Router(),
};
