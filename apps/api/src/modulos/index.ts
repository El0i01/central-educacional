// Lista dos módulos da central. Módulo novo = uma linha aqui (e a seção dele em docs/modulos.md).
// Ligar e desligar é em nucleo.config (modulos_ativos), não aqui.

import type { RegistroModulo } from '../plataforma/modulos.js';
import { fleo } from './fleo/index.js';

export const MODULOS: RegistroModulo[] = [fleo];
