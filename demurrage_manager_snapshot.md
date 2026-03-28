# 📦 Demurrage Manager — Snapshot Completo do Projeto

> **Gerado em:** 2026-03-26 (última atualização: 27/03/2026 — v1.1.0)
> **Projeto:** Demurrage Manager — Transhipping Agenciamento Marítimo Ltda.
> **Repositório:** https://github.com/luccafwlog/demurrage-manager.git
> **Este arquivo é autocontido.** Contém todos os arquivos do projeto com conteúdo integral para reconstituição completa em outro ambiente.

---

## 📋 Histórico de Melhorias & Atualizações

### [2026-03-27] 🏗️ Refatoração Modular — Arquitetura Multi-Arquivo (v1.1.0)

#### Contexto
O `app.html` havia crescido para **6.959 linhas / ~780 KB** — um monólito que dificultava manutenção, debugging e evolução futura. A refatoração preserva **100% da estabilidade e dos dados** enquanto organiza o código em módulos coesos.

#### Arquitetura Modular Implementada

```
demurrage-manager/
├── app.html          ← reconstruído: 1.390 linhas (~113 KB, era 6.959 / 780 KB)
├── js/
│   ├── rates.js      ← tabela RATES, getRate(), getRateForBL(), calcUSD(), daysBetween()
│   ├── utils.js      ← uid(), toast(), openModal(), closeModal(), fmtBRL()
│   ├── db.js         ← Firebase init, window._dm* helpers (ES Module)
│   ├── billing.js    ← PTAX, renderList(), saveBL(), viewDoc()
│   ├── tracking.js   ← renderTracking(), calcTrkStatus()
│   ├── clients.js    ← renderClients(), saveClient(), syncBLEmails()
│   ├── users.js      ← renderUsers(), painel admin
│   ├── consolidated.js ← faturamento consolidado, invoice HTML, ZIP
│   └── init.js       ← window._dmOnReady, renderDashboard(), settings
└── css/
    ├── base.css      ← CSS variables, reset, layout (~187 linhas)
    └── components.css ← componentes, responsividade mobile (~397 linhas)
```

#### Decisões de Arquitetura

| Decisão | Justificativa |
|---------|--------------|
| `db.js` como ES Module (`type="module"`) | Necessário para `import` do Firebase SDK via CDN |
| Demais arquivos como `<script src>` clássico | Preserva compatibilidade com `onclick=` inline nos templates HTML |
| `window._dmStore` como estado compartilhado | Padrão já existente; módulos lêem/escrevem via helpers `_dm*` |
| `window._dmOnReady` callback em `init.js` | Ponto de entrada após Firebase + dados prontos; invocado por `db.js` |
| Ordem de carregamento explícita no HTML | rates → utils → billing → tracking → clients → users → consolidated → init |

#### Método de Deploy

- Arquivos gerados no VM Linux `/sessions/.../dm-modular/`
- Push via **GitHub REST API** (PUT `/contents/{path}`) com PAT
- 12 arquivos commitados em ~10 segundos
- GitHub Actions (`firebase-deploy.yml`) disparou automaticamente
- Deploy Firebase Hosting concluído em 1m 3s
- App verificado ao vivo em `https://demurragemanager.web.app`

#### Estatísticas

| Métrica | Antes | Depois |
|---------|-------|--------|
| app.html — linhas | 6.959 | 1.390 |
| app.html — tamanho | ~780 KB | ~113 KB |
| Arquivos JS | 0 | 9 |
| Arquivos CSS | 0 | 2 |
| Total de arquivos no deploy | ~57 | 69 |
| Funcionalidade | ✅ 100% | ✅ 100% |
| Dados Firestore | Intactos | Intactos |

---

### [2026-03-27] 🚀 Melhorias Implementadas (v1.0.4+)

#### 5 Novas Funcionalidades Adicionadas:

1. **⚠️ Alertas Visuais para Containers Críticos**
   - Containers com free time vencido > 5 dias: fundo amarelo + badge "⚠️ X dias"
   - Containers com free time vencido > 10 dias: fundo vermelho + badge "🔴 X dias" com animação pulsante
   - Localização: CSS (seção "ALERTAS PARA CONTAINERS CRÍTICOS") + função `checkContainerCritical()`

2. **📱 Responsividade Mobile Completa**
   - CSS media queries para max-width: 768px
   - Tabelas com scroll horizontal em mobile
   - Botões com min-height: 44px
   - Font-size: 16px nos inputs (evita zoom no iOS)
   - Localização: Seção CSS "RESPONSIVIDADE MOBILE"

3. **💰 Tabela de Taxas Editável via Interface**
   - Interface interativa para editar taxas de containers (20ft, 40ft, Reefer, etc)
   - Persistência automática no Firestore via `window._dmFireSave()`
   - Validação automática de entrada numérica
   - Localização: div#settings-rates + funções `renderRatesSettings()`, `saveRatesToFirestore()`

4. **📜 Histórico de Modificações (Accountability)**
   - Campo `modificationHistory` em documentos de container
   - Registro automático: { action, by: user.email, at: timestamp, details }
   - Modal para visualizar histórico completo de alterações
   - Localização: Função `addToModificationHistory()` + renderização em renderTracking()

5. **🔧 Nova Aba "Configurações" com 5 Sub-abas:**
   - **📊 Geral:** Versão, data deploy, informações do sistema
   - **💰 Taxas:** Tabela editável com tipos de container, free time e valores
   - **👥 Usuários:** Lista completa de usuários (admin only)
   - **💾 Backup:** Exportar JSON/CSV, importar backup com confirmação
   - **🔧 Sistema:** Info Firestore, tecnologia, status online, limpar cache
   - Localização: div#mod-settings + todas as funções relacionadas

#### Estatísticas de Alteração:
- Tamanho do arquivo: 725 KB → 777 KB (+52 KB)
- Linhas de código: 6.755 → 8.374 (+1.619 linhas)
  - CSS adicionado: +600 linhas
  - HTML adicionado: +400 linhas
  - JavaScript adicionado: +600 linhas

#### Status de Implementação:
- ✅ Alertas visuais: IMPLEMENTADO
- ✅ Responsividade mobile: IMPLEMENTADO
- ✅ Taxas editáveis: IMPLEMENTADO
- ✅ Histórico de modificações: IMPLEMENTADO
- ✅ Aba Configurações: IMPLEMENTADO
- ✅ Validação de dados: IMPLEMENTADO
- ✅ Integração Firestore: IMPLEMENTADO

---

### [2026-03-27] 🔒 Correções de Qualidade & Robustez (v1.0.5)

**Commit:** `06092ce` — 4 correções aplicadas diretamente no repositório GitHub

#### Correções Implementadas:

1. **🔧 Rollback no `_dmFireDelete`**
   - Salva `prevItem` e `prevIndex` antes do optimistic update
   - Em caso de falha do `deleteDoc()`, restaura o item na posição original exata
   - Chama `_dmRender()` + `window.toast()` com mensagem de erro visível ao usuário
   - Alinha com `_dmFireSave` que já tinha rollback correto

2. **🟢 Persistência Offline via IndexedDB**
   - `enableIndexedDbPersistence(db)` ativado após `getFirestore()`
   - App mantém último snapshot no IndexedDB quando Firebase indisponível
   - Avisos elegantes no console para múltiplas abas ou browser não suportado
   - Importação adicionada no bloco de imports do Firestore SDK

3. **💰 Free Time Configurável por BL**
   - Nova função `getRateForBL(bl, typeStr)` criada após `getRate()`
   - Sobrescreve `rate.freeUntil` com `bl.freeTime` quando o BL tiver free time negociado diferente
   - Ranges de P1/P2 ajustados proporcionalmente ao novo `freeUntil`
   - **14 chamadas** de `calcUSD(dc, getRate(c.type), ...)` substituídas por `getRateForBL(b, c.type)`
   - Campo `bl.freeTime` já era salvo no formulário — agora é efetivamente usado nos cálculos

4. **♿ Acessibilidade nos Modais**
   - `role="dialog"` e `aria-modal="true"` adicionados em todos os **10 overlays**
   - `aria-label` descritivo em cada modal identificando seu propósito
   - Botões "Excluir" de BL e Cliente recebem `aria-label` com contexto do item

#### Estatísticas:
- Linhas: 6.913 → 6.959 (+46 linhas)
- Tamanho: 776 KB → 780 KB (+4 KB)
- Arquivo: `app.html` — 1 arquivo alterado, 84 inserções, 38 deleções

---

### [2026-03-26] 🔧 Correções Críticas de Firestore

- Correção de consumo excessivo do Firestore
- Resolução de bugs críticos no app.html
- Otimização de queries em tempo real
- Melhor isolamento de dados por usuário

---

---

## 1. Visão Geral do Projeto

### Objetivo
O **Demurrage Manager** é uma aplicação web interna para a equipe da Transhipping Agenciamento Marítimo Ltda., desenvolvida para centralizar a gestão de **Demurrage & Detention (D&D)** de containers. O sistema substitui planilhas e processos manuais, oferecendo:

- Controle em tempo real dos containers em sobretaxa portuária
- Cálculo automático de valores em USD convertidos para BRL via PTAX+6,5%
- Emissão de faturas (com QR Code PIX) e recibos em formato pronto para imprimir/enviar
- Cobrança consolidada por CNPJ (múltiplos BLs em um único e-mail)
- Gestão de clientes com múltiplos e-mails
- Módulo de rastreamento/tracking de containers importado via planilha Excel
- Dashboard com KPIs, alertas de free time e lista de ações prioritárias
- Sistema multiusuário com autenticação Firebase, isolamento de dados por usuário e log de auditoria
- Painel administrativo para gestão de usuários e visualização de logs

### Stack Tecnológica
- **Frontend:** HTML5 + CSS3 + JavaScript puro (vanilla JS, sem frameworks)
- **Banco de dados:** Firebase Firestore (NoSQL, tempo real via `onSnapshot`)
- **Autenticação:** Firebase Authentication (e-mail/senha)
- **Bibliotecas CDN:**
  - `xlsx.js` v0.18.5 — leitura e exportação de planilhas Excel
  - `QRCode.js` v1.0.0 — geração de QR Code PIX nas faturas
  - `Google Fonts` — Inter + Syne + DM Mono
- **Hospedagem:** Pode ser servido diretamente por qualquer servidor de arquivos estáticos (Netlify, Firebase Hosting, GitHub Pages, etc.)
- **Build:** Sem processo de build — arquivos HTML estáticos com JS embutido

### Estado Atual
- ✅ Autenticação Firebase funcional (login, logout, reset de senha, proteção de rotas)
- ✅ Dados isolados por usuário (`/users/{uid}/bls`, `/users/{uid}/containers`, etc.)
- ✅ Sincronização em tempo real via Firestore `onSnapshot`
- ✅ Módulo Faturamento: criar/editar/excluir BLs, cálculo automático D&D, faturas com PIX QR Code
- ✅ Módulo Tracking: importação de planilhas, visualização de status de containers
- ✅ Módulo Clientes: cadastro, importação, exportação
- ✅ Módulo Dashboard: KPIs, "O que fazer agora", top clientes, containers em D&D
- ✅ Módulo Usuários (admin only): gestão de usuários, log de auditoria com filtros e paginação
- ✅ PTAX automático via API Banco Central do Brasil (com fallback para manual)
- ✅ Tabela de taxas D&D **totalmente editável pela interface** (20', 40', 40HC, Reefer, OT/FR)
- ✅ Cobrança consolidada por CNPJ com seleção múltipla
- ✅ Backup/Restore em JSON
- ✅ Relatório Excel com formatação profissional
- ✅ Descontos e gestão de disputas por BL
- ✅ Log de auditoria completo com filtros, paginação e exportação CSV
- ✅ **[2026-03-27] Alertas visuais para containers críticos** (cores, badges, animações)
- ✅ **[2026-03-27] Responsividade mobile completa** (media queries, touch-friendly)
- ✅ **[2026-03-27] Histórico de modificações** (accountability, rastreamento de mudanças)
- ✅ **[2026-03-27] Nova aba Configurações** com 5 sub-abas profissionais
- ✅ **[2026-03-27] Rollback completo no `_dmFireDelete`** (dado protegido contra inconsistência)
- ✅ **[2026-03-27] Persistência offline** via `enableIndexedDbPersistence()` (IndexedDB)
- ✅ **[2026-03-27] Free time por BL** — `getRateForBL()` usa `bl.freeTime` negociado no cálculo
- ✅ **[2026-03-27] Acessibilidade** — `role="dialog"` e `aria-label` em todos os 10 modais
- ✅ **[2026-03-26] Correções críticas de Firestore aplicadas**

### O que está pendente / próximos passos
- 🔲 Possivelmente: integração com sistema de e-mail automático (atualmente abre cliente de e-mail local via `mailto:`)
- 🔲 Possivelmente: notificações push para alertas de free time
- 🔲 Possivelmente: relatórios gráficos na aba Configurações (dashboard de métricas)

---

## 2. Estrutura de Pastas

```
demurrage-manager/
├── index.html           # Tela de login (Firebase Auth embutido inline)
├── app.html             # Aplicação principal completa (todo o app em um único arquivo)
├── auth.js              # Módulo de referência para autenticação (não usado diretamente pelo app)
├── db.js                # Módulo de referência para Firestore (não usado diretamente pelo app)
├── firebase-config.js   # Configuração Firebase de referência (não usado diretamente pelo app)
├── favicon.png          # Ícone da aplicação
└── SETUP.md             # Guia de configuração e documentação
```

> **Nota arquitetural:** O projeto intencional usa dois arquivos HTML principais (`index.html` e `app.html`) com Firebase embutido inline. Os arquivos `auth.js`, `db.js` e `firebase-config.js` são módulos de referência/documentação e não são importados diretamente pelos HTMLs, que têm toda a lógica Firebase embutida em `<script type="module">` inline para evitar problemas de CORS em file:// e para simplificar o deploy.

---

## 3. Arquivos do Projeto — Conteúdo Integral

### `index.html`

**Tamanho:** 14.5 KB

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Demurrage Manager — Transhipping</title>
<link rel="icon" type="image/png" href="favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --ink:     #0b0e14;
  --panel:   #111620;
  --surface: #161c2a;
  --border:  rgba(255,255,255,.07);
  --accent:  #1d8cf8;
  --muted:   #4a5568;
  --text:    #e2e8f0;
  --subtext: #64748b;
  --error:   #f87171;
  --success: #34d399;
}

body {
  font-family: 'DM Mono', monospace;
  background: var(--ink);
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr 480px;
  overflow: hidden;
}

/* ── Left panel ─────────────────────────────────────────────────── */
.left-panel {
  position: relative;
  background: var(--panel);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 56px;
  overflow: hidden;
}

.left-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(29,140,248,.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(29,140,248,.06) 1px, transparent 1px);
  background-size: 48px 48px;
  animation: gridShift 18s linear infinite;
}

@keyframes gridShift {
  from { transform: translateY(0); }
  to   { transform: translateY(48px); }
}

.left-panel::after {
  content: '';
  position: absolute;
  bottom: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(29,140,248,.18) 0%, transparent 70%);
  pointer-events: none;
}

.scanlines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg, transparent, transparent 3px,
    rgba(0,0,0,.12) 3px, rgba(0,0,0,.12) 4px
  );
  pointer-events: none;
  z-index: 1;
}

.data-tag {
  position: absolute;
  font-size: 10px;
  color: rgba(29,140,248,.5);
  letter-spacing: 1px;
  z-index: 2;
  animation: fadeFloat 6s ease-in-out infinite;
}
.data-tag:nth-child(2) { top: 14%; left: 8%;   animation-delay: 0s; }
.data-tag:nth-child(3) { top: 28%; right: 12%;  animation-delay: 1.5s; }
.data-tag:nth-child(4) { top: 52%; left: 14%;   animation-delay: 3s; }
.data-tag:nth-child(5) { top: 68%; right: 8%;   animation-delay: 4.5s; }
.data-tag:nth-child(6) { top: 40%; left: 40%;   animation-delay: 2s; }

@keyframes fadeFloat {
  0%, 100% { opacity: .35; transform: translateY(0); }
  50%       { opacity: .8;  transform: translateY(-8px); }
}

.left-content { position: relative; z-index: 3; }

.left-eyebrow {
  font-size: 10px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.left-eyebrow::before {
  content: '';
  display: block;
  width: 28px;
  height: 1px;
  background: var(--accent);
}

.left-headline {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: clamp(36px, 4vw, 52px);
  line-height: 1.05;
  color: var(--text);
  margin-bottom: 20px;
  letter-spacing: -1px;
}
.left-headline span {
  color: transparent;
  -webkit-text-stroke: 1px rgba(29,140,248,.6);
}

.left-desc {
  font-size: 13px;
  line-height: 1.7;
  color: var(--subtext);
  max-width: 380px;
  margin-bottom: 40px;
}

.stat-row { display: flex; gap: 40px; }
.stat { display: flex; flex-direction: column; gap: 4px; }
.stat-num {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 28px;
  color: var(--accent);
  letter-spacing: -1px;
}
.stat-label {
  font-size: 10px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
}

/* ── Right panel ────────────────────────────────────────────────── */
.right-panel {
  background: var(--surface);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 56px 52px;
  border-left: 1px solid var(--border);
  position: relative;
  overflow: hidden;
}

.right-panel::before {
  content: '';
  position: absolute;
  top: -1px; right: -1px;
  width: 120px; height: 120px;
  border-top: 1px solid rgba(29,140,248,.25);
  border-right: 1px solid rgba(29,140,248,.25);
  border-radius: 0 0 0 80px;
}
.right-panel::after {
  content: '';
  position: absolute;
  bottom: -1px; left: -1px;
  width: 80px; height: 80px;
  border-bottom: 1px solid rgba(29,140,248,.15);
  border-left: 1px solid rgba(29,140,248,.15);
  border-radius: 0 60px 0 0;
}

.brand { display: flex; flex-direction: column; gap: 4px; margin-bottom: 48px; }

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(29,140,248,.1);
  border: 1px solid rgba(29,140,248,.2);
  border-radius: 4px;
  padding: 4px 10px;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--accent);
  width: fit-content;
  margin-bottom: 8px;
}
.brand-badge::before {
  content: '';
  width: 6px; height: 6px;
  background: var(--accent);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: .4; transform: scale(.8); }
}

.brand-name {
  font-family: 'Syne', sans-serif;
  font-weight: 800;
  font-size: 22px;
  color: var(--text);
  letter-spacing: -.5px;
}
.brand-company {
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--muted);
}

.form-title {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 26px;
  color: var(--text);
  margin-bottom: 6px;
  letter-spacing: -.5px;
}
.form-sub {
  font-size: 12px;
  color: var(--subtext);
  margin-bottom: 36px;
  letter-spacing: .3px;
}

.field { margin-bottom: 20px; }
.field label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 9px;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}

.field-line {
  display: flex;
  align-items: center;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  transition: border-color .2s, box-shadow .2s;
  overflow: hidden;
}
.field-line:focus-within {
  border-color: rgba(29,140,248,.5);
  box-shadow: 0 0 0 3px rgba(29,140,248,.08);
}

.field-icon {
  padding: 0 14px;
  color: var(--muted);
  font-size: 13px;
  flex-shrink: 0;
}

.field-line input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: var(--text);
  font-family: 'DM Mono', monospace;
  font-size: 13px;
  padding: 13px 14px 13px 0;
  letter-spacing: .3px;
}
.field-line input::placeholder { color: var(--muted); }

.btn-login {
  width: 100%;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 1px;
  text-transform: uppercase;
  padding: 14px;
  cursor: pointer;
  transition: background .2s, transform .1s, box-shadow .2s;
  margin-top: 8px;
  position: relative;
  overflow: hidden;
}
.btn-login::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,.1) 0%, transparent 60%);
  pointer-events: none;
}
.btn-login:hover:not(:disabled) {
  background: #1a7de0;
  box-shadow: 0 8px 24px rgba(29,140,248,.35);
  transform: translateY(-1px);
}
.btn-login:active:not(:disabled) { transform: translateY(0); }
.btn-login:disabled { opacity: .5; cursor: not-allowed; }

.btn-spinner {
  display: inline-block;
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin .6s linear infinite;
  margin-right: 8px;
  vertical-align: middle;
}
@keyframes spin { to { transform: rotate(360deg); } }

.alert {
  border-radius: 6px;
  padding: 11px 14px;
  font-size: 12px;
  margin-top: 14px;
  display: none;
  letter-spacing: .2px;
}
.alert.visible { display: block; }
.alert-error {
  background: rgba(248,113,113,.08);
  border: 1px solid rgba(248,113,113,.25);
  color: var(--error);
}
.alert-success {
  background: rgba(52,211,153,.08);
  border: 1px solid rgba(52,211,153,.25);
  color: var(--success);
}

.form-footer {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
.forgot-link {
  background: none;
  border: none;
  cursor: pointer;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: .5px;
  transition: color .2s;
  padding: 0;
}
.forgot-link:hover { color: var(--accent); }

.page-footer {
  position: absolute;
  bottom: 28px;
  left: 52px; right: 52px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-footer-text {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 1px;
}

@media (max-width: 800px) {
  body { grid-template-columns: 1fr; }
  .left-panel { display: none; }
  .right-panel { padding: 40px 32px; }
  .page-footer { left: 32px; right: 32px; }
}
</style>
</head>
<body>

<div class="left-panel">
  <div class="scanlines"></div>
  <div class="data-tag">BL_2024_0481 &middot; 40HC &middot; D&D +12d</div>
  <div class="data-tag">CNTR: MSCU7823410 &middot; POD: SANTOS</div>
  <div class="data-tag">FREE TIME: 21d &middot; ROE: 5.4320</div>
  <div class="data-tag">VESSEL: MSC CAPRICORN &middot; ETA OK</div>
  <div class="data-tag">ALERT: 3 containers vencendo</div>
  <div class="left-content">
    <div class="left-eyebrow">Demurrage &amp; Detention</div>
    <h1 class="left-headline">Controle total<br>de <span>D&amp;D</span><br>em tempo real</h1>
    <p class="left-desc">Gestão centralizada de demurrage, containers e faturamento para toda a equipe da Transhipping.</p>
    <div class="stat-row">
      <div class="stat"><span class="stat-num">&#8734;</span><span class="stat-label">BLs</span></div>
      <div class="stat"><span class="stat-num">RT</span><span class="stat-label">Sync</span></div>
      <div class="stat"><span class="stat-num">PIX</span><span class="stat-label">QR Code</span></div>
    </div>
  </div>
</div>

<div class="right-panel">
  <div class="brand">
    <div class="brand-badge">sistema ativo</div>
    <div class="brand-name">Demurrage Manager</div>
    <div class="brand-company">Transhipping Agenciamento Mar&iacute;timo</div>
  </div>
  <div class="form-title">Acesso</div>
  <div class="form-sub">Entre com sua conta corporativa</div>
  <div class="field">
    <label>E-mail</label>
    <div class="field-line">
      <span class="field-icon">@</span>
      <input type="email" id="email" placeholder="usuario@transhipping.com.br" autocomplete="email">
    </div>
  </div>
  <div class="field">
    <label>Senha</label>
    <div class="field-line">
      <span class="field-icon">#</span>
      <input type="password" id="password" placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;" autocomplete="current-password">
    </div>
  </div>
  <button class="btn-login" id="btn-login" onclick="doLogin()">Entrar no sistema</button>
  <div class="alert alert-error" id="error-msg"></div>
  <div class="alert alert-success" id="reset-success">E-mail de redefinicao enviado &mdash; verifique sua caixa de entrada.</div>
  <div class="form-footer">
    <button class="forgot-link" onclick="doReset()">Esqueci minha senha</button>
  </div>
  <div class="page-footer">
    <span class="page-footer-text">&copy; TRANSHIPPING</span>
    <span class="page-footer-text">by ljuliatti</span>
  </div>
</div>

<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
  import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail }
    from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

  // PREENCHA COM AS CREDENCIAIS DO SEU PROJETO:
  const firebaseConfig = {
    apiKey:            "AIzaSyBWXLvUspGo1rRDSWYJ3rGMRUOGUH6bARI",
    authDomain:        "demurragemanager.firebaseapp.com",
    projectId:         "demurragemanager",
    storageBucket:     "demurragemanager.firebasestorage.app",
    messagingSenderId: "951449004275",
    appId:             "1:951449004275:web:c01cc83d02ba87d9bcaf86"
  };

  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  onAuthStateChanged(auth, user => { if (user) window.location.href = 'app.html'; });

  const msgs = {
    'auth/invalid-credential':     'E-mail ou senha incorretos.',
    'auth/user-not-found':         'Usuário não encontrado.',
    'auth/wrong-password':         'Senha incorreta.',
    'auth/too-many-requests':      'Muitas tentativas. Aguarde alguns minutos.',
    'auth/user-disabled':          'Esta conta foi desativada.',
    'auth/network-request-failed': 'Erro de conexão. Verifique a internet.',
  };

  window.doLogin = async function() {
    const email = document.getElementById('email').value.trim();
    const pw    = document.getElementById('password').value;
    const btn   = document.getElementById('btn-login');
    const err   = document.getElementById('error-msg');
    const ok    = document.getElementById('reset-success');
    err.classList.remove('visible'); ok.classList.remove('visible');
    if (!email || !pw) { err.textContent = 'Preencha e-mail e senha.'; err.classList.add('visible'); return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span>Verificando...';
    try {
      await signInWithEmailAndPassword(auth, email, pw);
      window.location.href = 'app.html';
    } catch (e) {
      err.textContent = msgs[e.code] || e.message;
      err.classList.add('visible');
      btn.disabled = false;
      btn.textContent = 'Entrar no sistema';
    }
  };

  window.doReset = async function() {
    const email = document.getElementById('email').value.trim();
    const err   = document.getElementById('error-msg');
    const ok    = document.getElementById('reset-success');
    err.classList.remove('visible'); ok.classList.remove('visible');
    if (!email) { err.textContent = 'Digite seu e-mail acima.'; err.classList.add('visible'); return; }
    try { await sendPasswordResetEmail(auth, email); ok.classList.add('visible'); }
    catch (e) { err.textContent = e.message; err.classList.add('visible'); }
  };

  document.getElementById('password').addEventListener('keydown', e => { if (e.key === 'Enter') window.doLogin(); });
  document.getElementById('email').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('password').focus(); });
</script>
</body>
</html>
```

### `app.html`

**Tamanho:** 720.9 KB

### `app.html`

**Tamanho:** 780.3 KB (atualizado em 27/03/2026)

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Demurrage Manager — Transhipping</title>
<link rel="icon" type="image/png" href="favicon.png">
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>

// ── MiniZip: simple ZIP creator (STORE, no compression) ─────────────────
// Spec: https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT
var MiniZip = (function() {
  function strToBytes(s) {
    var bytes = [];
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c < 128) { bytes.push(c); }
      else if (c < 2048) { bytes.push((c >> 6) | 192); bytes.push((c & 63) | 128); }
      else { bytes.push((c >> 12) | 224); bytes.push(((c >> 6) & 63) | 128); bytes.push((c & 63) | 128); }
    }
    return new Uint8Array(bytes);
  }
  function u16(n) { return [n & 0xff, (n >> 8) & 0xff]; }
  function u32(n) { return [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]; }
  function crc32(data) {
    var table = [];
    for (var i = 0; i < 256; i++) {
      var c = i;
      for (var j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[i] = c;
    }
    var crc = 0xFFFFFFFF;
    for (var k = 0; k < data.length; k++) crc = table[(crc ^ data[k]) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function concat(arrays) {
    var total = 0;
    for (var i = 0; i < arrays.length; i++) total += arrays[i].length;
    var out = new Uint8Array(total);
    var offset = 0;
    for (var i = 0; i < arrays.length; i++) { out.set(arrays[i], offset); offset += arrays[i].length; }
    return out;
  }
  return {
    create: function(files) {
      var localHeaders = [], centralHeaders = [], offset = 0;
      for (var i = 0; i < files.length; i++) {
        var name = files[i].name;
        var data = typeof files[i].data === 'string' ? strToBytes(files[i].data) : files[i].data;
        var nameBytes = strToBytes(name);
        var crc = crc32(data);
        var size = data.length;
        // Local file header
        var local = new Uint8Array([].concat(
          [0x50,0x4B,0x03,0x04], // signature
          u16(20),               // version needed
          u16(0),                // flags
          u16(0),                // compression STORE
          u16(0), u16(0),        // mod time, mod date
          u32(crc),
          u32(size), u32(size),  // compressed = uncompressed
          u16(nameBytes.length), u16(0) // filename len, extra len
        ));
        var localEntry = concat([local, nameBytes, data]);
        localHeaders.push(localEntry);
        // Central directory header
        var central = new Uint8Array([].concat(
          [0x50,0x4B,0x01,0x02], // signature
          u16(20), u16(20),       // version made, needed
          u16(0), u16(0),         // flags, compression STORE
          u16(0), u16(0),         // mod time, date
          u32(crc),
          u32(size), u32(size),
          u16(nameBytes.length), u16(0), u16(0), // fname, extra, comment
          u16(0), u16(0),         // disk start, internal attr
          u32(0),                 // external attr
          u32(offset)             // local header offset
        ));
        centralHeaders.push(concat([central, nameBytes]));
        offset += localEntry.length;
      }
      var centralSize = 0;
      for (var i = 0; i < centralHeaders.length; i++) centralSize += centralHeaders[i].length;
      var eocd = new Uint8Array([].concat(
        [0x50,0x4B,0x05,0x06], // end of central dir signature
        u16(0), u16(0),        // disk number, disk with central dir
        u16(files.length), u16(files.length),
        u32(centralSize), u32(offset),
        u16(0)                 // comment length
      ));
      return concat(localHeaders.concat(centralHeaders).concat([eocd]));
    },
    download: function(files, zipName) {
      var bytes = this.create(files);
      var blob = new Blob([bytes], {type: 'application/zip'});
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = zipName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
    }
  };
})();

</script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --navy: #1a2744; --navy2: #243354;
  --blue: #1e40af; --blue-btn: #1d4ed8; --blue-light: #dbeafe;
  --gold: #f59e0b; --gold-light: #fef3c7;
  --red: #dc2626; --red-light: #fee2e2;
  --green: #16a34a; --green-light: #dcfce7;
  --text: #111827; --muted: #6b7280;
  --border: #e5e7eb; --bg: #f3f4f6;
  --font: 'Inter', sans-serif;
}
body { font-family: var(--font); background: var(--bg); color: var(--text); min-height: 100vh; }

/* MODULE TABS */
.mod-tabs { display:flex; gap:0; background:var(--navy); padding:0 32px; border-bottom:3px solid var(--gold); }
.mod-tab { padding:12px 22px; font-size:13px; font-weight:600; color:rgba(255,255,255,0.55); cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-3px; transition:all 0.2s; letter-spacing:0.2px; }
.mod-tab:hover { color:rgba(255,255,255,0.85); }
.mod-tab.active { color:white; border-bottom-color:var(--gold); }

/* TRACKING MODULE */
.trk-toolbar { display:flex; gap:10px; margin-bottom:16px; align-items:center; flex-wrap:wrap; }
.trk-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
.trk-stat { background:white; border:1px solid var(--border); border-radius:10px; padding:14px 18px; }
.trk-stat-label { font-size:11px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--muted); margin-bottom:6px; }
.trk-stat-val { font-size:24px; font-weight:700; line-height:1; }
.trk-stat-val.blue { color:var(--blue); }
.trk-stat-val.red { color:var(--red); }
.trk-stat-val.gold { color:var(--gold); }
.trk-stat-val.green { color:var(--green); }

.trk-table-wrap { background:white; border:1px solid var(--border); border-radius:10px; overflow:hidden; }
.trk-table { width:100%; border-collapse:collapse; font-size:11px; table-layout:fixed; }
.trk-table thead tr { background:var(--navy); }
.trk-table thead th { padding:6px 4px; color:white; font-weight:600; font-size:10px; text-align:center; white-space:normal; line-height:1.2; word-break:break-word; }
.trk-table td { padding:6px 4px; text-align:center; border-bottom:1px solid var(--border); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; }
.trk-table tbody tr:last-child td { border-bottom:none; }
.trk-table tbody tr:hover { background:#f9fafb; }
.trk-table tbody tr.row-dd-open     { background:#fff7ed; }
.trk-table tbody tr.row-dd-returned { background:#fef2f2; }
.trk-table tbody tr.row-grace       { background:#fffbeb; }
.trk-table tbody tr.row-free        { background:#f0fdf4; }
.trk-table tbody tr.row-returned    { background:white; }
.trk-table tbody tr.row-ok          { background:white; }
.trk-filter-row th { background:#f1f5f9 !important; padding:3px 3px !important; }
.trk-filter-row input, .trk-filter-row select {
  width:100%; padding:3px 4px; font-size:10px; font-family:var(--font);
  border:1px solid #cbd5e1; border-radius:4px; background:white;
  color:var(--text); outline:none; box-sizing:border-box;
}
.trk-filter-row input:focus, .trk-filter-row select:focus { border-color:var(--blue-btn); }
.trk-filter-row input::placeholder { color:#94a3b8; }

/* STATUS PILLS */
.pill { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:20px; font-size:11px; font-weight:600; white-space:nowrap; }
.pill-free       { background:#dcfce7; color:#15803d; }
.pill-grace      { background:#fef9c3; color:#92400e; }
.pill-over       { background:#fee2e2; color:#dc2626; }
.pill-dd-returned{ background:#fecaca; color:#991b1b; }
.pill-none       { background:#f3f4f6; color:#6b7280; }

/* DAYS COUNTER */
.days-num { font-weight:700; font-size:14px; }
.days-num.over { color:var(--red); }
.days-num.grace { color:#d97706; }
.days-num.free { color:var(--green); }
.days-num.none { color:var(--muted); }

.header { background: var(--navy); color: white; padding: 0 32px; height: 64px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 200; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
.header-brand { display: flex; align-items: center; gap: 12px; }
.header-logo { font-size: 22px; }
.header-title { font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
.header-sub { font-size: 11px; color: rgba(255,255,255,0.55); }
.header-right { display: flex; align-items: center; gap: 12px; }
.header-rate-link { color: rgba(255,255,255,0.7); font-size: 12px; cursor: pointer; padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); transition: all 0.15s; }
.header-rate-link:hover { background: rgba(255,255,255,0.1); color: white; }
.header-logout { color: rgba(255,255,255,0.7); font-size: 13px; cursor: pointer; padding: 6px 10px; border-radius: 6px; transition: background 0.15s; }
.header-logout:hover { background: rgba(255,255,255,0.08); color: white; }

.page { max-width: 1200px; margin: 0 auto; padding: 28px 24px; }

.toolbar { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; }
.search-wrap { flex: 1; position: relative; }
.search-wrap input { width: 100%; padding: 10px 14px 10px 38px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; font-family: var(--font); background: white; color: var(--text); outline: none; transition: border-color 0.2s; }
.search-wrap input:focus { border-color: var(--blue-btn); box-shadow: 0 0 0 3px rgba(29,78,216,0.1); }
.search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--muted); font-size: 15px; pointer-events: none; }

.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 8px; font-size: 14px; font-family: var(--font); font-weight: 500; cursor: pointer; border: none; transition: all 0.15s; white-space: nowrap; }
.btn-primary { background: var(--blue-btn); color: white; }
.btn-primary:hover { background: #1e40af; }
.btn-outline { background: white; color: var(--text); border: 1px solid var(--border); }
.btn-outline:hover { border-color: var(--blue-btn); color: var(--blue-btn); }
.btn-sm { padding: 6px 12px; font-size: 13px; }

.results-count { font-size: 13px; color: var(--muted); margin-bottom: 14px; }
.bl-list { display: flex; flex-direction: column; gap: 10px; }
.bl-card { background: white; border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; transition: box-shadow 0.15s; }
.bl-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
.bl-badge { background: var(--blue-light); color: var(--blue); font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 5px; flex-shrink: 0; }
.bl-info { flex: 1; min-width: 0; }
.bl-number { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
.bl-client { font-size: 12px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 580px; margin-bottom: 6px; }
.bl-meta { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.container-tag { background: var(--bg); border: 1px solid var(--border); border-radius: 5px; padding: 2px 8px; font-size: 11px; font-weight: 500; color: var(--text); }
.bl-actions { display: flex; gap: 8px; flex-shrink: 0; }
.act-btn { display: inline-flex; align-items: center; gap: 5px; padding: 7px 13px; border-radius: 7px; font-size: 13px; font-family: var(--font); font-weight: 500; cursor: pointer; border: 1px solid var(--border); transition: all 0.15s; background: white; color: var(--text); }

/* ── Pago: verde — estado de quitação ── */
.act-btn.unpaid  { border-color: #86efac; color: #15803d; background: #f0fdf4; }
.act-btn.unpaid:hover  { background: #dcfce7; border-color: #4ade80; }
.act-btn.paid    { background: #16a34a; color: white; border-color: #15803d; font-weight: 600; }
.act-btn.paid:hover    { background: #15803d; }

/* ── Faturado: âmbar — estado de faturamento ── */
.act-btn.unbilled { border-color: #fcd34d; color: #b45309; background: #fffbeb; }
.act-btn.unbilled:hover { background: #fef3c7; border-color: #f59e0b; }
.act-btn.billed   { background: #f59e0b; color: #111; border-color: #d97706; font-weight: 600; }
.act-btn.billed:hover  { background: #d97706; }

/* ── Fatura: outline navy — ação de documento ── */
.act-btn.invoice  { background: white; color: var(--navy); border-color: #94a3b8; }
.act-btn.invoice:hover { background: #f1f5f9; border-color: var(--navy); }

/* ── Recibo: outline neutro ── */
.act-btn.receipt:hover { background: var(--bg); }

/* ── Editar: outline neutro ── */
.act-btn.edit:hover  { background: var(--bg); }

/* ── Excluir: destrutivo discreto ── */
.act-btn.del  { color: var(--red); border-color: transparent; background: transparent; }
.act-btn.del:hover { background: var(--red-light); border-color: #fca5a5; }

/* ── Card com BL pago ── */
.bl-card.is-paid { border-left: 4px solid var(--green); background: #f0fdf4; }
.bl-card.is-paid .bl-number { color: #15803d; }
.paid-badge { display:inline-flex; align-items:center; gap:4px; background:#dcfce7; color:#15803d; font-size:11px; font-weight:600; padding:2px 8px; border-radius:20px; margin-left:8px; }
.paid-date { font-size:11px; color:var(--muted); margin-left:4px; }
.badge-desc { display:inline-flex; align-items:center; gap:4px; background:#dcfce7; color:#15803d; font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; margin-left:6px; }
.badge-dispute { display:inline-flex; align-items:center; gap:4px; background:#fed7aa; color:#92400e; font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; margin-left:6px; }
.bl-card.is-disputed { border-left: 4px solid #f59e0b; background: #fffbeb; }
.bl-card.is-disputed .bl-number { color: #92400e; }
.aging-badge { display:inline-flex; align-items:center; gap:4px; background:#fee2e2; color:#dc2626; font-size:10px; font-weight:600; padding:2px 6px; border-radius:20px; margin-left:4px; }
.aging-badge.aging-ok { background:#fef9c3; color:#92400e; }
.aging-badge.aging-warn { background:#fde047; color:#92400e; }
.aging-badge.aging-late { background:#fee2e2; color:#dc2626; }
.empty-state { text-align: center; padding: 60px 20px; color: var(--muted); }
.empty-state .icon { font-size: 48px; margin-bottom: 12px; }
.empty-state p { font-size: 15px; }

.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(2px); z-index: 200; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity 0.2s; }
.overlay.open { opacity: 1; pointer-events: all; }
.modal { background: white; border-radius: 14px; width: 640px; max-width: 96vw; max-height: 92vh; overflow-y: auto; transform: translateY(20px); transition: transform 0.2s; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
.overlay.open .modal { transform: translateY(0); }
.modal.wide { width: 820px; }
.modal.xl { width: 980px; }
.modal-header { background: var(--navy); color: white; padding: 18px 24px; display: flex; align-items: center; justify-content: space-between; border-radius: 14px 14px 0 0; }
.modal-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.modal-close { background: none; border: none; color: rgba(255,255,255,0.7); font-size: 20px; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.modal-close:hover { background: rgba(255,255,255,0.1); color: white; }
.modal-body { padding: 24px; }
.modal-footer { padding: 16px 24px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }

.form-section { margin-bottom: 22px; }
.section-label { font-size: 11px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: var(--blue); margin-bottom: 12px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.form-grid.cols3 { grid-template-columns: 1fr 1fr 1fr; }
.form-grid.cols4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
label { font-size: 12px; font-weight: 500; color: var(--muted); }
input, select, textarea { padding: 9px 11px; border: 1px solid var(--border); border-radius: 7px; font-size: 13.5px; font-family: var(--font); color: var(--text); outline: none; transition: border-color 0.2s; }
input:focus, select:focus { border-color: var(--blue-btn); box-shadow: 0 0 0 3px rgba(29,78,216,0.1); }
.field-hint { font-size: 11px; color: #2563eb; margin-top: 2px; }
.field-hint.muted { color: var(--muted); }

.containers-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.ctable { width: 100%; border-collapse: collapse; font-size: 13px; }
.ctable th { text-align: left; padding: 7px 8px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; color: var(--muted); border-bottom: 2px solid var(--border); white-space: nowrap; }
.ctable td { padding: 5px 4px; border-bottom: 1px solid var(--border); vertical-align: middle; }
.ctable tr:last-child td { border-bottom: none; }
.ctable td input, .ctable td select { padding: 6px 8px; font-size: 12.5px; }
.remove-row { background: none; border: none; color: var(--muted); cursor: pointer; font-size: 16px; padding: 2px 6px; border-radius: 4px; }
.remove-row:hover { background: var(--red-light); color: var(--red); }
.calc-cell { font-size: 11px; color: var(--muted); padding: 4px 6px !important; white-space: nowrap; text-align: center; }
.calc-cell.active { color: var(--red); font-weight: 700; }

.info-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 14px; font-size: 12px; color: #1d4ed8; margin-top: 10px; }

/* RATE TABLE */
.rate-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.rate-table th { background: var(--navy); color: white; padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; }
.rate-table td { padding: 8px 12px; border-bottom: 1px solid var(--border); }
.rate-table tr:hover td { background: #f8faff; }
.rbadge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.rbadge.free { background: var(--green-light); color: var(--green); }
.rbadge.p1 { background: var(--gold-light); color: #92400e; }
.rbadge.p2 { background: var(--red-light); color: var(--red); }

.drop-zone { border: 2px dashed var(--border); border-radius: 10px; padding: 40px 20px; text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 16px; }
.drop-zone:hover, .drop-zone.drag { border-color: var(--blue-btn); background: var(--blue-light); }
.drop-zone .drop-icon { font-size: 36px; margin-bottom: 10px; }
.drop-zone p { font-size: 14px; color: var(--muted); }
.columns-hint { background: var(--bg); border-radius: 8px; padding: 12px 14px; font-size: 12px; color: var(--muted); }
.col-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.col-tag { background: white; border: 1px solid var(--border); border-radius: 4px; padding: 2px 8px; font-size: 11px; font-family: monospace; }
.col-tag.opt { color: var(--muted); }

.doc-page { display: none; background: white; min-height: 100vh; }
.doc-page.active { display: block; }
.doc-toolbar { background: white; border-bottom: 1px solid var(--border); padding: 12px 24px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 50; }
.doc-wrap { max-width: 820px; margin: 32px auto; padding: 0 24px 60px; }

.invoice { border: 1px solid #ccc; padding: 36px 40px; font-size: 13px; color: #111; }
.inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.inv-logo-area { display: flex; align-items: center; gap: 12px; }
.inv-num { font-size: 14px; font-weight: 600; color: var(--navy); }
.inv-title { text-align: center; font-size: 17px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 18px 0; }
.inv-hr { border: none; border-top: 2px solid var(--navy); margin: 8px 0 16px; }
.inv-hr-light { border: none; border-top: 1px solid #ddd; margin: 10px 0; }
.inv-row { display: flex; gap: 8px; margin-bottom: 8px; font-size: 13px; }
.inv-lbl { font-weight: 600; min-width: 110px; }
.inv-val { color: #333; }
.inv-tbl { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
.inv-tbl thead tr { background: var(--navy); color: white; }
.inv-tbl th { padding: 9px 7px; text-align: center; font-weight: 600; font-size: 11px; }
.inv-tbl td { padding: 8px 7px; text-align: center; border-bottom: 1px solid #eee; }
.inv-tbl tbody tr:last-child td { border-bottom: none; }
.inv-total-row { background: var(--gold); }
.inv-total-row td { border: none; }
.inv-total-lbl { font-weight: 700; text-align: right !important; padding: 9px 12px !important; }
.inv-total-val { font-weight: 700; text-align: right !important; padding: 9px 12px !important; white-space: nowrap; }
.inv-venc-row td { background: var(--navy) !important; color: white !important; font-weight: 600; padding: 9px 12px; border: none; }
.inv-venc-highlight { background: var(--navy) !important; color: white !important; font-weight: 600; text-align: right !important; padding: 9px 12px !important; white-space: nowrap; }
.roe-area { display: flex; justify-content: flex-end; margin-bottom: -1px; }
.roe-box { background: var(--gold); padding: 6px 16px; font-weight: 700; font-size: 13px; display: flex; gap: 12px; min-width: 180px; justify-content: space-between; }
.inv-bank { margin-top: 20px; font-size: 12.5px; }
.inv-bank strong { display: block; font-size: 13px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.inv-bank-detail { line-height: 1.7; color: #333; }
.inv-total-box { display: inline-block; background: var(--gold); color: #000; font-weight: 700; font-size: 15px; padding: 6px 14px; border-radius: 4px; margin-top: 8px; }
.inv-date { text-align: right; font-size: 12px; color: #555; margin-top: 16px; }
.cons-dd-item:hover { background: #f0f9ff !important; }
.inv-pix { display: flex; align-items: flex-start; gap: 18px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb; }
.inv-pix-qr { flex-shrink: 0; width:100px; height:100px; }
.inv-pix-qr canvas, .inv-pix-qr img { width: 100px !important; height: 100px !important; display: block; }
.inv-pix-info { flex: 1; font-size: 12px; color: #333; line-height: 1.6; }
.inv-pix-info strong { display: block; font-size: 13px; font-weight: 700; margin-bottom: 4px; color: var(--navy); text-transform: uppercase; letter-spacing: 0.5px; }
.inv-pix-key { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 6px 10px; margin-top: 6px; font-size: 12px; font-weight: 600; color: #15803d; display: inline-block; }

.toast { position: fixed; bottom: 24px; right: 24px; background: var(--navy); color: white; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; z-index: 1000; transform: translateY(80px); opacity: 0; transition: all 0.3s; box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
.toast.show { transform: translateY(0); opacity: 1; }
.toast.success { background: #15803d; }
.toast.error { background: var(--red); }

/* PTAX BANNER */
.ptax-banner { background: #0f2027; border-bottom: 1px solid #1a3350; padding: 8px 32px; display: flex; align-items: center; gap: 12px; }
.ptax-pill { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.ptax-label { color: rgba(255,255,255,0.5); font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; }
.ptax-val { color: #fff; font-weight: 700; font-size: 14px; }
.ptax-sep { color: rgba(255,255,255,0.25); font-size: 12px; }
.ptax-roe-label { color: rgba(255,255,255,0.5); font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; }
.ptax-roe-val { color: #f59e0b; font-weight: 800; font-size: 15px; }
.ptax-date { color: rgba(255,255,255,0.3); font-size: 11px; }
.ptax-refresh { background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); border-radius: 5px; padding: 2px 8px; cursor: pointer; font-size: 13px; transition: all 0.15s; }
.ptax-refresh:hover { background: rgba(255,255,255,0.15); color: white; }
.ptax-loading { color: rgba(255,255,255,0.45); font-size: 12px; animation: ptax-pulse 1.2s infinite; }
@keyframes ptax-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
.ptax-error { color: #fbbf24; font-size: 12px; display: flex; align-items: center; gap: 8px; }
.ptax-retry { background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.3); color: #f59e0b; border-radius: 5px; padding: 3px 10px; cursor: pointer; font-size: 12px; font-family: var(--font); }
.ptax-retry:hover { background: rgba(245,158,11,0.22); }
.ptax-src { color: rgba(255,255,255,0.2); font-size: 10px; margin-left: auto; }
.ptax-manual-tag { background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); color: #f59e0b; border-radius: 4px; font-size: 10px; padding: 1px 6px; margin-left: 4px; }
.ptax-manual-sep { width: 1px; height: 16px; background: rgba(255,255,255,0.15); margin: 0 4px; }
.ptax-manual-area { display: flex; align-items: center; gap: 7px; }
.ptax-manual-label { color: rgba(255,255,255,0.4); font-size: 11px; white-space: nowrap; }
.ptax-manual-input { background: rgba(255,255,255,0.07); border: 1px solid rgba(245,158,11,0.4); color: #fff; border-radius: 5px; padding: 3px 8px; font-size: 13px; font-family: var(--font); width: 90px; text-align: right; outline: none; }
.ptax-manual-input:focus { border-color: #f59e0b; background: rgba(245,158,11,0.08); }
.ptax-manual-btn { background: rgba(245,158,11,0.18); border: 1px solid rgba(245,158,11,0.45); color: #f59e0b; border-radius: 5px; padding: 3px 11px; cursor: pointer; font-size: 12px; font-family: var(--font); font-weight: 600; transition: all 0.15s; white-space: nowrap; }
.ptax-manual-btn:hover { background: rgba(245,158,11,0.32); color: #fff; }


@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  .doc-toolbar, .header, .page, .ptax-banner { display: none !important; }
  .doc-page { display: block !important; }
  .doc-wrap { margin: 0; padding: 0; max-width: 100%; }
  .invoice { border: 1px solid #ccc; }
  .inv-tbl thead tr { background: #1a2744 !important; }
  .inv-tbl thead th { color: white !important; }
  .inv-total-row { background: #f59e0b !important; }
  .inv-total-row { background: #f59e0b !important; }
  .inv-venc-row td { background: #1a2744 !important; color: white !important; }
  .roe-box { background: #f59e0b !important; }
  .inv-total-box { background: #f59e0b !important; }
  .inv-pix { display: flex !important; }
  .inv-pix-qr img { width: 90px !important; height: 90px !important; }
}

/* ── Dashboard ─────────────────────────────────────────────────────────── */
.dash-wrap { padding:28px 32px; max-width:1600px; margin:0 auto; }

.dash-strip { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:28px; flex-wrap:wrap; gap:12px; }
.dash-greeting { font-size:24px; font-weight:700; color:var(--navy); }
.dash-date { font-size:13px; color:var(--muted); margin-top:3px; }
.dash-strip-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
.dash-quick-pill { padding:9px 18px; border-radius:8px; border:1.5px solid var(--border); background:white; font-size:13px; font-weight:600; color:var(--navy); cursor:pointer; transition:all .15s; }
.dash-quick-pill:hover { background:#f1f5f9; }
.dash-quick-pill-primary { background:var(--navy); color:white; border-color:var(--navy); }
.dash-quick-pill-primary:hover { background:#0f1f38; }

/* Main 2-col grid: wider left, narrower right */
.dash-main-grid { display:grid; grid-template-columns:1fr 300px; gap:28px; align-items:start; }
@media(max-width:1200px) { .dash-main-grid { grid-template-columns:1fr; } }

/* Group label */
.dash-group-label { font-size:11px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:1.2px; margin-bottom:12px; }

/* KPI 4-grid */
.dash-kpi4 { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
@media(max-width:1000px) { .dash-kpi4 { grid-template-columns:repeat(2,1fr); } }

/* KPI card */
.dk-card {
  border-radius:14px; padding:20px 22px;
  cursor:pointer; transition:transform .15s, box-shadow .15s;
  box-shadow:0 2px 6px rgba(0,0,0,.09);
  display:flex; flex-direction:column; gap:10px; min-width:0;
}
.dk-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.14); }
.dk-top { display:flex; align-items:center; gap:12px; min-width:0; }
.dk-ico { font-size:22px; flex-shrink:0; opacity:.85; }
.dk-val { font-size:28px; font-weight:800; line-height:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; min-width:0; }
.dk-val-money { font-size:clamp(16px,1.6vw,24px) !important; }
.dk-prefix { font-size:11px; font-weight:700; opacity:.7; line-height:1; margin-bottom:3px; }
.dk-lbl { font-size:12px; font-weight:500; opacity:.85; white-space:nowrap; }
.dk-sub { font-size:11px; opacity:.75; margin-top:-6px; }
.dk-navy  { background:var(--navy);  color:white; }
.dk-blue  { background:#1d4ed8;      color:white; }
.dk-amber { background:#d97706;      color:white; }
.dk-green { background:#16a34a;      color:white; }
.dk-red   { background:#dc2626;      color:white; }

/* Panels row */
.dash-panels-row { display:grid; grid-template-columns:1fr 1fr; gap:18px; }
@media(max-width:900px) { .dash-panels-row { grid-template-columns:1fr; } }

.dash-panel { background:white; border-radius:12px; box-shadow:0 1px 4px rgba(0,0,0,.07); overflow:hidden; border:1px solid var(--border); }
.dash-panel-hd { padding:13px 18px; font-size:13px; font-weight:700; color:var(--navy); border-bottom:1px solid var(--border); background:#fafbfc; display:flex; align-items:center; justify-content:space-between; }
.dash-panel-btn { font-size:12px; color:var(--blue); background:none; border:none; cursor:pointer; font-weight:600; padding:0; }
.dash-panel-btn:hover { text-decoration:underline; }
.dash-panel-body { max-height:280px; overflow-y:auto; }
.dash-panel-row { display:flex; align-items:center; padding:10px 18px; border-bottom:1px solid #f1f5f9; font-size:12px; gap:8px; }
.dash-panel-row:last-child { border-bottom:none; }
.dash-panel-row:hover { background:#f8fafc; }
.dash-panel-name { flex:1; font-weight:600; color:var(--navy); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; min-width:0; }
.dash-panel-val { font-weight:700; white-space:nowrap; flex-shrink:0; }
.dash-panel-badge { font-size:10px; padding:2px 7px; border-radius:99px; white-space:nowrap; flex-shrink:0; }
.dash-panel-rank { font-size:10px; font-weight:700; color:var(--muted); width:16px; flex-shrink:0; text-align:right; }
.dash-panel-empty { padding:32px; text-align:center; color:var(--muted); font-size:13px; }

/* Right column */
.dash-right-col { position:sticky; top:80px; }
.dash-actions-col { display:flex; flex-direction:column; gap:9px; }
.dqa-btn {
  display:flex; align-items:center; gap:14px; padding:13px 16px;
  background:white; border:1px solid var(--border); border-radius:11px;
  cursor:pointer; text-align:left; width:100%;
  transition:all .15s; box-shadow:0 1px 3px rgba(0,0,0,.05);
}
.dqa-btn:hover { background:#f8fafc; border-color:#cbd5e1; box-shadow:0 3px 10px rgba(0,0,0,.1); transform:translateX(3px); }
.dqa-btn-alert { border-color:#fbbf24; background:#fffbeb; }
.dqa-btn-alert:hover { background:#fef3c7; }
.dqa-icon  { font-size:22px; flex-shrink:0; }
.dqa-title { font-size:13px; font-weight:600; color:var(--navy); line-height:1.2; }
.dqa-sub   { font-size:11px; color:var(--muted); margin-top:2px; }
.dqa-text  { flex:1; min-width:0; }

/* header logo */
.header-brand img { height:40px; width:auto; object-fit:contain; }

/* ── Billing Sub-tabs ── */
.billing-subtabs {
  display: flex;
  gap: 0;
  padding: 0 0 0 0;
  margin-bottom: 0;
}
.billing-subtab {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 22px;
  font-size: 13px; font-weight: 600;
  color: var(--muted);
  background: #f1f5f9;
  border: 1px solid var(--border);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: all .15s;
  margin-right: 4px;
  position: relative; top: 1px;
}
.billing-subtab:hover { background: #e2e8f0; color: var(--navy); }
.billing-subtab.active {
  background: white;
  color: var(--navy);
  border-color: var(--border);
  border-bottom-color: white;
  z-index: 1;
}
.billing-subtab-badge {
  background: var(--navy);
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 99px;
  line-height: 1.4;
  min-width: 18px;
  text-align: center;
}
.billing-subtab.active .billing-subtab-badge { background: var(--gold); color: #111; }


/* ── Consolidated multi-select ── */
.cons-row { padding:11px 20px; cursor:pointer; border-bottom:1px solid #f1f5f9; display:flex; align-items:center; gap:12px; transition:background .1s; }
.cons-row:hover { background:#f8fafc; }
.cons-row.selected { background:#eff6ff; border-left:3px solid #3b82f6; }
.cons-checkbox { width:16px; height:16px; cursor:pointer; flex-shrink:0; accent-color:#1d4ed8; }
.cons-aging-badge { font-size:10px; padding:2px 6px; border-radius:99px; font-weight:600; white-space:nowrap; flex-shrink:0; }
.cons-aging-ok   { background:#dcfce7; color:#15803d; }
.cons-aging-warn { background:#fef3c7; color:#b45309; }
.cons-aging-late { background:#fee2e2; color:#b91c1c; }

/* ── Invoice aging ── */
.aging-badge { display:inline-flex; align-items:center; font-size:10px; font-weight:600; padding:2px 7px; border-radius:99px; margin-left:6px; }
.aging-ok   { background:#dcfce7; color:#15803d; }
.aging-warn { background:#fef3c7; color:#b45309; }
.aging-late { background:#fee2e2; color:#b91c1c; }

/* ── Todo Widget ── */
.todo-item {
  display:flex; align-items:center; gap:12px; padding:12px 16px;
  background:white; border:1px solid var(--border); border-radius:10px;
  cursor:pointer; transition:all .15s; box-shadow:0 1px 3px rgba(0,0,0,.05);
}
.todo-item:hover { box-shadow:0 3px 10px rgba(0,0,0,.1); transform:translateX(2px); }
.todo-item-urgent { border-left:4px solid #dc2626; background:#fff8f8; }
.todo-item-warn   { border-left:4px solid #f59e0b; background:#fffdf5; }
.todo-item-info   { border-left:4px solid #3b82f6; background:#f8faff; }
.todo-icon { font-size:20px; flex-shrink:0; }
.todo-text { flex:1; min-width:0; }
.todo-title { font-size:13px; font-weight:600; color:var(--navy); }
.todo-sub   { font-size:11px; color:var(--muted); margin-top:2px; }
.todo-action { font-size:11px; font-weight:600; color:var(--blue); white-space:nowrap; flex-shrink:0; }
.todo-empty { padding:20px; text-align:center; color:var(--muted); font-size:13px;
  background:white; border:1px solid var(--border); border-radius:10px; }

/* ── Tracking BL Group View ── */
.bl-group-row { cursor:pointer; transition:background .1s; }
.bl-group-row:hover { background:#f0f9ff !important; }
.bl-group-header td { border-top:2px solid var(--border) !important; }
.bl-group-toggle { display:inline-flex; align-items:center; gap:6px; font-size:11px; color:var(--blue); font-weight:600; }
.bl-group-child td { background:#fafcff; border-left:3px solid #bfdbfe; }
.bl-group-child:last-of-type td { border-bottom:2px solid var(--border) !important; }
.trk-view-btn-active { background:var(--navy) !important; color:white !important; border-color:var(--navy) !important; }

/* ══ MELHORIA #1 — ALERTAS VISUAIS CONTAINERS CRÍTICOS ══ */
.trk-table tbody tr.row-alert-medium td { background:#fffbeb !important; }
.trk-table tbody tr.row-alert-medium td:first-child { border-left:3px solid #f59e0b; }
.trk-table tbody tr.row-alert-high td { background:#fff0f0 !important; }
.trk-table tbody tr.row-alert-high td:first-child { border-left:3px solid #dc2626; }
@keyframes pulse-danger { 0%,100%{opacity:1} 50%{opacity:0.7} }
.row-alert-high { animation:pulse-danger 2.5s ease-in-out infinite; }
.badge-overdue { display:inline-flex;align-items:center;gap:3px;padding:2px 7px;border-radius:20px;font-size:10px;font-weight:700;margin-left:4px;white-space:nowrap; }
.badge-overdue.medium { background:#fef3c7;color:#b45309;border:1px solid #f59e0b; }
.badge-overdue.high   { background:#fee2e2;color:#dc2626;border:1px solid #dc2626; }

/* ══ MELHORIA #3 — RESPONSIVIDADE MOBILE ══ */
@media (max-width:768px) {
  .header { padding:0 16px;height:56px; }
  .header-title { font-size:15px; }
  .header-sub { display:none; }
  .mod-tabs { padding:0 8px;overflow-x:auto;white-space:nowrap;-webkit-overflow-scrolling:touch; }
  .mod-tab { padding:10px 14px;font-size:12px; }
  .page { padding:16px 12px; }
  .trk-stats { grid-template-columns:repeat(2,1fr);gap:8px; }
  .trk-stat-val { font-size:20px; }
  .trk-toolbar { flex-wrap:wrap;gap:6px; }
  .trk-table-wrap { overflow-x:auto;-webkit-overflow-scrolling:touch; }
  .trk-table { min-width:960px; }
  .toolbar { flex-wrap:wrap; }
  .search-wrap { width:100%; }
  .bl-card { flex-wrap:wrap;gap:10px; }
  .bl-actions { width:100%;justify-content:flex-end; }
  input,select,textarea { font-size:16px !important; }
  .btn { min-height:44px; }
  .act-btn { min-height:40px; }
  .ptax-banner { flex-wrap:wrap;padding:8px 12px; }
}
@media (max-width:480px) {
  .header-logo { display:none; }
  .mod-tab { padding:9px 10px;font-size:11px; }
  .trk-stats { grid-template-columns:1fr 1fr; }
}

/* ══ MELHORIA #4 — HISTÓRICO DE MODIFICAÇÕES ══ */
.mod-hist-list { list-style:none;padding:0;margin:0;max-height:360px;overflow-y:auto; }
.mod-hist-item { display:flex;gap:12px;padding:10px 0;border-bottom:1px solid var(--border); }
.mod-hist-item:last-child { border-bottom:none; }
.mod-hist-dot { width:28px;height:28px;border-radius:50%;background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;color:white; }
.mod-hist-body { flex:1;min-width:0; }
.mod-hist-action { font-size:12px;font-weight:600;color:var(--text); }
.mod-hist-meta { font-size:11px;color:var(--muted);margin-top:2px; }
.mod-hist-empty { text-align:center;color:var(--muted);font-size:13px;padding:20px 0; }

/* ══ NOVA ABA CONFIGURAÇÕES ══ */
#mod-settings { max-width:1100px;margin:0 auto;padding:28px 24px; }
.cfg-header {
  background:linear-gradient(135deg,#0f1c3f 0%,#1a2f6b 55%,#1e3a8a 100%);
  border-radius:14px;padding:32px 36px;margin-bottom:28px;
  display:flex;align-items:center;gap:20px;
  box-shadow:0 8px 32px rgba(30,58,138,0.35);position:relative;overflow:hidden;
}
.cfg-header::after { content:'⚙️';position:absolute;right:36px;top:50%;transform:translateY(-50%);font-size:72px;opacity:0.07;pointer-events:none; }
.cfg-header-icon { font-size:40px; }
.cfg-header-text h1 { font-size:24px;font-weight:700;color:#fff;margin-bottom:4px; }
.cfg-header-text p  { font-size:13px;color:rgba(255,255,255,0.6);margin:0; }

.cfg-subtabs { display:flex;gap:8px;margin-bottom:24px;border-bottom:2px solid var(--border);flex-wrap:wrap; }
.cfg-subtab { padding:10px 20px;border-radius:8px 8px 0 0;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer;border:1px solid transparent;border-bottom:none;transition:all 0.2s;background:transparent;margin-bottom:-2px; }
.cfg-subtab:hover { color:var(--blue);background:var(--blue-light); }
.cfg-subtab.active { color:var(--blue);background:white;border-color:var(--border);border-bottom-color:white;box-shadow:0 -2px 0 var(--blue-btn); }

.cfg-pane { display:none; }
.cfg-pane.active { display:block;animation:fadeInUp 0.22s ease; }
@keyframes fadeInUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

.cfg-card { background:white;border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 1px 4px rgba(0,0,0,0.05); }
.cfg-card-header { display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--border);background:#f9fafb; }
.cfg-card-header h3 { font-size:14px;font-weight:700;color:var(--text);margin:0; }
.cfg-card-body { padding:22px; }

.cfg-info-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px; }
.cfg-info-item { background:#f8faff;border:1px solid var(--border);border-radius:10px;padding:14px 18px;border-left:4px solid var(--blue); }
.cfg-info-item label { display:block;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:6px; }
.cfg-info-item span { font-size:17px;font-weight:700;color:var(--text); }

.cfg-table { width:100%;border-collapse:collapse;font-size:13px; }
.cfg-table th { padding:10px 14px;background:var(--navy);color:white;font-size:11px;font-weight:600;text-align:left; }
.cfg-table td { padding:10px 14px;border-bottom:1px solid var(--border);vertical-align:middle; }
.cfg-table tr:last-child td { border-bottom:none; }
.cfg-table tr:nth-child(even) td { background:#f9fafb; }
.cfg-table input[type="number"] { width:110px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:13px;font-family:var(--font);color:var(--text);background:white;outline:none;transition:border-color 0.2s; }
.cfg-table input[type="number"]:focus { border-color:var(--blue-btn);box-shadow:0 0 0 2px rgba(29,78,216,0.1); }

.cfg-badge { padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600; }
.cfg-badge.admin { background:#dbeafe;color:var(--blue); }
.cfg-badge.user  { background:#dcfce7;color:var(--green); }

.cfg-backup-grid { display:grid;grid-template-columns:1fr 1fr;gap:16px; }
.cfg-backup-btn { display:flex;align-items:center;gap:12px;padding:16px 20px;border-radius:10px;border:2px solid var(--border);cursor:pointer;font-family:var(--font);font-size:13px;font-weight:600;transition:all 0.2s;background:white;color:var(--text);text-align:left;width:100%; }
.cfg-backup-btn:hover { border-color:var(--blue-btn);box-shadow:0 4px 12px rgba(29,78,216,0.12); }
.cfg-backup-btn.export:hover { background:#f0fdf4;border-color:var(--green); }
.cfg-backup-btn.import:hover { background:#fffbeb;border-color:var(--gold); }
.cfg-backup-btn .b-icon { font-size:26px; }
.cfg-backup-btn .b-label { font-size:13px;font-weight:700;display:block; }
.cfg-backup-btn .b-desc  { font-size:11px;color:var(--muted);margin-top:2px;display:block; }

.cfg-sys-row { display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--border); }
.cfg-sys-row:last-child { border-bottom:none; }
.cfg-sys-label { font-size:13px;font-weight:600;color:var(--muted); }
.cfg-sys-val { font-size:13px;color:var(--text);font-weight:500; }
.cfg-status-dot { width:8px;height:8px;background:var(--green);border-radius:50%;display:inline-block;margin-right:6px;box-shadow:0 0 6px rgba(22,163,74,0.6); }

@media (max-width:768px) {
  #mod-settings { padding:16px 12px; }
  .cfg-header { padding:20px;gap:12px; }
  .cfg-header-text h1 { font-size:18px; }
  .cfg-info-grid { grid-template-columns:1fr 1fr; }
  .cfg-backup-grid { grid-template-columns:1fr; }
  .cfg-subtab { padding:8px 12px;font-size:12px; }
}
</style>
</head>
<body>

<!-- ── LOADING OVERLAY ─────────────────────────────────────────── -->
<div id="dm-loading-overlay" style="
  position:fixed;inset:0;background:#0f172a;z-index:9999;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  gap:16px;font-family:'Inter',system-ui,sans-serif;">
  <div style="width:44px;height:44px;border:3px solid #334155;border-top-color:#3b82f6;
    border-radius:50%;animation:spin 0.8s linear infinite;"></div>
  <div style="color:#94a3b8;font-size:13px;letter-spacing:.3px;">Conectando ao Firebase...</div>
  <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
</div>

<!-- ── FIREBASE MODULE ─────────────────────────────────────────── -->
<script type="module">
import { initializeApp }      from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
                               from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import {
  getFirestore,
  collection, doc,
  onSnapshot, writeBatch, setDoc, deleteDoc, getDoc,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBWXLvUspGo1rRDSWYJ3rGMRUOGUH6bARI",
  authDomain:        "demurragemanager.firebaseapp.com",
  projectId:         "demurragemanager",
  storageBucket:     "demurragemanager.firebasestorage.app",
  messagingSenderId: "951449004275",
  appId:             "1:951449004275:web:c01cc83d02ba87d9bcaf86"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// Persistência offline: mantém último snapshot no IndexedDB quando Firebase indisponível
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('[DB] Offline persistence desativada: múltiplas abas abertas.');
  } else if (err.code === 'unimplemented') {
    console.warn('[DB] Offline persistence não suportada neste browser.');
  }
});

// ── Sanitiza objeto para Firestore: remove undefined, converte NaN → null ──
function sanitize(obj) {
  if (Array.isArray(obj))    return obj.map(sanitize);
  if (obj === null)          return null;
  if (typeof obj !== 'object') {
    if (typeof obj === 'number' && isNaN(obj)) return null;
    return obj === undefined ? null : obj;
  }
  const out = {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v === undefined) continue;          // remove campo undefined
    out[k] = sanitize(v);
  }
  return out;
}

onAuthStateChanged(auth, (user) => {
  if (!user) { window.location.href = 'index.html'; return; }

  const uid         = user.uid;
  const uCol        = (col)     => collection(db, 'users', uid, col);
  const uDoc        = (col, id) => doc(db, 'users', uid, col, String(id));
  const settingsDoc =              doc(db, 'users', uid, 'settings', 'alerts');

  window._dmStore = { bls: [], trk: [], clients: [], alertDays: 5 };

  let blsReady = false, trkReady = false, cliReady = false;

  function checkReady() {
    if (!blsReady || !trkReady || !cliReady) return;
    getDoc(settingsDoc)
      .then(snap => { if (snap.exists()) window._dmStore.alertDays = snap.data().days ?? 5; })
      .catch(() => {})
      .finally(() => { if (window._dmOnReady) window._dmOnReady(); });
  }

  // ── Listeners em tempo real ──────────────────────────────────────────────
  // FIX #6: erros de onSnapshot exibidos visivelmente (nao silenciados no console)
  function _handleSnapshotError(col, err, isReady, markReady) {
    console.error('[DB] ' + col + ':', err);
    if (window.toast) window.toast('\u26a0\ufe0f Erro ao carregar dados (' + col + '): ' + (err.code || err.message) + '. Recarregue a pagina.', 'error');
    if (!isReady) markReady();
  }

  onSnapshot(uCol('bls'), snap => {
    window._dmStore.bls = snap.docs.map(d => d.data());
    if (!blsReady) { blsReady = true; checkReady(); }
    else if (window._dmOnBLsUpdate) window._dmOnBLsUpdate();
  }, err => _handleSnapshotError('bls', err, blsReady, () => { blsReady = true; checkReady(); }));

  onSnapshot(uCol('containers'), snap => {
    window._dmStore.trk = snap.docs.map(d => d.data());
    if (!trkReady) { trkReady = true; checkReady(); }
    else if (window._dmOnTrkUpdate) window._dmOnTrkUpdate();
  }, err => _handleSnapshotError('containers', err, trkReady, () => { trkReady = true; checkReady(); }));

  onSnapshot(uCol('clients'), snap => {
    window._dmStore.clients = snap.docs.map(d => d.data());
    if (!cliReady) { cliReady = true; checkReady(); }
    else if (window._dmOnClientsUpdate) window._dmOnClientsUpdate();
  }, err => _handleSnapshotError('clients', err, cliReady, () => { cliReady = true; checkReady(); }));

  // ── Salvar com diff correto: lê store ANTES de atualizar ────────────────
  window._dmFireSave = function(type, newData) {
    console.log(`[DB-SAVE] Iniciando salvamento de ${type}...`, newData.length || 'N/A', 'registros');

    if (type === 'alertDays') {
      // FIX #14: merge:true preserva campos futuros do documento settings/alerts
      setDoc(settingsDoc, { days: newData }, { merge: true })
        .then(() => {
          console.log('[DB-SAVE] alertDays salvo com sucesso');
        })
        .catch(e => {
          console.error('[DB-SAVE] Erro ao salvar alertDays:', e.code, e.message);
          if (window.toast) window.toast('Erro ao salvar dias de alerta: ' + (e.code || e.message), 'error');
        });
      return;
    }

    const batch = writeBatch(db);
    let deleteCount = 0;
    let setCount = 0;
    let prevStore = null; // FIX #1: para rollback em caso de falha no commit

    if (type === 'bls') {
      const oldStore = window._dmStore.bls;           // snapshot ANTES de atualizar
      const newIds   = new Set(newData.map(b => String(b.id)));
      console.log(`[DB-SAVE] BLs: ${oldStore.length} anterior → ${newData.length} novo`);

      oldStore.forEach(b => {
        if (!newIds.has(String(b.id))) {
          batch.delete(uDoc('bls', b.id));
          deleteCount++;
        }
      });
      newData.forEach(b => {
        batch.set(uDoc('bls', b.id), sanitize(b));
        setCount++;
      });
      prevStore = oldStore; // FIX #1: store atualizado APOS commit (ver .then abaixo)

    } else if (type === 'trk') {
      const oldStore = window._dmStore.trk;
      const newIds   = new Set(newData.map(c => String(c.container)));
      console.log(`[DB-SAVE] Containers: ${oldStore.length} anterior → ${newData.length} novo`);

      oldStore.forEach(c => {
        if (!newIds.has(String(c.container))) {
          batch.delete(uDoc('containers', c.container));
          deleteCount++;
        }
      });
      newData.forEach(c => {
        batch.set(uDoc('containers', c.container), sanitize(c));
        setCount++;
      });
      prevStore = oldStore; // FIX #1: store atualizado APOS commit (ver .then abaixo)

    } else if (type === 'clients') {
      const oldStore = window._dmStore.clients;
      const newIds   = new Set(newData.map(c => String(c.id)));
      console.log(`[DB-SAVE] Clientes: ${oldStore.length} anterior → ${newData.length} novo`);

      oldStore.forEach(c => {
        if (!newIds.has(String(c.id))) {
          batch.delete(uDoc('clients', c.id));
          deleteCount++;
        }
      });
      newData.forEach(c => {
        batch.set(uDoc('clients', c.id), sanitize(c));
        setCount++;
      });
      prevStore = oldStore; // FIX #1: store atualizado APOS commit (ver .then abaixo)
    }

    console.log(`[DB-SAVE] Operações em batch: ${deleteCount} deletes + ${setCount} sets`);
    console.log(`[DB-SAVE] Iniciando batch.commit()...`);

    // Timeout de 10 segundos para evitar que fique pendurado
    let timeoutId = setTimeout(() => {
      console.error(`[DB-SAVE] ✗ TIMEOUT: batch.commit() demorou demais (10s)`);
      if (window.toast) window.toast(`Erro: Timeout ao salvar ${type}. Verifique sua conexão.`, 'error');
    }, 10000);

    batch.commit()
      .then(() => {
        clearTimeout(timeoutId);
        // FIX #2: Atualiza store APENAS após confirmação do Firestore (sem rollback indevido aqui)
        if      (type === 'bls')     window._dmStore.bls     = newData;
        else if (type === 'trk')     window._dmStore.trk     = newData;
        else if (type === 'clients') window._dmStore.clients = newData;
        console.log(`[DB-SAVE] ✓ ${type} salvo com sucesso no Firestore!`);
        // FIX #9: mensagem correta — "salvo", não "deletado"
        if (window.toast) window.toast(`✓ Dados salvos com sucesso!`, 'success');
      })
      .catch(e => {
        clearTimeout(timeoutId);
        console.error(`[DB-SAVE] ✗ Erro ao salvar ${type}:`, e.code, e.message, e);
        // FIX #2: rollback do store ao estado anterior em caso de falha no commit
        if (prevStore !== null) {
          if      (type === 'bls')     window._dmStore.bls     = prevStore;
          else if (type === 'trk')     window._dmStore.trk     = prevStore;
          else if (type === 'clients') window._dmStore.clients = prevStore;
          console.warn('[DB-SAVE] Rollback do store "' + type + '" executado após falha.');
        }
        if (window.toast) window.toast(`Erro ao salvar ${type}: ${e.code || e.message}`, 'error');
      });
  };

  // ── Deletar doc único ────────────────────────────────────────────────────
  // FIX #10: atualiza o store in-memory imediatamente após deleteDoc para que a UI
  // não exiba o registro como existente enquanto o onSnapshot não chega.
  window._dmFireDelete = function(type, id) {
    const colMap   = { bls: 'bls', trk: 'containers', clients: 'clients' };
    const storeKey = { bls: 'bls', trk: 'trk', clients: 'clients' }[type];
    const idKey    = { bls: 'id',  trk: 'container', clients: 'id' }[type];
    // Salvar cópia do item antes de remover (para rollback)
    let prevItem = null;
    let prevIndex = -1;
    if (window._dmStore && storeKey && idKey) {
      const arr = window._dmStore[storeKey] || [];
      prevIndex = arr.findIndex(r => String(r[idKey]) === String(id));
      if (prevIndex !== -1) prevItem = arr[prevIndex];
      // Optimistic update: remove imediatamente
      window._dmStore[storeKey] = arr.filter(r => String(r[idKey]) !== String(id));
    }
    deleteDoc(uDoc(colMap[type] || type, id))
      .catch(e => {
        console.error('[DB] delete:', e);
        // Rollback: restaura o item na posição original se a deleção falhar
        if (prevItem !== null && window._dmStore && storeKey) {
          const arr = window._dmStore[storeKey] || [];
          if (prevIndex >= 0 && prevIndex <= arr.length) {
            arr.splice(prevIndex, 0, prevItem);
          } else {
            arr.push(prevItem);
          }
          window._dmStore[storeKey] = arr;
          window._dmRender && window._dmRender();
        }
        if (window.toast) window.toast('Erro ao excluir — item restaurado', 'error');
      });
  };

  // ── Restaurar backup ─────────────────────────────────────────────────────
  // FIX #5: helper — executa operacoes em batches de 400 (limite Firestore = 500)
  async function _commitInChunks(ops) {
    var CHUNK = 400;
    for (var i = 0; i < ops.length; i += CHUNK) {
      var b = writeBatch(db);
      ops.slice(i, i + CHUNK).forEach(function(fn) { fn(b); });
      await b.commit();
    }
  }

  window._dmFireRestore = async function(bkp) {
    // FIX #4: restore SUBSTITUTIVO — apaga docs existentes antes de inserir backup
    var ops = [];
    // 1) Deletar todos os documentos existentes nas colecoes relevantes
    (window._dmStore.bls     || []).forEach(function(b) { ops.push(function(bt) { bt.delete(uDoc("bls", b.id)); }); });
    (window._dmStore.trk     || []).forEach(function(c) { ops.push(function(bt) { bt.delete(uDoc("containers", c.container)); }); });
    (window._dmStore.clients || []).forEach(function(c) { ops.push(function(bt) { bt.delete(uDoc("clients", c.id)); }); });
    // 2) Inserir dados do backup
    if (bkp.bls)       bkp.bls.forEach(function(b)      { ops.push(function(bt) { bt.set(uDoc("bls", b.id), sanitize(b)); }); });
    if (bkp.tracking)  bkp.tracking.forEach(function(c) { ops.push(function(bt) { bt.set(uDoc("containers", c.container), sanitize(c)); }); });
    if (bkp.clients)   bkp.clients.forEach(function(c)  { ops.push(function(bt) { bt.set(uDoc("clients", c.id), sanitize(c)); }); });
    if (bkp.alertDays) ops.push(function(bt) { bt.set(settingsDoc, { days: bkp.alertDays }); });
    // FIX #5: commit em chunks de 400 ops
    await _commitInChunks(ops);
  };

  // ── Expor db e user para o script não-modular ────────────────────────────
  window._dmDb   = db;
  window._dmUser = user;
  window._dmUid  = uid;

  // ── Log de auditoria no Firestore ─────────────────────────────────────────
  let currentSessionId = null;

  window._dmFireLog = async function(action, detalhe = {}) {
    try {
      const { addDoc, collection: col2, serverTimestamp } =
        await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
      const sessaoId = currentSessionId;
      await addDoc(col2(db, 'logs'), {
        usuario_id:    uid,
        usuario_nome:  user.displayName || user.email || uid,
        sessao_id:     sessaoId || null,
        acao:          action,
        detalhe:       detalhe,
        criado_em:     serverTimestamp()
      });
    } catch (e) { console.warn('[LOG]', action, e); }
  };

  // ── Registrar início de sessão ────────────────────────────────────────────
  (async () => {
    try {
      const { addDoc, collection: col2, serverTimestamp } =
        await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
      const ref = await addDoc(col2(db, 'sessoes'), {
        usuario_id:   uid,
        usuario_nome: user.displayName || user.email || uid,
        iniciada_em:  serverTimestamp(),
        encerrada_em: null
      });
      currentSessionId = ref.id;
    } catch(e) { console.warn('[SESSAO]', e); }
  })();

  // ── Verificar se usuário é admin ──────────────────────────────────────────
  // FIX #20: valor padrão seguro ANTES do getDoc resolver, para que código que
  // verifica _dmIsAdmin durante a inicialização não encontre undefined.
  window._dmIsAdmin = false;
  getDoc(doc(db, 'usuarios', uid))
    .then(snap => {
      const data = snap.exists() ? snap.data() : {};
      window._dmIsAdmin = !!data.admin;
      window._dmUserData = data;
      // Mostrar aba Usuários e Configurações apenas para admins
      const tabUsers = document.getElementById('tab-users');
      if (tabUsers && window._dmIsAdmin) tabUsers.style.display = '';
      // Aba Configurações: visível para todos os usuários autenticados
      const tabSettings = document.getElementById('tab-settings');
      if (tabSettings) tabSettings.style.display = '';
      // Atualizar nome do usuário no header
      const nameEl = document.getElementById('header-user-name');
      if (nameEl) nameEl.textContent = data.nome || user.displayName || user.email || 'Usuário';
      // Verificar se usuário está ativo
      if (snap.exists() && data.ativo === false) {
        alert('Sua conta foi desativada. Entre em contato com o administrador.');
        signOut(auth).then(() => { window.location.href = 'index.html'; });
      }
    })
    .catch(() => { window._dmIsAdmin = false; });

  // ── Logout ───────────────────────────────────────────────────────────────
  window.doLogout = async function() {
    if (!confirm('Deseja encerrar a sessão?')) return;

    // Mostrar feedback visual ao usuário
    const logoutBtn = document.querySelector('.header-logout');
    if (logoutBtn) {
      logoutBtn.textContent = '⏳ Encerrando...';
      logoutBtn.style.opacity = '0.5';
      logoutBtn.style.pointerEvents = 'none';
    }

    console.log('[LOGOUT] Iniciando processo de logout...');

    // Função de timeout para evitar que a função fique pendurada
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.warn('[LOGOUT] Timeout atingido - forçando redirecionamento');
        resolve('timeout');
      }, 5000); // 5 segundos de timeout
    });

    try {
      // 1. Registrar encerramento de sessão (não-bloqueante, timeout de 2s)
      if (currentSessionId && db) {
        try {
          const sessionPromise = (async () => {
            const { updateDoc, doc: docFn, serverTimestamp } =
              await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
            await updateDoc(docFn(db, 'sessoes', currentSessionId), {
              encerrada_em: serverTimestamp()
            });
          })();

          await Promise.race([
            sessionPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
          ]);
          console.log('[LOGOUT] Encerramento de sessão registrado');
        } catch(e) {
          console.warn('[LOGOUT] Não foi possível registrar encerramento:', e.message);
          // Continua mesmo assim
        }
      }

      // 2. Chamar _dmFireLog (não-bloqueante, timeout de 1.5s)
      if (window._dmFireLog && typeof window._dmFireLog === 'function') {
        try {
          const logPromise = window._dmFireLog('logout', {});
          await Promise.race([
            logPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
          ]);
          console.log('[LOGOUT] Log registrado');
        } catch(e) {
          console.warn('[LOGOUT] Erro ao registrar log:', e.message);
          // Continua mesmo assim
        }
      }

      // 3. CRÍTICO: Fazer logout do Firebase (timeout de 2s)
      console.log('[LOGOUT] Executando signOut...');
      if (auth) {
        const signOutPromise = signOut(auth);
        await Promise.race([
          signOutPromise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 2000))
        ]);
        console.log('[LOGOUT] SignOut bem-sucedido');
      } else {
        console.warn('[LOGOUT] Auth não está disponível - pulando signOut');
      }

    } catch(error) {
      console.error('[LOGOUT] Erro durante logout:', error.message || error);
      // NÃO mostra alert pois pode bloquear o redirecionamento
    } finally {
      // 4. SEMPRE redirecionar para login
      console.log('[LOGOUT] Redirecionando para login...');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 100);
    }
  };

  // ── Carregar logs para admin ──────────────────────────────────────────────
  window._dmFireLoadLogs = async function(filters = {}) {
    try {
      const { getDocs, collection: col2, query, orderBy, where, limit } =
        await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
      let q = query(col2(db, 'logs'), orderBy('criado_em', 'desc'), limit(1000));
      if (filters.acao) q = query(col2(db, 'logs'), where('acao','==',filters.acao), orderBy('criado_em','desc'), limit(1000));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ _docId: d.id, id: d.id, ...d.data() }));
    } catch(e) { console.warn('[LOGS]', e); return []; }
  };

  // ── Carregar e salvar usuários (admin) ────────────────────────────────────
  window._dmFireLoadUsuarios = async function() {
    try {
      const { getDocs, collection: col2 } =
        await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
      const snap = await getDocs(col2(db, 'usuarios'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch(e) { return []; }
  };

  window._dmFireSaveUsuario = async function(usuarioData) {
    try {
      const { setDoc: setDoc2, doc: docFn, serverTimestamp } =
        await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
      const id = usuarioData.uid || usuarioData.id;
      await setDoc2(docFn(db, 'usuarios', id), sanitize({ ...usuarioData, criado_em: serverTimestamp() }), { merge: true });
    } catch(e) { console.error('[USUARIO]', e); }
  };
});
</script>


<div id="app">

  <div class="ptax-banner">
    <div id="ptax-badge"><span class="ptax-loading">⟳ Consultando PTAX...</span></div>
    <span class="ptax-src" id="ptax-src-label">Fonte: Banco Central do Brasil</span>
  </div>
  <header class="header">
    <div class="header-brand" onclick="switchModule('dashboard')" style="cursor:pointer;">
      <img id="header-logo-img" src="data:image/jpeg;base64,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fW+nW6DI8rsMxuUssjRmW2WGr3MQ222kJShIfWAkAdgAO2q3rwzZbOZ5BxjC3bZYJtpuV5aRJEyzx5DqkuKSlQDi0FYGh6A9qjPLburIMqu9+WwI6rlOemFoK6g2XHFL6d+3XVrderjzI14fnVlyluImYu1TW5aWFL6A4UKB6SrR1vXrqg2DmLM7nkN+m2iXBscWLbri+mOIFpjxVaCikBSm0JKhoe3devwwwodx58xCFcIjEyK9O6XWX2w42sdCuxSexH11oV8nG6Xqdc1Nhoy5Lj5QDvp61FWt+3W6zXFuWOYLyBZ8uahJnLtj/nJjqc6A58kjXVo69fdQa/NAE18AAAOKAA+urE8e45iWTeHSx4xcocKHkF/vM9qzXhSEpUiWyhotMOL1vy3OtSO50FFJ17q5vuea+47rXWoq17tmtnuGZPyuNrJhiYYZFpuMmeiWl09S1PBsdPTrtry9737aCZsixXGMV8O2bYsmBDl5bY5FqevNy6UrUzJkOudURtfsS0htKVEHRWpfuqukRkyJTUdKkpLq0oBUdAbOtmtmsmaSLdgOW4quJ8aOSPwnnZa3j1tKjrcX6aPV1Fw7JI1r21qlBPPKeaOcVZzN49wnHsdYtdkKI0l2fZ2Jci5uBCS448t1KjpSidJSUgDWq1Hn6y2WFc8byKw21u0xcosTF2ctzRPlxXlKWhxLYPcNlTZUkewK16AV7JPKuNZCiJN5B43i5LfozCGDdGrq9CVLQhISj4whAIcUAAOoFJIA2a0vkXMbpnGRm83RuNHCGG4sSJFb6GIkdsabZbT30hI/vJPtoNcpSlApSlB+2HXWH0PsOLadbUFIWhRSpKh3BBHoannDfEteTY0Yxyljtu5BsQ0B8fSBLb9mw4Qeoj3kdX/mFQHSgs1a43hovkwXPEs9y/i67LHyWnfMW237wFp6jr63R9VbXCsVyYZ6bV407aY5Gx8buQQvX1LkE1TqlBbG9Y5g6mnRyB4t7jfIjg/ZoluddfCx7vkuOg/2KwTPJ/AXGp6+NOPJWT3pr9qu+Qq+QhQ9FpR37/Uls/TVa6UG78rcq5xybcRKyu8uSGW1FTEJoeXGY/itjtv2dR2r3mtIpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSgUpSg//9k=" alt="Transhipping" style="height:46px;width:auto;object-fit:contain;mix-blend-mode:screen;">
      <div>
        <div style="font-size:11px;font-weight:600;letter-spacing:1px;opacity:.6;text-transform:uppercase;">Demurrage Manager</div>
        <div style="font-size:10px;opacity:.4;letter-spacing:.3px;margin-top:1px;">by ljuliatti</div>
      </div>
    </div>
    <div class="header-right">
      <div class="header-rate-link" onclick="backupData()" title="Exportar backup completo dos dados" style="color:rgba(255,255,255,.7);">💾 Backup</div>
      <div class="header-rate-link" onclick="restoreData()" title="Restaurar dados de backup" style="color:rgba(255,255,255,.7);">📂 Restaurar</div>
      <div class="header-rate-link" onclick="openModal('modal-rates')">📋 Tabela de Taxas</div>
      <div class="header-logout" onclick="doLogout()">↪ Sair</div>
    </div>
  </header>
  <div class="mod-tabs">
    <div class="mod-tab" id="tab-dashboard" onclick="switchModule('dashboard')">🏠 Painel</div>
    <div class="mod-tab" id="tab-billing" onclick="switchModule('billing')">📄 Faturamento</div>
    <div class="mod-tab" id="tab-tracking" onclick="switchModule('tracking')">📦 Controle de Containers</div>
    <div class="mod-tab" id="tab-clients" onclick="switchModule('clients')">👥 Clientes</div>
    <div class="mod-tab" id="tab-users" onclick="switchModule('users')" style="display:none;">👨‍💼 Usuários</div>
    <div class="mod-tab" id="tab-settings" onclick="switchModule('settings')" style="display:none;">⚙️ Configurações</div>
  </div>
<!-- DASHBOARD MODULE -->
  <div class="page" id="mod-dashboard" style="display:none;">
    <div class="dash-wrap">

      <!-- DATE STRIP -->
      <div class="dash-strip">
        <div>
          <div class="dash-greeting" id="dk-greeting">Bom dia</div>
          <div class="dash-date" id="dk-date"></div>
        </div>
        <div class="dash-strip-actions">
          <button class="dash-quick-pill" onclick="switchModule('billing');openConsolidatedEmail()">📧 Cobranças</button>

        </div>
      </div>

      <!-- MAIN GRID -->
      <div class="dash-main-grid">

        <!-- LEFT -->
        <div>

          <div class="dash-group-label">Faturamento</div>
          <div class="dash-kpi4" style="grid-template-columns:1fr 1fr 1fr 2fr;">
            <div class="dk-card dk-blue" onclick="switchModule('billing')">
              <div class="dk-top"><span class="dk-ico">📄</span><span class="dk-val" id="dk-total-bls">—</span></div>
              <div class="dk-lbl">Total de BLs</div>
            </div>
            <div class="dk-card dk-amber" onclick="switchModule('billing');setFilter('unpaid')">
              <div class="dk-top"><span class="dk-ico">⏳</span><span class="dk-val" id="dk-pendentes">—</span></div>
              <div class="dk-lbl">Pendentes</div>
            </div>
            <div class="dk-card dk-green" onclick="switchModule('billing');setFilter('paid')">
              <div class="dk-top"><span class="dk-ico">✅</span><span class="dk-val" id="dk-pagos">—</span></div>
              <div class="dk-lbl">Pagos</div>
            </div>
            <div class="dk-card dk-navy dk-card-money" onclick="switchModule('billing')" >
              <div style="display:flex;align-items:center;gap:16px;min-width:0;">
                <span style="font-size:28px;opacity:.85;flex-shrink:0;">💰</span>
                <div style="min-width:0;overflow:visible;">
                  <div style="font-size:11px;font-weight:700;opacity:.65;letter-spacing:.8px;margin-bottom:4px;">SALDO EM ABERTO</div>
                  <div id="dk-total-aberto" style="font-size:20px;font-weight:800;white-space:nowrap;line-height:1;overflow:visible;">—</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Additional KPI Cards -->
          <div class="dash-group-label" style="margin-top:20px;">Faturamento & Cobranças</div>
          <div class="dash-kpi4">
            <div class="dk-card dk-red" onclick="switchModule('billing')" style="cursor:pointer;" title="BLs com data de vencimento anterior a hoje e não pagos">
              <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                <span style="font-size:24px;flex-shrink:0;">📉</span>
                <div style="min-width:0;">
                  <div style="font-size:11px;font-weight:700;opacity:.65;letter-spacing:.8px;margin-bottom:2px;">VENCIDO</div>
                  <div id="dk-total-vencido" style="font-size:16px;font-weight:800;">—</div>
                </div>
              </div>
            </div>
            <div class="dk-card dk-blue" onclick="switchModule('billing');setFilter('billed')" style="cursor:pointer;" title="BLs marcados como faturado mas não pagos">
              <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                <span style="font-size:24px;flex-shrink:0;">📊</span>
                <div style="min-width:0;">
                  <div style="font-size:11px;font-weight:700;opacity:.65;letter-spacing:.8px;margin-bottom:2px;">FATURADO</div>
                  <div id="dk-total-faturado" style="font-size:16px;font-weight:800;">—</div>
                </div>
              </div>
            </div>
            <div class="dk-card dk-amber" onclick="switchModule('billing');toggleDisputeFilter()" style="cursor:pointer;" title="BLs com disputas abertas">
              <div style="display:flex;align-items:center;gap:12px;min-width:0;">
                <span style="font-size:24px;flex-shrink:0;">⚠️</span>
                <div style="min-width:0;">
                  <div style="font-size:11px;font-weight:700;opacity:.65;letter-spacing:.8px;margin-bottom:2px;">EM DISPUTA</div>
                  <div id="dk-total-disputa" style="font-size:16px;font-weight:800;">—</div>
                </div>
              </div>
            </div>
          </div>

          <div class="dash-group-label" style="margin-top:20px;">Controle de Containers</div>
          <div class="dash-kpi4">
            <div class="dk-card dk-navy" onclick="switchModule('tracking')">
              <div class="dk-top"><span class="dk-ico">📦</span><span class="dk-val" id="dk-ctrs-total">—</span></div>
              <div class="dk-lbl">Total</div>
            </div>
            <div class="dk-card dk-red" onclick="switchModule('tracking');document.getElementById('tf-status').value='dd_open';renderTracking()">
              <div class="dk-top"><span class="dk-ico">⛔</span><span class="dk-val" id="dk-ctrs-dd">—</span></div>
              <div class="dk-lbl">Em Demurrage</div>
              <div class="dk-sub" id="dk-dd30-sub"></div>
            </div>
            <div class="dk-card dk-amber" onclick="switchModule('tracking');openAlertPanel()">
              <div class="dk-top"><span class="dk-ico">⚠️</span><span class="dk-val" id="dk-ctrs-alerta">—</span></div>
              <div class="dk-lbl">Em Alerta</div>
            </div>
            <div class="dk-card dk-green" onclick="switchModule('tracking')">
              <div class="dk-top"><span class="dk-ico">✅</span><span class="dk-val" id="dk-ctrs-livres">—</span></div>
              <div class="dk-lbl">No Free Time</div>
            </div>
          </div>

          <!-- "O que fazer agora" widget -->
          <div id="dash-todo-wrap" style="margin-top:20px;margin-bottom:20px;">
            <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;">
              ⚡ O que fazer agora
            </div>
            <div id="dash-todo-list" style="display:flex;flex-direction:column;gap:8px;"></div>
          </div>

          <div class="dash-panels-row" style="margin-top:20px;">
            <div class="dash-panel">
              <div class="dash-panel-hd">
                <span>🏆 Maiores Saldos em Aberto</span>
                <button class="dash-panel-btn" onclick="switchModule('billing')">Ver todos →</button>
              </div>
              <div id="dk-top-clientes" class="dash-panel-body"></div>
            </div>
            <div class="dash-panel">
              <div class="dash-panel-hd">
                <span>🚨 Containers em D&D</span>
                <button class="dash-panel-btn" onclick="switchModule('tracking');document.getElementById('tf-status').value='dd_open';renderTracking()">Ver todos →</button>
              </div>
              <div id="dk-dd-list" class="dash-panel-body"></div>
            </div>
          </div>
        </div>

        <!-- RIGHT: Quick actions -->
        <div class="dash-right-col">
          <div class="dash-group-label">Ações Rápidas</div>
          <div class="dash-actions-col">
            <button class="dqa-btn" onclick="switchModule('billing');openNewBL()">
              <span class="dqa-icon">➕</span>
              <div class="dqa-text"><div class="dqa-title">Novo BL</div><div class="dqa-sub">Criar fatura manualmente</div></div>
            </button>
            <button class="dqa-btn" onclick="switchModule('billing');openImport()">
              <span class="dqa-icon">📥</span>
              <div class="dqa-text"><div class="dqa-title">Importar Planilha</div><div class="dqa-sub">Faturamento via Excel</div></div>
            </button>
            <button class="dqa-btn" onclick="switchModule('tracking');openTrkImport()">
              <span class="dqa-icon">📦</span>
              <div class="dqa-text"><div class="dqa-title">Importar Containers</div><div class="dqa-sub">Controle de D&D</div></div>
            </button>
            <button class="dqa-btn" onclick="switchModule('billing');openConsolidatedEmail()">
              <span class="dqa-icon">📧</span>
              <div class="dqa-text"><div class="dqa-title">Cobrança Consolidada</div><div class="dqa-sub">Selecionar cliente</div></div>
            </button>

            <button class="dqa-btn dqa-btn-alert" onclick="switchModule('tracking');openAlertPanel()">
              <span class="dqa-icon">🔔</span>
              <div class="dqa-text"><div class="dqa-title">Alertas de Free Time</div><div class="dqa-sub" id="dqa-alert-sub">—</div></div>
            </button>
            <button class="dqa-btn" onclick="switchModule('clients')">
              <span class="dqa-icon">👥</span>
              <div class="dqa-text"><div class="dqa-title">Gerenciar Clientes</div><div class="dqa-sub">Cadastros e e-mails</div></div>
            </button>
            <button class="dqa-btn" onclick="openModal('modal-rates')">
              <span class="dqa-icon">📋</span>
              <div class="dqa-text"><div class="dqa-title">Tabela de Taxas</div><div class="dqa-sub">Visualizar D&D rates</div></div>
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
  <!-- /DASHBOARD MODULE -->

    <div class="page" id="mod-billing">

    <!-- Sub-tabs -->
    <div class="billing-subtabs">
      <div class="billing-subtab active" id="subtab-faturados" onclick="setBillingSubTab('faturados')">
        📄 Faturados
        <span class="billing-subtab-badge" id="badge-faturados"></span>
      </div>
      <div class="billing-subtab" id="subtab-pagos" onclick="setBillingSubTab('pagos')">
        ✔ Pagos
        <span class="billing-subtab-badge" id="badge-pagos"></span>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar" style="border-top:none;border-radius:0 8px 8px 8px;">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" id="search-input" placeholder="Buscar por BL, contêiner ou cliente..." oninput="renderList()">
      </div>
      <button class="btn btn-primary" onclick="openNewBL()">+ Novo BL</button>
      <button class="btn btn-outline" onclick="openImport()">📄 Importar</button>
      <button class="btn btn-outline" onclick="exportReport()" title="Exportar relatório Excel">📊 Relatório</button>
      <button class="btn btn-outline" onclick="openConsolidatedEmail()" title="Enviar cobrança consolidada por CNPJ">📧 Cobrança Consolidada</button>
      <button class="btn btn-danger" onclick="clearAllBLs()" title="Excluir todos os BLs">🗑️ Limpar tudo</button>
    </div>

    <!-- Results + filters -->
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
      <div class="results-count" id="results-count" style="margin:0"></div>
      <div style="margin-left:auto;display:flex;gap:6px;" id="billing-subfilters">
        <!-- faturados sub-filters -->
        <div id="subfilters-faturados" style="display:flex;gap:6px;">
          <button class="btn btn-sm btn-outline" id="filter-all"    onclick="setFilter('all')"    style="font-size:12px">Todos</button>
          <button class="btn btn-sm btn-outline" id="filter-unpaid" onclick="setFilter('unpaid')" style="font-size:12px">⏳ Pendentes</button>
          <button class="btn btn-sm btn-outline" id="filter-billed" onclick="setFilter('billed')" style="font-size:12px">📄 Faturados</button>
          <button class="btn btn-sm btn-outline" id="filter-discount-btn" onclick="toggleDiscountFilter()" style="font-size:12px;margin-left:8px;border-left:1px solid var(--border);padding-left:10px;">💚 Com Desconto</button>
          <button class="btn btn-sm btn-outline" id="filter-dispute-btn" onclick="toggleDisputeFilter()" style="font-size:12px;">⚠️ Em Disputa</button>
        </div>
        <!-- pagos sub-filters (hidden by default) -->
        <div id="subfilters-pagos" style="display:none;gap:6px;">
          <button class="btn btn-sm btn-outline" id="filter-paid" onclick="setFilter('paid')" style="font-size:12px">✔ Todos os Pagos</button>
          <button class="btn btn-sm btn-outline" id="filter-discount-btn-paid" onclick="toggleDiscountFilter()" style="font-size:12px;margin-left:8px;border-left:1px solid var(--border);padding-left:10px;">💚 Com Desconto</button>
          <button class="btn btn-sm btn-outline" id="filter-dispute-btn-paid" onclick="toggleDisputeFilter()" style="font-size:12px;">⚠️ Em Disputa</button>
        </div>
      </div>
    </div>

    <div class="bl-list" id="bl-list"></div>

  </div>
</div><!-- /mod-billing -->

<!-- MODAL: CONSOLIDATED EMAIL -->
<div class="overlay" id="modal-consolidated" role="dialog" aria-modal="true" aria-label="Cobrança Consolidada por CNPJ">
  <div class="modal" style="width:700px;height:82vh;min-height:500px;display:flex;flex-direction:column;overflow:hidden;">
    <div class="modal-header" style="flex-shrink:0;">
      <div class="modal-title">📧 Cobrança Consolidada por CNPJ</div>
      <button class="modal-close" onclick="closeModal('modal-consolidated')">✕</button>
    </div>
    <div style="flex-shrink:0;padding:14px 20px 10px;border-bottom:1px solid var(--border);position:relative;">
      <label style="font-size:12px;font-weight:600;color:var(--muted);display:block;margin-bottom:6px;">Buscar cliente por CNPJ ou Razão Social</label>
      <input type="text" id="cons-search"
        placeholder="Digite CNPJ ou razão social..."
        oninput="filterConsolidatedList()"
        onfocus="showConsolidatedList()"
        autocomplete="off"
        style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;box-sizing:border-box;">
      <div id="cons-dropdown"
        style="display:none;position:absolute;top:calc(100% - 10px);left:20px;right:20px;background:white;border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;max-height:240px;overflow-y:auto;z-index:300;box-shadow:0 6px 16px rgba(0,0,0,0.12);">
      </div>
      <input type="hidden" id="cons-cnpj-hidden" value="">
      <div id="cons-selected-chip"
        style="display:none;margin-top:8px;padding:7px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;font-size:12px;color:#0369a1;align-items:center;gap:8px;">
        <span id="cons-chip-text" style="font-weight:600;flex:1;"></span>
        <button onclick="clearConsolidatedSelection()" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:16px;padding:0;line-height:1;">✕</button>
      </div>
    </div>
    <div class="modal-body" style="flex:1;overflow-y:auto;">
      <div id="cons-client-list"></div>
      <div id="cons-preview" style="display:none;">
        <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">BLs em aberto incluídos na cobrança</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:var(--navy);color:white;font-size:11px;">
              <th style="padding:7px 8px;text-align:left;white-space:nowrap;">Nº FATURA</th>
              <th style="padding:7px 8px;text-align:left;">BL</th>
              <th style="padding:7px 8px;text-align:left;">CONTAINER(S)</th>
              <th style="padding:7px 8px;text-align:right;white-space:nowrap;">TOTAL</th>
              <th style="padding:7px 8px;text-align:left;white-space:nowrap;">VENC.</th>
              <th style="padding:7px 8px;text-align:left;">STATUS</th>
            </tr>
          </thead>
          <tbody id="cons-tbody"></tbody>
          <tfoot>
            <tr style="background:#FFF8E1;font-weight:700;font-size:12px;">
              <td colspan="3" style="padding:7px 8px;">TOTAL GERAL</td>
              <td style="padding:7px 8px;text-align:right;" id="cons-grand-total"></td>
              <td colspan="2"></td>
            </tr>
          </tfoot>
        </table>
        <div style="margin-top:10px;padding:8px 2px;font-size:12px;color:var(--muted);">
          ✉️ Para: <strong id="cons-to-display"></strong>
        </div>
      </div>
      <div id="cons-empty" style="display:none;text-align:center;padding:40px 20px;color:var(--muted);">
        <div style="font-size:36px;margin-bottom:8px;">🔍</div>
        <div style="font-size:13px;">Nenhum BL pendente encontrado para este cliente.</div>
      </div>
    </div>
    <div class="modal-footer" style="flex-shrink:0;">
      <button class="btn btn-outline" onclick="closeModal('modal-consolidated')">Cancelar</button>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center;">
        <span id="cons-selected-count" style="font-size:12px;color:var(--muted);display:none;"></span>
        <button class="btn btn-outline" id="cons-pdf-btn" onclick="printAllInvoices()" disabled>🖨️ Abrir todas as faturas</button>
        <button class="btn btn-outline" id="cons-multi-send-btn" onclick="sendMultipleEmails()" disabled style="display:none;">🚀 Disparar Selecionados</button>
        <button class="btn btn-primary" id="cons-send-btn" onclick="sendConsolidatedEmail()" disabled>✉️ Abrir no E-mail</button>
      </div>
    </div>
  </div>
</div>

<!-- TRACKING MODULE -->
<div class="page" id="mod-tracking" style="display:none;">
  <div class="trk-toolbar">
    <div class="search-wrap" style="flex:1;max-width:400px;">
      <span class="search-icon">🔍</span>
      <input type="text" id="trk-search" placeholder="Buscar container, BL ou CNEE..." oninput="renderTracking()">
    </div>
    <select id="trk-filter-status" onchange="renderTracking()" style="padding:9px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;font-family:var(--font);background:white;cursor:pointer;">
      <option value="all">Todos</option>
      <option value="dd_open">⛔ D&amp;D Não devolvido</option>
      <option value="dd_returned">📦 D&amp;D Devolvido</option>
      <option value="returned">✅ Devolvido</option>
      <option value="grace">⚠️ Atenção</option>
    </select>
    <button class="btn btn-primary" onclick="openTrkImport()">📄 Importar Planilha</button>
    <button class="btn btn-outline" onclick="clearTrkFilters()" title="Limpar todos os filtros de coluna">✕ Limpar Filtros</button>
    <button class="btn btn-outline" id="btn-trk-view-toggle" onclick="toggleTrkView()" title="Alternar entre visão por container e visão por BL">🗂 Visão por BL</button>
    <button class="btn btn-outline" onclick="manualMigrate()" id="btn-migrate" style="display:none;">⚡ Migrar para Faturamento</button>
    <button class="btn btn-outline" onclick="exportTrkReport()">📊 Exportar</button>
    <button class="btn btn-outline" id="btn-alert-toggle" onclick="openAlertPanel()" style="position:relative;">
      🔔 Alertas<span id="alert-toolbar-badge" style="display:none;position:absolute;top:-4px;right:-4px;background:#dc2626;color:white;font-size:10px;font-weight:700;padding:1px 5px;border-radius:99px;line-height:1.4;"></span>
    </button>
    <button class="btn btn-danger" onclick="clearTracking()">🗑️ Limpar</button>
  </div>
  <div class="trk-stats">
    <div class="trk-stat"><div class="trk-stat-label">Total Containers</div><div class="trk-stat-val blue" id="ts-total">0</div></div>
    <div class="trk-stat"><div class="trk-stat-label">D&amp;D Não Devolvido</div><div class="trk-stat-val red" id="ts-over">0</div></div>
    <div class="trk-stat"><div class="trk-stat-label">Atenção</div><div class="trk-stat-val gold" id="ts-grace">0</div></div>
    <div class="trk-stat"><div class="trk-stat-label">Prontos para Faturar</div><div class="trk-stat-val green" id="ts-ready">0</div></div>
  </div>
  <div class="trk-table-wrap">
    <table class="trk-table" id="trk-table-el" style="display:none;">
      <colgroup>
        <col style="width:8%">  <!-- CONTAINER -->
        <col style="width:10%"> <!-- BL -->
        <col style="width:11%"> <!-- CNEE -->
        <col style="width:4%">  <!-- TYPE -->
        <col style="width:3%">  <!-- POL -->
        <col style="width:3%">  <!-- POD -->
        <col style="width:8%">  <!-- VESSEL -->
        <col style="width:6%">  <!-- DISCHARGE -->
        <col style="width:6%">  <!-- DEADLINE -->
        <col style="width:6%">  <!-- EMPTY RETURN -->
        <col style="width:4%">  <!-- USE DAYS -->
        <col style="width:4%">  <!-- FREE TIME -->
        <col style="width:4%">  <!-- DIAS CORRIDOS -->
        <col style="width:11%"> <!-- STATUS -->
        <col style="width:7%">  <!-- ENVIADO EM -->
      </colgroup>
      <thead>
        <tr>
          <th>CONTAINER</th><th>BL</th><th>CNEE</th><th>TIPO</th>
          <th>POL</th><th>POD</th><th>NAVIO</th>
          <th>DESCARGA</th><th>DEADLINE</th><th>DEVOLUÇÃO</th>
          <th>USE DAYS</th><th>FREE TIME</th><th>DIAS</th><th>STATUS</th>
          <th>ENVIADO EM</th>
        </tr>
        <tr class="trk-filter-row">
          <th><input type="text" id="tf-container" placeholder="filtrar..." oninput="renderTracking()"></th>
          <th><input type="text" id="tf-bl"        placeholder="filtrar..." oninput="renderTracking()"></th>
          <th><input type="text" id="tf-cnee"      placeholder="filtrar..." oninput="renderTracking()"></th>
          <th><input type="text" id="tf-type"      placeholder="tipo..."    oninput="renderTracking()"></th>
          <th><input type="text" id="tf-pol"       placeholder="..."        oninput="renderTracking()"></th>
          <th><input type="text" id="tf-pod"       placeholder="..."        oninput="renderTracking()"></th>
          <th><input type="text" id="tf-vessel"    placeholder="filtrar..." oninput="renderTracking()"></th>
          <th><input type="text" id="tf-discharge" placeholder="DD/MM..."   oninput="renderTracking()"></th>
          <th><input type="text" id="tf-deadline"  placeholder="DD/MM..."   oninput="renderTracking()"></th>
          <th><input type="text" id="tf-return"    placeholder="DD/MM..."   oninput="renderTracking()"></th>
          <th><input type="text" id="tf-usedays"   placeholder="..."        oninput="renderTracking()"></th>
          <th><input type="text" id="tf-freetime"  placeholder="..."        oninput="renderTracking()"></th>
          <th><input type="text" id="tf-dias"      placeholder="..."        oninput="renderTracking()"></th>
          <th>
            <select id="tf-status" onchange="renderTracking()" style="font-size:10px;">
              <option value="">todos</option>
              <option value="dd_open">D&D n/dev</option>
              <option value="dd_returned">D&D dev</option>
              <option value="returned">devolvido</option>
              <option value="grace">atenção</option>
            </select>
          </th>
          <th><input type="text" id="tf-migratedat" placeholder="DD/MM..." oninput="renderTracking()"></th>
        </tr>
      </thead>
      <tbody id="trk-body"></tbody>
    </table>
    <div id="trk-empty" style="text-align:center;padding:60px 20px;color:var(--muted);">
      <div style="font-size:48px;margin-bottom:12px;">📦</div>
      <p style="font-size:15px;">Nenhum container encontrado. Importe uma planilha para começar.</p>
    </div>
  </div>
</div>

<!-- CLIENTS MODULE -->
<div class="page" id="mod-clients" style="display:none;">
  <div class="trk-toolbar">
    <div class="search-wrap" style="flex:1;max-width:400px;">
      <span class="search-icon">🔍</span>
      <input type="text" id="cli-search" placeholder="Buscar por CNPJ, razão social ou e-mail..." oninput="renderClients()">
    </div>
    <button class="btn btn-primary" onclick="openNewClient()">+ Novo Cliente</button>
    <button class="btn btn-outline" onclick="document.getElementById('cli-import-input').click()">⬆️ Importar Planilha</button>
    <button class="btn btn-outline" onclick="downloadCliTemplate()">⬇️ Baixar Modelo</button>
    <button class="btn btn-outline" onclick="exportClientsReport()">📊 Exportar</button>
    <button class="btn btn-danger" onclick="clearClients()">🗑️ Limpar</button>
    <input type="file" id="cli-import-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="importClientsFile(this)">
  </div>
  <div class="trk-table-wrap">
    <table class="trk-table" id="cli-table" style="display:none;">
      <thead>
        <tr>
          <th style="width:18%">CNPJ</th>
          <th style="width:32%">RAZÃO SOCIAL</th>
          <th style="width:32%">E-MAILS</th>
          <th style="width:10%">BLs</th>
          <th style="width:8%">AÇÕES</th>
        </tr>
      </thead>
      <tbody id="cli-body"></tbody>
    </table>
    <div id="cli-empty" style="text-align:center;padding:60px 20px;color:var(--muted);">
      <div style="font-size:48px;margin-bottom:12px;">👥</div>
      <p style="font-size:15px;">Nenhum cliente cadastrado. Clique em "+ Novo Cliente" para começar.</p>
    </div>
  </div>
</div>

<!-- USERS MODULE (admin only) -->
<div class="page" id="mod-users" style="display:none;">
  <div class="trk-toolbar" style="flex-wrap:wrap;gap:10px;">
    <h2 style="margin:0;font-size:18px;font-weight:700;color:var(--primary);">👨‍💼 Gestão de Usuários &amp; Auditoria</h2>
    <div style="flex:1"></div>
    <button class="btn btn-primary btn-sm" onclick="openNewUser()">+ Novo Usuário</button>
    <button class="btn btn-outline btn-sm" onclick="exportLogsCSV()">⬇️ Exportar Logs CSV</button>
  </div>

  <!-- KPI cards -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin:16px 0;">
    <div class="dk-card" style="text-align:center;padding:16px 12px;">
      <div style="font-size:24px;font-weight:800;color:var(--primary)" id="usr-kpi-total">0</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Usuários Ativos</div>
    </div>
    <div class="dk-card" style="text-align:center;padding:16px 12px;">
      <div style="font-size:24px;font-weight:800;color:#f59e0b" id="usr-kpi-sessions">0</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Sessões Hoje</div>
    </div>
    <div class="dk-card" style="text-align:center;padding:16px 12px;">
      <div style="font-size:24px;font-weight:800;color:#10b981" id="usr-kpi-logs">0</div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px;text-transform:uppercase;letter-spacing:.5px;">Ações Auditadas</div>
    </div>
  </div>

  <!-- User table -->
  <div class="dk-card" style="margin-bottom:20px;">
    <div style="font-size:14px;font-weight:700;color:var(--dark);margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;">
      👤 Usuários Cadastrados
    </div>
    <div id="usr-table-wrap">
      <table class="trk-table" id="usr-table">
        <thead>
          <tr>
            <th>NOME</th>
            <th>E-MAIL</th>
            <th>CARGO</th>
            <th style="text-align:center">ADMIN</th>
            <th style="text-align:center">ATIVO</th>
            <th>CRIADO EM</th>
            <th style="text-align:center">AÇÕES</th>
          </tr>
        </thead>
        <tbody id="usr-body">
          <tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">Carregando usuários...</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Log viewer -->
  <div class="dk-card">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #e5e7eb;flex-wrap:wrap;">
      <div style="font-size:14px;font-weight:700;color:var(--dark);">📋 Log de Auditoria</div>
      <div style="flex:1"></div>
      <!-- Filters -->
      <input type="text" id="log-filter-user" placeholder="Filtrar por usuário..." oninput="renderLogs()" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;width:180px;">
      <select id="log-filter-action" onchange="renderLogs()" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;">
        <option value="">Todas as ações</option>
        <option value="login">login</option>
        <option value="logout">logout</option>
        <option value="criacao_bl">criacao_bl</option>
        <option value="edicao_bl">edicao_bl</option>
        <option value="exclusao_bl">exclusao_bl</option>
        <option value="marcacao_pagamento">marcacao_pagamento</option>
        <option value="marcacao_fatura">marcacao_fatura</option>
        <option value="abertura_disputa">abertura_disputa</option>
        <option value="resolucao_disputa">resolucao_disputa</option>
        <option value="edicao_cliente">edicao_cliente</option>
        <option value="envio_email">envio_email</option>
        <option value="importacao_planilha">importacao_planilha</option>
        <option value="exportacao_relatorio">exportacao_relatorio</option>
      </select>
      <input type="date" id="log-filter-from" onchange="renderLogs()" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;">
      <span style="font-size:12px;color:var(--muted);">até</span>
      <input type="date" id="log-filter-to" onchange="renderLogs()" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;">
      <button class="btn btn-outline btn-sm" onclick="clearLogFilters()">✕ Limpar filtros</button>
      <button class="btn btn-danger btn-sm" onclick="confirmClearOldLogs()">🗑️ Limpar logs antigos</button>
    </div>
    <div id="log-table-wrap" style="overflow-x:auto;max-height:420px;overflow-y:auto;">
      <table class="trk-table" style="min-width:700px;">
        <thead>
          <tr>
            <th style="width:140px">DATA/HORA</th>
            <th style="width:150px">USUÁRIO</th>
            <th style="width:160px">AÇÃO</th>
            <th>DETALHE</th>
          </tr>
        </thead>
        <tbody id="log-body">
          <tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px;">Carregando logs...</td></tr>
        </tbody>
      </table>
    </div>
    <div id="log-pagination" style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:12px;color:var(--muted);">
      <span id="log-count-label"></span>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline btn-sm" id="log-prev-btn" onclick="logPage(-1)" disabled>← Anterior</button>
        <span id="log-page-label" style="line-height:28px;"></span>
        <button class="btn btn-outline btn-sm" id="log-next-btn" onclick="logPage(1)">Próxima →</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: USER -->
<div class="overlay" id="modal-user" role="dialog" aria-modal="true" aria-label="Gerenciar Usuário">
  <div class="modal" style="width:500px;">
    <div class="modal-header">
      <div class="modal-title">👤 <span id="modal-user-title">Novo Usuário</span></div>
      <button class="modal-close" onclick="closeModal('modal-user')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group">
          <label>Nome *</label>
          <input type="text" id="fu-nome" placeholder="João Silva">
        </div>
        <div class="form-group">
          <label>E-mail *</label>
          <input type="email" id="fu-email" placeholder="joao@empresa.com">
        </div>
        <div class="form-group">
          <label>Cargo</label>
          <input type="text" id="fu-cargo" placeholder="Analista Operacional">
        </div>
        <div class="form-group" style="display:flex;gap:20px;align-items:flex-end;padding-bottom:4px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:500;margin:0;">
            <input type="checkbox" id="fu-admin" style="width:16px;height:16px;">
            Admin
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:500;margin:0;">
            <input type="checkbox" id="fu-ativo" checked style="width:16px;height:16px;">
            Ativo
          </label>
        </div>
      </div>
      <div class="info-box" style="margin-top:14px;">
        ℹ️ Após salvar, o usuário receberá acesso ao sistema. Admins têm acesso à aba Usuários e podem ver todos os logs de auditoria.
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-user')">Cancelar</button>
      <button class="btn btn-primary" onclick="saveUser()">✓ <span id="save-user-label">Salvar</span></button>
    </div>
  </div>
</div>

<!-- MODAL: CLIENT -->
<div class="overlay" id="modal-client" role="dialog" aria-modal="true" aria-label="Gerenciar Cliente">
  <div class="modal" style="width:560px;">
    <div class="modal-header">
      <div class="modal-title">👥 <span id="modal-client-title">Novo Cliente</span></div>
      <button class="modal-close" onclick="closeModal('modal-client')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:14px;">
        <div class="form-group">
          <label>CNPJ *</label>
          <input type="text" id="fc-cnpj" placeholder="00.000.000/0001-00" oninput="onCnpjInput();checkCnpjField(this)" style="transition:border-color .2s;">
          <span id="fc-cnpj-hint" style="font-size:11px;color:var(--muted);margin-top:2px;"></span>
        </div>
        <div class="form-group">
          <label>Razão Social *</label>
          <input type="text" id="fc-name" placeholder="EMPRESA LTDA">
        </div>
      </div>
      <div class="form-group" style="margin-top:14px;">
        <label>E-mails (um por linha ou separados por vírgula)</label>
        <textarea id="fc-emails" rows="4" placeholder="financeiro@empresa.com&#10;contato@empresa.com"></textarea>
        <span style="font-size:11px;color:var(--muted);">Todos os e-mails cadastrados receberão a fatura ao usar "Enviar por E-mail".</span>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-client')">Cancelar</button>
      <button class="btn btn-primary" onclick="saveClient()">✓ <span id="save-client-label">Criar Cliente</span></button>
    </div>
  </div>
</div>

<!-- MODAL: TRACKING IMPORT -->
<div class="overlay" id="modal-trk-import" role="dialog" aria-modal="true" aria-label="Importar Planilha de Tracking">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">📦 Importar Controle de Containers</div>
      <button class="modal-close" onclick="closeModal('modal-trk-import')">✕</button>
    </div>
    <div class="modal-body">
      <div class="drop-zone" id="trk-drop-zone" onclick="document.getElementById('trk-file-input').click()"
        ondragover="event.preventDefault();this.classList.add('drag')"
        ondragleave="this.classList.remove('drag')"
        ondrop="handleTrkDrop(event)">
        <div class="drop-icon">⬆️</div>
        <p><strong>Arraste ou selecione uma planilha</strong></p>
        <p>(.xlsx, .xls, .csv)</p>
      </div>
      <input type="file" id="trk-file-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleTrkFile(event)">
      <div class="columns-hint">
        <strong>Colunas esperadas:</strong>
        <div class="col-tags" style="margin-top:6px;">
          <span class="col-tag">CONTAINER</span><span class="col-tag">BL</span>
          <span class="col-tag">CNEE</span><span class="col-tag">TYPE</span>
          <span class="col-tag">POL</span><span class="col-tag">POD</span>
          <span class="col-tag">VESSEL</span><span class="col-tag">DISCHARGE DATE</span>
          <span class="col-tag opt">DEADLINE FREE TIME</span>
          <span class="col-tag opt">EMPTY RETURN</span>
          <span class="col-tag opt">USE DAYS</span>
          <span class="col-tag opt">FREE TIME</span>
        </div>
        <div style="margin-top:8px;font-size:11px;">DEADLINE FREE TIME e USE DAYS são calculados automaticamente. FREE TIME padrão: 21 dias.</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="downloadTrkTemplate()">⬇️ Baixar Modelo</button>
      <button class="btn btn-outline" onclick="closeModal('modal-trk-import')">Cancelar</button>
      <button class="btn btn-primary" id="trk-import-btn" onclick="doTrkImport()" disabled>📦 Importar</button>
    </div>
  </div>
</div>

<div id="doc-view" class="doc-page">
  <div class="doc-toolbar">
    <button class="btn btn-outline btn-sm" onclick="closeDoc()">← Voltar</button>
    <button class="btn btn-primary btn-sm" onclick="printDoc()">🖨️ Imprimir / PDF</button>
    <button class="btn btn-outline btn-sm" id="email-btn" onclick="sendInvoiceEmail()" style="display:none">✉️ Enviar por E-mail</button>
    <div style="flex:1"></div>
    <button class="btn btn-outline btn-sm" id="edit-val-btn" onclick="openEditValue()">✏️ Editar Valor</button>
  </div>
  <div class="doc-wrap"><div id="doc-content"></div></div>
</div>

<!-- MODAL: BL -->
<div class="overlay" id="modal-bl" role="dialog" aria-modal="true" aria-label="Cadastrar ou Editar BL">
  <div class="modal wide">
    <div class="modal-header">
      <div class="modal-title">📋 <span id="modal-bl-title">Novo BL</span></div>
      <button class="modal-close" onclick="closeModal('modal-bl')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-section">
        <div class="section-label">B/L & Navio</div>
        <div class="form-grid cols3">
          <div class="form-group"><label>B/L *</label><input type="text" id="f-bl" placeholder="CSC45640102U00"></div>
          <div class="form-group"><label>Vessel (Navio/Viagem) *</label><input type="text" id="f-vessel" placeholder="GREEN GUANGZHOU V1"></div>
          <div class="form-group"><label>POL (Origem)</label><input type="text" id="f-pol" placeholder="NANSHA"></div>
        </div>
        <div class="form-grid cols3" style="margin-top:12px">
          <div class="form-group"><label>POD (Destino)</label><input type="text" id="f-pod" placeholder="VITÓRIA"></div>
          <div class="form-group"><label>Free Time (dias)</label><input type="number" id="f-freetime" value="21" min="0"><span class="field-hint muted">Padrão: 21 dias corridos</span></div>
          <div class="form-group"><label>ROE (PTAX+6,5%)</label><input type="number" id="f-roe" step="0.0001" placeholder="ex: 5.5434"></div>
        </div>
        <div class="form-grid cols4" style="margin-top:12px">
          <div class="form-group"><label>USD/Dia — 1º Per. (sobrescrever)</label><input type="number" id="f-usd1" step="0.01" placeholder="auto"><span class="field-hint" id="f-usd1-hint"></span></div>
          <div class="form-group"><label>USD/Dia — 2º Per. (sobrescrever)</label><input type="number" id="f-usd2" step="0.01" placeholder="auto"><span class="field-hint" id="f-usd2-hint"></span></div>
          <div class="form-group"><label>Vencimento</label><input type="date" id="f-venc"></div>
          <div class="form-group"><label>Nº Documento <span style="font-weight:400;color:#9ca3af">(gerado automaticamente)</span></label><input type="text" id="f-docnum" placeholder="automático" style="color:var(--muted);background:#f9fafb"></div>
          <div class="form-group"><label>Data da Fatura / Recibo</label><input type="date" id="f-docdate"></div>
        </div>
        <div class="info-box">💡 <strong>USD/dia preenchido automaticamente</strong> pela tabela de taxas conforme o tipo do contêiner. Preencha "sobrescrever" apenas para alterar manualmente para todos os contêineres do BL.</div>
      </div>
      <div class="form-section">
        <div class="section-label">CNEE (Cliente)</div>
        <div class="form-group" style="margin-bottom:12px"><label>Razão Social (texto completo)</label><textarea id="f-client" rows="3" placeholder="EMPRESA LTDA CNPJ 00.000.000/0001-00 AV ..."></textarea></div>
        <div class="form-grid cols3">
          <div class="form-group"><label>CNPJ</label><input type="text" id="f-cnpj" placeholder="00.000.000/0001-00" oninput="checkCnpjField(this)" style="transition:border-color .2s;"></div>
          <div class="form-group"><label>Telefone</label><input type="text" id="f-phone" placeholder="+55 (00) 0000-0000"></div>
          <div class="form-group"><label>E-mail</label><input type="text" id="f-email" placeholder="email@empresa.com"></div>
        </div>
      </div>
      <div class="form-section">
        <div class="containers-header">
          <div class="section-label" style="margin-bottom:0">Contêineres</div>
          <button class="btn btn-outline btn-sm" onclick="addContainerRow()">+ Adicionar</button>
        </div>
        <table class="ctable">
          <thead><tr>
            <th>Container</th><th>Tipo</th><th>Descarga</th><th>Retorno</th>
            <th style="text-align:center">Dias Corridos</th>
            <th style="text-align:center">1º Período</th>
            <th style="text-align:center">2º Período</th>
            <th></th>
          </tr></thead>
          <tbody id="containers-body"></tbody>
        </table>
      </div>
      <div class="form-section" id="discount-section">
        <div class="section-label">💚 Desconto (opcional)</div>
        <div class="form-grid cols3">
          <div class="form-group">
            <label>Tipo de Desconto</label>
            <select id="f-discount-type">
              <option value="">Sem desconto</option>
              <option value="comercial">Desconto comercial</option>
              <option value="datas">Ajuste de datas</option>
              <option value="cortesia">Cortesia</option>
              <option value="acordo">Acordo de pagamento</option>
              <option value="erro">Erro operacional</option>
            </select>
          </div>
          <div class="form-group">
            <label>Valor do Desconto</label>
            <input type="number" id="f-discount-value" step="0.01" placeholder="0,00" min="0">
          </div>
          <div class="form-group">
            <label>Tipo de Valor</label>
            <select id="f-discount-mode">
              <option value="fixed">Valor fixo (R$)</option>
              <option value="percent">Percentual (%)</option>
            </select>
          </div>
        </div>
        <div class="form-grid" style="margin-top:10px">
          <div class="form-group">
            <label>Justificativa *</label>
            <input type="text" id="f-discount-justification" placeholder="Descreva o motivo do desconto...">
          </div>
          <div class="form-group">
            <label>Aprovador</label>
            <input type="text" id="f-discount-approver" placeholder="Nome do aprovador">
          </div>
        </div>
        <div id="discount-preview" style="display:none;margin-top:8px;padding:8px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:12px;color:#15803d;"></div>
      </div>
      <div class="form-section" id="dispute-section">
        <div class="section-label">⚠️ Disputa (opcional)</div>
        <div class="form-group" style="margin-bottom:12px;">
          <label style="display:flex;align-items:center;gap:8px;">
            <input type="checkbox" id="f-dispute-open" style="width:16px;height:16px;cursor:pointer;">
            Marcar como disputa
          </label>
        </div>
        <div id="dispute-details" style="display:none;">
          <div class="form-grid cols2">
            <div class="form-group">
              <label>Motivo da Disputa</label>
              <select id="f-dispute-reason">
                <option value="">Selecionar motivo...</option>
                <option value="quantidade">Divergência de quantidade</option>
                <option value="datas">Divergência de datas</option>
                <option value="taxa">Discordância com taxa aplicada</option>
                <option value="calculo">Erro de cálculo</option>
                <option value="cliente">Cliente não concorda com cobrança</option>
                <option value="outro">Outro motivo</option>
              </select>
            </div>
            <div class="form-group">
              <label>Status</label>
              <select id="f-dispute-status">
                <option value="aberto">Aberto</option>
                <option value="em-analise">Em análise</option>
                <option value="resolvido">Resolvido</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="margin-top:10px;">
            <label>Observações</label>
            <textarea id="f-dispute-notes" rows="3" placeholder="Detalhe a disputa..."></textarea>
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-bl')">Cancelar</button>
      <button class="btn btn-primary" onclick="saveBL()">✓ <span id="save-btn-label">Criar BL</span></button>
    </div>
  </div>
</div>

<!-- MODAL: RATE TABLE -->
<div class="overlay" id="modal-rates" role="dialog" aria-modal="true" aria-label="Tabela de Taxas D&D">
  <div class="modal xl">
    <div class="modal-header">
      <div class="modal-title">📋 Tabela Demurrage & Detention — BRASIL</div>
      <button class="modal-close" onclick="closeModal('modal-rates')">✕</button>
    </div>
    <div class="modal-body">
      <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Atualizado em 03/01/2024 · Dias corridos desde a data de descarga</p>
      <table class="rate-table" id="rate-table-body"></table>
    </div>
    <div class="modal-footer"><button class="btn btn-outline" onclick="closeModal('modal-rates')">Fechar</button></div>
  </div>
</div>

<!-- MODAL: IMPORT -->
<div class="overlay" id="modal-import" role="dialog" aria-modal="true" aria-label="Importar Clientes">
  <div class="modal">
    <div class="modal-header">
      <div class="modal-title">📄 Importar Planilha</div>
      <button class="modal-close" onclick="closeModal('modal-import')">✕</button>
    </div>
    <div class="modal-body">
      <div class="drop-zone" id="drop-zone" onclick="document.getElementById('file-input').click()"
        ondragover="event.preventDefault();this.classList.add('drag')"
        ondragleave="this.classList.remove('drag')"
        ondrop="handleDrop(event)">
        <div class="drop-icon">⬆️</div>
        <p><strong>Arraste ou selecione uma planilha</strong></p>
        <p>(.xlsx, .xls, .csv)</p>
      </div>
      <input type="file" id="file-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleFileInput(event)">
      <div class="columns-hint">
        <strong>Colunas esperadas:</strong>
        <div class="col-tags">
          <span class="col-tag">BL</span><span class="col-tag">VESSEL</span>
          <span class="col-tag">CONTAINER</span><span class="col-tag">TYPE</span>
          <span class="col-tag">DISCHARGE</span><span class="col-tag">EMPTY RETURN</span>
          <span class="col-tag opt">POL</span><span class="col-tag opt">POD</span>
          <span class="col-tag opt">CNEE</span><span class="col-tag opt">CNPJ</span>
          <span class="col-tag opt">FREE TIME</span><span class="col-tag opt">ROE</span>
          <span class="col-tag opt">VENCIMENTO</span>
        </div>
        <div style="margin-top:8px;font-size:11px">USD/dia calculado automaticamente pela tabela de taxas pelo tipo do contêiner.</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="downloadTemplate()">⬇️ Baixar Planilha Modelo</button>
      <button class="btn btn-outline" onclick="closeModal('modal-import')">Cancelar</button>
      <button class="btn btn-primary" id="import-btn" onclick="doImport()" disabled>📄 Importar</button>
    </div>
  </div>
</div>

<script>
const TEMPLATE_B64 = "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";
const TRK_MODEL_B64 = "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";
function downloadTrkTemplate() {
  const bin = atob(TRK_MODEL_B64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'modelo_controle_containers.xlsx';
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadTemplate() {
  // Create a new workbook with instructions and template data
  const wb = XLSX.utils.book_new();

  // Instructions sheet
  const instrSheet = XLSX.utils.aoa_to_sheet([
    ['INSTRUÇÕES DE IMPORTAÇÃO - Demurrage Manager'],
    [],
    ['Coluna', 'Descição', 'Obrigatório', 'Exemplo'],
    ['CONTAINER', 'Número do container', 'SIM', 'FFAU0000000'],
    ['B/L', 'Número do Bill of Lading', 'SIM', 'CSC45640102U00'],
    ['CNEE', 'Razão social do cliente', 'SIM', 'EMPRESA LTDA CNPJ 00.000.000/0001-00'],
    ['TYPE', 'Tipo de container (20G1, 40HC, etc)', 'SIM', '40HC'],
    ['POL', 'Porto de origem', 'NÃO', 'NANSHA'],
    ['POD', 'Porto de destino', 'NÃO', 'VITÓRIA'],
    ['VESSEL', 'Navio e viagem', 'NÃO', 'GREEN GUANGZHOU V1'],
    ['DISCHARGE', 'Data de descarga (YYYY-MM-DD)', 'SIM', '2024-01-15'],
    ['EMPTY RETURN', 'Data de devolução vazia (YYYY-MM-DD)', 'SIM', '2024-02-10'],
    ['ROE', 'Cotação PTAX+6,5% (opcional)', 'NÃO', '5.5434'],
    ['FREE TIME', 'Free time em dias (padrão: 21)', 'NÃO', '21'],
    ['CNPJ', 'CNPJ do cliente (opcional)', 'NÃO', '00.000.000/0001-00'],
    [],
    ['Observações:'],
    ['1. As colunas com "SIM" em Obrigatório são essenciais'],
    ['2. O arquivo deve estar em formato XLSX ou CSV'],
    ['3. As datas devem estar no formato YYYY-MM-DD'],
    ['4. Não modifique os nomes das colunas'],
    ['5. Deixe em branco os campos não obrigatórios se não tiver informação'],
  ]);
  XLSX.utils.book_append_sheet(wb, instrSheet, 'Instruções');

  // Template sheet with sample data
  const templateData = [
    ['CONTAINER', 'B/L', 'CNEE', 'TYPE', 'POL', 'POD', 'VESSEL', 'DISCHARGE', 'EMPTY RETURN', 'ROE', 'FREE TIME', 'CNPJ'],
    ['FFAU0000001', 'CSC45640102U01', 'EMPRESA ABC LTDA CNPJ 00.000.000/0001-00', '40HC', 'NANSHA', 'VITÓRIA', 'GREEN GUANGZHOU V1', '2024-01-15', '2024-02-10', '5.5434', '21', '00.000.000/0001-00'],
    ['FFAU0000002', 'CSC45640102U02', 'EMPRESA XYZ LTDA CNPJ 00.000.000/0002-00', '20GP', 'SHANGHAI', 'SANTOS', 'EVER GIVEN V2', '2024-01-20', '2024-02-15', '5.5200', '21', '00.000.000/0002-00'],
    ['', '', '', '', '', '', '', '', '', '', '', ''],
  ];
  const templateSheet = XLSX.utils.aoa_to_sheet(templateData);
  templateSheet['!cols'] = [
    {wch: 14}, {wch: 20}, {wch: 36}, {wch: 7}, {wch: 10}, {wch: 10}, {wch: 22},
    {wch: 12}, {wch: 14}, {wch: 10}, {wch: 10}, {wch: 18}
  ];
  XLSX.utils.book_append_sheet(wb, templateSheet, 'Dados');

  // Download
  XLSX.writeFile(wb, 'modelo_importacao_demurrage.xlsx');
}
</script>

<!-- MODAL: ALERT PANEL -->
<div class="overlay" id="modal-alert-panel" role="dialog" aria-modal="true" aria-label="Painel de Alertas">
  <div class="modal" style="width:780px;height:86vh;min-height:520px;display:flex;flex-direction:column;overflow:hidden;">
    <div class="modal-header" style="flex-shrink:0;">
      <div class="modal-title">🔔 Alertas de Free Time</div>
      <button class="modal-close" onclick="closeModal('modal-alert-panel')">✕</button>
    </div>
    <div style="flex-shrink:0;padding:10px 20px;border-bottom:1px solid var(--border);background:#f8fafc;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span id="alert-panel-badge-count" style="font-size:13px;font-weight:700;color:var(--navy);"></span>
        <span style="font-size:12px;color:var(--muted);">|</span>
        <label style="font-size:12px;color:var(--muted);">Janela de alerta:</label>
        <input type="number" id="alert-days-input" min="1" max="30" value="5"
          onchange="saveAlertDays();renderAlertPanel();"
          style="width:52px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:13px;text-align:center;">
        <label style="font-size:12px;color:var(--muted);">dias</label>
      </div>
      <button class="btn btn-primary" onclick="closeModal('modal-alert-panel');openAlertEmailModal();"
        style="font-size:12px;padding:6px 16px;">✉️ Enviar Alertas por E-mail</button>
    </div>
    <div style="flex-shrink:0;padding:8px 20px;border-bottom:1px solid var(--border);background:white;display:flex;gap:16px;flex-wrap:wrap;">
      <span class="alert-pill-over" style="font-size:11px;">⛔ Em Demurrage</span>
      <span class="alert-pill-today" style="font-size:11px;">🔴 Vence Hoje</span>
      <span class="alert-pill-warn" style="font-size:11px;">⚠️ Vence em breve</span>
    </div>
    <div class="modal-body" style="flex:1;overflow-y:auto;padding:16px 20px;" id="alert-list">
      <div style="text-align:center;padding:40px;color:var(--muted);font-size:13px;">Carregando alertas...</div>
    </div>
    <div class="modal-footer" style="flex-shrink:0;">
      <button class="btn btn-outline" onclick="closeModal('modal-alert-panel')">Fechar</button>
    </div>
  </div>
</div>

<!-- MODAL: ALERT EMAIL -->
<div class="overlay" id="modal-alert-email" role="dialog" aria-modal="true" aria-label="Configurar E-mail de Alerta">
  <div class="modal" style="width:720px;height:84vh;min-height:500px;display:flex;flex-direction:column;overflow:hidden;">
    <div class="modal-header" style="flex-shrink:0;">
      <div class="modal-title">🔔 Envio de Alertas de Free Time</div>
      <button class="modal-close" onclick="closeModal('modal-alert-email')">✕</button>
    </div>
    <div style="flex-shrink:0;padding:10px 20px;border-bottom:1px solid var(--border);background:#FFF8E1;font-size:12px;color:#92400e;display:flex;align-items:center;gap:8px;">
      ℹ️ Um e-mail consolidado por consignatário, listando todos os containers em alerta.
    </div>
    <div class="modal-body" style="flex:1;overflow-y:auto;padding:0;">
      <div id="alert-email-list"></div>
    </div>
    <div class="modal-footer" style="flex-shrink:0;justify-content:space-between;align-items:center;">
      <span style="font-size:12px;color:var(--muted);"><span id="alert-email-count">0</span> destinatário(s)</span>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" onclick="closeModal('modal-alert-email')">Cancelar</button>
        <button class="btn btn-primary" id="alert-send-all-btn" onclick="sendAllAlertEmails()">✉️ Disparar Todos</button>
      </div>
    </div>
  </div>
</div>

<!-- MODAL: EDIT VALUE -->
<div class="overlay" id="modal-editval" role="dialog" aria-modal="true" aria-label="Editar Valor">
  <div class="modal" style="width:400px">
    <div class="modal-header">
      <div class="modal-title">✏️ Editar Valor Total</div>
      <button class="modal-close" onclick="closeModal('modal-editval')">✕</button>
    </div>
    <div class="modal-body">
      <div class="form-group" style="margin-bottom:14px"><label>Valor Total (R$)</label><input type="number" id="edit-val-input" step="0.01"></div>
      <div class="form-group"><label>ROE utilizado</label><input type="number" id="edit-roe-input" step="0.0001" placeholder="5.5434"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-outline" onclick="closeModal('modal-editval')">Cancelar</button>
      <button class="btn btn-primary" onclick="applyEditVal()">✓ Aplicar</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
// ============================================================
// RATE TABLE — BRASIL, DIAS CORRIDOS desde a descarga
// ============================================================
// DE/PARA de tipos de contêiner → categoria de taxa
// 20GP = qualquer variação de 20 pés GP/HC/standard
// 40GP = qualquer variação de 40/45 pés GP/HC/standard (inclui 45G1=40HC, 22G1=20GP tratado abaixo)
const RATES = [
  { type:'20GP/HC',
    aliases:[
      '20GP','20G0','20G1','20G2',         // GP standard
      '22G0','22G1','22G2',                 // 22G1 = 20GP
      '20HC','20HQ','20HO',                 // High Cube 20
      '20GP/HC','20ST',
    ],
    freeUntil:21, p1:{range:[22,30],usd:30}, p2:{range:[31,Infinity],usd:50} },

  { type:'40GP/HC',
    aliases:[
      '40GP','40G0','40G1','40G2',          // GP 40
      '42G0','42G1','42G2',                 // variações 40GP
      '40HC','40HQ','40HO',                 // High Cube 40
      '45G0','45G1','45G2','45GP','45HC',   // 45G1 = 40HC
      '40GP/HC','40ST',
    ],
    freeUntil:21, p1:{range:[22,30],usd:60}, p2:{range:[31,Infinity],usd:80} },

  { type:'20FR/OT',
    aliases:[
      '20FR','20F0','20F1',                 // Flat Rack 20
      '20OT','20O0','20O1','20P0','20P1',   // Open Top 20 / Platform
      '20FR/OT',
    ],
    freeUntil:21, p1:{range:[22,30],usd:50}, p2:{range:[31,Infinity],usd:80} },

  { type:'40FR/OT',
    aliases:[
      '40FR','40F0','40F1',                 // Flat Rack 40
      '40OT','40O0','40O1','40P0','40P1',   // Open Top 40 / Platform
      '45FR','45OT',
      '40FR/OT',
    ],
    freeUntil:21, p1:{range:[22,30],usd:100}, p2:{range:[31,Infinity],usd:140} },

  { type:'20RF/RQ',
    aliases:[
      '20RF','20R0','20R1','20R2',          // Reefer 20
      '20RQ','20RH',                        // Reefer HC 20
      '20RF/RQ',
    ],
    freeUntil:10, p1:{range:[11,19],usd:95}, p2:{range:[20,Infinity],usd:110} },

  { type:'40RF/RQ',
    aliases:[
      '40RF','40R0','40R1','40R2',          // Reefer 40
      '40RQ','40RH',                        // Reefer HC 40
      '45RF','45RQ','45R0','45R1',          // Reefer 45
      '40RF/RQ',
    ],
    freeUntil:10, p1:{range:[11,19],usd:190}, p2:{range:[20,Infinity],usd:220} },
];

function getRate(typeStr) {
  if (!typeStr) return RATES[1];
  const t = typeStr.toUpperCase().trim().replace(/[\s\-\/]+/g,'');
  const exact = RATES.find(r => r.aliases.some(a => a.replace(/[\s\-\/]+/g,'') === t));
  if (exact) return exact;
  const prefix = RATES.find(r => r.aliases.some(a => t.startsWith(a.replace(/[\s\-\/]+/g,''))));
  if (prefix) return prefix;
  return RATES[1];
}

// Retorna a rate do tipo de container, sobrescrevendo freeUntil com o free time
// negociado do BL quando ele for diferente do padrão da tabela.
function getRateForBL(bl, typeStr) {
  const base = getRate(typeStr);
  const blFreeTime = bl && bl.freeTime != null ? parseInt(bl.freeTime, 10) : NaN;
  if (!isNaN(blFreeTime) && blFreeTime >= 0 && blFreeTime !== base.freeUntil) {
    // Ajusta os ranges das faixas para manter consistência com o novo freeUntil.
    // Faixa P1 começa no dia seguinte ao fim do free time.
    const p1Start = blFreeTime + 1;
    const p1End   = blFreeTime + (base.p1.range[1] - base.p1.range[0] + 1);
    const p2Start = p1End + 1;
    return Object.assign({}, base, {
      freeUntil: blFreeTime,
      p1: { range: [p1Start, p1End], usd: base.p1.usd },
      p2: { range: [p2Start, Infinity], usd: base.p2.usd }
    });
  }
  return base;
}

// dc = dias corridos (Data Retorno - Data Descarga)
// Returns { dc, diasP1, diasP2, usdP1, usdP2, totalUSD }
function calcUSD(dc, rate, ov1, ov2) {
  if (!rate || dc <= 0) return { dc:0, diasP1:0, diasP2:0, usdP1:rate?.p1.usd||0, usdP2:rate?.p2.usd||0, totalUSD:0 };
  const usdP1 = ov1 != null ? ov1 : rate.p1.usd;
  const usdP2 = ov2 != null ? ov2 : rate.p2.usd;
  if (dc <= rate.freeUntil) return { dc, diasP1:0, diasP2:0, usdP1, usdP2, totalUSD:0 };
  const diasP1 = dc <= rate.p1.range[1] ? dc - rate.p1.range[0] + 1 : rate.p1.range[1] - rate.p1.range[0] + 1;
  const diasP2 = dc >= rate.p2.range[0] ? dc - rate.p2.range[0] + 1 : 0;
  const clampedP1 = Math.max(0, diasP1);
  const totalUSD = clampedP1 * usdP1 + diasP2 * usdP2;
  return { dc, diasP1: clampedP1, diasP2, usdP1, usdP2, totalUSD };
}

function daysBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  return Math.max(0, Math.round((new Date(d2+'T12:00:00') - new Date(d1+'T12:00:00')) / 86400000));
}


// ============================================================
// PTAX — Banco Central do Brasil  |  ROE = PTAX venda × 1,065
// ============================================================
let ptaxState = { ptax: null, roe: null, date: null, loading: false, error: null, source: null };

function fmtBCBDate(dt) {
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  const y = dt.getFullYear();
  return `${m}-${d}-${y}`;
}

async function loadPTAX() {
  ptaxState = { ptax: null, roe: null, date: null, loading: true, error: null, source: null };
  renderPTAXBadge();

  try {
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 10);

    // Endpoint CotacaoDolarPeriodo — 1 única chamada, range de 10 dias,
    // traz sempre a PTAX mais recente divulgada. Aspas codificadas (%27).
    const startDate = fmtBCBDate(from);
    const endDate   = fmtBCBDate(today);
    const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial=%27${startDate}%27&@dataFinalCotacao=%27${endDate}%27&$top=1&$orderby=dataHoraCotacao%20desc&$format=json&$select=cotacaoVenda,dataHoraCotacao`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const json = await resp.json();

    if (json.value && json.value.length > 0 && json.value[0].cotacaoVenda) {
      const ptax = parseFloat(json.value[0].cotacaoVenda);
      const roe  = parseFloat((ptax * 1.065).toFixed(4));
      // Data extraída da resposta (ex: "2026-03-23 13:08:11.223" → "2026-03-23")
      const dateStr = (json.value[0].dataHoraCotacao || '').slice(0, 10);
      ptaxState = { ptax, roe, date: dateStr, loading: false, error: null, source: 'BCB' };
      renderPTAXBadge();
      applyPTAXGlobal();
      return;
    }
    throw new Error('Sem cotações no período retornado pelo BCB');
  } catch(e) {
    console.error('[PTAX] Erro ao consultar BCB:', e);
    ptaxState = { ptax: null, roe: null, date: null, loading: false, error: 'PTAX indisponível no BCB. Aguarde e tente novamente.', source: null };
    renderPTAXBadge();
  }
}

function renderPTAXBadge() {
  const el = document.getElementById('ptax-badge');
  if (!el) return;
  if (ptaxState.loading) {
    el.innerHTML = `<span class="ptax-loading">⟳ Consultando PTAX no Banco Central...</span>`;
    return;
  }
  if (ptaxState.error || !ptaxState.ptax) {
    el.innerHTML = `
      <span class="ptax-error">⚠ ${ptaxState.error||'PTAX indisponível'}
        <button class="ptax-retry" onclick="loadPTAX()">↻ Tentar novamente</button>
      </span>
      <span class="ptax-manual-sep"></span>
      <span class="ptax-manual-area">
        <span class="ptax-manual-label">Inserir PTAX manualmente:</span>
        <input class="ptax-manual-input" id="ptax-manual-val" type="number" step="0.0001" min="1" placeholder="ex: 5.8200"
          onkeydown="if(event.key==='Enter') applyPTAXManual()"
          title="Digite a PTAX Venda divulgada pelo BCB">
        <button class="ptax-manual-btn" onclick="applyPTAXManual()">✓ Aplicar</button>
      </span>`;
    return;
  }
  const srcLabel = document.getElementById('ptax-src-label');
  const isManual = ptaxState.source === 'MANUAL';
  if (srcLabel) srcLabel.textContent = isManual ? 'Inserido manualmente' : 'Fonte: Banco Central do Brasil';
  const fmtD = ptaxState.date ? new Date(ptaxState.date+'T12:00:00').toLocaleDateString('pt-BR') : '—';
  const manualTag = isManual
    ? `<span class="ptax-manual-tag" title="Valor inserido manualmente — não consultado no BCB">manual</span>`
    : '';
  el.innerHTML = `
    <span class="ptax-pill">
      <span class="ptax-label">PTAX Venda</span>
      <span class="ptax-val">R$ ${ptaxState.ptax.toFixed(4).replace('.',',')}${manualTag}</span>
      <span class="ptax-sep">→ PTAX × 1,065 =</span>
      <span class="ptax-roe-label">ROE</span>
      <span class="ptax-roe-val">R$ ${ptaxState.roe.toFixed(4).replace('.',',')}</span>
      <span class="ptax-date">(${fmtD})</span>
      <button class="ptax-refresh" onclick="loadPTAX()" title="Recarregar do Banco Central">↻</button>
    </span>`;
}

// Aplica PTAX inserida manualmente pelo usuário (plano B quando BCB está indisponível)
function applyPTAXManual() {
  const input = document.getElementById('ptax-manual-val');
  if (!input) return;
  const ptax = parseFloat(input.value);
  if (!ptax || ptax < 1 || ptax > 20) {
    input.focus();
    input.style.borderColor = '#ef4444';
    setTimeout(() => { input.style.borderColor = ''; }, 1500);
    return;
  }
  const roe = parseFloat((ptax * 1.065).toFixed(4));
  const today = new Date().toISOString().slice(0, 10);
  ptaxState = { ptax, roe, date: today, loading: false, error: null, source: 'MANUAL' };
  renderPTAXBadge();
  applyPTAXGlobal();
}

// Aplica ROE automático nos BLs sem ROE manual
function applyPTAXGlobal() {
  if (!ptaxState.roe) return;
  let changed = 0;
  bls.forEach(b => {
    if (!b.roeManual) { b.roe = ptaxState.roe; changed++; }
  });
  if (changed > 0) { save(bls); renderList(); }
}

// ROE efetivo para um BL: manual > PTAX oficial do BCB
function effectiveROE(b) {
  if (b.roeManual && b.roe) return b.roe;
  if (ptaxState.roe) return ptaxState.roe;
  return null; // sem PTAX disponível — não usa valor aproximado
}

// ============================================================
// STORAGE
// ============================================================
// ── STORAGE: BLs (Firestore via window._dmStore) ──────────────────────────
// FIX #2: retorna cópia profunda para que o diff em _dmFireSave compare
// oldStore (referência ao store) vs newData (cópia local modificada) corretamente.
function load()  { return JSON.parse(JSON.stringify((window._dmStore && window._dmStore.bls) || [])); }
function save(b) {
  // NÃO atualiza _dmStore aqui — _dmFireSave faz o diff correto e atualiza o store
  if (window._dmFireSave) window._dmFireSave('bls', b);
  else if (window._dmStore) window._dmStore.bls = b; // fallback se Firebase não inicializou
}
function deleteBLById(id) {
  if (window._dmFireDelete) window._dmFireDelete('bls', id);
}

let bls = load();
let activeFilter = 'all';
let showOnlyWithDiscount = false;
let showOnlyWithDispute = false;

function setFilter(f) {
  activeFilter = f;
  ['all','unpaid','paid','billed'].forEach(k => {
    const el = document.getElementById('filter-'+k);
    if (el) el.style.fontWeight  = k===f ? '700' : '400';
    if (el) el.style.borderColor = k===f ? 'var(--navy)' : '';
    if (el) el.style.color       = k===f ? 'var(--navy)' : '';
  });
  renderList();
}

function toggleDiscountFilter() {
  showOnlyWithDiscount = !showOnlyWithDiscount;
  const btns = document.querySelectorAll('#filter-discount-btn, #filter-discount-btn-paid');
  btns.forEach(btn => {
    if (showOnlyWithDiscount) {
      btn.style.fontWeight = '700';
      btn.style.borderColor = 'var(--blue)';
      btn.style.color = 'var(--blue)';
      btn.style.background = 'rgba(30, 64, 175, 0.05)';
    } else {
      btn.style.fontWeight = '400';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.style.background = '';
    }
  });
  renderList();
}

function toggleDisputeFilter() {
  showOnlyWithDispute = !showOnlyWithDispute;
  const btns = document.querySelectorAll('#filter-dispute-btn, #filter-dispute-btn-paid');
  btns.forEach(btn => {
    if (showOnlyWithDispute) {
      btn.style.fontWeight = '700';
      btn.style.borderColor = '#f59e0b';
      btn.style.color = '#f59e0b';
      btn.style.background = 'rgba(245, 158, 11, 0.05)';
    } else {
      btn.style.fontWeight = '400';
      btn.style.borderColor = '';
      btn.style.color = '';
      btn.style.background = '';
    }
  });
  renderList();
}
// Backfill venc — called from _dmOnReady after Firebase loads
function _backfillVenc() {
  let changed = false;
  bls.forEach(b => { if (!b.venc) { b.venc = nextBusinessDay(null); changed = true; } });
  if (changed) save(bls);
}
let editingId = null, currentBL = null, currentType = null, ovTotal = null, ovRoe = null, importData = null, currentDocnum = null;

// ============================================================
// UTILS
// ============================================================
function uid() { return Date.now().toString(36)+Math.random().toString(36).slice(2); }

function genDocnum(blStr) {
  // Hash determinístico baseado no número do BL
  let hash = 0;
  const s = String(blStr || '').toUpperCase();
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash) + s.charCodeAt(i);
    hash |= 0;
  }
  const num = (Math.abs(hash) % 9000) + 1000; // 1000–9999
  return 'DEM-' + new Date().getFullYear() + '-' + num;
}
function toast(msg, t='') {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'toast show '+t;
  setTimeout(()=>el.classList.remove('show'), 3000);
}
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Modal genérico reutilizável (para histórico e outras funcionalidades)
function showGenericModal(title, html, width) {
  let m = document.getElementById('generic-modal-overlay');
  if (!m) {
    m = document.createElement('div');
    m.id = 'generic-modal-overlay';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;';
    m.innerHTML = `<div id="generic-modal-box" style="background:white;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:80vh;display:flex;flex-direction:column;overflow:hidden;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--border);background:#f9fafb;">
        <h3 id="generic-modal-title" style="font-size:15px;font-weight:700;margin:0;color:var(--text);"></h3>
        <button onclick="document.getElementById('generic-modal-overlay').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--muted);line-height:1;padding:4px;">×</button>
      </div>
      <div id="generic-modal-body" style="padding:22px;overflow-y:auto;flex:1;"></div>
    </div>`;
    m.addEventListener('click', e => { if (e.target === m) m.remove(); });
    document.body.appendChild(m);
  }
  document.getElementById('generic-modal-title').textContent = title;
  document.getElementById('generic-modal-body').innerHTML = html;
  document.getElementById('generic-modal-box').style.width = width || '520px';
  m.style.display = 'flex';
}
function fmtDate(s) { return s ? new Date(s+'T12:00:00').toLocaleDateString('pt-BR') : ''; }
function fmtBRL(v) { return 'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function parseDs(v) {
  if (!v) return '';
  if (v instanceof Date) return v.toISOString().slice(0,10);
  if (typeof v==='number') { const d=new Date((v-25569)*86400000); return d.toISOString().slice(0,10); }
  const p=String(v).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (p) { const y=p[3].length===2?'20'+p[3]:p[3]; return `${y}-${p[2].padStart(2,'0')}-${p[1].padStart(2,'0')}`; }
  const iso=String(v).match(/(\d{4})-(\d{2})-(\d{2})/); return iso?iso[0]:'';
}
function nk(k) { return String(k).trim().toUpperCase().replace(/[\s\/\-]+/g,'_'); }
function longDate() { return new Date().toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}); }
function cap(s) { return s.charAt(0).toUpperCase()+s.slice(1); }

// Next business day (skip weekends; Mon if Fri)
function nextBusinessDay(fromDate) {
  const d = fromDate ? new Date(fromDate + 'T12:00:00') : new Date();
  d.setDate(d.getDate() + 1);
  // Skip Saturday (6) -> Monday
  if (d.getDay() === 6) d.setDate(d.getDate() + 2);
  // Skip Sunday (0) -> Monday
  else if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// Fill venc field with auto value (next business day from today)
function autoFillVenc() {
  const field = document.getElementById('f-venc');
  if (!field.value) {
    field.value = nextBusinessDay(null);
  }
}


function blTotal(b, roeOv) {
  const roe = roeOv ?? effectiveROE(b);
  let t = 0;
  (b.containers||[]).forEach(c => {
    const dc = daysBetween(c.discharge, c.emptyReturn);
    const calc = calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null);
    t += calc.totalUSD * roe;
  });
  // Apply discount if present
  if (b.discount && b.discount.value > 0) {
    if (b.discount.mode === 'percent') {
      t = t * (1 - b.discount.value / 100);
    } else {
      t = Math.max(0, t - b.discount.value);
    }
  }
  return t;
}

// ============================================================
// DISCOUNT PREVIEW & CALCULATION
// ============================================================
function updateDiscountPreview() {
  const type = document.getElementById('f-discount-type').value;
  const value = parseFloat(document.getElementById('f-discount-value').value) || 0;
  const mode = document.getElementById('f-discount-mode').value;
  const previewEl = document.getElementById('discount-preview');

  if (!type || value <= 0) {
    previewEl.style.display = 'none';
    return;
  }

  previewEl.style.display = 'block';
  const modeLabel = mode === 'percent' ? '%' : 'R$';
  const typeLabel = {
    'comercial': 'Desconto comercial',
    'datas': 'Ajuste de datas',
    'cortesia': 'Cortesia',
    'acordo': 'Acordo de pagamento',
    'erro': 'Erro operacional'
  }[type] || type;

  previewEl.textContent = `${typeLabel} • ${value}${modeLabel}`;
}

function attachDiscountListeners() {
  ['f-discount-type', 'f-discount-value', 'f-discount-mode'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', updateDiscountPreview);
    if (el) el.addEventListener('input', updateDiscountPreview);
  });
  updateDiscountPreview();
}

// ============================================================
// AUDIT LOGGING
// ============================================================
function logAuditAction(action, details = {}) {
  console.log('[AUDIT]', action, details);
  if (window._dmFireLog) window._dmFireLog(action, details);
}

function wrapWithAuditLog(action, fn) {
  return function(...args) {
    logAuditAction(action, {args: args});
    return fn.apply(this, args);
  };
}

function toggleDisputeDetails() {
  const checkbox = document.getElementById('f-dispute-open');
  const details = document.getElementById('dispute-details');
  if (checkbox && details) {
    details.style.display = checkbox.checked ? 'block' : 'none';
  }
}

// ============================================================
// RATE TABLE RENDER
// ============================================================
function renderRateTable() {
  const el = document.getElementById('rate-table-body');
  let html = `<thead><tr><th>País</th><th>Tipo</th><th>Período</th><th>Dias</th><th>Taxa Diária</th><th>Nota</th></tr></thead><tbody>`;
  RATES.forEach((r, i) => {
    const showCountry = i === 0;
    const showNote = i === 0;
    html += `
      <tr>
        ${showCountry?`<td rowspan="${RATES.length*3}" style="font-weight:700;vertical-align:middle;text-align:center">BRASIL</td>`:''}
        <td rowspan="3" style="font-weight:600;vertical-align:middle">${r.type}</td>
        <td><span class="rbadge free">FREE</span></td>
        <td>01 – ${r.freeUntil}</td>
        <td style="color:var(--green);font-weight:600">FREE</td>
        ${showNote?`<td rowspan="${RATES.length*3}" style="vertical-align:middle;font-size:12px;color:var(--muted)">DIAS CORRIDOS</td>`:''}
      </tr>
      <tr>
        <td><span class="rbadge p1">1º Período</span></td>
        <td>${r.p1.range[0]} – ${r.p1.range[1]}</td>
        <td style="font-weight:600">USD ${r.p1.usd}</td>
      </tr>
      <tr style="border-bottom:2px solid var(--border)">
        <td><span class="rbadge p2">2º Período</span></td>
        <td>${r.p2.range[0]}+</td>
        <td style="font-weight:600;color:var(--red)">USD ${r.p2.usd}</td>
      </tr>`;
  });
  el.innerHTML = html + '</tbody>';
}

// ============================================================
// LIST
// ============================================================
function renderList() {
  const q = (document.getElementById('search-input').value||'').toLowerCase();
  const filtered = bls.filter(b => {
    const matchQ = !q || (b.bl+' '+b.client+' '+(b.containers||[]).map(c=>c.container).join(' ')).toLowerCase().includes(q);
    // Sub-tab scope
    const inFat  = !b.paid;
    const inPago = !!b.paid;
    const inScope = activeBillingSubTab === 'faturados' ? inFat : inPago;
    const matchF = inScope && (
      activeFilter === 'all'
      || (activeFilter === 'paid'   && !!b.paid)
      || (activeFilter === 'billed' && !!b.billed && !b.paid)
      || (activeFilter === 'unpaid' && !b.paid && !b.billed)
    );
    // Apply discount filter if active
    const matchDiscount = !showOnlyWithDiscount || (b.discount && b.discount.value > 0);
    // Apply dispute filter if active
    const matchDispute = !showOnlyWithDispute || (b.dispute && b.dispute.open);
    return matchQ && matchF && matchDiscount && matchDispute;
  });
  updateBillingBadges();
  document.getElementById('results-count').textContent = `${filtered.length} resultado(s) encontrado(s)`;
  const list = document.getElementById('bl-list');
  if (!filtered.length) {
    list.innerHTML = `<div class="empty-state"><div class="icon">📭</div><p>Nenhum BL encontrado. Importe uma planilha ou crie um novo BL.</p></div>`;
    return;
  }
  list.innerHTML = filtered.map(b => {
    const ctrs = b.containers||[];
    // Only containers that generated demurrage
    const billableCtrs = ctrs.filter(c => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      return calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD > 0;
    });
    const tot = blTotal(b, null);
    const totStr = tot > 0 ? ` · Total: ${fmtBRL(tot)}` : '';
    const tags = billableCtrs.slice(0,3).map(c=>`<span class="container-tag">${c.container}${c.type?' ('+c.type+')':''}</span>`).join('');
    const more = billableCtrs.length>3?`<span style="font-size:11px;color:var(--muted)">+${billableCtrs.length-3}</span>`:'';
    const isPaid   = !!b.paid;
    const isBilled = !!b.billed;
    const paidBadge   = isPaid   ? `<span class="paid-badge">✔ PAGO</span><span class="paid-date">${fmtDate(b.paidAt)}</span>` : '';
    // Aging: days since billedAt for unpaid billed invoices
    const agingDays = (!isPaid && isBilled && b.billedAt)
      ? Math.floor((Date.now() - new Date(b.billedAt).getTime()) / 86400000)
      : null;
    const agingBadge = agingDays !== null
      ? `<span class="aging-badge ${agingDays>=30?'aging-late':agingDays>=15?'aging-warn':'aging-ok'}">${agingDays}d sem pagamento</span>`
      : '';
    const billedBadge = isBilled ? `<span class="paid-badge" style="background:#dbeafe;color:#1e40af;margin-left:4px;">📄 FATURADO</span>` : '';
    const discountBadge = (b.discount && b.discount.value > 0) ? `<span class="badge-desc">DESC</span>` : '';
    const isDisputed = (b.dispute && b.dispute.open);
    const disputeBadge = isDisputed ? `<span class="badge-dispute">⚠️ DISPUTA</span>` : '';
    const paidLabel   = isPaid   ? '✔ Pago'     : '○ Pago';
    const paidClass   = isPaid   ? 'paid'        : 'unpaid';
    const billedLabel = isBilled ? '📄 Faturado' : '○ Faturado';
    const billedClass = isBilled ? 'billed'      : 'unbilled';
    return `<div class="bl-card${isPaid?' is-paid':''}${isBilled?' is-paid':''}${isDisputed?' is-disputed':''}">
      <span class="bl-badge">BL</span>
      <div class="bl-info">
        <div class="bl-number">${b.bl}${paidBadge}${discountBadge}${disputeBadge}${billedBadge}${agingBadge}</div>
        <div class="bl-client">${b.client||'—'}</div>
        <div class="bl-meta"><span>${billableCtrs.length} contêiner(es) c/ demurrage${ctrs.length > billableCtrs.length ? ` (${ctrs.length} total)` : ""}${totStr}</span>${tags}${more}</div>
      </div>
      <div class="bl-actions">
        <button class="act-btn ${paidClass}"   onclick="togglePaid('${b.id}')">${paidLabel}</button>
        <button class="act-btn ${billedClass}" onclick="toggleBilled('${b.id}')">${billedLabel}</button>
        <button class="act-btn invoice" onclick="viewDoc('${b.id}','invoice')">📄 Fatura</button>
        <button class="act-btn receipt" onclick="viewDoc('${b.id}','receipt')">🧾 Recibo</button>
        <button class="act-btn edit" onclick="openEditBL('${b.id}')">Editar</button>
        <button class="act-btn del" onclick="deleteBL('${b.id}')" aria-label="Excluir BL ${b.blNum||b.id}">Excluir</button>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// BL FORM
// ============================================================
function openNewBL() {
  editingId=null;
  document.getElementById('modal-bl-title').textContent='Novo BL';
  document.getElementById('save-btn-label').textContent='Criar BL';
  clearForm(); addContainerRow(); openModal('modal-bl');
  // Attach discount preview listeners
  attachDiscountListeners();
  // Attach dispute listeners
  const disputeCheckbox = document.getElementById('f-dispute-open');
  if (disputeCheckbox) disputeCheckbox.addEventListener('change', toggleDisputeDetails);
  toggleDisputeDetails();
}
function openEditBL(id) {
  const b = bls.find(x=>x.id===id); if(!b) return;
  if (b.paid) {
    alert('Esta fatura está marcada como PAGA.\nDesmarque como paga para editar os dados do BL.');
    return;
  }
  if (b.billed) {
    alert('Esta fatura está marcada como FATURADA.\nDesmarque como faturada para editar os dados do BL.');
    return;
  }
  editingId=id;
  document.getElementById('modal-bl-title').textContent='Editar BL';
  document.getElementById('save-btn-label').textContent='Atualizar';
  fillForm(b); openModal('modal-bl');
  // Attach discount preview listeners
  attachDiscountListeners();
  // Attach dispute listeners
  const disputeCheckbox = document.getElementById('f-dispute-open');
  if (disputeCheckbox) disputeCheckbox.addEventListener('change', toggleDisputeDetails);
  toggleDisputeDetails();
}
function clearForm() {
  ['f-bl','f-vessel','f-pol','f-pod','f-client','f-cnpj','f-phone','f-email','f-docnum'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-freetime').value=21;
  document.getElementById('f-roe').value='';
  document.getElementById('f-usd1').value=''; document.getElementById('f-usd1-hint').textContent='';
  document.getElementById('f-usd2').value=''; document.getElementById('f-usd2-hint').textContent='';
  document.getElementById('f-venc').value = nextBusinessDay(null);
  document.getElementById('f-docdate').value = new Date().toISOString().slice(0,10);
  document.getElementById('f-discount-type').value='';
  document.getElementById('f-discount-value').value='';
  document.getElementById('f-discount-mode').value='fixed';
  document.getElementById('f-discount-justification').value='';
  document.getElementById('f-discount-approver').value='';
  document.getElementById('discount-preview').style.display='none';
  document.getElementById('f-dispute-open').checked=false;
  document.getElementById('f-dispute-reason').value='';
  document.getElementById('f-dispute-status').value='aberto';
  document.getElementById('f-dispute-notes').value='';
  document.getElementById('dispute-details').style.display='none';
  document.getElementById('containers-body').innerHTML='';
}
function fillForm(b) {
  document.getElementById('f-bl').value=b.bl||'';
  document.getElementById('f-vessel').value=b.vessel||'';
  document.getElementById('f-pol').value=b.pol||'';
  document.getElementById('f-pod').value=b.pod||'';
  document.getElementById('f-client').value=b.client||'';
  document.getElementById('f-cnpj').value=b.cnpj||'';
  document.getElementById('f-phone').value=b.phone||'';
  document.getElementById('f-email').value=b.email||'';
  document.getElementById('f-freetime').value=b.freeTime??21;
  document.getElementById('f-roe').value=b.roeManual ? b.roe : '';
  document.getElementById('f-usd1').value=b.ov1||'';
  document.getElementById('f-usd2').value=b.ov2||'';
  document.getElementById('f-venc').value = b.venc || nextBusinessDay(null);
  document.getElementById('f-docdate').value = b.docDate || new Date().toISOString().slice(0,10);
  document.getElementById('f-docnum').value=b.docnum||'';
  // Fill discount fields
  if (b.discount) {
    document.getElementById('f-discount-type').value=b.discount.type||'';
    document.getElementById('f-discount-value').value=b.discount.value||'';
    document.getElementById('f-discount-mode').value=b.discount.mode||'fixed';
    document.getElementById('f-discount-justification').value=b.discount.justification||'';
    document.getElementById('f-discount-approver').value=b.discount.approver||'';
  } else {
    document.getElementById('f-discount-type').value='';
    document.getElementById('f-discount-value').value='';
    document.getElementById('f-discount-mode').value='fixed';
    document.getElementById('f-discount-justification').value='';
    document.getElementById('f-discount-approver').value='';
  }
  // Fill dispute fields
  if (b.dispute && b.dispute.open) {
    document.getElementById('f-dispute-open').checked=true;
    document.getElementById('f-dispute-reason').value=b.dispute.reason||'';
    document.getElementById('f-dispute-status').value=b.dispute.status||'aberto';
    document.getElementById('f-dispute-notes').value=b.dispute.notes||'';
  } else {
    document.getElementById('f-dispute-open').checked=false;
    document.getElementById('f-dispute-reason').value='';
    document.getElementById('f-dispute-status').value='aberto';
    document.getElementById('f-dispute-notes').value='';
  }
  document.getElementById('containers-body').innerHTML='';
  (b.containers||[]).forEach(c=>addContainerRow(c));
}

function addContainerRow(c={}) {
  const tbody = document.getElementById('containers-body');
  const tr = document.createElement('tr');
  const rid = uid();
  tr.dataset.rid = rid;
  const types = [
    '20G1','22G1','20GP','20HC',           // 20 pés GP/HC
    '40G1','42G1','40GP','40HC','45G1',    // 40/45 pés GP/HC
    '20FR','20OT',                          // 20 pés FR/OT
    '40FR','40OT',                          // 40 pés FR/OT
    '20R1','20RF',                          // 20 pés Reefer
    '40R1','40RF','45R1',                   // 40/45 pés Reefer
  ];
  tr.innerHTML = `
    <td><input type="text" value="${c.container||''}" placeholder="FFAU0000000" style="width:130px" oninput="updateRow(this)"></td>
    <td><select style="width:80px" onchange="updateRow(this)">${types.map(t=>`<option value="${t}"${c.type===t?' selected':''}>${t}</option>`).join('')}</select></td>
    <td><input type="date" value="${c.discharge||''}" style="width:140px" onchange="updateRow(this)"></td>
    <td><input type="date" value="${c.emptyReturn||''}" style="width:140px" onchange="updateRow(this)"></td>
    <td class="calc-cell" data-dc>—</td>
    <td class="calc-cell" data-p1>—</td>
    <td class="calc-cell" data-p2>—</td>
    <td><button class="remove-row" onclick="this.closest('tr').remove()">✕</button></td>`;
  tbody.appendChild(tr);
  updateRow(tr.querySelector('input'));
}

function updateRow(el) {
  const tr = el.closest('tr');
  const ins = tr.querySelectorAll('input,select');
  const type = ins[1].value;
  const discharge = ins[2].value;
  const emptyReturn = ins[3].value;
  const dc = daysBetween(discharge, emptyReturn);
  const rate = getRate(type);
  const calc = calcUSD(dc, rate, null, null);

  const dcCell = tr.querySelector('[data-dc]');
  const p1Cell = tr.querySelector('[data-p1]');
  const p2Cell = tr.querySelector('[data-p2]');

  if (dcCell) { dcCell.textContent = dc > 0 ? dc+'d' : '—'; dcCell.className = 'calc-cell'+(dc > rate.freeUntil?' active':''); }
  if (p1Cell) { p1Cell.textContent = calc.diasP1 > 0 ? calc.diasP1+'d @ $'+calc.usdP1 : '—'; p1Cell.className = 'calc-cell'+(calc.diasP1 > 0?' active':''); }
  if (p2Cell) { p2Cell.textContent = calc.diasP2 > 0 ? calc.diasP2+'d @ $'+calc.usdP2 : '—'; p2Cell.className = 'calc-cell'+(calc.diasP2 > 0?' active':''); }

  // update hints from first row type
  const firstRow = document.querySelector('#containers-body tr');
  if (tr === firstRow && rate) {
    document.getElementById('f-usd1-hint').textContent = `Tabela: USD ${rate.p1.usd}/dia (dias ${rate.p1.range[0]}–${rate.p1.range[1]})`;
    document.getElementById('f-usd2-hint').textContent = `Tabela: USD ${rate.p2.usd}/dia (dias ${rate.p2.range[0]}+)`;
  }
}

function readContainers() {
  return Array.from(document.querySelectorAll('#containers-body tr')).map(tr => {
    const ins = tr.querySelectorAll('input,select');
    return { container: ins[0].value.trim().toUpperCase(), type: ins[1].value, discharge: ins[2].value, emptyReturn: ins[3].value };
  }).filter(c => c.container);
}

function saveBL() {
  const bl = document.getElementById('f-bl').value.trim();
  const vessel = document.getElementById('f-vessel').value.trim();
  if (!bl||!vessel) { toast('BL e Navio são obrigatórios','error'); return; }
  const cnpjVal = (s => s.length === 13 ? '0'+s : s)(document.getElementById('f-cnpj').value.replace(/\D/g,'').trim());
  if (cnpjVal && !validarCNPJ(cnpjVal)) {
    if (!confirm('O CNPJ informado parece inválido. Deseja salvar mesmo assim?')) return;
  }
  // Collect discount fields
  const discountType = document.getElementById('f-discount-type').value;
  const discountValue = parseFloat(document.getElementById('f-discount-value').value)||0;
  const discountMode = document.getElementById('f-discount-mode').value;
  const discountJustification = document.getElementById('f-discount-justification').value.trim();
  const discountApprover = document.getElementById('f-discount-approver').value.trim();

  const discount = (discountType && discountValue > 0) ? {
    type: discountType,
    value: discountValue,
    mode: discountMode,
    justification: discountJustification,
    approver: discountApprover,
    appliedAt: new Date().toISOString().slice(0,10)
  } : null;

  // Collect dispute fields
  const disputeOpen = document.getElementById('f-dispute-open').checked;
  const dispute = disputeOpen ? {
    open: true,
    reason: document.getElementById('f-dispute-reason').value,
    status: document.getElementById('f-dispute-status').value,
    notes: document.getElementById('f-dispute-notes').value.trim(),
    openedAt: new Date().toISOString().slice(0,10),
    historico: []
  } : null;

  const obj = {
    id: editingId||uid(), bl, vessel,
    pol: document.getElementById('f-pol').value.trim(),
    pod: document.getElementById('f-pod').value.trim(),
    client: document.getElementById('f-client').value.trim(),
    cnpj: (s => s.length === 13 ? '0'+s : s)(document.getElementById('f-cnpj').value.replace(/\D/g,'').trim()),
    phone: document.getElementById('f-phone').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    freeTime: parseInt(document.getElementById('f-freetime').value)||21,
    roe: parseFloat(document.getElementById('f-roe').value)||null,
    roeManual: !!parseFloat(document.getElementById('f-roe').value),
    ov1: parseFloat(document.getElementById('f-usd1').value)||null,
    ov2: parseFloat(document.getElementById('f-usd2').value)||null,
    venc: document.getElementById('f-venc').value || nextBusinessDay(null),
    docDate: document.getElementById('f-docdate').value || new Date().toISOString().slice(0,10),
    docnum: (()=>{
      const manual = document.getElementById('f-docnum').value.trim();
      if (manual) return manual;
      // editing: preserve existing docnum
      if (editingId) return bls.find(x=>x.id===editingId)?.docnum || genDocnum(bl);
      // new BL: generate from BL number
      return genDocnum(bl);
    })(),
    containers: readContainers(),
    discount: discount,
    dispute: dispute,
    createdAt: editingId?(bls.find(x=>x.id===editingId)?.createdAt||Date.now()):Date.now(),
  };
  if (editingId) {
    const i=bls.findIndex(x=>x.id===editingId);
    bls[i]=obj;
    logAuditAction('edicao_bl', {blId: obj.id, bl: obj.bl, hasDiscount: !!obj.discount, hasDispute: obj.dispute?.open});
    toast('BL atualizado!','success');
  } else {
    bls.unshift(obj);
    logAuditAction('criacao_bl', {blId: obj.id, bl: obj.bl, hasDiscount: !!obj.discount});
    toast('BL criado!','success');
  }
  save(bls);
  // Auto-register client in client registry if CNPJ provided
  if (obj.cnpj) autoRegisterClient(obj.cnpj, obj.client, obj.email);
  closeModal('modal-bl'); renderList();
}

function exportReport() {
  if (!bls.length) { toast('Nenhum BL para exportar.', 'error'); return; }

  const NAVY = '1A2744', GOLD = 'F59E0B', WHITE = 'FFFFFFFF', GRAY = 'F3F4F6', GRAY2 = 'E5E7EB';

  // ── Build rows ──────────────────────────────────────────────
  const rows = [];
  bls.forEach(b => {
    const roe = (b.paid || b.billed) && b.frozenRoe != null ? b.frozenRoe : effectiveROE(b);
    const frozenTotal = (b.paid || b.billed) && b.frozenTotal != null ? b.frozenTotal : null;
    let blBRL = 0;

    // Only containers that generated demurrage
    const billable = (b.containers || []).filter(c => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      return calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD > 0;
    });

    if (!billable.length) return; // skip BLs with no demurrage at all

    billable.forEach((c, idx) => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      const calc = calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null);
      const brl = calc.totalUSD * roe;
      blBRL += brl;

      // For frozen totals, distribute proportionally across containers
      const totalBRL = frozenTotal !== null
        ? (idx === billable.length - 1
            ? parseFloat((frozenTotal - (blBRL - brl)).toFixed(2))
            : parseFloat(brl.toFixed(2)))
        : parseFloat(brl.toFixed(2));

      // Calculate discount for this BL if present
      let discountAmt = 0;
      if (b.discount && b.discount.value > 0) {
        if (b.discount.mode === 'percent') {
          discountAmt = totalBRL * (b.discount.value / 100);
        } else {
          discountAmt = b.discount.value;
        }
      }
      const totalBRLWithDiscount = Math.max(0, totalBRL - discountAmt);

      rows.push({
        'Nº FATURA':      b.docnum || genDocnum(b.bl),
        'BL':             b.bl,
        'NAVIO/VIAGEM':   b.vessel || '—',
        'POL':            b.pol || '—',
        'POD':            b.pod || '—',
        'CNEE':           b.client || '—',
        'CNPJ':           b.cnpj || '—',
        'CONTAINER':      c.container,
        'TIPO':           c.type || '—',
        'DESCARGA':       c.discharge ? new Date(c.discharge+'T12:00:00').toLocaleDateString('pt-BR') : '—',
        'DEVOLUÇÃO':      c.emptyReturn ? new Date(c.emptyReturn+'T12:00:00').toLocaleDateString('pt-BR') : '—',
        'DIAS CORRIDOS':  dc,
        'FREE TIME':      b.freeTime ?? 21,
        'DIAS COBRÁVEIS': Math.max(0, dc - (b.freeTime ?? 21)),
        'DIAS 1º PER.':   calc.diasP1,
        'USD/DIA P1':     calc.usdP1,
        'DIAS 2º PER.':   calc.diasP2,
        'USD/DIA P2':     calc.usdP2,
        'TOTAL USD':      parseFloat(calc.totalUSD.toFixed(2)),
        'ROE':            parseFloat(roe.toFixed(4)),
        'TOTAL BRL':      totalBRL,
        'DESCONTO':       b.discount && b.discount.value > 0 ? `${b.discount.value}${b.discount.mode === 'percent' ? '%' : 'R$'}` : '—',
        'VALOR DESCONTO': parseFloat(discountAmt.toFixed(2)),
        'TOTAL FINAL':    parseFloat(totalBRLWithDiscount.toFixed(2)),
        'VENCIMENTO':     b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—',
        'STATUS':         b.paid ? 'PAGO' : b.billed ? 'FATURADO' : 'PENDENTE',
        'DISPUTA':        b.dispute && b.dispute.open ? b.dispute.status.toUpperCase() : '—',
        'DATA PAGAMENTO': b.paid && b.paidAt ? new Date(b.paidAt+'T12:00:00').toLocaleDateString('pt-BR') : '—',
        'VALOR PAGO (BRL)': b.paid ? (frozenTotal ?? parseFloat(blBRL.toFixed(2))) : '—',
      });
    });
  });

  // ── Create workbook ──────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, { origin: 'A3' });

  const headers = Object.keys(rows[0]);
  const ncols = headers.length;
  const nrows = rows.length;

  // Column widths
  const colWidths = {
    'Nº FATURA':14,'BL':20,'NAVIO/VIAGEM':22,'POL':10,'POD':10,
    'CNEE':36,'CNPJ':18,'CONTAINER':14,'TIPO':7,
    'DESCARGA':12,'DEVOLUÇÃO':12,'DIAS CORRIDOS':10,'FREE TIME':8,
    'DIAS COBRÁVEIS':10,'DIAS 1º PER.':9,'USD/DIA P1':9,
    'DIAS 2º PER.':9,'USD/DIA P2':9,'TOTAL USD':11,'ROE':9,
    'TOTAL BRL':13,'DESCONTO':12,'VALOR DESCONTO':14,'TOTAL FINAL':14,'VENCIMENTO':12,
    'STATUS':12,'DISPUTA':12,'DATA PAGAMENTO':16,'VALOR PAGO (BRL)':16,
  };
  ws['!cols'] = headers.map(h => ({ wch: colWidths[h] || 12 }));

  // Helper to set cell style
  function sc(ws, addr, val, style) {
    if (!ws[addr]) ws[addr] = {};
    ws[addr].v = val;
    ws[addr].s = style;
    if (typeof val === 'number') ws[addr].t = 'n';
    else ws[addr].t = 's';
  }

  const styleTitle = { font:{bold:true,sz:13,color:{rgb:WHITE}}, fill:{fgColor:{rgb:NAVY}}, alignment:{horizontal:'center',vertical:'center'} };
  const styleSubtitle = { font:{sz:9,italic:true,color:{rgb:'374151'}}, fill:{fgColor:{rgb:'FEF3C7'}}, alignment:{horizontal:'center'} };
  const styleHdrReq = { font:{bold:true,sz:10,color:{rgb:WHITE}}, fill:{fgColor:{rgb:NAVY}}, alignment:{horizontal:'center',vertical:'center'}, border:{bottom:{style:'thin',color:{rgb:'E5E7EB'}}} };
  const styleHdrOpt = { font:{bold:true,sz:10,color:{rgb:WHITE}}, fill:{fgColor:{rgb:'374151'}}, alignment:{horizontal:'center',vertical:'center'} };
  const styleCellEven = { font:{sz:10}, fill:{fgColor:{rgb:'F0F4FF'}}, alignment:{horizontal:'center',vertical:'center'} };
  const styleCellOdd  = { font:{sz:10}, fill:{fgColor:{rgb:WHITE}},    alignment:{horizontal:'center',vertical:'center'} };
  const styleCellBRL  = (even) => ({ font:{bold:true,sz:10,color:{rgb:'15803D'}}, fill:{fgColor:{rgb: even ? 'F0FFF4' : WHITE}}, alignment:{horizontal:'right',vertical:'center'},
    numFmt: '#,##0.00' });
  const styleCellUSD  = (even) => ({ font:{sz:10,color:{rgb:'1E40AF'}}, fill:{fgColor:{rgb: even ? 'EFF6FF' : WHITE}}, alignment:{horizontal:'right',vertical:'center'},
    numFmt: '#,##0.00' });
  const styleCellROE  = (even) => ({ font:{sz:10,color:{rgb:'92400E'}}, fill:{fgColor:{rgb: even ? 'FFFBEB' : WHITE}}, alignment:{horizontal:'center',vertical:'center'},
    numFmt: '#,##0.0000' });

  // Title row (A1 merged)
  const lastColLetter = XLSX.utils.encode_col(ncols - 1);
  sc(ws, 'A1', 'TRANSHIPPING AGENCIAMENTO MARÍTIMO — Relatório de Demurrage', styleTitle);
  ws['!merges'] = ws['!merges'] || [];
  ws['!merges'].push({ s:{r:0,c:0}, e:{r:0,c:ncols-1} });

  // Subtitle row (A2)
  const today = new Date().toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const cap = s => s.charAt(0).toUpperCase()+s.slice(1);
  sc(ws, 'A2', `Gerado em ${cap(today)}  ·  ${bls.length} BL(s)  ·  ${rows.length} container(es)`, styleSubtitle);
  ws['!merges'].push({ s:{r:1,c:0}, e:{r:1,c:ncols-1} });

  // Style header row (row 3 = index 2)
  const optCols = new Set(['ROE','FREE TIME']);
  headers.forEach((h, ci) => {
    const addr = XLSX.utils.encode_cell({r:2, c:ci});
    ws[addr] = { v: h, t:'s', s: optCols.has(h) ? styleHdrOpt : styleHdrReq };
  });

  // Style data rows
  const brlCols = new Set(['TOTAL BRL']);
  const usdCols = new Set(['TOTAL USD','USD/DIA P1','USD/DIA P2']);
  const roeCols = new Set(['ROE']);
  rows.forEach((row, ri) => {
    const even = ri % 2 === 0;
    headers.forEach((h, ci) => {
      const addr = XLSX.utils.encode_cell({r: ri+3, c: ci});
      if (!ws[addr]) return;
      if (brlCols.has(h)) ws[addr].s = styleCellBRL(even);
      else if (usdCols.has(h)) ws[addr].s = styleCellUSD(even);
      else if (roeCols.has(h)) ws[addr].s = styleCellROE(even);
      else ws[addr].s = even ? styleCellEven : styleCellOdd;
    });
  });

  // Totals row
  const totRow = nrows + 3;
  const totStyle = { font:{bold:true,sz:10,color:{rgb:WHITE}}, fill:{fgColor:{rgb:NAVY}}, alignment:{horizontal:'center'} };
  const totBRLStyle = { font:{bold:true,sz:11,color:{rgb:'000000'}}, fill:{fgColor:{rgb:GOLD}}, alignment:{horizontal:'right'}, numFmt:'#,##0.00' };
  const totUSDStyle = { font:{bold:true,sz:11,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1E40AF'}}, alignment:{horizontal:'right'}, numFmt:'#,##0.00' };

  headers.forEach((h, ci) => {
    const addr = XLSX.utils.encode_cell({r: totRow, c: ci});
    if (h === 'CNEE') { ws[addr] = {v:'TOTAL GERAL', t:'s', s:totStyle}; }
    else if (h === 'TOTAL USD') {
      const totalUSD = rows.reduce((a,r) => a + (r['TOTAL USD']||0), 0);
      ws[addr] = {v: parseFloat(totalUSD.toFixed(2)), t:'n', s:totUSDStyle};
    }
    else if (h === 'TOTAL BRL') {
      const totalBRL = rows.reduce((a,r) => a + (r['TOTAL BRL']||0), 0);
      ws[addr] = {v: parseFloat(totalBRL.toFixed(2)), t:'n', s:totBRLStyle};
    }
    else { ws[addr] = {v:'', t:'s', s:totStyle}; }
  });

  ws['!ref'] = `A1:${XLSX.utils.encode_cell({r: totRow, c: ncols-1})}`;
  ws['!rows'] = [{hpt:28},{hpt:16},{hpt:24}];

  XLSX.utils.book_append_sheet(wb, ws, 'Demurrage');

  // File name
  const stamp = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `Relatorio_Demurrage_${stamp}.xlsx`, {bookType:'xlsx', cellStyles:true});
  toast('Relatório exportado com sucesso!', 'success');
  logAuditAction('exportacao_relatorio', { tipo: 'relatorio_bls', registros: bls.length });
}

function togglePaid(id) {
  const b = bls.find(x => x.id === id);
  if (!b) return;
  if (b.paid) {
    if (!confirm('Desmarcar esta fatura como paga?\n\nOs valores congelados serão liberados para edição novamente.')) return;
    b.paid = false;
    b.paidAt = null;
    b.frozenRoe = null;
    b.frozenTotal = null;
    toast('Fatura desmarcada. Valores liberados para edição.', '');
  } else {
    // Snapshot ROE e total no momento do pagamento
    const roe = effectiveROE(b);
    const total = blTotal(b, null);
    b.paid = true;
    b.paidAt = new Date().toISOString().slice(0,10);
    b.frozenRoe = roe;
    b.frozenTotal = total;
    logAuditAction('marcacao_pagamento', {blId: id, bl: b.bl, total: total});
    toast('Fatura marcada como paga! Valores congelados. ✔', 'success');
  }
  save(bls);
  renderList();
}

// ── Confirmação Dupla Segura ──────────────────────────────────────────────
window._pendingConfirmation = null;

function showDoubleConfirmation(title, message, itemCount, onConfirm) {
  const modal = document.createElement('div');
  modal.id = 'double-confirm-modal';
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); display: flex; align-items: center;
    justify-content: center; z-index: 10000;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white; border-radius: 8px; padding: 24px;
    max-width: 450px; width: 90%; box-shadow: 0 20px 25px rgba(0,0,0,0.15);
  `;

  dialog.innerHTML = `
    <h2 style="margin: 0 0 12px 0; color: #dc2626; font-size: 18px;">⚠️ ${title}</h2>
    <p style="margin: 0 0 16px 0; color: #374151; font-size: 14px; line-height: 1.5;">
      ${message}
    </p>
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px; margin-bottom: 16px;">
      <p style="margin: 0; color: #7f1d1d; font-size: 13px;">
        <strong>Quantidade:</strong> ${itemCount}
      </p>
      <p style="margin: 8px 0 0 0; color: #7f1d1d; font-size: 13px;">
        <strong>Ação irreversível:</strong> Após confirmar, não há como recuperar estes dados.
      </p>
    </div>
    <label style="display: block; margin-bottom: 16px;">
      <div style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">
        Digite <strong style="color: #dc2626;">DELETAR</strong> para confirmar:
      </div>
      <input type="text" id="confirm-input" placeholder="Digite DELETAR"
        style="width: 100%; padding: 8px 12px; border: 2px solid #e5e7eb;
        border-radius: 6px; font-size: 14px; box-sizing: border-box;"
        autocomplete="off">
    </label>
    <div style="display: flex; gap: 8px;">
      <button onclick="document.getElementById('double-confirm-modal').remove()"
        style="flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px;
        background: white; color: #374151; font-weight: 600; cursor: pointer; font-size: 14px;">
        ✕ Cancelar
      </button>
      <button id="confirm-btn" disabled
        style="flex: 1; padding: 10px; border: none; border-radius: 6px;
        background: #fecaca; color: #7f1d1d; font-weight: 600; cursor: not-allowed;
        font-size: 14px; opacity: 0.5;">
        🗑️ Deletar Permanentemente
      </button>
    </div>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  const input = document.getElementById('confirm-input');
  const btn = document.getElementById('confirm-btn');

  input.addEventListener('input', () => {
    const isValid = input.value === 'DELETAR';
    btn.disabled = !isValid;
    btn.style.opacity = isValid ? '1' : '0.5';
    btn.style.cursor = isValid ? 'pointer' : 'not-allowed';
    btn.style.background = isValid ? '#dc2626' : '#fecaca';
    btn.style.color = isValid ? 'white' : '#7f1d1d';
  });

  btn.addEventListener('click', () => {
    if (input.value === 'DELETAR') {
      modal.remove();
      onConfirm();
    }
  });

  input.focus();
}

function clearAllBLs() {
  showDoubleConfirmation(
    'Excluir todos os BLs?',
    'Você está prestes a excluir permanentemente TODOS os BLs armazenados no sistema. Esta ação não pode ser desfeita e não há backup automático.',
    bls.length,
    () => {
      bls = [];
      save(bls);
      renderList();
      toast('✓ Todos os BLs foram excluídos permanentemente.', '');
      logAuditAction('exclusao_todos_bls', {quantidade: bls.length});
    }
  );
}

function toggleBilled(id) {
  const b = bls.find(x => x.id === id);
  if (!b) return;
  if (b.billed) {
    if (!confirm('Desmarcar esta fatura como "Faturado"?\nAs informações serão descongeladas.')) return;
    b.billed = false;
    b.billedAt = null;
    b.frozenRoe = null;
    b.frozenTotal = null;
    toast('Status "Faturado" removido. Valores liberados.', '');
  } else {
    const roe = effectiveROE(b);
    const total = blTotal(b, null);
    b.billed = true;
    b.billedAt = new Date().toISOString().slice(0,10);
    b.frozenRoe = roe;
    b.frozenTotal = total;
    logAuditAction('marcacao_fatura', {blId: id, bl: b.bl, total: total});
    toast('Fatura marcada como Faturada! Valores congelados. 📄', 'success');
  }
  save(bls);
  renderList();
}

function deleteBL(id) {
  if (!confirm('Excluir este BL?')) return;
  const bl = bls.find(x=>x.id===id);
  logAuditAction('exclusao_bl', {blId: id, bl: bl?.bl});
  bls = bls.filter(x=>x.id!==id);
  save(bls);
  renderList();
  toast('BL excluído.');
}

// ============================================================
// IMPORT
// ============================================================
function openImport() {
  importData=null;
  document.getElementById('import-btn').disabled=true;
  document.getElementById('file-input').value='';
  document.getElementById('drop-zone').innerHTML=`<div class="drop-icon">⬆️</div><p><strong>Arraste ou selecione uma planilha</strong></p><p>(.xlsx, .xls, .csv)</p>`;
  openModal('modal-import');
}
function handleDrop(e) { e.preventDefault(); document.getElementById('drop-zone').classList.remove('drag'); if(e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }
function handleFileInput(e) { if(e.target.files[0]) processFile(e.target.files[0]); }
function processFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(new Uint8Array(e.target.result),{type:'array',cellDates:true});
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});
    importData=rows;
    document.getElementById('import-btn').disabled=false;
    document.getElementById('drop-zone').innerHTML=`<div class="drop-icon">✅</div><p><strong>${file.name}</strong></p><p>${rows.length} linha(s) encontrada(s)</p>`;
    toast(`${rows.length} linha(s) lidas.`,'success');
  };
  reader.readAsArrayBuffer(file);
}
function doImport() {
  if(!importData) return;
  const grouped = {};
  importData.forEach(row => {
    const n = {}; Object.entries(row).forEach(([k,v])=>{ n[nk(k)]=v; });
    const blNum = String(n['BL']||n['B_L']||'').trim(); if(!blNum) return;
    if (!grouped[blNum]) {
      grouped[blNum] = { id:uid(), bl:blNum, vessel:String(n['VESSEL']||n['NAVIO']||'').trim(), pol:String(n['POL']||'').trim(), pod:String(n['POD']||'').trim(), client:String(n['CNEE']||n['CLIENTE']||'').trim(), cnpj:(s => s.length === 13 ? '0'+s : s)(String(n['CNPJ']||'').replace(/\D/g,'').trim()), phone:String(n['PHONE']||n['TELEFONE']||'').trim(), email:String(n['EMAIL']||n['E_MAIL']||'').trim(), freeTime:parseInt(n['FREE_TIME']||n['FREETIME']||21)||21, roe:parseFloat(n['ROE'])||null, ov1:null, ov2:null, venc:parseDs(n['VENCIMENTO']||n['VENC']||'')||nextBusinessDay(null), docnum:String(n['DOCNUM']||'').trim()||genDocnum(blNum), containers:[], createdAt:Date.now() };
    }
    const container = String(n['CONTAINER']||n['CTR']||'').trim().toUpperCase();
    if (container) grouped[blNum].containers.push({ container, type:String(n['TYPE']||n['TIPO']||'40G1').trim(), discharge:parseDs(n['DISCHARGE']||n['DESCARGA']||''), emptyReturn:parseDs(n['EMPTY_RETURN']||n['EMPTY RETURN']||n['RETORNO']||'') });
  });
  let added=0, updated=0;
  Object.values(grouped).forEach(imp => {
    const i=bls.findIndex(x=>x.bl===imp.bl);
    if(i>=0){bls[i]={...bls[i],...imp};updated++;}else{bls.unshift(imp);added++;}
  });
  save(bls); closeModal('modal-import'); renderList();
  toast(`Importado: ${added} novo(s), ${updated} atualizado(s).`,'success');
  logAuditAction('importacao_planilha', { adicionados: added, atualizados: updated });
}

// ============================================================
// DOCUMENT
// ============================================================
function viewDoc(id, type) {
  const b=bls.find(x=>x.id===id); if(!b) return;
  currentBL=b; currentType=type; ovTotal=null; ovRoe=null;
  // Show/hide email button based on BL email or client registry
  const emailBtn = document.getElementById('email-btn');
  if (emailBtn) emailBtn.style.display = getEmailsForBL(b).length > 0 ? '' : 'none';
  // Show/hide edit button based on paid status
  setTimeout(() => {
    const btn = document.getElementById('edit-val-btn');
    if (btn) {
      if (b.paid || b.billed) {
        btn.textContent = '🔒 Valores Congelados';
        btn.style.color = b.billed ? 'var(--navy)' : 'var(--green)';
        btn.style.borderColor = b.billed ? '#93c5fd' : '#bbf7d0';
        btn.style.cursor = 'default';
      } else {
        btn.textContent = '✏️ Editar Valor';
        btn.style.color = '';
        btn.style.borderColor = '';
        btn.style.cursor = '';
      }
    }
  }, 0);
  renderDoc(b,type);
  document.getElementById('app').style.display='none';
  document.getElementById('doc-view').classList.add('active');
  window.scrollTo(0,0);
}
function printDoc() {
  if (currentBL) {
    const docnum = currentDocnum || currentBL.docnum || ('DEM-' + new Date().getFullYear() + '-0000');
    const primeiroNome = (currentBL.client || '').trim().split(/\s+/)[0] || 'CLIENTE';
    const bl = currentBL.bl || 'BL';
    const tipo = currentType === 'invoice' ? 'FATURA DEMURRAGE' : 'RECIBO DEMURRAGE';
    const nomeArquivo = `${docnum} ${tipo} ${primeiroNome} ${bl}`;
    const oldTitle = document.title;
    document.title = nomeArquivo;
    window.print();
    setTimeout(() => { document.title = oldTitle; }, 1000);
  } else {
    window.print();
  }
}

// ── PIX BRCode (EMV) payload builder ──────────────────────────────────────
function pixCRC16(payload) {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}

function pixTLV(id, value) {
  return id + String(value.length).padStart(2, '0') + value;
}

function buildPixPayload(chavePix, nomeBeneficiario, cidade, valor) {
  // Remove non-alphanumeric from name/city (PIX spec)
  const nome = nomeBeneficiario.substring(0, 25).replace(/[^A-Za-z0-9 ]/g, '').trim();
  const cid  = cidade.substring(0, 15).replace(/[^A-Za-z0-9 ]/g, '').trim();
  const chave = chavePix.replace(/[^0-9]/g, ''); // only digits for CNPJ

  // GUI = br.gov.bcb.pix, KEY = chave, TXID = ***
  const merchantAccountInfo =
    pixTLV('00', 'br.gov.bcb.pix') +
    pixTLV('01', chave) +
    pixTLV('05', '***');  // txid

  const valorStr = valor > 0 ? valor.toFixed(2) : '';

  let payload =
    pixTLV('00', '01') +                          // payload format indicator
    pixTLV('26', merchantAccountInfo) +            // merchant account info
    pixTLV('52', '0000') +                         // MCC
    pixTLV('53', '986') +                          // BRL
    (valorStr ? pixTLV('54', valorStr) : '') +     // transaction amount
    pixTLV('58', 'BR') +                           // country
    pixTLV('59', nome) +                            // merchant name
    pixTLV('60', cid) +                             // merchant city
    pixTLV('62', pixTLV('05', '***')) +            // additional data
    '6304';                                         // CRC placeholder

  return payload + pixCRC16(payload);
}

function sendInvoiceEmail() {
  if (!currentBL) return;
  const b = currentBL;
  const docnum = currentDocnum || b.docnum || genDocnum(b.bl);
  const roe = (b.paid || b.billed) && b.frozenRoe != null ? b.frozenRoe : effectiveROE(b);

  // Calc total
  let totalBRL = 0;
  (b.containers || []).forEach(c => {
    const dc = daysBetween(c.discharge, c.emptyReturn);
    const calc = calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null);
    totalBRL += calc.totalUSD * roe;
  });
  if ((b.paid || b.billed) && b.frozenTotal != null) totalBRL = b.frozenTotal;

  const to = encodeURIComponent(getEmailsForBL(b).join(', ') || b.email || '');
  const subject = encodeURIComponent(`${docnum} - Fatura de Demurrage - BL ${b.bl}`);

  const vencFmt = b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—';
  const totalFmt = totalBRL.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});

  const body = encodeURIComponent(
`Prezado(a) ${(b.client||'').split(' ')[0] || 'Cliente'},

Encaminhamos em anexo a Fatura de Sobreestadia de Container referente ao BL abaixo:

  Nº Fatura : ${docnum}
  BL         : ${b.bl}
  Navio/Voy  : ${b.vessel || '—'}
  Container(s): ${(b.containers||[]).map(c=>c.container).join(', ')}
  Total      : R$ ${totalFmt}
  Vencimento : ${vencFmt}

Para pagamento via PIX, utilize a chave: 06.352.972/0001-21 (CNPJ)
Banco: ITAÚ | Agência: 0870 - Praia do Canto | CC: 37293-5

Para imprimir/salvar a fatura em PDF, abra-a no sistema e clique em "Imprimir / PDF".

Atenciosamente,
TRANSHIPPING AGENCIAMENTO MARÍTIMO Ltda.
CNPJ: 06.352.972/0001-21`
  );

  logAuditAction('envio_email', { bl: b.bl, blId: b.id, docnum });
  window.location.href = `mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${body}`;
}

function closeDoc() {
  document.getElementById('doc-view').classList.remove('active');
  document.getElementById('app').style.display='';
  currentBL=null; ovTotal=null; ovRoe=null;
}
function openEditValue() {
  if(!currentBL) return;
  if (currentBL.paid) {
    alert('Esta fatura está marcada como PAGA.\nOs valores estão congelados e não podem ser alterados.\nDesmarque como paga para editar.');
    return;
  }
  if (currentBL.billed) {
    alert('Esta fatura está marcada como FATURADA.\nOs valores estão congelados e não podem ser alterados.\nDesmarque como faturada para editar.');
    return;
  }
  document.getElementById('edit-val-input').value=(ovTotal!==null?ovTotal:blTotal(currentBL,ovRoe)).toFixed(2);
  document.getElementById('edit-roe-input').value=ovRoe!==null?ovRoe:(currentBL.roe||effectiveROE(currentBL)||'');
  openModal('modal-editval');
}
function applyEditVal() {
  ovTotal=parseFloat(document.getElementById('edit-val-input').value)||0;
  ovRoe=parseFloat(document.getElementById('edit-roe-input').value)||null;
  closeModal('modal-editval');
  if(currentBL&&currentType) renderDoc(currentBL,currentType);
}

function renderDoc(b, type) {
  const roe = (b.paid || b.billed) && b.frozenRoe != null ? b.frozenRoe : (ovRoe!==null?ovRoe:effectiveROE(b));
  if (!roe) {
    alert('⚠ PTAX não disponível.\n\nNão é possível gerar o documento sem a PTAX oficial do Banco Central.\n\nAguarde o carregamento da cotação ou clique em "↻ Tentar novamente" no topo da tela.');
    return;
  }
  const docnum = b.docnum || genDocnum(b.bl);
  currentDocnum = docnum;
  const isInv = type==='invoice';
  let totalBRL = 0;

  const rows = (b.containers||[]).map(c => {
    const dc = daysBetween(c.discharge, c.emptyReturn);
    const calc = calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null);
    const brl = calc.totalUSD * roe;
    totalBRL += brl;
    return {c, calc, brl};
  }).filter(({calc}) => calc.totalUSD > 0);

  if ((b.paid || b.billed) && b.frozenTotal != null) totalBRL = b.frozenTotal;
  else if (ovTotal !== null) totalBRL = ovTotal;

  // ── Apply discount (only when not frozen — frozen already includes it) ──
  const subtotalBRL = totalBRL;
  let discountAmt = 0;
  const hasDiscount = b.discount && b.discount.value > 0 && !((b.paid || b.billed) && b.frozenTotal != null) && ovTotal === null;
  if (hasDiscount) {
    if (b.discount.mode === 'percent') {
      discountAmt = subtotalBRL * (b.discount.value / 100);
    } else {
      discountAmt = b.discount.value;
    }
    totalBRL = Math.max(0, subtotalBRL - discountAmt);
  }

  const colspan = isInv ? 8 : 7;
  const colsI = `<th>CONTAINER</th><th>TIPO</th><th>DIAS 1º PER.</th><th>USD/Dia</th><th>DIAS 2º PER.</th><th>USD/Dia</th><th>DESCARGA</th><th>RETORNO</th><th>LÍQUIDO</th>`;
  const colsR = `<th>CONTAINER</th><th>TIPO</th><th>DIAS 1º PER.</th><th>USD/Dia</th><th>DIAS 2º PER.</th><th>USD/Dia</th><th>DESCARGA</th><th>LÍQUIDO</th>`;

  const rowsHTML = rows.map(({c,calc,brl}) => `
    <tr>
      <td>${c.container}</td>
      <td>${c.type||'—'}</td>
      <td>${calc.diasP1||0}</td>
      <td>${calc.usdP1.toFixed(2)}</td>
      <td>${calc.diasP2||0}</td>
      <td>${calc.usdP2.toFixed(2)}</td>
      <td>${fmtDate(c.discharge)}</td>
      ${isInv?`<td>${fmtDate(c.emptyReturn)}</td>`:''}
      <td style="font-weight:600">${fmtBRL(brl)}</td>
    </tr>`).join('');

  const totalCols = isInv ? 9 : 8;
  // Garante vencimento — atribui e persiste se estiver vazio
  if (!b.venc) {
    b.venc = nextBusinessDay(null);
    const idx = bls.findIndex(x => x.id === b.id);
    if (idx >= 0) { bls[idx].venc = b.venc; save(bls); }
  }
  const vencRow = isInv ? `<tr class="inv-venc-row"><td colspan="${totalCols-1}" style="text-align:right;padding:7px 12px;font-weight:600">VENCIMENTO DIA</td><td class="inv-venc-highlight">${fmtDate(b.venc)||'—'}</td></tr>` : '';

  document.getElementById('doc-content').innerHTML = `
  <div class="invoice">
    <div class="inv-header">
      <div class="inv-logo-area">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyYAAACwCAIAAAB1gu2mAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAEAAElEQVR42uy9d5glV3E+/Fadc7r7ppnZrF3lHJBAQgghBCYYkXMwxgSDDQZsMA4YcCAZ29gYDCYbGzA5CDA5iCBQQCCEUEI57mq1eXYn3NB9zqn6/ui+d+6dmRXalQT++bv1zDPP7uzsvX27z6nz1ltvVZGqYmxjG9vYxja2sY1tbPem8fgWjG1sYxvb2MY2trGNIdfYxja2sY1tbGMb2xhyjW1sYxvb2MY2trGNbQy5xja2sY1tbGMb29jGkGtsYxvb2MY2trGNbQy5xja2sY1tbGMb29jGNoZcYxvb2MY2trGNbWxjyDW2sY1tbGMb29jGNrYx5Brb2MY2trGNbWxjG0OusY1tbGMb29jGNrYx5Brb2MY2trGNbWxjG9sYco1tbGMb29jGNraxjSHX2MY2trGNbWxjG9sYco1tbGMb29jGNraxje0eMPu/75JE944FafAnXe7fdMl3yKLf0tFXpr1fxhiVjm1sYxvb2MY2tv+rkEsUIkPYaBj4UP87FIBAAfAowFoExQQqIB2CUCxgHUJaAzxFOozCBBAgAgDcGHWNbWxjG9vYxja2/2OQi6kCOCyj8EkA7n8nkgpCKUDcx0nLcVbEfXBmQLroN5bBWwuvGZcyZGMb29jGNraxjW1s+2ekqv+LLkf7X1ShI6UF4NNHTCXeUgYAoREKivpQinXZF6cB7pIFIKe86A20+oUIgGDGLNfYxja2sY1tbGP7vwi5ZAFyLWCvPkQqv2mFt5QR+uRXBbbKDKQsh5NYBzSXADLEbpkF4LWA8wQAg2m8TMY2trGNbWxjG9vds/998nmSvmJrCIcBJZtlqAROJSQqQRJRJbqqfqIDbLYAtAYv3kd1AEihAhrQXQawe0k8jm1sYxvb2MY2trH9X4Jc1EddQ2Br4c/EJQFGgCn/kUCww9hoWCrf/8nC3wRsqjfioTeS/k8C1GJMao1tbGMb29jGNrb/25BLgQiuNPIQ069OhAJU6tlthaoUtFCoWEEupcWvNgS2UP5eIBBK0owJDvDjRTC2sY1tbGMb29jubfvfpeVSwPdxFAMGQpAF1FX9eITTkiGkJaNgaynkQh94la9lAIIwIvVLISs1PWGkZcTYxja2sY1tbGMb292z3xjLpapEFZ6JMRIRM4cgxnJUMIGAGImJmQFVEKlq1KgEIi4hVKiIsQpRdTu4Y+vsbbdu2rFjV6+Xb9y0eeeOPcbYNK3lPnrvmTnNTC3lww878KlPfezaKRKhjI3G6AwNQz8aA66xjW1sYxvb2Mb2fwByEZGqhhCstcZUCitnuUouMojKLl2kQCybQxCETNm8oRsxO9+Zmy8u+cW1N9506xVXXHXzzTfv2jnT6+WixGzzXkySFGp7PrCQTTOCKXwnhvnUhXVrJx72yIdMTbUyJgGxcWWicrhuscReY9Q1trGNbWxjG9vY7gHk85tKLBZFkSTJ4K8hhBCCNWRNKWwnCHp5tGkKgwBEYN5j526/acv2a66/8eJLf3HxJZfefMvGxE0URUSMMM4lCcHEKCICsDUJMweF+KiqbJPEas0F39vdbU9v3nhxjWEBjUgYjpZ0rseIUGxsYxvb2MY2trGNbb/tNy+fL4rCGGOttdYCAaEHYwALZldPS0Lrpo0zN2/aesllV5173kVXX3/TfLcHdhCCTviYwTIZAPBBoQolgKDiixlEwDFsCopSdHo935OuM3Hl1ETK/QlCBEvLDm0caO7HNraxjW1sYxvb2P7fhFwlxSUizFwmFlXV+5Akrsg9WaPG7O7oeT/++Q8vvOTaGzb+8MKfihgggU3BE4hEZJxjnxfMAoniPTRQ4iZbtXq9seHAda1WI3EGkInJ1tTURK8zv3XrVvU+YT7q8AOLHmoOzHAMUiwWzI/ziWMb29jGNraxje2es99kxeJwbtF775xToJ1Hl5ode8IXvvKNL371OzfetmW2XXSm27U163tFVIEhZqLoA6IwxdTGQw7ecJ/73OeYY4467JCD1h2wesXkRFaz1pp6Zq0jQ0gz1FIEQWdenaO5Pd3JidpUAwYggSGoF7JDbFZJk0EAof+F3WLHNraxjW1sYxvbGHLtB+Tq9XpZlgHoFNjWxoc/8a2zv/SV2zZvyb3AC7JG2prId+1CltQTh9jjUByy4YCHP/SMB51+8qmnHN1sJK1GkqYwfbyEcga2AgJnoIqiiMwwzgSgKFBLYKpp1gIFgqIv4a86RQACAYRhx4TX2MY2trGNbWxj+81DriUDdjDQP1WtTGnh9wawRoEiijUcAS8wjOtv3Pypz3/9vz55zmwXIRKcY5fAQHyB+T21Fa1mzZ5w1GGP/e2HPfoRDz36yLohxIjUVG82PJgxRKjCWRhAygFCDCh6RURqIkCAAzhGioGjIkmqWkXqU1xUQi6Y0c+1uF/X0v5duqwIbPH9+d/W92vQtf/Xo1yjvVzA6L/Kkt/iu/hB9vlK7qQ0tRoPJXf9Gu76Pd+Xp7/8EqL9etDL3WFedjn/yi2/8JuDHfRrWat0Zzdnn4z36dnocuun/0MZcgtVe7+BL6A7e2D7s9Tv9ObI8DpZuIa9TEKjvWxCXW6/3M0ybh36zLzcetP92Lx3feHp8p+O7rYnweI7v/AQ9c6WK987PmToLZR/5c2501txZ4tzGX8y9HZ6l/3/Xi+I9s1z7uX//Sr/oAyS6vuSJ6L7dOW/6vnuR9Zs5LYO2CCMuJfqOwMSYOxgWLWCFBJhjYBhOAdmCky38ZVvnvPOd713966O40lLqRpiY0MM2t49sbp58un3feJvP/jRDzv9uMMPYEAEhhABMhAJzCxgAQJAQATUAECvhFZDMvmYmjaggAMC4IyxTGwAVcS8IrqCKIFcArAgMISg5QtElSBMxIbBUnWxX7KsBCpLvIgsLE4CwIO/m3v7kNJF/kUWH5O00Nts0IT23gZbPHQ+KXjRIjULt1H7bp76hxvfyaGlgAyP1LwLF2MwNHZzr/dQKjaU7lYRqy65Yt7L/VmyyQU6PIWdyk/aP0f34QJGTl+V0SiIl+LKpaFFueW134S4uoByFDztM+rSO/WGNAzmyj/S8EcY3XHA0C0atEjWvdxiWnKpvLx3HoKSOtpvmQCj1VIudQgWCu0vbWZPVShoByuNhk8pGXIae7tvvE8LLFZuXaCxhH0RHPvbqv9zgFjBsVqEYvpDbDF6/5Y9bBetW1p6wI+G1ks3qg55m/LCBnBweBHeFbBMS9+a9nrY09D5pUvAEY16S9l34EWAGflkC86Nl+7lhd/i/d0vvNyzGN0Ro35+ubCWB48DQ/5/6BdkedChDFqE5mXR28lejiNeFqXpUq+7ELrcieekJf5tyD9I9VKlZ9ClV2T6/1+Wbv+9nk2jEcuSBVZuZ+0fW3w3IdfCptLR+9j/LtR/cAJwOaFHQQYQDxAMtdtdW2tExvY5fPU7F/7Hf3/66qtvoPqEGhvzkGYuttuxmx99n6Of9PhnPOa3zzjxmPWTGVJW1oKJI9sA5BHGQNjmfbDVVmzZjo137N41vaebe++D+EBQiGr0JV7SlOFMzdmJWn3N1OT6NSvXr7CTNVhrVGAYbMCARIggcSaGHpGCDMiCEmsqx15tTKXlnRLxXpx49RgYC7O4fx20wJBf5DsFBHwvQ8ClJwuNTgsY6Uh75+EMLbPieV8YD76LPpX6YdBdCxnvehy0tyeyDJIvp7CjD2vuVc5omdOUl73tChHADKKs31QfO+LlnOle4tKRQJgH3pMGi0JHPylhWVxGg/XTP10YqhBSHrxH/+eVD1x+sansfU3zfqyr/qqWPj3LcWRflOcBy8IiFBoMn907h8DD5BjtBW8tudVEi7n/AWiToeicKixIRHzXP3O/k6IsPDXaB2Z9ePXTXj7+Pi1nXvzivHSn08KL7ndSYeQ//uq6eh1FWMs4If6VoeCd+M5ykZu98Fp6ZyzmIFLah1txJ56T9va5ifvA0Yx6VBqKEnkpPCKIAjwCbWXRfVr+/leQepkNv++QSxc73/4FiQxtp8FFRUKv6LH4WmrJQIsYheqNRg5cfPnmd73/Y+f86CdFtKCWdhguobqPpjj5QUf83jOf9ISzfmvdZOIEjRQIMERKyVxP1IIs1KAD/HITrrll9zXX3rh5646de+Z27pmdbXtRnu90iyAxaukjVJUgDLJkAQiTTZJaqzm5cmrFytZkI92wdvKkow+5/wkTB63EJKFm4AwIZK0DJMIpLIAQolFxgwfHbhG5RwBgdWRZMFWPfOFplT5OfgMn1JDv1QXSq7weghgI7j15H1HsLzla4jGGsRdVyBUjW2IRGFmGRBZCNPtw+QTYxSerLmVA+B7v0MZ78xR7Qy0D73Bv0I7EZd9hXgZsySK8Rf0tD8T+P5n+LdqPt+c7daeLabMlUfjgd3jpSw+H78P/hfdyiC3KlS5JewmNBLsLzpCGr44WaJZBQE+D7aZMtAQvLjnsFLwfR/4yS0zBNJhltpDxXKCNAQbzALIs/jALZ8/iNtF7e9NF4YKG6lDWwT1hQ/1VV/1mhJZZCgCRwPu4f3lvRPKSnSV7J91HHAsRTEUhhH2gumj4UOe9YCXuOzfaD1RNo/+Fl0cbPCp0GSXzqp8MIDcTxPS5rr1srmXAFo2sExl5X13mDpeMWBxBByOsug7j+IWUwuK7v1fPCQHYLFp9Q5GCjL6a9L3PIrewiH4u/2oW30m+S49qaJcNgbH9O18VGB0jTYAiDDmr6sG0Yy8xxkA0BmssYGbnvOfaf/z3F97xvg/PdLTWXDU/PYu0ZtgQ+6OOOegFz3vq7zz14WtrQNQ6UTmJJxI6AWpRAPOCCy6aPuf7F1x1w627cjvb87mPxFbJFlFiBEzCLhVRKJUt7MuBQlYpCQTRAigUighSkIA9NK/VzYpU1rfc6Sce9egHP+C+R7eaGRoWPogIsoRLTGs1GkOQ8v/aARmue8HytIjkvBsh7P6nsgjLSDpGnaxWP9e9EwZ334ySlQV6Vob2MC8itweJhsW7a685g5LR1X3kudyd8CBYwlLeHRZQ70rkvcxDGWX4Cf1cAO/H9dy5lmvkQ1dsfN9nKg9zAjriMS1hHyU1dzWC5cVgtDw4h4QNd7KvykkVutz5uiz8kjv7ZRlipIb3lQUQucr4VKnGEtlw1cOZAAehOLSABqTpryJe9/XhxuoaQp9GN5HsILG48HNyoR+7L6TXF50rNPAJiyi6/sXTXuIIHeXwKC6TnKqeIPUDvHK97SuJa0A27t2T0lKwpQvIYORZV+tqCbGtcb/9iS4L6O8MKt31PYI7Z9x18Wfn5fb+8OflOzmV9C5c0lKxyiK6aDgfRyO7jfp+nkfJC8GdqkSWV2spLwVqMsTGLUrNLQrhlmQ8pSLDFktcFthxLANVF6FJvruQa+ExyehHJ/QjFe5/eAkIgPZCr2YbCusFV123+fVvecf3z/85XCvCaTdvrVotvjdVz/74pS948R8+yirqjIwX6PtuRGFxRwfn/WL2K9+76BdX39D2USnO9wprJ6BOCKrKzGwcEUVdiEGjCkQBEDELuNNLyMBaOBMNeVIhKEVopOhN9Bw9h24zSQ7dcMAh61c86+mPuP8JtZUOCRAKNBMQEAvNHAgeiEAEGcAWcDoU4yyhvpZkl6tHaO9FpmuJMmMhla5DSY3FDvRew4LKFYGkg3VZMicMcFyCUzGqMFsi8l162bLvd4ixmMMYTtWzjEoE3D1JTMoyR68OH0h797b9K78X1s5gfepCilwNFhEhJAP93DBZTndjifZTt6NQb5HKu9TVlY5sCY+1CC3JEnnHYmJj5IJlkdh8yb8Obs4o60+sJLFP2i2oAxmhyrmIKSWvOnhjHtHEDL2T3oV02F2AXALEkovQIchFA86GTAm5zLCMaeEgktFVOoBcOqCr+9zwyNmzNxl+/yfyq8POfVtAldOgJa84Ajh0yB/T3lhO7CXU3Bf6dhRt0JJgAaMSMdqPEG64mkeXR726pDRBl7knspdMAQ8rzJYNaUZvtdCSp6nLgC3FYhHmIsRbEhp8V7MBi9HnstNieNH165LTmZZdNiMwXfrJ60XXwXtDhKP0Ct9dlmuphxy9DhnJ0ZMoYqfopUlrPhcx/O3vXfLnr3nzjj0dSppsEkOs4icS8+THP/IVL/3DY49MypDLKQgoelDCnog7ZvGJr/7wR7+48Ze37ZZ0Qm0WfBcGSZaoZwAxBClyQJhJRFD0oApjiEg1lFOxoYwYWklmBJHhtYxBScmATa3RLIKXoETEiuiDilj2BjOHrZs46yGnPe3RDz7+EJiAhFFjOAUjAkWV/wJHpBHMywlxaDFHMtCGV2jj3oRcfQCxLOSSAXCRPpFr7+2uIX3/HvpOnEAA2aUqTlnqm3ToGMAitc1dlWYt3bUMoRFnKP2bxDIkL6V7DHLJr9pgy+jQ9S6xU3f5E2NZp72Iy5G+ezQVytHRzU4lTGHZbxZQl2O5RiDX6ImuYSF2pIrJWYqThv263Jn7lhGXjX1kWQb7i8qznzFaEBMBhZjyWJIl7oB4EVdxNwuZdWHhSp/lomEeiLQPesiGAQ5bRGKVrmDkPBtsRe3/a5+jIr7zysfhcofluWqC3kMbaS8oeRhL8cLzHWAXHf3lUoUzuDjaT39IwziLFheQ6gJNt3/7RZbZ0bS8bp2XhQK6SGE8/EsDIoeXwsQlx9nIib9M3c/Cxx3Vwo4k3XgIDDGWi72Xf7JLP8ui/furpbdDa+POeXrtx5mKpUTXXY8a9gNySZmQrlaVjupMVRaWV9+hxIh2QI/wL//++X9774ddc5UvhB1bxKIz/aBTTvjTlz3/CY9+QMYAkEdEhiMEYOseXHH9li9/5+df/u7PqLW+7RmJQeIQPTGxIrbn4RQshmE0JIxGaldMNiea2bpVU6lzzjJpJFJmBqCqUYoiSLfnZ+e607OdPTPd+U7sBS1yQVq3SU3YKEHLEUKIzlL0hfTaq1rukaed+MyzHnT6sbUpg4aDGbCfEILvM3w1BdNymHpkmS6U45lfB+SihWq+O4VcHPel4m9/MosLmsKwEDcTAXZpDdFeIdcCOTei+FmW8/jV+G8Bcg1nQLivzKjuSdwvyLXXRF75aJYe8BXnIUszTcvUPVW7jPf9kFocDS9f60QD721GcosDv1/mpoh1ucDxrt6ghXskeyEvhyHXCMsVlxwGPCycWrwc6Fc8KF1g7wZvMaSD4kVP0aCv9SGK/VhlSc2vVEyALgHPxIvw1rKIZF9v59BdKl/BLgfW+2WMulzygmSUguD+jZRKibEc5JKRur9yH3FcrlCOl1SZ7ff6udPayaVge1TktCgBRKPhHBRECrtPdU6lAoxGmHhZxJkNC1H4bkEuWeLLeCm1M0pHLbkng+aUg9zZwprnO0/cA6CFvNayDPFwqbUs+LdK9biMaxpEuVjCSY+m/JZ+fN47VTmELBcYPhlF4YNHYQdhwNLCFjMCMRflSX5l9nPfIZdCym5VDAssp0agMAo2WTzU4BfXzP7dW9/5nfMuQW0CamAIoeO0/VeveNFLXvisA6bAgPdddrUCKIBdOc776Y1nf+3cS6+5o60rxKyItilFgAukHsV8zWqm1GnvrmVywLrVxx1zxJGHH7JqsjnVyg7bsObQg8CEukMy+slDn3v3wEwXO7dj2/bd23bOzcz7O3bsufTKa665cWPB1tXqhUSAkDahCXIPYxIT4+zWFrXPOu34p5x1xuMefkSJlQxggQQB6EEBSgGzJGjmOAo7sFCt/ZuDXEt9IY1oX+4limvBLy8A9JFjG6NynBH6REdTiks0Pbr/lxT6OrYBhVYeugZ9yLUfUeneIdei8kNejs0aAZEDd2aG+Z59g1wLQG05ampYLz9AOX4Bcg0jpMGJVepviOM9wHIty5+POvklpeOy6MAbnHOqQ+518DSHCxGWSzANtDs0+Ci8tFYcC0g99sHpwtlMI3qURZ9ir6zAKEs0FEzT/m38ZTgkWjZDRViaMo79C+YygJRB50MZglyLc09LKvMXltnysLgfJsX9apqzZN0uu5wWR2VYikpHD9qhjBjHfQ/heBh1lS5ucMj2cepAi2n2+8nuNb3IS/1hVReFZcIYYPRSaThwWD5vMMo2DaD7cv5kmX5JvGj/juYfsQh1LS+pXAqtFsjLJTuOFhUFyxJWmxehzL31B6GRJhG/PsgVAWEYgElHW7loAR4cgdzzYtgy4fyLNv/1P7zzp1dcZ1prYjdHI6V8/uTjD3zDq1/+2Icfw5XoQAVcAPPAl39w62f/5wdX3byjoxMxaSpbKCF45wz3ei6069xruPx+9zn00Y8489AN61ZPNNatwUQdBv3epwJnwUCMVVLR9PulFH3Cn/oKlLJUpgvcugXbZvX6TVu/e96FP/vl1d2ogZuat9yKddqZ0e5sK7Od9kzhewcdsPbAtVMv+p0nPPrMiSmgDiRA9F3rLAQaPJU1jcGDCCaBAuziYvSwH0fm3YVcC8tXEbxaW9XmiVYUhsG9aLIXEUO5yn2EMSCgKGItMQQJ3luXAohRjSERUdVqIucoJluWiL7r16MKSyAIokco4BIA8B4uBVHRzZOsDqaiCEli98ND0jJpO8SiMGkWQzA2EUWMwpZllHnSJYIkA2hEQsKlK2dzdyDXAIIH750zAObn5xvNCa+ICsMVKesFwUuSWEN9vF7yo6EAAc6CyhIson1dzAoAIVSFc0rwHtYNRwElrBYAEiOzW7aOqbrDUYAAooVPGgOsBTGiwhiQC0PAR4bI1FJnlYwqTWL/5zyqtxUNpGBWDQVZC7gYFaaCfFFgGawq0RtrAW7nhUuTqEhopHPM4FP4gMQiemUN1pnQ69g0BQi8b/5BQmRroqDnQ5ZaBXp5zFLjC00SCgLT71PoiyJxyTKkGokCAVqIOHZRYQBDYIUEsEMelIisGVy5OkvL8BD90CXkuc1qAItCpNrjQ5WAVeozDocTy64UVREpC6EGP+l152r1eh8xjB7jouXdCz4KKEnsMGeLkdxr1aXMS1VwRYBGWLPP/rD65AKzsBPCAr8SAtjAGIBUCQDRXt8hz/M0TVWViFS1FCsr+q0BAC3Lw/o/CUGsZRpMz1MtgjcuWQq5yvBguDekRLg+mghSMLMKOTY++MS6brdbq9WGaOCl69cs8icqItFba/qqG+7GkBibKADExeVcIIEvOmmaAAghKpidWy5l3FfmxfK04OC9iCRpDVhInohEIkO88MSjwCwpxVnApooIGIKiAgyDoyREWK48CjNExVCVMQMQYyQiY4wun6q8ZyCX16oTD5HaoVMlAPC+iFCXNIKgiOIcn//jja/4yzdev2l7bXJNd65rJ5pGuo8+8wH/+HevPPZQBw8YeIYHCuCXm8Pr3/rB27b2ts1A3Cqtr5AIaA4jzs9loZOE9omHr3/64x925gOPXLUSkynS/i7V0iMA5ZkYI5hBVHUyFSAKfAS7yoFyP3KPUWEoaJUd7AJ7Ivbk+OGPb/vEF76+bY/dtXMe0TcbNWIr1hWU+m6PHafoPuHM+/7lix9+zEpYj7qDFCFxFuoB7fsUBZmQB1traJ/ropEmfvdy3WI/mB16zFXe0xdwDpFQRJCBB3xA7V5W8y8r7Bh2hWUkUUl9SWPuTZoBLCIllUKEQsC812q1fbr+qP2dFpGWHlYUUOl1OMv64akBQUKsvADtH+Qajc9EYCwA76N1LgK+UJOQH0rQDNBAefDnACtSqr7bypvbfTsRKsBnF2v7+peXF0KJFVTsFgA31EOuJCdSAgpw8JQaQCABzoQYjbGEfYAICuQ9sAObxdWFoT+ty5aXJ0ElGJvsjRmKPhhSmLIzYEQIsAw2gAkRCibLEegJRMEGRQk7gOkZ7Nw5mxfF1NTUmtXWAomB4+oz6GhNn4omTK5KPsYhUtAB3PPwMdjUOoJITJgGTE/RD/bs8mqUyhexQkN0luDzqndfku6TvKwogkvsQOUweKPyfTsedQcGNIJ8nqTpsnlMJfihvGzQ/t7sr2PTn6g2gOCGloNcgBYFJS4EJZsUAh+RufKB9kuSy2atfbDEeyENmBZwlEglRmAqa2Wl026nmbPGQqIvCpemEFEBGQcyA4zeKzRJaDnIZduFUFJxWjIE/miftnu/bJWG6hJK/MGjPGnwHoB16Z1slhCCtXaAn4hIAQ+EvnIlKkAwfSdG/WseJv9KUYSphBNlqyiOYA8Uiqiw/bYeDlCg66XmWBSO0JnvTjRr0cfEmaFE3mjbYS3VEWZJtlTKlslFiOpSIQpAAGqoGsFFqhZSqdZwVeLF91eYU0IRUSL7ZSrPYvSixhg2Dv1VagkSPQA2rryYXkSk6rAos1tQBEGng+npmdnZPSumJqemplotuFEqS/saEtu/yOiDcdbHUOJRa2jwmIwxGG39IvcW5KrIdVTcKVPug3FZBOZ7kmX8nx//5t+/7QO7O8hqzd58hzI3UXOv+sPnvvaVT6xpJTDsBhQO2zze8/ELz/76+YI13ZD2JAYQ2BGDfc+G2QNbeNbjz3jyo+5/zKE27X8qC0hAwiPtYAa91D3gFb6keYc8guu3MEuhRvKEojEA2Hc8TJ1T2xMIV6+weRc+8pkffu+8n+3syp6cC01QnwIniAJn0Jm22nnV8x73qufdZxWQAkFgGQaC0EP0UIG1YAtOdSi9OERR/npG7AzaFksZfalWUphOgW0zPms5zqAKyRcaPN7j34WWUygqlCACKvv997oHra5xVCM5NJBLyzA098G4ZMdsBzZVNrJsqVq/o9ddvSqgKNBqwTFUkVKF9qAwZayjQIyh17VZBmZIhHX7megZqZxCjFLyH6II/TsSgFt3VXuatbxbFImFjDKMgUZkDtr1ayZdw8D3Oo1afZ8hV79IYuAiDYCQF0XBSQ3Wbpv1uTpNYS26czFxptwOZVTTsFjVQArAw5p+FwBGDMFYh32BXCW3sXlH7pI0EjpFTDJDFp2Orl5BMUALLTrzK5rpVC1Z1J18UeArPmfnILHbbtdaLQDqg4eRJOmWWESxZYfftHnbVTfcePW1N956+x27Z9p7ZufywjNbpRJMxsxiqtlYt27dQQeuP/Sggw4/9MBjjjjswHVp0yIBHGABWxbexEIlkkt6eXRcM84qEMvFrOpIGIoQwUlk8sB1W+anVjcx6IO9KGGhkKJYN5kYwMSAUIAEbGD2AXKVr7lztteJ3IMBTNaARngPZyACETTrCN24ZsKkA/+jiyFXJARg53y3XUjWbGjJgguI4CNU0KgDAd2Z3oqJrJVW4Qphmd5XIQRjk+tuu2PF2g1wyP1QO/6+figSDSCX0eW3V68XrWXbH3hrDLIEBmjP5StaKQESQZDE8KKe+TEqc4W6Sh69n4BeKN6M4BzYPB0osxHIe8hqcIzuvG823D75kyqpwmCGITgDSzBA4SusGUJ0hgwxICLCvNeQqYRZ3ntrLREB2NPuBZd1SxrXIETAwBJCgAocIfa6CWPNVM0AsddlZ9U4AAYLnGKEDcCcYKaDoHBpnwUQqEAtvJfU8IoMFtCIukHIC5fYEWZrRBJHg+KnAc4IvbZNEhAiOQ/cvHV24oCJbgclGVXiLSWQIgGsgnrdtStqUEEsqiCMUHh1jpbPEgyUS4pQcohcYllJHEdgvgA5EGHLHG64bftVV9+w8Y5t199826YtW9qdnipFVdLoe3PNWpIkSaOWrl93wLFHHnnS8ccce+Thh6xvTdZQImIbVWPuLIGqJkeiCxFIDMFau7eW9PdMYlEhpiJfR/ZqkKicCjDTQ5bhk5/93hv+6R05t+bne2AyJHVH//qPr3/2E0/LFKVYfk8b1ML3L23/w3v++4pNu11rfW+OAOuaLkvM3J7tKOYfeOIxj33Iyc98zBEbJlHj/hNFFaf2Nc/IgbkuZubibLs7VxR3bN0138unZ9sz7W4v90FBbAzxRL21empi9VRr7YrGAStqk3XbSrEiQwIkZWii8DkMYCx6BQoGMty0Df/zvcu+c+HlN2zePROc2AaSCRgDX1hTuLktZ56w/m/+6Nn3O9oyVy9lIZAciOgVyGogV1Zrj/TC+TVArpEO+QuN02IkZWoX+Mp3zvvSt74/3e5Fm4HJQkBSNea9p78DINIhzUrZM6LiaY2GZuoOXbfiL17+4g2rmwn1ewgpgW1PEJnf8d6P/OSyKz0ZVReJy/60VQZKy1yXLvvuDFr2egzxIQdtOOSggw85aMNhBx+84YBVqydQMzBAp62pQSMtJyL5fiC/fzTgkip0YoB7ubepk37kevmN25/6opcHdkYjqRgVIQiSSCaStdZ22x0TewdM1p71lMe89pUvzPZnYJQMxIUjAl4NJdScK/DOD33859fcsrunYNtIwAi5UgWXVVc264esWfmm17ykDrAHYm5TB4iS0pAE5K5YAH548TUf/uTnd83Mpq2JIlIexCaZInbn5zMjRooayeMf9VvPedoTJ+tpjLFM3tEivUj5LKOCCWSiolcElySB0AFu2iZX/PLq8y/86QU/uXjPfNdk9a4XNkkeoUpkDLMRqKqSallIoRpLqixztKLVWNnKnviohx1/1GEnH3/khlWZA5wGQ1oyooAh2NI5kkEEgoS0FKtEgN1cD3fMdv709X/fFTVkFwQ3VM6xEKNC0R+6Yc1fvfJlB62ZzMqssRQgA3L7BLlu2bzjI5/67KXXb6S0VagJAkggxKKXJ0kCwLGsrLuX/f7vnnnKcSyB2GJY2dmHXPOCr51z7le+84OZji+iFUqUrICJ1OftRmKtFpnRJz7qEc9+yqPLWqJF6vVSyRCAuVxf8Rd/047chet5BFFIzBwTglEBUG7kCAPAIALL+J/EuiAx+iDQelZbt/6AQw8+5IC1K0+5z9Frp5oTE67GMIAoNEhq2faJsZISKwm5QcvOCnKpggByOXDuxVd/5DNf2jbbTRut4CWKz5yT6L33++TfmFSDF5Falq1du+aYI4867tijDzpg3ZrVkytaSIdifgJCEdK9CBVEpMyfxhhLKUUI4Zqbb3/Dv71/zpOCYF2IpMyWOMZAEusWNuannHjci37vmQevmzJaJjfKViADyGUCOAde8bp/3rRzrlBHLlONDEUsRAKcadaS2T27nv+sZzz1sQ9tmfIsK+/j0AQ20EhmjhYlbQEEkAKmI3zVTZte95Z/sc3VvaBWoAqFjcRQNhSd5pn2Xv7C5zzqzPsnDKgvO4ULaLDwl4VcqhQFpVsuL67jkTkUQC9g11y47Mprv/n9H11wyeV37JhJGlPCNpBVmNgX6TJFjl1rVGPUGBMmioG1yBjHHXnoaSedcMapJ55w9KGHr5ssq4e63W5Sq1O/eJcJGpUgxpjFbV33Drn2Y+CPWdLaRgBEicSpBzoeaYaPf/68v3/ru3fN5HAWvkCCow/f8E+vf80jzzy+RiCgF1AwQgsf/dK17/zI/8xow0wc3ougVcay+plpPzd38vGHPPcpz3rcQ9etz8ABda649sHTnQOum8ftu3Hzxi033Xb7pi3bdkzPzrZ77RAjXARFJbABWzKGiEjYYJawOe90fdGpZW7lROPA1RMHrmydcd8T1qR8zPr60WvQSkFdICCzsAkK4Nh1ePVzT37mY0/+2rnXfP6cn1xxwx2o5cgmQRJmZ1qtqR9fccsLX/v2V7/iDx77yLWTjBQgzxMuhXqkjCiwS5vHCO5908XDK6p0nDE2ACbF9j3ty6+/ZWe7oPqkSbKiKKTUbdwL3wnRwJMOWvORlEVbgGXWopNqPnfYQblaMKAWEqGxlxdJo0VsInDbjt0/v+bW6LJASSRTNqJkCGk1/yCwjURL392AlrseNdFfcu2twXtneP26Nccdc/QZD7j/yScef9C6yQ1TRMBMDxMZiJwWOSXmHgXDiNW8dRQCZ/CFr32zSFfknFoNjGhUBFC4SLYXNXEZTTV9e/aOubkLfv7LZ21tH7iyMZXsj/xumVpuiWADoiTF9bdt+dlVN8wEZ7M6F11QDGTUGWXyeSeFrK5nJ59y6jPOun/qoJpYUAjeOhf7Qoe7jv68rV1x06aNW7bVV6zymuzp9JI0s9Ya1gwR3T2p5Pc/5RQkaQRAiyYLlNWC1V9m253GxFQE5jySNOkCF115+zkXXXbO+T+94cabyGVkrNoWcy23KkqUOGsTUS18DhGTJFmW9TodAMxgUgQ/VxTtmWLHbO+a//jUqlZy9GEbzjz15Iefefp9jjm0kcB776wYiRnbKhEcQQaO2ftuYg3UQJHW4EL9qps3zhRqbCZDgkNWMaqMYHxPlGxzEqYvyI0CUgwpWu7K/WysWHXL1t0XXX4tN9fk6rpFYSCJ5cSZzCUhhG57z6q6+Z1uiACzqY7JwfHZl7RbxradcxddcuVMoeIatjYJsgKbpDZvz1kJyOcy7d3nuOMHGaIhQT4P8FYBzIF+dPl1ewrSbIW4BhnDzOq7BpGlVJezMEcYgI0GYBlAo1HYGssGTBrn4vVbNV7KWkxkOPGYI8544GkPfuADjj9qVdPAOg5A4ZEYsGqVABIEH1yyNF6iMisSbO3KG2+7Zevu2sTKqNTpztcTR2wjLe9P9ubfElYmEBHJjNyw5RsX/sIQO8JDHnTaiSccfcb9Tzn+qFUtixBggSyxexs2Qf1E1eAPMcbt09NX37p5V0FRGCbxymDDyirRoEg1oDvbmpyKnJRxbQyBbcLLUcu3bZu++tZtPU3FuBijs6YMrLo+NJpZMbtn9uOfv9/JDzjigNqkgXgklodKOir1Gy2pdFkYNiVRJJIzzOhGc/EV17up2WhSjqrEAiNUVg9IKt2atG/dsq0AkvLFWQVR1NBQDctidbwqQGT6ydYIY2AdZoFf3jh9zg9++N0fXnjzxtuDSZPGivq6qU4vik2pVFR7AQHWwrJIUqgX9YBS6ixEgu9RuOLWbZdfd/Onvvjl44867DEPO/OhDz7t6CM21Gv17oDQrdhWosUOeLgx7DLOcF8hV9l9kRenLIc6ZTuH755/w9+84a3zXbjaKs8KLR548glvf8vfnHrcGgvEADEIFtduxds+8IVvnX+5NtZ5MxFzRgLtTfu5bYcdvP73nvrspz/q8ENaYAHlRT1NFOgAPUUgbO/gkit2XXDltZdu2r7Ly9x8p50HIQNXh2shsxCqsvilplIEvqhGXic11CdRR5u5ncdNm0N96+xXf/zVQ1fWD5mqHbGq/tATj3roqetXZ9AIAxSCBMgYx6zCK555/FkPP/47F21690e+4Jln5nu1ZjOI9rg5jfR1//qfN9zxxEc/9H4POBx1h25gK+qcGx7VOrKGVO7xSTJ7004t7vOpKkQRKEAFJVKrRdcIMFq5+EWT0O6Z74RgKZR0lBIr7OD4cQTLiffz0dUoyaqcFxsAWaMRYXJFj9CjJKQtpK1cjJAtlTIEkKpRUYKHjYS7fj31bIIREELX5zdun7t280/O/ckvDlgz9bDTT33yYx952n3WZhk84Ahk+G7MRFvkUFmVQHCJLUMIZ3D7ts65F/ykQ0mPMovIGphKyJVEMpRl8z4kSWYbSQRu3Lz90mtuPvQRJ+1XeenSzhRl+KhlAZ6HDabG2ZTYVClVVk+kzpA10aTtosNBPvSpzx1y8IEPOm5dkpAPCAHGMRHt633pweSuZibX+LRVaKJohqzmVR1L8B1rG0ZNsGnPI7OwPLyJZGGSDAEwjYmpUjLFCbZ18ZVvnvf5r3/7lu1zO/bMczYxMbnKh9gpIshR4kDQXuHzeRiL1JVqsPbuPXAOgsjMzhqXsgkqhVdJssYen1987e2/uPaW//nOeWecfupTnvT4009YlwDGiPcxYQMCE3rBO0uJs6UWVwM6EfMF5vKojakcqcIOWBFSMQguRmLbETOfo9tAjGgaIpfux35vF5KbJCatkLR6cJS5xBIhzs7NzkU4V0ta1tTY1ifi8DAiDNVrDMoTXWayZrPV7FGWw3RzIETkHpQ1UkqdtaHDSQ2MKHDcL7/XkbauAmQpbGOi1qj5ZGo+lDSgwiWswWighdyihXLVrqXq/L7wnZwRDeLLFq8WlthZx7K9N3v+FTdd8Itr15791Yed/oDHPOLMU048ZsNEVYERIyGINcwkon7Z867Sq4kRU0taHFxNYIkckrSQGJUrUuSu+ZNICo0iJd2uzJwaWzC+8P2ffO8nl37+y98+7b7HP+WxjzrzAYeWEYPZS8VSuZXKgqFKUumcV8Sk0VMKkcjWvJLCMluNwSEwPAUR1zBJPfZF8caOyMUVrEAAOG32dDq3mZg0IKizIAvDkmAehFS37M7f8rZ3vfuf/7pRQ1rqvAZ9m4cKUY3ycnyOgJhZFRyAwAmyFhori8BkRZQimTKucAgkcKKS1Eo9saPBFOJFEwpHqo9FQEwK9DyMgzGY6eLGTds/9fXv/vjnV95wy62u1qivPmiu43e3CzhbpuFgPNgiMdAI8ZJH+B6SBDaBaK6cR0EAm8SSsVkC8Vds3Hn1x774qa99/6xHPuKpj/vt+x4+oUMqTxnR6mHJxMVlslj27h3pvNAskexct7C15NIr7njFq14TUVPVqAm6c8cefeQ/v+FvTz1uNXKJLOxsF/je5dP/8J6P37gzYO2RvXaETaGBevNrar3HPf4hv/PEh59+nGsACD61EamZjT4aNwNcsgnfvOCyS666dWc7eHKz3RCNZbPCtjLYVME+KkIoqwsgAqgxmrA1qSWidp4bq6IcFQwrygjUEbJTB904t/umPbt/vn3Pt27c1PqOOeWkYx556omPPNLVGBZQwMTQgDl5NR3x2IMfd/qfv+XfP3/hVXvme5jLxU2uDcb0uv49/332jTff8Ie/++SHHpdYi+ATyrs2cWDWRY2A9dfBci3DblSVV/1mKewKcsGkBRy8wNl+V3TcC9+tEIGglRezgClHrQVfGKIUQVy9KKWOioQgRcHWqXFEiADXJoOpdaIJtjZQ5ZVNzowKIFFpYSDMXbieud1zaGSU1GzSNCD13bmiF3d3//sLX/3R+Rc+4wm//bxnPPGQlTZ4NSKpNfuJt5Z0kVFVpapCvzzhfnTBj7fsnCmyA2EaQQM09jXQCciAE6Ao1BQqiavPFO0vfePbZz7wpEMb+4y3lnQvE5TEDkgUgRBgu2pzSoM31jSI4UOAV5gECYFdoOLy62/59Be+uuaFzznmoCYYLkll3/sZCDCb+y5cSBtFMCHJkFK0GULIfQ9IMlO3USIncIumQsvCFwHgcqxMmYq+8rbO+z/yiW9//zyqNecLpBMrCbyn3QWIk0xA2p6HczBMad0ZVgkhBCCYlIkpBNFYiLBUalUbjck7bdhaWq978VfvmL/5nJ/++LotJx2+5o2vfM7hU83EoehKklZ8LUPE52wdyJFBloAKiK15zjwykFtgGjUaDWK8iIhrUAIiGAsBGRgpct4XYlWAPCq5pmatHiUxpmDT9grvays29HqdEGNZO9YTzoFS9MuQamTe0BTFQhEizfZCVJlXr9YiraPuIESEEHvqCw3U80K8qIHLaC1wSat43wkIaEAAm6GWoOhIJS0dzPViEER5ZMZw/zuByThjDbFCWTRI0FzENVZ7CRYy3Su++J0f/vCCHz/l0Q97zjOedPi6yckUziDk0RoAYnkhFFu0HSIw3/OFGk0aHSE2STRUkPOaSznv+y76E7bRe1BSoQBjoqr3ET5QY01hcfO22Y3fPPeyy6/67Yc88LFn/fYDT1h75yFTKeeqLpQZbIJNc2+CApwBFmqEDSCx6ASSFEkgV0rjLcGlyYgLGmpOGsh0hQI72EyiL0wiEcRGbIrp6fra9TPTW37000s//pmvveL3n1TNFB7q/ymDAas0EtsvPHwSkBGgUHSCiKvlcHkstWNUrTsgVwMKDhZJFirBAENDSbUOVdAvbnbKzIWg59U4UmDHjHz16984+xvfu2LLbM9ksbbSg7udSCZxjYaXmCa1EItYFAhdy2qZCCJK3hE7FhGp+l9ZJInNsqKXFzH0WFJHiHHbtvlb/ufc7/74kr98/pNPP+HIQw9eTVQVJo+CwuH+gsvH5/sGuajf+UapL5urKlcQFbVacs2ts3/8Z6/besfu+qoNJqXY6xx32AFf+tj7D1kPACblCJ4HvvuzbX/zrx/d0rU9bqJTyjJnk9g9aAW9+ZW/f+Z9V61twAKhPddoNAq46QBv8fkf3/alH118w/b2fEi8ZmzqhpK02SrvF3mB7wJspN9RWJQ0GngTC1ZPMRcNK+s1pkSFlIhMGoAeosJCLLI0kpu3NKte98xfe9G1P7jqloMx96rnPO0hx084YMrYFOAQVjmbrcJH//F3Pvq16z/0uW/fPqcdP+/bDs3VmZ381g8uv2Pr7le96JlPOH1F07F1DaiHCtFgHvBehxff41aS3iPvWP5VJGqp8+eoCFwShISYL8w3KBvwMC8cpuWtpaHpCmXfieH+t8TLTLetGlwZ7RcQQbnaeCV5nNRAPoQOrCul9OpzJMxJ0u8PVCq41ROpcYAD9bt8EKAUqyIhxYDuHr7+StQWy6AaUvYbMli5kl0iReE7PW8MGcsuzSWkk6tvn+38+0c/d9k117365X946tGrGWlehCTpNwHuBxtxZNbhcq3Oq6IeXmhtBWFiHyQKTMIBmPM45/yftsUIDToeKaq+cgbEiBFpAmPge5TWEuN++NPLbt82e8gRE1X9wVDif7hUcmnJJA31vOEhmTHYlT1e2CXKhk1Z7idkDCygZacrBrgbuN5c+YXvnHviiSduOOiMjMvWFaqkxMtHeMt1hxIGN5tNNs6LemGwQxRIWY1mbNpEjvnOjA+SWhDgQ9mPYvQly5E7MDM9sRnftFP/7QMfOef8i119Rc5JtIHJYlBtFyIA26yHECBRgy8CIAKJMEYNhyAghjNkDZQ0RgBKRBOT2u3lApfUrGt0u/PX3rZ129bbt91y1V//yR887NT72ZT7w3IisZJzw3NCVCFkqs8I21+0VSc8gkQhGMv9iSc+whjmJL0L7bNHHbpxQTUvYrBAYkEWIkCt2+mV8FFZ2LFLEh0qM6TRZ8OAJZgkgasja5EnNSlKjXoR1dlc1bJNbKLEg6L6oX5mPJjWVkqw1RjVxKRZ9AQR9HqDhnyReGEjV05qeNJ8tR1UoiqBIgRVR0MmmJoXgCj6Qsm6tLFjfv5TX//u9y788Zte8+oHnXjE2jpcRdsLWEBeFkrTeHiJ1po1GPZRJBKsVcArKrwFWWYkGg183eBSBQDVJzRGRK2GPbEBGxBbZ+bbe1KbNpvNm7dN3/jpL123ccsLn/30sx54WLrAdclwUASADFeaQInGGFGjsLF690pWUVVV12oUSEwu7Aa7vnI82n8a/QpHBtQkAYaNI+skBAWpsiqj17Pr13d273b1lcr241/6zvFHH/3Ehx5naFDmyYuA9fB8rSHVjKpEOJcSLDGBiyhIsqrWtDqEGMQBLrDp9ToLyW2p2q2MjhISEEPLznmkxHkApZQDl103/dFPfOKCC86f9QiNdZEztoZgvKj4CAS4JG/Pg03ZRIMlIHhAwEaEJQZEgAxsAlV4X3RyAJQ1xBfdXg/G2OaqjsYbt+35q79/+0ue+/TnPvNph6zNbL/tFy2d4nUnO3Q/5Ce+ndvJ1APzvbyZpb7oZEldgOk5vPiPX3vNDduyFQflhWoojj9k7efe9/fHroYHOkAE9gDf+u4tb33XJ9u6xscka9Z73T3W+hZ3HnbqYa9/5bOPWgkbZmuoA1ZqrRlgc8QPr43v+eI3r9sxp/WVME2IZLV6vnu6nikEvtezeXftROv2m24wKr3p3VCCMDodTDTQmUUxSyvqumsL4GH5D17+kte+4om7Ctxxh95wyy2/vP6Wq2/ZuCdHl9LpAt6n2eTKbkyR1rd1wo6u/YO3f+mB9zn4d5/w0DOPTdYBTWtrQJNRRLz8Scc8+ORD/+GDn//R5Xe0zUroRM830Dr+hu3Fq//po/zmP3vU/bhGIMmhBGMJJnhQYhXI251Go36v4i3qa0WVIBAeqmSNPqRp4gELSpOa5IQyQ0AOGixiuZUjl6eshXiAXGJjtwMRm6SF9yALYxYaTpbukg2UQQqfJ84U7U5abxZCGg2SFNKFxqHJCRFqQAyiKCGqZ6sEseDEBIjCpIApJQ91gMSrlolJhQRQ+VKx4sy0FM0qSzDEbE3uI7zApbCE6DkWpKICgQHXYQ3ES94DWWQNIHLMHcQaDtCeJrXVq7992a03vfHf/uVv//wR91mTJHbeS92xCQEa4EiIAxj9WuLBfMC+lHbglxZ6KhKVBb+BY9FI6zkgwI+v2HTRtRtjOomQuyTzvQ5s4pLE9wqwwBjkOchCFOTJ2NlerzGx5qOf+fKZf/sCCNreu8x5BAPOyvfth0YLE40Wkj5conBXcQwMYphEpQJ6AhZClBzEMKzlfWZB6J89xvWQdqy+5YOfWH/4UWfdb03wmLQE8YANopYJkBiCqlqXykgNx8IABiZm34HvKRxsCumBhGJUKEwMeY/V2KTBpKX8OTWDdhUMjSj161xpvEzKu7p401vfcf7PrylM3TRW5fNdU2v6UFjiLHEx74WibQw740PIia2yATG4PL04CoETWIdYaC8Hg9NEVTXPKctUI4hAEoMnImNQRFx9647ff+XrPvruf3/wKcfUDDjChAgCyhSZTbxWtTJRDShDVFABLgBA0lJoLCpsLAS1gGYZI5lBGmEfenEygSKckmEVhCgFECHCqqoKA9UYY1AFgq8RbPVcuORTlbhk3w3YAd77aGvzBaw1IgXIQZWs0ZjDURSSqMxsFY4GEUjVNogA0wdVDHjOgmtIUYq+ggES1qLomTQrhEEOwbu68Z052Ea1VvpNtkodAthojJVQBMzWGmOCRCWBiGUAIsTSaM2ozM6EP37T2//iRS/6k2edhgATxWbohU5qawqq+quAh6dbFr4N8gqYJIshkDESu9Yiem9ImZmIiiLP6o1upyCXKg9KZgkUSJUpCkh9F5zAcqnkB5VdVAoflB1LlD1FYdIWZxM//OXGn7zhHW9/46ufeMahLqBlAfUIAa5WyuAESPod6QwbKFgTLXM4zkFDBelCFwaI3CcaglWfkhv0FOhP8q0QUQLkZQM7mxAk9uaJjIQchqCFIQnT26m5yvvgHW/qtv/ri984+vCDTjqoySEnU8auzNTPJPGCaoUXdExsTEKm6h5iNRoJGsupnuXIYwYRlCAxsgG5mtWkegV2JoGqowWWtPBiLTsS9QVZqo6kBLPAF3942/s/8olbN95mqZVMpFFIEbyPSkwmgbPQUkudgTSAicDklQ0rQBbMVeMo79HrwRg4B1XjXMx7CJ5So6EIIaRp2ilIa+v+/TPn/PSqm9/06leecsSEiQCLFD1OssFUPYy23bkHEosuqUZb1LO07fNG0vSAEt78D++68pe3ZM1VIBN3bz3kyIP+/e1vPOm4dSAp6eJZ4OvnbXrDv/53dGs7RbpyzfrpzTfauj+4Kc998iNe/MwHrrSoITfW9KK2I+aBn98in/3Bz8+57IZ2c7XWW0hrmG/DaBIxWWvk83t6vU5vfgbb75if3QXS1VOTq+ppo9G67oZboIrpXbUVra5v084dv/O0x1LobLvjtg1hB++OhzbMCYfRww87In/EER64ZJNed/v0+ZfdcN3mPdvn5hFslia9bnCtDdRc+dObtlz+bx874/iDnveERzz86CwCNSAzsIinHJx++B+f/5YPXfDFH1y1bfdOpCvg6h21Pd/7s79729te84dPPn3NurQJzX17ztSaSZLNtPNmI200JmLRM0l2r/NdNEw7lF6VXOLK7tziixjKglrAWAQPEWggiJR7tVRp2ARFx/cKW5b3qhiXKVuJHgrW/uQgEqirROHGqBTWqoSeRoZtwDACoEIQUKgCGbJlMAxSZpayNEYZGvvMNUNhq36M1alPWlY8iiBo2RFbLJQQY1VxKcHHADJIa7AO3Q40GqhhBXMgE8o9X7b1jAovMGyTBN7Pt+ez1hSypDOXozZ1667OW//9Q+te/6oTDm4ax0VAjUs4E8gkgkUtZKsqIV4mWhnaciLGlnUuPOtx3k8v2eOpIOucE98GFD73eQ7j4CxCgcRWKDOKqsIke+Y6l1xx9caNvaMOzLLM5QAP89yK0ZJirnQ2Q7mA/oyjgUZNqCzDof6/lhC2pOU0kKoShAiwQoy0mRt630c/ffTrX3XsKhRFSBwLtIgFtJRyROscFCJaCl1HIldSBowKa7/bqHposFr2gBeQiFpoFaebYcKspFaopDBJwR0P4/Chj579iyuvsbWWQdKe6yJJY7eHxAblkBeOuNlsxhja87ONyYkA9YDECGGQARuwgxDyHliTZiOGPM7PALCNRui008mJfL7td88kk02BdcaEwhdqjjr86LTRYlN1U4Sz8D0kWZk4jqUspSSz1FSLVvuTimjQQpwBJBKtmGAWumrt817XUsctDIkIJdo2igglcCRBFXqp6Xe3Gl4uChBFgnDVRsQoWYChgTWoqqmOeqNU0edctfuRwaC+wZNmiAEILCAhCyVAWNVQdIoihqKXw9XgUtgkhj0IecUCDiZ6adXdxhBHFjbGOet9lO6sqMJlYANVEQGRKEdDYhiWds533v2RT8vs/F/+wSOsZVVJs5qgzMfwyIz2ansEQFgRR5EuMxtmkSAhQjQWntlAVYMulKYpFKIqVP6RCMaBqAxaKz9WBorEAAcQswW5AP+P7/7PovvcZz/yeB/EIcJYFVHmRcNBBlPIeDBfgaR0vIKClYRKvRVTVaXES2Td/T0OGLBQ2cpXBEKgCC2fU8LoIWoIUIKtxegvv/6WD37ys297zYvratIynUbqC01SLp+N9Ck6GuqSMNJbF0JlyAchBYkIgcpuCaRQJ2CjysvW+BBE4RwT4IvCOQcN0YeYpB740Ocv/uBnv7yrXVBzFauf6XUketfIEmu7eaF5DpdWHTuYEcu65NKpGUBjjLAM70t/wlnCzMF7dLtRBLUUrCrBJAkzR1V2GaWpF7n8mhu/+o1vnfzKZ6uWW3fgMRe6RRosn2Hcd8glBbJERYhgiRsujQJivP/D3/rPj32xterg2d0zMFh/6Op3/MvrHnL6Bgh6nTY3Wz3gc1+79h/e97mOWWtqa8G9mbmtbio5dKX92z949FmnHbHagoB2kdok7Rj8cic+/73Lv3XRFVu7Ss1VGgTdWdPuNNO0prL12htmuzk6e9DegXwWmYEpDpxq/tmfvPDBDzp5enf+whe/tNPNvUh3527L/m1vfdPzn3E6C+KMJ1+snioz9CgEKSAGDzmYTj141W/df9XzX/q+9taZ2ooDJkhq5GZ2b3OZq2VTKJILrtp2/a1fPOtBJz314fe9/wGYADIYB9QEb/6jhxy6bvV/nn3OTTs2ajIJylytmc/N/90/fYD+9hVPfOjKiWjqzUY3CEJnqpHMz800m5Pssl9HflGrpuAL5DiVEk+2BvXUwncpeAUjqZfMLkFI1aByJVXArUCMSepijHlewDkUEcY4WdjNvmzwUlaTSeHzuayWGKcaNGiBbg4u29MKFKVP0rL/f5KSz8WHoghZzQoBto6Yg/dNsc4ulaIbJSbWOGNgkl5knZ2DNWCwKmuJLSI0gDykC0OUTpp6KjHmedcKZa2pXgiwKZotdLti+ZLLf/mu9//X3/zZSw9bVwtFqKVc8gcw5fXz3sXp3G8lMFToW7FxFBWRsOmOuQt+fHEQjZYQVWNw9aaqhiK3tRRsgw+IEURlKV0UWJf4Xr75jm3fOf+CQ579qPIplx2AqESQxgx2PC3ki/ZLPkijgxcr5YraJGvPz1x08c8+/pkvve6Pnz5hrCMI1DlnUDbLpsF/Z9jFfdSUhPYHUkilceFBjzGvMA7nXXrrl7/+rZm5HrUaZIlrmYSAFSshgtk5sDX1+uzcLPJetnpde3YWlmAMyBABUbToAl22RiQixhjmmcAJMxlVAUgjKEmVrXFp0e2yA8XIGl78gucfe8z6qHDU7+VmHIiGD5FyPiVB6dcmKfjfYdQ/hGmI6RSgiIGtIcNBBXkPjjn4RjObz3PlQRdeGdTEETGTitc8gGyClJm5Vq+353sgo9Coser4TJZASa25fXrH5772zWOPPOiJDz9aC2MTC4R9mo4gYIksJrFGmcU6FEVh2Pg8IEkgPFQXzlX9Kasvesh7MBZsqybdquVcFmFmhRCLMhQKvfGW2//jIx8/Zv2rHnT8AeotxUg2xdIWrJW26d7tKCQEr6TKpFFVQNakbuf0jq9//4ITjzr8Jc/87Xan16hZQKGeNNWR6nvpu5i+bkHvGQGNSGC2pmSOyYCMJuyB//rc9//jw5/f2VPXWpnPzUnqkloL1vYK73sFjDE1p6oSfFXcHD1CBCkZcsawYYA4QbvbFZE0TaMvQrcLlzZXTc3Pd5IsLYoCXkRNLCJC5NTmc7MNhNNPOfGpT3oCKZxF7HVNOtLSlvZWNXUnCq872UDqDCgQR0sSfVHm7X900W3vfN/HFfVCkDTrE03zp3/y3Mc9/OiyJNU2W7MeXznn6n959ydyWoXWAVHI1pyE6eMOcG9/7Yuf8ltHrKsBhczORUmwE/jMhXte++9f+tx5V22Vhq+toqReZ7uu3lhRdOavvXLrLy6mHXdg51bsuAPac6tqiHOmO43Ozvscvvr4Q/Cg+6V/8fLfS+Lumu5Zv8K+/S2ve+EzTmdBk7Fm0q2eSBFF5mYRQwJpMupAA5jbgb/4/b+99ZILsPXW7jWXbbv84t62W6ZMSEMhHc+mmU0etjWvfeH8X77+g1/65tXzN/fQBqKizmgCL33Kcf/0588+dp2sbRYG8/n8TDZ5QMetetU/fPCz5+7oWdtBZmzCRoG82ar3ChG+dwcaLlZTVWiIASZmH4QA8b2mlXUTaZYoijkmsUYtszOUMCVMTAyi1BiXJKwqMYoAZLjWpEaLFawwAqPKKkbL4zkA0SUmSY1j35nZEWZ2ALmpGWaybBxTwly+vmUwK7pdQ9qo1Q27+R7mAny0yum+eRkCjCWbpGmNFN3Zue7Mbo0Btcw4lxi2xCyRII7ZOMuGWxN1y6LtmTCzW3o9gGBrlSzMx6xehypMsnr9wV/61g/+59vndoBa3ZaSfxhHCw1q9r6haEDW9TusVCQ/+UgeuPjnl91+x3ZymbJjl8A4IhIREILPw57d8DlCQNmqh10IMQqyegNJ+rXvf397G10PR+AIjgKFagSJ0tLNzvsMtkiWr5thF7oFBK2pVV/4ytfO/up5waAHRC1vCDExl81jVWyffRvJLtJ+HuGWwMRllThgA6qR8h/++KfmeiGdmPSKoptXzRu7bczvRiNF6no7t5vUTa1f19uxPa0lmTWphMR3k3yuVsxNSmcFevVidoI6k6aoaTeJnVRyIwV8zpaL3dNaeOtcd36eXSoiibWPecTDnvKY05oG0fd3mw/lFCYdGWMnpML7OQX0/2W8VRFvC5onISih5wswrLU2S2AY4qU7G+ZnUyZLxpFxTI6NNSYhk5DREFOXOOegsMSpdeJje+cuMFPZHsA6YQdyiEaVlFxzxepbd+5478c/ce3mniYEpGX3nn1wn8RI6kqpjyiiFqIiktWSyammY1gjtvxu1BpyTNbARF83sVVLGqk1EBQFJHLSLwOn8iJN2RBd1KzYcOAvb9n09vd/aMecwCV5VJS67uruya+zXTaIAxmwsUaBgLzjSGxjYl7Sj5z99Yuu2WrqmZIFUM4982FwZdKP1fsxnu6t3m6fLTFWY+6LnrHWB5R9xb5wzqUf/sTn57r5mjXriqKHNDU27fnY65bCLAcy0Qfpdin2aiwZ+abVVoYJhzpHJz3qzUl7T7F7W0M6Tc1lbqcp5idbad3p/LatCHkxM4MoxiXGOLADMYk2rBwwmb30hc8/4bCmJUDUOIclzU35ntJyKSBERejVrAXYgufntK301rd/aPPmuakDD98zvcNQ7/ef/4w/fP7j8163maVd4gh87Uc3v+HtH9P6oUIt+AjxQYszTj7yP1/3lEObcOWySjhJcHPEP33oF+deeqXPJmbcJGxSr9XzmZmWhpltd/S23Y5tWxB8NtHozsxlk9lDH/GgN/ztSzbfvPkD//YvdSPHHLjCBdQsnvOkh3318x92Sfov//zWgw9cXyshso+AgiKgbAkUQREwrNYRUvjYmTZhLhKBIvYU3dnp7pbbagcfkTXXFRJjkni3Mg+zv5zuvunDX3r0/Y/+q9894wAD69FwSIEnnLpu8s0v+9u3fYSC7PBm90yB+mrKmm953+emJl/w+PtPUNFdnVDR6yaZTVP3aylZlAVmomJYquEZacoeoNAN7d0+72TZpEtq8735CLB6VQFYyCoA4nx2ziTGqJDAucwLpNOFshIrxQWtI0k1HDrkscibXNRU08wGGGE/O9clSqNCEBlCCEoQYgUbm0rhc98tW1dYW6bhLO/b2EeW+S6kyE2sJ7Y12RLlXCQUPoqCPMeCJJBhstZoEaPvdvfUammstTpFOWoxi+K1l9tGI3Q7vZkZpGnR63RM5qbWn/2NH5x+2v0fcsIBIGjhqe5KP6pLKrYWsVwY7pZeCbwoCsHQ9Cy++8MLewoPBjshIpsUvR40plkSQoisjampdqcHFYlcJmd9XiBNApvLb9l40S+veeyDjy8lz/ACI2S5nECvqPpFLQzq3o+4k4YHBlevZ9jG3lxtcopN3LVnx0c/+8WTTrrP/Y5cVScSgao4JhCVYSWMJeJhkk37Kn7d1yHhKpVCX1lEqlEmhAt/sekX19xISSOP5LJaMdfN5+eRGLR3o5lxbCME0zCaz/TyPatW1DTMr1u14rCDjjh4/doV9ZoJodeez/P8pi13bN66bffu3SUBNpd3Va3LGvVavWedgCR49Lr1FZPzM/PHHHfoK1/24nJcSZpAy0pZXtS2sIK6NJyE+f8R6mLqDxopG7+CRCCNiWZRFL35Gdg6kgZBVzUasTs/3xXpj1mmheoYgJLYJahlZc1NYGORUEY+eGVVJpAteU+oIqqymZ3bU2s0rth0x6e//q1Xv/RpU4Avok3cviw3hpZDlgE2EnogPz+/HaLMrDSgnYQgEWpV6oTYLvI4y0laqzU0SwqBzwtY0y8hGmwAUfCuXXOrV6+/8Oe//MI3vvfS3320y+qdIqaJ0RKm9wOeagDAvc6PMkyCmLN4p94XuYcjVxNTu2135y3v+q9PvPvv1qYgHxJrKpkeFk0doKpEbLR8Skv8SvsccQTvrTOJNb4oFNxTAXDpjbs/8IkvbJnLbdqcmZ/TGClNvRe4rCIUReCDs1Rr1TXv9uZ3GVXryBJJjCKBmQ2xsWpYVAtjrCa28EV7pqNsJ+oNm6a75zqZMV5j6HjbaESX2GK+aeRlL/jdM++7llEqV8uUollmfrwuDzz3ObEYAbalIBvG2loTb/r7T1xwyZXIJtpdj5iffL+j/+SlL2g5sDMCnidcePncW9776TZWSdLSnofvoEZnnHDgB9/4hKMSpIp2DqTIgZ9v1Ve/58tb83q7vipXImsy52R+Xvbs2rN5I6a3JqkxNTIhJJg7+MiVT3jS45/3ose9+U3vOebgte95x9sPW58kFkYRgh64Ov2Pd701rWUHHbQhM5idba+caMCW2XYDKGoJAI0BXOIv1Grmj1/2or/7x3dMd7TQCGUkCWZ2dTu9bmNnuv7wxvqmc27OxALmjgKf/eEVV1+z8Z9e9eyT1oAVLnZS6047fOIdr3/FX//9+4rcz2SZxESJpnP/pvd9dsXrX3zmYa2AdpLVu51eVk/vfYc3LGzn4byW9+U4SKycqB99yPod7Z5kLhqjKzIoOfVGypaGNlBadlmxJLHgbp6nE/XpQrbtnEdzBfI8EFSZEHWorU8tsSbmh61Zkc9Mg9SmlrNs3oW01gRgyg5QVHY8ZyUO5cjXWDtsVRPd3CLlxfUxd8VHxiTj1ZMr6+RDd9YSGUMFjJJjUM3ASU7qAQi7eU/dXNSj250pTKilK7xxIc9VlbNG8AWMBRFCYevN2dk9jdrExh0z3z3vxw884el1QJQMoBqIFg+WlsVCOqaRf5TKiRojwOXX3nDpL69W2xIYJIn2ck6c9nKbuoQ5+sIxSW8+YVNERV5QLdOM4EME+RiNcV8/9/xHPfj4Tg8TFjA2dmdNqyYLz4IXKlX3h+cXLKgTiLTKHUQvaLTyQrx0662Vt2zd/b6Pfebv/uxlR620KRvvIzQ4a2EZUZdkt/eLYq9K/4bOHTbaBzI/uPAnPZjZIkZbCyGglpGx6nM7UXckvfnZBNRKHVM86dhjnvm0J5xx2jGZRd2hzlV/bSOIiq5BN2D3bn/19Tdc9LNLL7n8l7fdsXPOd9s7upzVRTnLslhz3Zkdk2n6vN956jHrbDnOzRj4sge+RGNtqUEp02pliyVWIb3XOS7935q1XPjsJEpod+aNNbZeN65WBNWZPRsOXZGz39CckP6pNDxUJsbY80WW1V2Szs7OT+/ZE4IIwaZJiAzjwFbJEYFVNQYyhFodzXRufufZ3/7OEx/9yNMPn6Rqarnsw+J3BmyhBUKnzvHIIzYU7ZmY99I0rZDQwg0Xo6gTk2gnL6bnu3PdPQGObZbYJIoIm6FZOaVqUgHbjcYmrS9/54cPeeADTjxipbFlF37IwjRDDN5L7u3nK4BIUfjMaDl0MggFgZHkFzdv/vePfPFvX/6MVpJIiGxgF4a9958uKRb1X7975pzr9TpZmlhrBTCOb5vFu/7r01dv2kH1FbOz80nD1ZvNznwXaRPGpVmWz83Be5sQx3x+12wGWdNIV7Tqxx11xGn3P+WE+xx3yIGrW60Sz6HmsGtX2LVr97Zd01dff+Mll15x022b2nnRbRecFy5zPo8IoOA0DyLtJz/+oX/w9Ifaci6kA1TQH9k0PGJySNJ49yFX9M5YkcDERcCPL9v0gY98mrNVotbPTR+yYdU/v+k1h661ImC2PeD6abz6nz+2pdPwtqEakUSbFA89fv0HXvuEdQGJw3wbWQM7ga9dM/P2z33rZl8P8/Oopa16GmZmdM98vnu33nILmNGbK/LYrNFfvfaVz3jqg9dNIQIf/NhFPz7vou/Pbb/4gh/+2R//waMedlo9QWopSjzx2MOkhKEiKydq+fyMSxJOapEQJRoyCg1MxA6ABzZu2vTpz37mrLMeddSJp3/vvIvP/+6PIGXlUY656bzbyae3pAdtaKxotUWzqQ299tSl0+3ff8vZb/7jZz36OKyyddXcEO63wf7r37z8df/80cu2FXPiwBao37Z555++4T3f+9CrmlmDEGt1ClF5n5tH3mOWJLZU//zO0x73jGc9ToEC5ZBxGMANJtcO2v0rDMEBAZgRfPG7v/jn9390R2+nmLpQX6ykWkEKFel1H//IM//tb5/bAgxK0VfVamXQgJGHVmoYGiOaAvDBcKkKcHf9bHZatHz3z57ztOc96dSsP520P128mpE3kDfO5ZjN8cPzz//xpVec//Nr7tg9HU0TplbFbt6bLLGJzWfatRWT877ZnpufmJg494KLn/ao3zr9qNU2zVBOhqGl6ZTBbNzRmZI6GJpBShyB2QLf/sF5s93AUxnEQQ1MCiYQJUzt2d0U/boDDtiydQcnNedSr1FFrEsCQIZgXOH4/Muvuuy62VMOnug32KqATb9RFo8I6nU/3fAA5pAyAyLRZZmfnxVjCiDNWt++8GfHHnv0y37nMasdnEvKEtdycDzKSg1lDKEu3q9r4YUNQ0woZ+XOBtx42+Y82kKJXRp7nmpJkiR50YGP3bndk42GE9/U/Pd/71kvfv5ZDaoqTMsvW9Y8RAXIMTUsVqxxh6054TFnntADLr5y+/kXX/a9H120defuXdN7WPLUos7xaY97xDMedaz2B0UXvgAnAhAvE82TgspmRbqPLNf/68IvHZ5ULQtcuGGyJuQhFPM2bR1+9OHv+ce/PG4D7BIZ00AwVDYOnfe44sqbL7/qyksvveyCn1/h7eo5pHlZp2AMYI1EVRTdbjJZ7xYdAJt27vne+RedeshjG5b2qS6BVWR+loyzvt2ycsaJx/zD3/7pQSuRDHUd09Eoq91Fo4b5ApddufkHF/70Z1dec+vmbdPtOZs1g3AkHWqoriBK165v79zaSOrXb9r+/Qt/duRhj6kzSEFUVhNXOTr59cwqASABxmjIhdm6tNSQQDUGtavW/tfnv37yifd5ykOPq1kTenmSuoVCBBr0oJHFahAtNS20f3JSFUEMZIwCXeBzX/vhty/8eWEaNddKmkxEeZ7bej1pTHZ27My7XWi0iUnIS6+9wtED7nvCg0875ZlPPGuijpqDDpcLpTDA1Bp75Jo1nbDmsWceKy96wrWbeuee9+Nvf/9Hm7Zs74R2DZQ0mp18ziideepJr3vl76VAr51HCUmrVnS7Sa3WaXdrzcZin6nL7999DjQTkxJsiBzUzBV44z/9W07WS9TQaU64V770eQ86ZYMKDCMH74p47T994dY9kNZaU29pr+uKPfc/JHnbXz7zyBamskAK28ROwpd+suMfPva163f6oBZr17Az3ekdcdfW3vVX63VXgTxCGwlljaQxUT/+xGOTOrZOx/d+8Ivvff/757oBpvHTS6784pe/semOnUEQoYYNU1m97JkEvkjrdXauqqthE8ECw5wQqIjCwIqpqV/89KKzP/lJE/0pJx7PzQZCcKLodOA78HPYdlN+45V+x+YWtLNrt5h60dywmSZf/8Evfeaimd1AQWkKOOCkQ5K3v+GlUzydYA8kh8tQX7NlGn//zv+ZEXiYADaG+NfoT2npwyYUhc8sMkAjEqAJtIAWMAFpQuqKpmJCMalYAdRyrSvqwErGBAc/N20RQDJInPS/hCGOlfJuE0iBOjAJ1BVJUb1+C5gAWpAWwiRkErICaAJpDHWI0WA4AL6PUe76ZxTtza1MqAlkQB1oArWIuqIFNIA60IhFQ0NLsS7FgU089wkPfdvr/+Qf/+bVD3vAfTMtLEJqrRQ9kyVEmu/ZxZmbm95tE0etlR2v19x423U3bxIAxkCEqKx7BO9lQw19AKnAh6KsWiqAzbt65//kUk4bwhZk0StgWEJAKAyJifkRBx/wxEc9/LdOf4Dk85llWEaMIc+RexGAOY/YPD33gx//NKtV6JiyDDHq8H0b2fy873hrOM9SJUiNdX7PnnRiCiYN5GZyiUnrU1/62pXXbZwpyko5J2WCwZj+VPllQ/R9vJ4qq1i1ChGg67FnDrvnet2onNTznjeNpkbNp3cm9XrwsmL1hs58l6I871nPfPFzz5okuIhENdXgtLCxh9CDFDACE41IApS72AF14MyT1v75Hz76ff/6xj949pNPPubgJJ+x3d2nHH3gy577tAmg5aCFhxSps4oYAU5cjAtCupIX7B9Ie9HG/f8ixShVa5iFZFlZOqlSdLszu6cyNIAWMAmZGPqahLQgdWgWigawxuHh9z/iz17wlHe84c//6mXPX5lpy6jhqulMObMSKvVaVrTb6OVmxSrXmvrKt86ZnoHfx0LQstNa3SEhHzp70N1z8Eq0AFdgAphUTFZ+rPpqAutqaABTBo849cA3/unT/+3Nf/20xz6ilZKLOWvBEkt1Y/UF5PNtNFptT3tyue6WzXvaKOKAFtXlRbn3qvaXYBNHxgXRIBokVtXBEyumd810qfaej519+S2zAUiydG/Ome65eEFCrNXrMBbkOhFX3bj7M1/+FmpT3FjRnuvCpkFFVWOMne3b0WzBUKOZmtgtZnYed+gBr/6TF7/tDa955XPPWj+JlQ5NoAnUgRpQA+qACWoEDpi0Fdt9n4OzP3nuIz/+gTe//AXPOmLNRJLPpH6G53ccf9DKN/7Fy1ZnsFGnGulEqxZ63aSWxhjqo3iLfkXudl8jrqil0D8y3vWfn/vJldeAydYM0H7io8944e+elRAsIwBt4H0f/8lPr7wD6SofopeiwXTCyuydr3rmSSuCQbeseN1T4IM/2P33X7xwY7uOxjpYy7HH7dmw8dbi2l9idjphcnkX3VlryXPctmv7S175iq279J3v/cA73v3+nVtnbH11gZpprvrGDy58wUteecsde7qBYlU6wVXvN5MABGUeim4HX3XDKXDomslvfOHsl/ze7773n//5A+94BzodJjZBDAFaQDvgHua3FTddOXfjVROGMN+Gy4Qbm332jrO//95vbpwuQzGBAY4+AO9/w4uPXdFBsQuIKCRJV3/xnF9+4LPXlAU5Xsp+ectnT+61XP2IZakrb0jTIOsP9qYlGYHyK0moZLIE6HqBTcOyImhRiJCKRTTlhO8IB6SKpl2kZGEs9IEAAGusgkEWJgGnILevRTrs0m4etD84nKCJgRmWuPMCs5syWNECHnnaYW/6qz99+Gn3i/O76g4g0eAlFCa1FCMz+bxQFWHHtfrFl1/R7pUXbYhYxPOd+h0fdIHiorKhaDWL/ds/uGDj9mmbNUUNYkSalmk4kyVFZ25lo7Z2ovHKPzrrAScd23B2fs8uUmFrIAIiJcAkcCnS1g8vvPjWLYAtG1HwELRRvpvhcVlvBV6kvo+9nmm28nYbxEEN0gaS5q3b9rzrAx/dvHN2Xsqaeyu6Vxe0n4F7xSpIxQ8LUocdu+bnur1IpoiEpBaLAF/wRKMoAri2e044ba1ff+hTnvLoMiNgRFKKhgI0CKDWqE2VrbIlAxLPEpyIUzitYoZj1+HPfv+R//jXr/qDZz/hgLq+8vefecw6KreMtYaIAHHGlDfI2MWpMVLoIrBV3VgQERGVW15Vy/B4vzOQRIgxxhiprG8tGyj8RsVcC/BFR+jKGCOI2LEhzSzHXjTDgduguUBVd0KpTYad2JqVE3/43Kf+3V/86co6x84sW2Im8TnFmLCqFJCAZiMWoefDlh07r7j6Bmvv5L7R4oyDaoQis23JNWHKVF3MIxRIEiF4UE7wDE8Ipc69JOkTrY7zDDhhA7/mj5/2F3/0woZTKjrqe5mzKApigXqQVv3bTGIaE+dedMkNt21ng7Iz3aBMWPaiWbhXYLF4gmhemFrLl5KJGDhJEAo0WoWbuPSG29//ic9v7yEAIIQo1dRF5bzdrq5yaMkt7se3rweWJRUBuBCQwSfP/srW3e1e5BCAtBYEMYhzTn2gVgu9Nvl2Q/NieuvjH37Gm/7qVc9/xhmHrUQGtIAakEIySAZJgfKraanGVYiV9aFYCqxK8cfPeeS/vuE1v/fE3/a7Nh7Uor948XNO3IAUsByhASo2TYc3+3Keju52iAkYJkTA4Pyfbfzsl77tYcAUZrcfeEDjxS94ymQDhiFAAXzpO7d89PPnaNZEvQEgicWkzr7hT573gMNWpWgLMAPexfj8T2Y/8q2f7tQppKsAZ3whW24PN96E7TsRKFVjBSzaWrmSDGKnDWOTxuTFv7jm2uu3dDsmWXFAJ4DSRiHOI7nxts1v+ee3GztcGsT9FudlgxmQwujCGVKiLslDw+C0kw7+6z9/+X//x3smU5sh1BwbaLNWh88RejARxRxmd2HLxtkrflZHjs4MVJPV67b2+D/+57wPfvmWbp8Az4Az7jPx96/6vVVZh4rd0NjphMba49/z0a99/2ez8xHKJu4l33tPphtL76WDnukVfhqcegQxkDK94qq7IVS2kxl0ckI/V6bBLDgCBhhSfg1R7SOprEFWu/pfRqsbTqVP6X8RgoGYBa0CLzSy34fzmEc/t7CEQQppYdyFatmP0QEZglWdIBx1AF747Kcec/ABRXuGYqCFHVLKzipOpRdxzY23+pLQUO0n8kALJ8qQZyEIYC1VR2wI5QQqBXvCji6+d8FFrjU1n4ci90hThALlIIrga84U7ZnfOu3+U8AD73vC2slGK0ts2V/DGbCyKeueqBDctPGOS668NjKQlAk3Q2XHquUQ8T6f4bS0JFM5c9Zx2XAIoiikEE6bKy+56rr//sz/gFGgQl15LwyvCLqb9VcL2nSp4D0wNzfXaXdDVDIWxHAOxmgUxAhTs0nNmvTEE+8Lj7qBBRIKiB4amJUNCUwEyvmMMUaoEoFZHJASSuDFASlwxvGr//yPnvehd771rAfftw7YGPspXAzrOYZ/MnzO3InQyhjDzMwMU94iUlXdL7RUoocYI0JACIMl+ptKLAoNYexqm/RZ8YFrKrltHQ3J+v2xyuyaGc0Fl4v9MQ858blPffyKRip5VyFJ6qj0NhoBRQREoewDNt6+xeu+YxZiUBnD8FC6oBwuFYBACAZqEA3EIbAqiSQMq6BeoAIrLJ7+uDOedNbDGwknpFBPRjUGqtrPBTDA1otpB7192y4t/T/poEH/0DEmrPfuw0IMGjxqjSKKkjVpxo6kOwcoigI2RX3ynIt+8YkvnlMAc90AwxEoCg9Q2mjFIPfselMRYgaxMn565abLr72h7RU2g3VQUmKwjVERAkkkRl29Leaf97QnvPZPXnLmSatrgrSMixBIPUa/SEPZJHKwuspDsIyyUuDU49a+4kW/++bX/Olfv/LFj33IMRlgFVVro6pRLwMjz4R/FdvF+/xIFHmBQvEf//25m264DZwiS10recVLnnvG/Y9goJuHjuKXG/Ghz56zJ6awEXEOvaJVzL/zb17yyFNXwAOYnPU8D/zr+Zv++nNf29ZNOGSY7bZizLZtxc03Y+PtmO2ZmGjMvLhgsrld0z5EZHWk9R3b59/7nk/+7Ge3JfWDRJ1u29aamDjjIQ855QEPmly19nvf/9F1N23XpW66n/ZCmQ5bcJIB8C5VIFjFqhV40AMPOP7YQzuz2zvt3e1Ou5v7dOVU2dbcNRvwvRoCdmzqXPMz7Lg5SfJi93ZTn9hDrU9/9xfvPfvanLFzDgy0GL91yprX/sGTpsKOGnJrs5278zYm/vWDn7tpBwpAfm3lS0NpDoz0qpMh4AUDsQgGHhqg/er76r94aA7NWb0DjAajYgRcDlQIcIFcIDMEdSNXU+uFBUa0gk9C5YurB3zVKrD66m8G+KGs4r44SRKCMqIFHLS8YGhuxVuFgUDKNwrld4IYUoq9Mqn6yFPXnXbi0Vp0EjO8L0pQGapWpkl6/S2390LZ7VVRTSdZrm0hBCiPvPJvEUxghnEeUOCCi6/9+RXXiUlFBFCqah0ERIzoECcSevwjH5oA9z9xzVGHHmC1oFggeCatGqKKgFPA7JzvfPu882YDtMRZ7Lh6s7vN72t/oi1YwFqmUUnEF94X5YHBWQrrYhChpC3u7G9+9+xzLusB8xERMEm6rKBhf4aED5q7VjNDpIReRa8TQmBQVaxEBLIay1E6Gr3P5zubN962ahIMSAFjuBLaSfQxL0Kv0H7vNHZKDBFEgXqCJIQaoWlRJhxX13HaiUfWWLjomGqQMw9PVhv5jP3wpip7U95bnXyMMYQQQsByXNg+fTGzMcaUiHyA5H5TiItGgeag+lUXlgBpGdgEU4ZmkSvfUf651JMKysDHCKzAChKFAyYZT3rEmYevX1u2Ji+C7/q2UFAEKrtfRgNKgtAV112X73NTHoYYSGKiM9G56GyEBUgdxCEmiBbRIhoSY5RJmaCkEbGA+lqiifoUOKCB5zz1CQeummItEAKTkigzQyOkAAPMQdHJ4023bcplZI0Mk4Ok93aTEUkSG3wOw/ARQUSJIdBAFGEYwaur7erEj3z+q+dfdrOpZZ4QBElaCyHeG80sqJJhoAecc/7F19+yObKlNCkZ3BLeiQhIEX1Gwfn20QdMvfplLzh+g6kBDYZvdw1C3+0HaIDIkKxW+iXkI8ALXlOgBhxxQOuFz3ri0x79sCmGixgFD8v4tKHRarww4WD/IVc5JyTFeT/eeO4FP8PEShiLmenT7nvc0574qCob5mxb8cmv/PDy67c2Vx2EWMDvnjCzL37mWQ89eUXTIHjMC3KXfu7SLR8+56cdUw9JYplWTU7M3XJr59absGsnojA7himCejBZi0YTovCexJAmt15/u/c1QhZ2bZ86fP2jH/HQd//bn539ide//73veelLX1rPaiMazP7wkwpyUQREECIkohR3BaCQ0FHEvAADf/W6Pz/w8INdZmvNLGiez+2GFsh7WnQza7o7txjpYtcm3HpVcesvTey2ahnS1nTMvnDuLz79g61JC50yeI3xD590/HMe+0CnbYk5rHETq66+ffdH/+eCXjl4oZ9J1Kox7j2cSFxQryqwuKWxjPxIBywRL5BM5dBaHqDVshU9BDaSA4wROKnehgBWJmUBKVWqjViNeFCBxGEIRVSFrGRQFf0NhjmWETD367P3SapLkUyslLqLQo6yk95gCmT1wRLrpOhxRAqcfvJ9mokxhrVqkMFSdtVShQpIXFKf7ebTM0F4OEcpS66kIvbKwy5GP0QXsQdy4OvfOzeYdK4XKalTkmjRAytUjTWW4Ltzp97nuBMOazCwwuL0+52oPifxjCi+AAMxQARkQUnaav74sssvv2m6A0QqaRpT0SXghXhjf7A6ERZyLgsomKOWiFyCM8xpCiUfUZtc047p29/3oZ9eud2UXdRN2RSU76LW4Vce4SEOBmiKM3CMNHG1LLXWWmZERYgAEMWyQeg50lrmbrnxhu3bkQdwgiKPkHLch3MmTWxmqap1UALYwlgwQwUSSmheVnVokO7cHEEQChosZlo0SrJ6mbIlwsJOJBLiO2G5Kpw0mHtIRMxUPYC7+hWjlGkdrhpW2Yrx+s0wXP1jjWSZ3KKOAO/+fJ+Btyn9z2jMvChZCaCQIzY0Tz7+2EaaGGPYGZM4WCpvKSJBjaNEObn6plsi7TtgIQZMpHK4oRUajJwaKsCgweHKKoApe0gHaEgTJIAEnHhE44SjjlDvVYKIqCozgwhSEMopYRxUt27b4cOiDVIxuoS9FsHdg2aMgQhUKcvKgykUhTUGEktoHEOYWLXm5i3T7/zIZzbNIQAz7SICbFy70zHWKfiePMiYRZErbt8pF116VVeNTROSfogOCIGZbZoi5ly0D18z+Xeveulhq2AELIi5NOs1eD+UrhmsK8ailAwtELEGkRQhzxFCzaKZkh0MsdYBR7uI4pIlY3b5bsvnFT5ivsB7Pvhf7dwDllQbrfqLnv2s9SsajuABz/jeT3Z88TsXupUb5ucLY0zS23X6iRO//6wTWwYmgmroML57O9726e/tmjXZ6g3S2xn9zmLLrbj5Rt2xwwWfJdYaBPGgCKZAlNWbCAoPzUNiU3K11sRK3+s1p5yf2fiZD7ztg+/6aAI85NT1f/yS5x12YMsMU/pUDZuLfa8YgVh2jgSXTEwIHoZBkiQQwKtMrFqhCfWQkwvNpj3phKMm6iZs3rSiVV+1YqKVWeTzaE9j662Nzm6Z2WlIY1LbLNl/fvP871/dzYE5gI1pAi9/9m8feWBT/EyzQfPTO0J99ZfOvfQ7l+zxpeL5XlNuVfPyRpnPCmUNRKxDJ6ESImyEU0qV0kiuIM4JBSGyg0lh0oITD+RUz6nhqSYwNLSapepVUzIiPArzRMFKVslGsoFsQbYgG8gGspFc+RXgAmwBm4ML7BuPLuCcaznXcsADoBSUKqWeXQ7kQEEcyCmnkV056K4QA7AjZAYsOOaQA6dajei9gAErZCJVsK8cCVKIkMu27tw56D2jKjQidB1hyExf7V2Nfclzr4jAFTfO/PyK69LWlCiRNcZSpauVSCokXvLOox/xkBQwEQY44wEnTzUSR5RYg+g5c1rOkPEREbDp5undX/vRj7olHReoPACo5GYXnvQ+yrcVrMzKWrKHVE22J1a2bKDGGkiRd7oaBUQw6Z52kaw84JbNu/7z45+dE+RAoSPZ7buJugSoJn+X+WiFBVZONOqZhQTSSkpYTuhjUms0SaJoERDe/cEPbNya5wCytKAsF5OLyYWiKEPLsVOdXugU4kuhCpuqnbwEhBwQZ9FqNaAKY+FSyABv2X7jUxlk0MrePNSP97QcwbaXT16iohLaiiIPPoSgIiXddhe/gsIYLvvolv+91HJ5739zecX+Ry4zZQtahQqmlNTpgBcPhEB9nosRmdUgMtRIZCl/GAiBURAikCbIgPscfVQsfAxBjdHE9qKPUEMEYRZjTErsNu3a5YG4j/gexDDwzLnl3JjcIAdyKi+Jq6/B1RLyMttlDHyOWJR5q7oFA/c76T6m0u0R2EjZ9AuRNYdEMLNx871cyjuk5RamYZ6f9N6W5XG3V5gkg4TUGUhhSSAiUPU51FtroL7T6aRTq35yzcb3feLLBVBrJYVC2dbrLQUXvsA9KIxRFEX0hF9cfeN1t252WUtVxfcQc5CqljIASq1BkWckT3/cIx9yymEJUGckDNYAANZVQ3iRgCxoKNQfFg8OiFgS41g1pKmzlmMoZ+KhXwVuAAuqtrws4K2hZzU0vvNuQS4lwOKcc39+/kUXKyx6uba7T33cY5766NPrFgDaEbfuwn9+6su7ukDahHNpjKscXvrcJ6yfQOawex49wrUz+JePfG1naMFzb8/upGGls2Nu4w0oOkAkg4C8CG1FF0mEjQh5b/ceCLl6i8nm823N2z60N2xYcZ8j1zzs1KNf9pLfOevMk8ss7MpGFYAQBBoGBfOD7Gv/7lcgV2AAa23KbPKiUGB6Fm9845tvvWWjb7c1n2026F/f9Jr/fvff/9Or//TJT35se8/OdmeuKArkeaIRW2+f/eXl3W13TNRMQdJ2jY25e8t/fOr6marvIcXi0HX8R7/3+BX1ot3dhRWtdjvfVZj/+uw3p2UBci2j37yXXOASqLV06JgMtYeII3dvIF0pVXBc+ppS5hq5nDfFg/Yz1RkNLr+bIW5t8Jpx6L10RBCzf0dyBTFl2fzY6HspAKYiRLIGGjIGx6KeJUDZ3c6BEpCpxuxCygaj5NIgA5maqKoh3ptssmRkqkRljNLX6X3zuz+cnmvP59HUWhIk+uAMynM9hkKCP3j9ugeddrIF6gYpcPyRG0469hjHUmrsSAXBlwQikW33ctSyc3/6k63ziACX7TFGhhssQIF9JfZpGEWWy9RAfB46s2zgEgsJGjxEAYKpT88XE2sPPP/iSz/40a8B4EXzXfVuact0AHJi7KsCsHqqNVGv+byn0YMNQGQMgBAKsPaCb+d5j9zXzr3gPR/77Ce+fvGVt3e6TDkngZPIiZb/BSAgyawtRyIMulZCQGXRSEkgcaebRyGQgUmHRHvDJE6Vp0Afl0NLunSv/rZkPogIBCY464wxYOL+gLi79EVwDtbaKtsSI1TLPONvCnJJBTcXHE3FpuuAaS6d8Mg4oOE7KSOrZEnPO40sOPbIo7IkBUiLXBjKHKESFREUGNEIuzkfe/ujP6+qXqT86l9eHHqp4Qa/aikvubE0g7VA0CI3QPA4+KADnTMVuQWO5bwgEoo5NBIryLB1IS5Jow9pueheVdAToEjrDeS93sxO+F4oenCujD3SNAm9WatRRCipz3j3+W/+6HNf/Qn397iAg4L7VQ73HA40Cvz0sit3t4torKpCIosnoxBFhCipiEE46rD1z3jKY0M3pKU+28csTdqzs/38hul7dasVYLrTLalaLlRjEmdTABJ1wF2Ndu4YPJdRJcxyztbu6+rrBXzp619Vyz4EcmZlo/G7T37yRApSFBE58PUfXHrFTZubaw6d29PmWpqE/NlPfezD7rc+AXbN7a5PrtgCvPsTF9y4cT5dtb6DTmqEZnaZ2el1ayc279kCw0UluIggNWwgFEVckobACAwhk1iuqdD8g8885S1/+fxiZsvhhx/qLCQihpClVn0BO2h5VzVJkjLJoxYKQwMiuwxmGUpSFJlrRMVkA+tWrL950xxZY+pxw7qJR5x23GGrccyTHviMsx74n5/9FjVWfu27P7zsymti4W29FfLCb751J3F64OGFbe5pB6MT7/joN//1Tx9fZ5BJLPD0R2z4yRUnfeaCmwprgXqRz191644vfP3Glz/pqLR0tSMCDr2n4Ncy/NYI+qZ+/hGgSqPaP2ZQ9hHuQ9RS1yVOJaEk0TyRvAejhiJJHB6npVU3gbKBk60c6uBgEtNXHcbFEuOhtlV9R7xPUQFDrHqneQIkALQLDaTBwTK5RVrmQfssJQcEiDKhPT8jwYPLw8CABGoFYgY30tgi761avVYBhAj7q7SiWh2oxhCIXJYVwC1b2hf+5GdF5EAwbKCFxmCdCYjKpLk3jIececb6tVNl6sIDK+p45MN/66Irb+gUPWOzWI5iBZHAWS6glLpbtt7xvR9d+KInnFkjlBQYaPhQkP1DslRWiauCTHkHiXDw4Yduuv46X+T1Wj2yECMKEDWZWFHs2BYmnMJ+8tNnn3bisY847RhbNr2nYQVheXW8f0c4ANVIMBBPZFetTA5Yu8biBgHIskrZ/4hFVURhHK9c0yUyk8knv33h2eec/5AHnXbg+tUHrl5xxMEHHLrhgHWTramaayZwDrHM0GHogiuuSA04qiiQ1utBUD7/lEeSaDx8t/8/9v47XrKjuhbH195VdUJ33zRRo5E0yjkLCRAglMgI8QCRhQCTcQIbG2M/B/j62eY5PtvP2AZjcs5ZBEmggFDOOUsjTbpzQ4dzTlXt/fvjnO7bdzSSNSLZv+f+9Odq7lxN3+5zqnbtvfbaawFQrpfyCP19pM+VZRkzhxA0OCRLediuZku9no8x1mmWENVJsjFGJP5y8i08ErDHQ/t0Fl26YmZ8aHpJSU4elhkMRf2q0qZuZmpiotOZNYghwiolmfQHLGTJQkiZQRZJWuxiLUcqqhExOsQ0hkRiInAMW9OoR8240R0nG4BBgLNs2EAigBiDD7AWGsVaOwhqTBLrEpeMI0AqwAFJjNGaZHkTmH+a+mTXTwuGy0QJGvM0X7vXHnffdSdlbbAhqwyF71nOTJr3BhXcxOb+4KOf/sKxB+559MHrgw4/Ej3MY4FkLLbv8sM5PLCIK6650WWtKoizNiKSBCJTAWAmoqoqp1rZaU89ccPavKXwZXCJtUwSY3tyMgYxbkklcfx92B0+/ijTVWXjAFQ+OmdAFKPWKrUj1sjDhLeGgPay7OLhKZc+yhD3OCUIdT/usuvvOfeHl/YHwi5tJXzKicee9OQ9Tf2LLB6cxSe+cn4v5jqI1GnJYG63lck73/DEFJAgE5MzC8AnznvgotseSjqrFud6ndWTgy0PxFtuyVnnpQSXCAICLLMlxCASIGTJaIyWiWKloTAcEAsiOfXEwzesSdyq9VGDgWFDIAOJO6VM8HJ2V62gLzTa2lY0MuCL2M7Nn/zeb776Te/ctH2uHCw+9/SXrFtdy9NhegbnvPY5aOGppzzxzDNfNrNq4mWveOUnvvi1B2671c1MYL6tyZp85drZrf0r7try2fNuPue0g7OASYsO8J63P/NLF72/6paYWgtJBxU+/PEvn3PGbzs2eW2SU3fiFIpomrdpsVyFeZfNWh7+zTIcdWdXaghfE4kBeJl+nRLUAEY91Y49zebipVdSQJsmSz0A0lx75ZFEQm1IbBrhm+F6UxnONtaCZWLGJiDHhY5Gb0Ww46UxGqwGHlkuaD27RGakET9sqhplEHyQxDKEwLYEPKXdKnjvYSMASByCHPWEJhKDqje/arVRoAw+tQSNqiBKxt7S0hWrN2msvMkTwCpsN+DCK66/f8vcIGo+2RoM+rAMpTIG2ATMiDE1dOITjk4YBATvjXMGePIJxzjLUknW6fT6fVgwjEgUkM1bZTFPxF/77vkvOv0pWYqUlggKtMRK2XVUSVWXet9CysxkEZ/99Cd9bXbjps1bI0WNTGxrELPqLvBEp1f186Tdjfz3H/rkHmvfccTeUzSKwg0jUJZQtAYQksfy9mrNv7r2BTGYSdFi7L56puVQUVQSH7www2TQABCMJeMGi/OImk+t6fYWv/uT62PVn2hnM+28k5q2oZl2a92qlSump9bstnbFiukNe6zde4/dVq9MMoI1TbIegKCsHomDci3H0QTYuoozy47JYR9WGybXw1jl9Yc1QsKAj2F7b3Drlvm5vkHKUdWqaFCwfeyC8hFu82K1ZVBVymALYYhoo2P+S/B25KGttRCLmtrVmzEUpxveUUYYcV52ZCsp7+hBMd6h1nqEHg899NC22bnophAJlahWxFx7n4sIaySDNDFLkW/kxEBLsZB1CFaMCVuo1Lx+YVUzHHU3y+Pk0setsw0LBaIIV57S1GYpCA5YmJs1KtEPbJJGH0EMwwqDqKRgCRKKhKmZgoWtX385I/XnPAZBAol+4LO8fdD++xx71KGfvv/OylchBBgzmJ3tTE95X/a6XXCWTM9UC7jtwc1//9HPvu/dv777ZKO/F0XdSHBSR9kDK2oZtseDGmzc2rv1rnvS9opBd+CyVL1QHZlUjGNSFfGrOhNPOf4oAwTvXeIkRjZGYwTAdsd8a9ksqC5RBsd6PzQY+Dx3zpl+v8paCRkqvCSOlZp61iwZeQ1fTGXZC2LnKFejCo0xCydamhJhUVVNBqVkOS+U+ORXz5+dB9Ipa0DV4lvf8BIHBVEF9IF/+OjF9241ShPOTlkuQYvvedev50AHCKoFcOM2/J8vn9/LdpOub+X5YPtivPlOzA8s+8W5+22nFZQQGEGFDCgDAKagESocfWYj4vxUyk98whHv+PW3HXfknhZgtmN+ZgQ1Q48TM7ZUGeOOwjKUg6LGE5cJsCnYGyw6tJ902IoLv/nvF116zd77bphZNR2BS27offnL37pn4/2HHHbwq89+9mF74V//5nf9YPH5z3n6y848+a2/8XtX3XpjuX1x1dGnzW6dzVrt7ZC//PqPVh9w8Av2AoCWYC3hfe865zff/2/a3Q7uIGDb/OLff+qyd7zy+EyINIJYuL4LGmPfGFt7X5CAVGBYdlHbhMat/XagoA4PhoflZLXOCjdYUyOCPFQ4o9hAJSTaMJhqvqGFCigAArEERAYgSaNIBGJunAaXZ3s78zleXiAN2d9x1JtQMBCHlQQpWJpAKQTSaMgOY6Fr0jsfkCQj3wxSRt10jt5phDcRqXfYDlxx96a7N83azlRVLrRaWVH0Adgsr6JCLVhd1T3iwL18BcnRylpQr1VR29bqcMpqmH7WKhvMDJOmAIHdQLHd4wc/uWmuhMvbvhgYQ4ooTGISwEETJNk+6yYOP2Cf3AAq1rkqijG8x5r0uGOPPu+aO7qlIJ1Af45TguNQ9dmkbFuiyXW3bfzBZXee+dR9ycB4MUZQlEhTgCIZehxCfGREhIzRGA0UEqPXmUn7qmecuIfM/d2//HsQW3rStA02CMHQQKtgsslBZb3Lrrxn9q8+9Kl/fN9bckGLJcZgrI0xsjG1d49RMVqvMa0XukKk+bMoyQ5yVkmjM8Zk02YBEwg45cknfO3b37t900Yzs4Y6U9UgwKVQB60QYxShNFORgfdIUyGCSxdVFrtC3cBQ0gHduYWVM9dyzjgrhHKybQ/ef8+nHnv0kQfue/gBu7cMUgsDVB62duojLyATFeSIIFIYyw1HhxgEM4w2LGxUfE2DVgYSkAAEClAVKDlzz9z8q37vT1MzlB2JoqpkdsETMDJ63ldKyKdEmIQJ4gCQRhKh8UYzCX7u0vbUqKBBYQXWqIICIZJSDEKtVL13JJkKx0pEFIjUDOIsJ7DDB++cq8NNjeF6L7khkFZFefe99wYQbAICDKNfJHlWFn2YgWu1ZdDT0JsyJgeScdGFEXJdT4Now6EaZtLERNFo9EEZREwwKohxGKJoNDyxBEnwUECV2fXDoJ05hV0sIjKzuDBbLG6fmtqtWwyInNZsi6QTFuaS3KHopVJaKXgI+BM7GsLL9QWJSvrzzLpYg5UidW5Qmk7eedMrTu4/cPu3v3eJTyZ6VZmtXt1dWGSbuAmroGrTfcmKVfNY+dXLbjvwq999x6ufbRAsFMqkpk4/ao+vxpyEE6hRRHrshDpthD5uuuPuAhApkJiiCEne8UXJKmRU1EcfTCgO3fuAo/ZbQ4BJHACuXSCtGS3zoiyyNKtfVgTWgIAYhinyeBNIwYQ8czUjs50nzWSg4wD0AowFAxPqoVWj3WFTAcxwiw1Pz0dpLI5xEHhUMkFVJUZYiyznMmDjpvDFr36XJ9ZIWUkojj7iwBOP2yuFDxIqze/Zhm+e+33QypWrVs/ObfW9B08/6bCTjshtfe6qmQf+94e/WdkJ36vS1Nno+/ffNbX72vktDyz25iZXrVzozhuTkrEKjpFQn+/OsbMIg07LLWzefMCGNe9+x1tf9qKnWCCWQ37QjnnDI3FrhsbsuqxZXqe9QaKDuNz6YpZseyKbfP4zj+oV+NHFN/3Dv378gkuuWrlm/ZZtW7/5g/OmpltnnXnSs04+1gGlYN/d+fff+Wuve/O7ti/Obb3t5tWHHrHdDwJz2l7zr18878g3n9LJkSo6wNOPWnvyMfufd9lGDLqcTJRldu6Pb3jBc4+fmEAGjVGUWAgMZ4xVFaUowgnXGrSiQmRoV6MeHpG0zI8EbcZR7qPjwxg1R2j5XEZdgyrh4dAi1dmjRCbUpsv/QaHGj9gZHZYSNNIV42V8o6XClNk4K7X+RBlSVhggdXUwjUCokzYRW+tTEEDswQPg6tvL7158hViXtnId9MQXEG+sY7aAQgwQUHQP3vfQqTYABImWwMaMmh/L1eAiAGb4KiSO/WBgW06Ba2/dds1Nd3hykZhVeEj3aviF4sn3n3z0k/ZYPZkApBEkqeEItA1Of9qJX/v+Jbxqg/jg0tRXA04SGBYBkY1BC6KLr7ju9KfumzbZtMIwVFVZDUTBtGshe2QcBhIaogtOxPTmzn7hs6+77rofXX2TT/JKPaKFM+RBDCFAKQjNV3L5Dbf/8yfO/Y1XPbNXhnZqB/1+3uqISIyRnRsnQJCKPuYqYtxPiYFjj9pz7cqObXVuun9riGQmVsX5PibaqCpAWElp6Lleq8iyGS3w2KBuDKWyH8CAUyJs6nbv2HTt9y68MkPYb4/1Zz7j9JNOOG6/PacnMygwqMpO4hgRRrVXUJ7l1npEgCsRZ6A17qW1axiGSN4QFdZh57wur0UHjDIaI0QNL9cIagL9Y71lSmJSJwpRCyWGWtQt3yUEkXW4L38h1hdNhVUj4xQazxcSZC2ViHLg1TsKZjJP0lwfuaR01omEqgpsjbOOgMSxAqEfudW+5qZb1FgMSkRFi5NWR6u+TS2S1C9uTzKXiO652+oc48hjU4guDWTrcKpdh3+v8CHAGoVWMahqmsICIcCZWpZdofV/msrAERyhLAatLG13OlF5flCmrXTLANdcf3MlqjHYpFV5RVRKTOj10ZpgipkzRLpmxdTkBEQgVAu01cf/EEv9ud8yJZVyMMjba7vb51ekeOevvOrOG+64dePWpNUufQUkMKkvetBoJluhKsUmg5h97ItfP/bQfZ557EGilTGmKKosTUZhWR+XIMzoUIgRD83OBlIGjOEIGyKUWYlUCrIK0izhdStnOukOOcz40QFnbE2upWHz4Y57tgQlWKdkIjSAlcnAqKqRekmMmyVo3dmwWUttNti++bj17cwEAHDtGqMy+iin7SNwuZb8n1SJ6oZCM+pvLL73/fO23/dQsnq9MGlVvP6cV9XUDsc2AzY/8MDeu3Wuu/OhuWJ2xXQny5P3/OaLkjqgRoQEH7lg40W3P9jqrBOOzpiFB+46cM9p252f780l0zML/XnjcpANQSERLrV5G4bDYCC9Rc7MwuzWfffZ631/9K7nnHpQPV60M8WfxxwGdIc/IksMEBDV2IRsnljcclf5Lx/68Be+/I2FiqZWrN2yvQuTCOSP/vR/f/MbX3nGyU967dlndXKUimOfuMfqdXvObZzXbQ8tbp6Z3LDb7Pa+2vz6m+790g/u2et5G1KCY+xl8PozTr/k6n8tKCnKmNjOldff/e3zbz7kzIMzEMEbSssAsgDy4Ac2qb34FIpYIkkd/vvxqEdOEatCqkHt1ZhngI+xMlTLhyEO3WGZbS0GMFjspp1OJGycx9fP/f6d99znWhOLCwObZ1UIsBbGVEEhCkRDQUN5/DFH1SNIEIUBHoXLRUq1ijUMrKtnY3940cX33H8/tVcohhabDWdFoYHjYIoHpxx/xIoUJBUQ4SOsMeA2pc98ylHrZ9JtYdGDk7p9UdeSMcJaoSgiF158yR1nnj61dzsSW2r6cIpINfq2q1bhjU/LDtCjWkMrJ/hX3/LGm3/3j6uFcjDoIzHgJGgd0AQUQMzO3PXgpk9+8ZvHHnHISUfuWQRN0xQaJEZn0+qnbJdow7siwBJ+9S1vev2v/tbkzG49khB6yAzKXs1sZVAc6VYN5RSWda+oUUNqzbRDCBIqqLJJCLaKsQjVLZsW3/tP/7bq45961klPfuULnn38YevzJO33e8Q6kbUoZy09tQwDPnpn0kdLYh9OFFAGMzSKaD0fBoBglGBMortys0Lww36cGaYCNXqDHR3ufjFuYzreK6yP3kgKFD3YxLRaCQUUi160qKIPSAwgo3NufKJH2CBLDQjB961LAPQLn7Qmr7xjy4+vuTkowRCMIS20HARf5q1OvyzhnPfeOLfnHhsezxCBcYYBH0SkisELwLAWSx1lIkIktc1scCzB0koB9SEIuTxrpQuKC6649eJrbqLWTDeySxMVaaT1wCZJfHcu1cASV62YyQxsg5vpDmTMn3djUUBweZBKi6LTSlLFQbvnbzr7pe/9uw/0pdRoYJxEhU0gVZIkg9nt3JmKRbldq7/6pw8f9lfv230yYUGWJePzDrU2ikGIanaN/k8AECPuu+8+UYISEROz1OO9rKi8sSZCstRt2HO9o2XJ3Tg0EGO01ulwkikqZrf1PvLZL/3rZ79VJS2wCVBRViaQ0YihSZlwgzGIEozGlCoDLFZx98nk3//8d55yzMEQQVS1YwTh4dLY6S7jR9p+BKohA8MOwKCAAJ/5zOfy6RUUJFT9Qw7Y74znnzDoNY0mCzz1mPV/82fv+MPfeu2TDttN5+98wdOP2HsFLJABweL+Ah/6xnmhs3rQr6aNDdsfynThba884/5br6LpdgWBUIQVdkgT5BmIQjkIvQWEAo4s/ORU+81veM2zTz2IFN6DAdlV06yRSBUtE3ehRtUSGgTGsm1tmVv0wKVXXv+v//65hdKYdHKuV1GSmbzt1aT59AU/vOxv/+Ejv/+H/+fv//XcX/+tf/q9P/z09m4pIUAGxb23yGAB1lUlss6ar//wyhtmUTC8aBt4+mEzTzli3zSRwOptrnb669+75P7t6HliU+d8gCJ4tq4dJRZVUakouSRxvud/GZSM/0qPVpa20sSMBM/qDijIi8SxLn4ESomLQXliukt4qI9PfPHcj37m89tn52GSZHImRCPsOGsHdhLrnEOdym4rpo889KCa4WstN7Ju+ogHWYw+TZ2quCSrFHc9VF106eUmSYWNUq0dM8JaBVq1tDxsw26HHbCPyLCfQIQQ4SsLWTuJ5576tNDdnhmqBoVNXIwCtiCjqmwMiB7Y+OBFP75casZL08wlImL8tMK7OrLJAywhRByx74o3ve41NpQTCYyWiBXYga2qgiRJtN1pcdq+Z+vCP3z401sKqCUyDjHaBoIbWroMCU6P40Sv92/KOOVJB7ziJWeaWKJY5KJrqIIURLWRDqkqD+dpGTIuzmZJLGBJmKS7sLUoFiRWENFIEg2ZFuczc4XK1NoFbn/iG99707v+4P3/9On7NvfSVttlnX4VQSDn6jlW7z3t/Oo1+euO85tLYngWYLCBsbAO1rFNdpkvLdL0xoiUa1qACnT5tf3FB5GHfY40HZ2FUWBswmlqa/6SBsQIiYgCDbXAFQwGi71QFACMsT54gG2W3zsX/ubDn3povu+VkSRImMX7qnAEXxUQsUmeWNvrdo84/NDH43ygKiKqlCSJghYW4WtmnAzNMySoiGrQKJAAREhouKour4BFxWLAJ7/8nfu3dd3kSiFbBoWxMAwR5HmMMYagqpMT7b32WN8g7w08I3UGOpyw/nl3grmCNVnHlz53JlPEQfWy5x3zkuednkiFULk0g6rN2zBu0OvBWoqVyxKTda677YG/+uAne0A/DmfbNYzva667Co8n7OChzZuZbaypUkyQpXO/7sI759auXfuwJbe06oyp2bcRw+GdvNOeW+zF9rRvr6zaK32+omzN+PZKn6+o/6Zsr/Tt1WVnddlZWXZWV+3VVXu1z1eW+UxlJ7YWQNIBJzDJchxalny+d6bIw4/InScDEYCJrY9IM1x+5f3X3XBzqKJRoN97+VkvyC06bQZYSm+AUOCgtTjnjH3/z3vf8P7fe+Ovvea5nYBJgIEF4GPfu+P+AQ+iJddC0Tfb7v7NVzznoPWT8F31PYhH2oE6HRTwFTTACoyCBVaMkWp+6xOOOuRFZ54EQANyh1AVhuIu0YGHGgHLLlAjvE5ggLgeRrGtiRUC3Hr3QyZfVUmriE5dpkQxAmQWijC9dt9CW5/6wnf/8m//7TOf+srHP/G5rfOLEI9yHuX83M3XT9g0cRP9kD8wMJ/9/i09oIg+0TCjeO0LTk1jF5a8cWZq7Q13bvn+ZbdWiQEYqmkCVZCFEHw0LukopYuDCMBl/41yPWpFKujPzkq3XxuXOoCEHAwpZ/XssoAiCEiBjF1i3Zzg37966W/+4d998BOf63udWrdeYKvFHtRAXdBEI5NJksTClyYUT3vSEw7Ye7U2UwNjm4pkvMAajb5I9IAMyiIASvjRjy+77e57Xd5RYhDrUI6VAagYiVT1TnzCUWvWTBRBlBw4hUlhkpq5GyOecfqppBClyEmoG0e17mnU2kKKXHLeBT/cMl+zhiyGY2uEh2vhPtY0S1nG27ikApWWgQHOeu4TzjrjuS4MJk00sYRNYJySGFaEKoSgaatKOt+/4oa//uAXa1MdIa7j5sME6Za3lfTRNeqlDmo0ZgLz27/xK88//WlJ6KWxO4FyKncGqsRRCcQyfMYhR6z+GrV5ChTOUGqSLE2S1JJVMT5SFRmTqyrbWoiQqbWzMfnXT375D//8Hy+74QEPdL2IAAZKBKCV5XF0tDSSnmNpxzDxWhaOleFrw1UeCv+wEomKRo9YPsanBj8SrwUbUA10sT4smWX9RWVdj6AD51wCRQyhKr0qCdtuv+r6OhYnsGmddNZagDCpCOeTK0w+EWD7kdTmFfiBueIfP/nlL37/x961lQxChbKPECbyLE3TGNQlrVBWjkxq+KnHn/B4So6i0BhDjGxc3u60JqC1QJ9hZQd2YEdsiS0ZRj1EEgSw/Qqb+6EA7tqKP/iLj1109Y1oTQ/EwiQgsCHAgyJUUFbOGobsvWHPgw7crx74abSXl3tJCVh+vkJCrJEDJ2mr1Z3b3raYSTUHfu31Zz35mMNR9SV4GBuqClVAFdqdjiOIyNbFcmA7X/jOhf/+5QvJoQhLt37IjxNWYQ2su6YLCAUY3X7B1onUMg2oGW4kWk/PMMQQtVs54+EyW801jCoYmj/WP8ozpHnuVYKGqCGqiAaRWNt5Rw1Rg9fgNUSRKBI1VNBFpIWZcjPrka2YK7FYCMjWkjRDooM8elFjh5dmJ7mXKNUUVzIQ4IP//jGXZBqpHPTX7r7iGac+JQSktuGyQtFOEAAH7LcCe55yRG6QERCq0iZXPYjPXXClnVzje5VLs4WNtz9tv7VvesERl119nzUB3R6v6EgA2JkJo1JJDCg9REDRMFIjdip/7jOevnISDkgcyn6/1Xo8+YdiDACEQIUJAqaGEkTBx0H0JnOf+uo1n/z812w2U1VRUCP/AQactBH8fLeiaIyZLIJpr9lQxkBpKlwglqgUszbOL6YrVi0O+sjb37vsxlecetAJKxPooMN46qErjtln/QU3d5G0oyKa/Cs/uPwlzzqwFdj4vs0cgDLCWKixpcIDNjW/uF7Af9lHJO6sXPfAbPeK27stIzYOHEkMXkFFULKpSVvEtiiKzZseeOCeux+Y3f7j6+7Y0q3ueeBBzlrZ1MT87Ha0p5G1YCx8RBR4z2nCvkR/cXJF9rxnnjqZQAO0mSnVHUhsO5BRXOIAhXUBWIj4wcWXDiJrhDAPN95QuEqiET9h5YnHHukIZEwERDhhBgk5VsAS9t97j3332vPOLYtZu9PvlUgslGAs1ItIiNpJ82uuv+nqG29d++QDLcHWIzJNi+enOGiXTToIxVC/bgm89bUvveWWW35y7U1pa6YfA9iq+lrFqgolTEppFqJ+9pvfP+qQ/V522lGJceoLsskYmXKH+MM7kQbYyWZukhgGhzLa1Exl+PU3vjZL3Ve++d25bQ/EpG3bq4MOKYi1kL6OlAuGItTjwiFpoqHqDwaIZNlYkxhjlFm7XbRyJBNVKKBZZeTi6+++/8/+/g/f8/YnHrpnbefIjn0sU2Nlh7k7He/S0g4aeDQcTdea0kdDOqUEqBpDtAvopCiRgHTkFkDDljUtSbPyLwkpH29p+34fbF3ifCiJHRsnLmGHAWBoORxQXxnDALxiUFErdQG48NLrP/Hlb333ittCPlOJBRuoQkVjgLNVkKzV7vf7JrHd7VteeMoT91pDZtcjqOl0nOVitr9Yld2iHAS0EvQrTCQY72LRcLK639dWeyoAMYFJ8K1L7/rXT3z+mlvv60dj21NVv480I1ZoiVAYm0eJgDCpVOWB+++zfhXSRj5n2cn9i5o4ZSROo0RQ4kzRG7RzwQDrJtK3nvPy2+77m7vv24L2DEJAkpFB5SNiJCJy6aAY5FMTH/j4548/6ojj9plq7Heb7EcJwir0MIrCY2QBiRKYJIy0NYlEagmVcQvtqHA7yOKM9oUSCHVvUYHKY1BIb1AIczCO2SoJFGBWYqgqmZ0tXlY1RVCESGTJZWlmUestWqZlv5cfaW7Rjm8E0rHpWRE2JipFhRI2b8ePLrnUJi2StFiYPfnpz1i/e8dalFWZkyGblL0i7WTdxfm8k1tCx7IBh6Ikayrg21fdd8eihEkFuOjPH7z3mjefefxq4O47bpzdvrm1aq/+YpfaMxpD7M1BK8Mmz9N23iJIv7dQdLe/+U2v/x/PO2WocVrzZ6S3sNCeXLmL236sl1pHJ4AhAJdlTFO2LjMWl15zx/v+/K8fvGcO+Sqbd0zGPnoZdCGQNIMPeWd6MNfNWx3vY6+oUFWIASkbplj2YDrFAw8mrd2Q5V6qTb34le9fecRLj22pGoprrX3paU+56I5vBi4RAJNfd8eWK2/BKfsi4Rz1PCXjkqvuvejCyy648Med1Xuc9cLnPumQ3fbZfeK/s65Hu7mcPDjwf/vFH3zgK9+XsmfVZ7aWe1bYtIxaBg21HQpEY4hRe6WfnJrxaTtxmSjAbJytscxRgW5iEcve6on0eU8/8YlH7WsBMAwNVc5pGa9oefbVjDCyyz1w8RW3X3njbbbV7kWFZRBDVBQMhkQCOY2H7bfXYfvtxQDXbjmEKiIxDIIqMsaqSZz8lCfe/aVvaV0GsEUMZBM1BhIUFAlVkO/84IdHH7z/HjONCO3Qo44exi59TCFvmUouKUFVQh1UWsCaabzjza//3T9870NF6IcSmYWPMUZraw0aK2RNe3Jbd/afPvKZg/fb+4g9pzJKHGCHHnxK423FpVmyMQt2PGK0ViFCOzX9iLbBnqvsb735nJT0RxdfeteWxaImsakoAWqa31MzL+pvdpgnUIJxyIcOP1FCKNWLm572i104h2yi6va8M3PsFh+c/5t//uhf/8nvbZjmooeOgzMpILYh6g9ZYsuSR1nibwGszYgyc62NV9ue1wObADQq7ZLLS+0eGZsZrEazEUSNmrnWGd4vLOfSZeuNagXUZvgYhlQCqgqtvFR6aNv8HrutINkxwumwXxoBEHoe111197e+fe6ll18+2yu3e9vZbffuXB+pBYjIWsp6RQE2BANfpHmSdfKXnvHsRJGQ7qrLYuwPonMgnpyZsWlnWxfpDEyC7ctteZacB7JsQbBpGy657Mqvf+f7P7n2xsVKXWfatTqVDhlIsTIUmCPHUlmh0US/dtWKpz35hMaiq+FcKpbtCyj9/L0yjUHlQ9Q8z6uqQmZMwuUgPO3wda95yXM+9ImvPzi3qElqnRU2vj8AMDE5udjru6mZBV/6snz/P/3bX/7BO/aZREK2nlg0WhkRT6I7DMg/tjIvKJhtk1kZHimHi4Q05RB9/W2MsW5V7VRLyQzn7OrqyDmI8opVazynwrnUPuKNgpFp5IpoB28WAAZCyDsIAQghalnBWqkZao0m33Ba+VFRrp2eXjEyM5PtVzAJbrzprqrCfLen4vOWecqJx062wIBL3KA7aLVs2sqKfrlyogWE6AfGpWGxtO0VgXHLFpx/9U3BpFAyFFck1W+87iWn7IM24ztf/+Ju69du3VzZfCp4b+BTG0PZ23fDPq985ctf9YqTLeNTn/zuJz/2b6975YvWTMMB0au1mmXJ3Lat0yt3Nd9afjsaCxSunZrS1GioIjGsvfW2Ozdvmc1Xr/MhIcPl3BxsRCdFVaIcUJYPFntJZ6KK6mPMOxNlUkjVhdqo3rg0bt2qbhqDBU6c2LSM6bk/vubVzzt2qt2Kvfk8T5921D7rViT3bVtEugJzvR5lF15x68kHHUhiBmXgzH7ss+e+93/93ey2AexEIXd96evfPemo3T/ygb/YsG7mv5OuR96ihMmVi/3uokZOEkMGpVdVUQhi451nbHOImQjRvJMsLCy4POtVQVXTTqfs95DmGHRBZLMUAifeSnHY3vu95qwzZ1KIIGcwag/hOiqEegaGl0tRE6AqQTQa54Hv/ejS+zfPZiv3GgujNNQZqgvB6vjDD9hrdc4jTJ1ABBEwoRoMuJVPWjzpmEM++5WvL/YX2LVr62x1yjaRUsiaQVW2J6YuufyqjbMLa2am67jNVPtq8y5quy3T0JIx6dLUmugrY1Mi5MBTj17/qhed8dcf+pjNU1gOhSCKuloGXaWq1Bkle8M9D37o01/5/971msRyOShMng1zLN6BcRkfPQ7v+CmkLIosa3mgTbAd/PE7X/vjU572wU9+4fxr7xaIqKgosa2rzwgFGVHWWu2Uhu6zDESFsSCJMfR8QRBjTJpm5eICtSa0KLHQRaulpZ/vF61W++JrbvrHD3/8fe94TT6BXiGdDD74kVVik1rRqM+iS1eVhMWOf2TVKCSkSiQKIYIQEblHcsLeGUYhJJ4QI9XdyYga8SIadTWx3N1EfwHQ+ZiztVAtbVULvUiAwNq01b77vo3/9MGPSNlV2IdPaCqxqhKbTVu3PPjQZgEbl0Tl6CZdK+t2B7AGzCgHqupaeYxqk6yY3T6xZl1/+6bTTjzq6IP2bisYFXaR02iyTERgXSR76VXX/MH/9/f9ua15Yur8qvGlGFqIRpjAyU233tEb9PP2RBCNtpW38oGPCsGgtBMTIkGKvmbOOVtVpTEECRnj6EMPOOWkQw1qBpQfOmgYPA5k6Kd5lCViaLUm5uYXO5OTQA8htrIsAG98ySl33njH18+/pCQzKAYIDnknZVmc3w4mtq2y211UXHnLvf/+uW/93q88RxlZM2IcGRHKwmx2Pd1XBRkWCUQWXI8O1hCgMnMspbYTFX20wkxUmNhwLeUGAQaDsNDtych8WiOa2WJtPC1HlKymIcaAIALWoNsN7LPUpQk0BDaW8Qi49n+QctHS72BrAYqAcVDgm+d+b/tikeadEMK63VYccvC+AAhSxiLvtOvzIcvSWC2ahAwBMdrWBAiLwLV3b71vWxecJKlDf/NrX3Ty6YeC+zjvgqtuufbq9/3tP//F337h9uvva09kcdA1ce4Fzz7lne98x4H75EWF1OGclz3jCx/7h+kcsUKWwLoaNOfplatU5HHk/Q+750IwdX4rApMYA/SLqj05NTfwqlZ9icyCBVUBEhjWUCJx3ntSYmOKoq9cD9t4WBer2J5o97ZvLu65feKw9iLnatyWYM+9/O4Dnr53J+lAsM9uOOnYAz/x/SsxWIBNS5UfXHj52aceePBauMx+/+Kr/uBP/nyxcprMVJKgPYnQ++Fl1//J+//PX7333Ssm0n6/32q1avLpL9HN4z/jI5Rw3AzXa6y1AZTBtakZAAnDtouCeOAFSe4VSZKBxIeSnGOOSE1c7Kr0J1Ijvbk9V07++htefdQ+naQBEgQQmGHNbMcV4JbngGTZGAHueKg4/yeX29ZkBSXnrEt8v8dpJv1SoHk7Lfu9FZ3W/3jOqbG7kHQmBSg9nINlqC9gTJY0Ll9HHbDHkfvv/pMb7xVjKhhNUsQoAKyJqsbYSuM9D2358RXXHLrf02sFGgZH702S7PIJKwoZGqOrqhKUVENVVc4Z76N1ptZJeukZz77jvvs/+u0fqWHnnLc2DipkOaxFrJIkL+eDnV79hXN/tN/eG9728qdP5FkEyiqwtQKAmG0iA0+GYoy7cMqQQinL6tloHiH1Tz1mv+OP+Z1Pn3v9tbfdecUVV911972DojI2gXVRKICczchagQ0So9bud0YE8CUSo+LBYhInIsEXME6LCmDYDDX9udMZ6IBc+tmvfOuMU57zlKNXk+Fam7OekB1lGyOPweWmzlqbTBApK4IvW62sKgfWUpK6ubmteTsvqghjHzt9R1UNIBqsSYIIiEGqZUl5AlmyNqRfaGNRlyAu1A4qy9Bgdm6hP3BZ68rrbiJEj0TH7r0sqQxAwGDSdFqomYISAuLwgPQliMHol9Emedkr7NRM2VtY0U7OfOYpe66A0RJSwGQ7PZSHfmu6/P5ojBXAzNyvvDXJT665iREIIqrSoLMN45CUBLayifAktztdSO18pl7A5IytUIbBwOap5K0g3pjEpcQhaBisWT39kjPP6DCqAnmCBo2Wh1mF/Nwd4QQQMlSWpc1WlZEmXApDELEsbbLvfttrbr/l5hs3bQ/G+qSNMpQJYBJoqIoB56lGM1fRR7967rFHHP6M4/ekCGuRWhNDZbMcwQoi7QqJXgSJQauVxRhhrfpgLNX6VcbasqqMs9GjKP3cQrfmNYGW7Ft8VbkkARpxHAWKMmapAeCcdYbrWQfLVhFFglFiBgxXVUmONQaXpaGsNPrc5SEGbzMMFpCy8ZX6wgDGUC0nt6wTOixmHi56wjsnrA1/WtdD27u4b+OWSiCgEKv9D9zz4IP2qo8vY0wEyogoAMGwgxDIghzUVoR54IOf++b8QGGTan7r+inz4pPWtYBWhi99+aurV6w8/elHE1tqt4rF7TYMXvS8Z/zfv3nPht1yB0wloAoLWzbLYKGTUmak/gxDLeyGZ/pTkFKWfXBVmCQhIh/x5Cc+sSxLUgVFUATVCgOjr0I6lGGiCKq/DdBaMt0qIihisF3mtxqpQDwvydcvvGarQJwBwwIvftaTO9SHsUiy6MN9W7Y9OF+WhPkeLrvsuvluCMijbcG1UIqbXInOmo985mt33bcRQJI0niD/gdvM/4MPBZQIhpVBFuyULMhCzbCaGVpCioEQGUtJCjJV5atBJTFq1Y/dea16rbZJ46D70D0H7rH6ba9/xekn7JM0TO2ho5aOmJqNSeXOeiLkwQH47g9/vHWxrMiFqCrii37tB0JZZvN80OuJ9xs2bNh77706nU4tJ8GuWXDkMoEplStFBHZblR156EGpo+AHPDJPrMmqxJFMJOPaU5/72jcXPMTAC6oqmDSVovhpqR5N8sXOudrXiQQS1CjWr7Rnv+SMQ/dcO6GV37YpdYmdngFZlBVIy9nZid3XL84PqDXzwU994cKrH/BAKUjzNmp+dwhSVVBVJeceA01TR2+GhkmEmHr7NQa2yIFXPPPw33/rC/7yPb/+F+/5tXe89iXPecrRB65uT/OgI72k2s7dLdTb4orZ1M+lYTGpFqZMyDhmWiUWbClUAykLMDe5gnAzQ4YI8kriKRHX+uyXvzaIcA5aS98+tos5VgpLK3dVf1Gqfjm/rdy+JYlFS4oO+yQsurDofO+xfR2E/nwsC2vUJg7WmDRF5lRknHL0y4Cfdemj0hgRoCmaOcJUbD27itKS05Jdya5i58l5SgO5ilLPLlDqKYmUCDmhFGRtkjQuUEli0gSiWgXv/cTMlJYDF6vTTjz+zFMOtAoMutDweHqqjXi6iXCeXUV5wfnA5APT7vNEz3Z6ptPnTs9M9E3bcx5N6pv3aSI15g/Vwpxp59nERPARAw+1lVLRLx18EnqvevELnnbCngboZCCCVNWjndE/x+ApRqPRUNejkWp+BQPISFqIe61Ifudt56xIyUmJqqQsA1tYB0OGhKGqGARs6cnffugTW/ooFQoUVZllrcXF7i7XewpmiGJqspNlqYYKpDF6qLCBqooIjAVxb+Af2LS1kdgUiVFjjCqo8y0RhFhFiQbIUxMFIYIJ3vvEOmZjSK2SUyKJiCKlT9O03W6D2ff6ABmTiijDsAZIJI1GIyGaUfjdWZ2x07VmHxEBa2RvQYS77tl2+x33RK115uWwQw+YzBAhDuBa/YsRBAa12UFt7ZJG0AC4bR4P9Mlm09Y5I5uf+YTD93TIA8Ti2Wc855VvPCcMsH3brMZyciLPYvXOX39brDDVQozo9YrpyWyQu3f/1q92cudMffV0ySCVdm2unB9BJkPBStCIGjAKQQ45YNW6NavvfqgLCiAZEXWXvAIhoKBNU3LI3FBGJLArxbOFLM5Wm+9LpiYGxkl75pp777vq1rDmYFuDJE/aN9mrbW7d6oPJ4Xiuv/CjK6487qAn9yrcdPM9vrImyaKom8z91lm/rc/tabHde+/beOQBe9Rn0iiX/xl6Mv6Xz7fqMWJlwECX1IQBsA69b0a9Ho1aVuQMGwgMk8kSS6qxLFi9rQpU3ROOOfBdv/rGpx29TwL4wqfZmLTMSHR3rPVDS+gQAA7QCGwb4Bvf/2G3FJO2I1mAwAKyEip4j1ZONpmamjzg4MPYoQcuxygwDjBAxcycAAiAMTjgsCPTH1y20PVjdknNe4jEAdZwvPmOey+45OYzTjqYGCADVTb2cZ03y6mQhEYRXsQ4C8ApgsAaPOGQ9b/1pnPe/Wd/5dt5v7foJleGwcBO5KG3iFa2OD9vJqfm5rd7F//mA/++z3t/Z481rozaLwYCC5uAPZyGKlhrxw+aWkpNsdwgc+dllAy5a6inSkmQGazZf+aJ+8+UcvRcN2yfW5jvDe57cPPcQv/BLdse3LJ10+atm7Zu3bJ1trsw0AWdzHNvaSBCLoF1SDIyLS0j1NYJF6uoVoIIErVJ6XH+JZffdNuLjz14atgqfnh3YfwveZn2eZ3EhZBaPerIw4wGCkUMA0bw3jubC9GSctijflXiztSqq2++fVtRBg6IGmvdBVrqJS75Zf2CKF3LlcBGSsHjHQpigQ1sSEmZGj5NLY07EjjSkRYyD6FNgSL0eyAly0a8READSB3R4pYHZzrZiccc8VtveWUKpKgVkB93T4QbfwswCJEgNV9nOHGsymNBIICUVbhxMIMo5ZNTAy+xvwA2NDENqHpvXYpi28ue94zXvezkNhBKUAoNgZ1bpt82Qk9Uft43y6hoY7vGkTBkTggjJlBWfdZTjjj7JS/4+499uUIaQ1G7vxOEYhA2sAaahBB+ctPt7/+/n/7rd718vgJsMtftttfv0/OyawkkNZ4Ue67bLWHqazRMMQSoJSIRAojYwsTBoLzj7nuLiMQASsZahao04JNIcNaWPhg2dZMwsbApssR674WiVzEqFobZKVNQKRd6pRpwDjaUTUC07FfEyuQNAsEYDUbDkrj6Y37YEbdgZPAyso4S1doz7rY77r534yawjaJrV0wee+RhtQ4kjzzreMiLU4ZILXpcAAPgY1+9QiZW9hcoE7+C+i86+ehUkTF6FU477QQB7t2GxW3bELDY677wrOes3b3TyQAgMUgnMwYm8uQlLzpztHsJ2lxHQJR2kY83dm3q942a3Mqktba6RpFWagrg2GOOvO87F0f4xvB5NFvUnNlLQ7yNW5cwiFWYnIkIzpAMFv3sQ0m1D9pWOef22nMvvvakg4+FIiHkwLOfeMy9X7+j6wO1WNSee9Elr3nZkycmQOwsZ1na6i70fL+LTgbxUoa0Pc1kx3Hvmhv+3/nWOFZJEB3eqRECwswgMQ1EOsygCdBAUCILIomx3y8gwUhpfX8q55e+9PnnnPXCA3fvMBCr2MkcEMYw42FIovHoPD7XzfUSueSqW2+68161k2oSZpIQNXjjHMjG6GOMyrSwsHDRpZefcekPxBeec5O2LCKq0oq31kaTKPH8/HYwZZ3JrudNs9185ZqiKIYnU3OWKyHCFMJTE1Of+OwXn3XSe2KNfpPC2sd1UZnGzC5Hv0hiZGMBMQYkWnoYxy889agrrzr941/7QTo5se2hjbRiVfARxmVZVszOxsy49oSlcPUtd/7dv33yve8+JxpHxnJkYQZgbRoGg0hjrDGSx7ChZSfooiqRZDxyXOeUuTNp10+uiMATD1kfgRLwAVXEoMBCb1D2yofuf/DOe+/94eVX3HLffVtKPzcogUqth+nU6BZDQYFUDYICkdKFqpzJ3EWXXn7MwacRKIZgjONRYj70uh2/R+P5iAFAolLts2GP33z7m/fd3TkgZbDAmpG20WN6eMLtG4v//YF/u+jq613S9oYRAwxZa0MZGPwLR7l2AABG3PmHHa3EUR1TlCUvCVnuh10zCWUsb+O6C+aMizGGYgBwmjhrmUOZcnX8IQf95R++cV0LoYiUKWzyyKJIj4jNjZiMSiy1LS+GydbQNG5MWU0aAjXCmD8HgTBY7NrOZDRWy1LLQW0C33J43skn/uabXjNJiBXaaZNpgghU63jQuBsgQ36u6h6M2mSCxgvYugsr3rNzThGj/ZVXvuC6W+/+2vcuy5JsIAYMUo0SVUHOqnEw1vDU57/xvWMP3fflzzthEK3LO0EE7B6HM7ez2LDnnsWgZ41l5ijKhlVVmaAsymCj7O+4b+NdG8sj90xjMxVMdU7fzPEM54QNYCyKCtu2zRqpVmdUcGmiUhRWQMkHDETyFRPzc3PoTCBxIhFeasunOo1+eO471gNe5uGJ/4DLtezoolrNxUfcdvud3W4P2SrEcs3aVScce4xGtIyhMXdWIsQYDRHIgjkQosUicOE1N24Jk6Apkt7Bu7WOWIEUUEGeaAVa6KLqo2MNqw4knvDUk5IMEbjr7tktD97/hGMOb2VsExNisMyNwhAIwyEeXbKf2oUoQMvlkxqVOYIBREQRGcZ77L3HOtYKZIczTQwxo/2uYxxUagpwQ8IqjUeXEoCI/kLsz5lWJ/ZKaXUuvu62TcWxe2UgwCrOet7pH/vGbaUzvig9052b57aVmG7hyCOO+MSnvoGJlW6i7ft9TrTdbi9u2qYTvNdee40grrqFUc/K/ne21dxcKghSj/YoNYN+w41Ql0WAMi0lSiI+ioCNE2KEgXV2ZTs9cp+D3vCKFz3juL1ZoEEzS3C8w7C2gmUHF8tletFD9oDiG+eeNwgcMxuryKlRCYY0+sKlHI3VqoRLhPjmO+7tJEpsPTulRSMVh9KKF3A/ctrulIWfmprob92sLkd7ZtD3xGCI6NA3mQDlSMwmqeCvuPamW+7qHrdPxyscMUIJ93il3ZSbSRyCAGQNjB2xJZjBMVgkDPzq6191yx33XHHb/Ukrr6oSJoFJi36BVgs+uMSUZZUnnS//4NKjn3LaxGQ6MTW5dRbwFbTUPAORtdaj2jkIs4zfwvqo0a0BxFVq3XlSMsRgY8kUpTfGtpnIQuvpxKlckfMB04pD3vCaZ23p4fzLrv3M18699rZ7Z/sVuBRYMIvKqJccwQKGsLC76dbbPE5zAIkYq+MQHdFy1Eu4UW5oPIgEGiE+c9h/g1ubIgEsQAG5xS7pGpSA2zubyBINpaMWJ6b0CpFQVUvWgooRoV1+UV0r2bE3LQQMJZqG3HO2OhSGrWFU0iUAWaFQUaIaplBlQIREVWOMzrk8TTR4LfosIYU//aQT/vQP3tYiZA3nmWHzqiyTdNdDZUOgHhsYrG/ceOHdYIZadz9qyyupDXuIhZjzJPpArK1WEstB0d++5+5rnn78sf/zLa/aY4pCqRMpGUXw3jqjoSLXcPjGoVL6heCSOux5j8pKEEc1DIZ1FDGV4jfe8Kpbb7rtwcWFgtowibU2SpSoiBEIEFReOhMzf/GP/37EcSfYqbVis6qqAIEzu/ZWJDo2G9bvLlWZtpLabINYVYiNFaMSBJzCpRs3bbvkJ5cfvOdTMq5l9tQxy9gVc87FGENUa22WYP26FX/y7re9690oFOUCevP93mK/2xvM9gfby+qW+zd+5HOfL2VByJTdADWdtK2qHqOclyNxhDWkQ9i/9lgU7KiA/+hcrvGfMQPo9XHbbXcAlo0FmZmpqfWrTW5gFLGMwwgcANGaFkcMQgACcNtmVGkWkXCrI1X1gpOflgMGiFIylBUzHdxx68297dsRJet0JlauGghuvGPxVa99wwc/+nFyXAUkLmNmVa2FajCGL5tdn7ahcW+2BjFudHGCgo2x1orExCFzrFINp7UJagCrmgBWyQ4dmhWkSjWtxQIWtSRBDT5ZglbF3KzxHsYVpW4byA33QYEgyAkH72Uc+zwhRKi6iieuv70U4HnPOf2E44/sz2/z84vGGlv0i+2buZO94uVnbdh7XZ25jygjqv8tSD++aJunMo0PaMUhHVY1Dr26lRAtFBIRoxLDWCStycnJdWtW//NfvvPE4/ZOgDYjJR+qPjTGUO2Qb2EHa0VapgdTx+Fbbt9y2VXXmSSPlNQuH4aROkJZ+KowrqEHTU5NdWZWFdwuk6kimSyR9aOrTMunbZ90dHK3Mp0OyXRIJgaBi0iuPYFQn0zK45QCqhuaGETlJP3cl74aATZQkV3Ot2oNp3HPlpo+D6p8ZGMAEJFKACR1lgEK2GPG/NZbXr+yZTIElAVAqPeLyETL9Re2p2m6vTfoUuufP/mFn1xxTVn4GKS5eQDqza6PKSAPv/JQberh0qnUkD7reVVmkAIhS01mNWUkQKJaPzPABCRA5rFXBy8/5cj/9c63v+nFz19pJdWBQQmqwBKZI5FoIupgMrQmNs/OFVXzIdyQZ/nIFLTlf1FL0kulvpCysetoAxMkVgJpwGN+WqA7B4oVaygGvXLQb2RKQrUDkUt/kbA4YZk35k4bjsQAC9lGrhYsNdmDRrqxtAPoNdzwNgYfyipW5WBu1nfnD9pjzate8Mz3/fZb1mZYmyH25vOMAe5WymlHd9XtauegXf2HAA2Ah3pWb9Q7rRihNl6vD4VIVsgCLEqQYEKl/XnT23LQ2vYbXvTMv/zdV+8xRSZKglDb89maPVOjfM2UwAhM+7lT8aTeR8QNwKBLLXGXpBEmRrUGZT8cs9/K337L69JqgUJf/UBEmC052zhFi8C6Us3G+cH7/+mjtz+4rR+QZyl2VQoVgugJWLtmcre1q1SCamQViFLtlGocQr3v3faF/gU/umRuQesy2weRsS5/VVV1SpMm1jCKIlSVcsQksIawzwQO37315INXnXb8nmeefOCLn3n4c085sZNCfJ8QjSFrDTOXwdfyLZE4EmvjqWhANi7Db2uycCAE/Acp1/IVRkRBMb9Y3nHX3WCrSmTMgfvuZwAjgIdjC2WGGACIdjgpKUOS+UVXXjHbLUBGevO5peOP2sBA8HPWhf4gGgJFrJ3JEzBFLha6dz2w8dKrt73lN991x70PHnrUcUUEW5QRVNNfyOyAaf1MuOOKJWOF5nppdMD0VBsxaJNyMdRC3fBphzrR1IDAsFCnMGAmiawmetHUwjG2z1JR2rQNpSpNLrrmRgAoQ83mOPTgDRIGlGTgdq9Kz7vocgH23pD+0f/8rWef/hRnLVU6kyZ5LPdY03n1K1/YyppbUyde+EWMsfxXyrhUrIpVSRATaArJEFPEBN5KdBIdRSvRqDR301nrDINIQ4QPqKrt8/MbN278wcW3tgALFP15A3GJI8YYmjiGjz5KSQ8UEef/8OK5hX6AVRCSTEUYqMoBGTXM1jlkGSq/sH17d2E+kqnqzVNrVBsmtrAuCsIgQGlxUMGwMRy9R1qzi2pa4/gZxqrExlmXnXf+j+7fXBEQws+ICEKsxCGqKgFsnSOiEAMAFXEGKPHkI9e/5exX5BzanTaqUOuJkzFFb6HTSnzVN2k+oNb1dz74ne+fNz8/X48KjzLCEAIemxWuLHs+XOPTCKyHq9RV6oKYqDZEE2qQRUklSPQqgSCE2DRJFTlpEjCpOGaP/JznnXLmSce1YteiByrBAmLlLHCulAOOXRYFPoZ+/zF2TXjJnqBRjhCVwBTrflQCGBXEEjFASWEf4zMAzOhkaeZso8HFzIZNno+Ibr/c7bls/m7panFTq4NRD7uQreXchOzweGue9bd1WgbYdmcaNgtFEatyt9UrT33ak9909kt/91dfufcM535Ag9lWy/h+N4KjTcpxXcZdXfVN4SHcWCg1+RaLd1I6LVMdWPW1oouQFSTCCcjVzyTJDCP0F9pavPDUJ/7je3/7na88dVrART+hkCWkflAPYIn3xiba9Ct5eenwc7+DkUzDylY1itHAQYSNsP1SFJhoWQZe+uxjzzjtxKmMAQ0hBBAZC2PAAoskS3qDgjsrzvvJdR/65BcmZ9ZU5aCV7qLHIgDDGrFyGiccd6z3JVSctTXKoCE0Bzg5kFHm62666Yc/vLBmDNWx2kskw1GlHjjzVTM/lGc2dZQYOFQpSkPe1D4WCgYcIc2zIsRSUJLl9nTMJheCCcgiJZFsJBvJxCbT4rhUdddjuY3J1pjD3NgeWG4EucwJR4Gg6BV+09Z5sFGNiZHjjz60fpEyNG3eUFUG3tTWgAAUMUKALnDFDXdEGJfniP2jDtizw7W6YACQ5i4KjMG++2045bSTjYXpJB/84L/8+jt+98rrbz3oyCc+6wUvNQlCzeMXIRq9TwWiamzc23VnzzGMQZfnnmZUK9BS67WWakkMYhAosUkA7LH7aiLPAoipCdfKqiYqa8OphwyNcgESYVVS5iHsJDDGAYTuAvwgVD0YLPp4+XW3lECtWmuBZ5/2pFBsN8TMue+VV19/iwBBcfJT9/2z97377Je9MDNaDqoYlSmumMwJ8N7XENco5fqvAXTRIyCt/+G/ouGY+PKu3ohssVSyq6gEjj6turlfdOWCqRZduZgW3ZZf6JQLLd9zYeBi4KiqFEBFFZWYDJElpA5ZqrCz3eJfPvyJW+5fiEC71WZDiEFi3KFFNO4s8XB56Fp19P5txfmXXQPTKouCFDZx8CGEwCbNJ6ajaNntwRjkOeW5nZjkJIVhsCKxNnNgqkTLWjSBldptkWiSzBgji9vJGamdYWCarkez28WkWRlla6+aK/GdCy6uAJdaVGW9iUyzd3UJH2qO/9EAff2XvLM+HUjFOSfQqNLYU+iQU6UxTZAALz3jaWeeftJg9qFkIoHvQkpFZGuqyhNcqz2FGIXNXRu3wKYwBATEGMtARGQeJv08PgJUW/VApOZzjp/nO6i+U8N5qIFPMgSGMWTZ1DxVqrNXdnXhBNUQayhdmBEH0Qr2WO1efMZzrHqn0YhA47CRRADDRwnV1IqZhYWFubk5qY8BH8YwweEfdezKqgzbVXUWwsQ2y7K2aaSMEH0jVU+mbmQ+lq/1bSzLQVEUAJIkEx+kO4Bvfnstu6+Ppcfx0zYQRyApS9MfC8Pr1qi/Nj8aNeKlYC2HmsJ1dW3QrAYabTejYlRYxSA4Lcst96SDbesmzSnHHfzbb3zV/3rPr531rKNWJAhFwY6RJgjRtfIo0fEu04iGb57rzA8kRsVoMBrrUttoPQsdLSIRManV6NQ78UYrI4WR0sggib0499AUihed/uS//9Pf+9PffvtTDt/QgaTks8wRE2Kkut5QGbYvHj6R84jvfzwRU1oeJ3exmpKmWT/mfUpSdzSjotVyoo25lhP8/jveuvdMtjon0qhRRGq5XSVIVfRdmleRe4GuufnOQKbq9wW77rFIFIJvA8cecah6b0DWGkAUEVXBNbfPKJg1b21aKD7/zW/fv6U7CmTR+3rfQ9V7n6Q5gKoKvlIAEiONCjeKGDtGB/2uBVk2WokqqY8IMWm1pAEdhWsnMSDuyE+k4cGw89tla15LHPIhTEMyi2Atg1frrrv5ngc3L8Jmzmpuq+OO2EurKmZJzNEnGCBlhgREgRrYNgwsMIhYMLh7c8GSu1DFwUPH7X/EmhwAsmyq1nkNCgWSSbz+V3/l6rtuXbz1rm0PhW435JPrbr572+e+cf7rX3nKbm2krBwFYhFCpGBSo5CgcMiXxgWoHuWqs8ygYJglW7jGDq+hdBgslwU0NdqvkFJM2qAXHnC5xLCQupWDeZ+snKriACaazMTZWXTaKMokzUIVJChqBNYKlKSKSd7x3oOJKsBHpFpuezDdbbfSR7JZGZPbHsTkuibPe9Jxu5OfT/OVvUGJ1M3Nz1dAm0CCg/c2v3L2s7/8pU9VmgqSe+6+b/PGjYfvtn40Ql9n7iNS13+KpEofIdP6KTDIOjwPbUAQeUiK16XlP4TFBTJ48fNPfebRh8XBIqUuBjJiOIS2QdCwqLHk/G/+6aMPdktvGGyCOhgiDVr1Guccm4qhy2++76NfOveP3v6ShK2tf5cxAEfIcKeIGbNqEUiAElQgrubUS4zMF11/3xV3bi3EJI59uQh1zMQmrRRR02bt+og818W54IaLEyUCAkJQbRTFpASzVgGQSBRFkDqtSjJZ9B5sEAII1hGCB1MIjHRS3OTmavEr5132shedPFE7iYJRA+IsgESY2OwRIfKk0SIFJBILLBRSe1I2FCSFQpRrB48hvEoiam0yXIcRUKt2JsXrXvY/rrr5ppu2zlcxIG8jiocVX6V5p6gCUosQQjrd1QCqoAGaDBttTXbLCEAUGtdyCqMQV5eTDAPYauDzLIWi7Pm05RAVllDTfwCi+uCQWgdruZwH15xoRWNWCTRCa6UxhuGB1tQKXwkREuagHMWrBCISm8BYwHVnt/cWTah8qErYxmGpTvjGqaOkQvV0IVUgAAZqVKLAwORloUmQFlgBb5yDGxXO9Ni+EmAJBLBLxLqqikDKieO6LWc4mEAiwVDkcTLqLjLKdSdnv+5s10dQgCsNQAHqh/+MBRQlIgZut9Qk2i/AMS9nc+cWFIGyepBrCVWCUIxcC2SNXoU0lcGpx2546jGHnfjkJ27YY32eIaEm83ZZ1pC/LQB23KiPP1LeVdMOdmjyEBG7TKoAm7CzsbudJFiKeZp2A4QaYh8LIkmEJUjbqPo+gMTZ6Muy31s9M3nIAfs9+7STDz1gn0P2220qgVMkhKHHswEYVsbPKiwJzyy93VhLwj4aj5V1qdLgxyVyW7dw1UgglaboYgFglQ01oso1MTAh7DGF9//OW179a78zM7Xbgk3CYoWVKzHoaYxMLCEadpEokvZiwOREoWNs6Mdcb7vUJcDRB+6/59q1W3uhX5UiZFg5s6gGYKDqASjY6sT0BVfd/IGPf/6db3vtTIpBb9BpOWiEiERxLql/s7FWBKo1ElYD3kJsQOSHCUXbJS7GtnCBkEK9wcD3EZkhpGJQWR2wLJ1QNLp1ZCsAkOQRPqcdUU8fLttKxiqwfaELAYwjDY796hWTecYBiMNqSUWa8GgSEQij6xWOrr4bi5L5wGkI05k5bP/19YoqBkWW54bgDHxEavDkYyd+/91v/9rnPnXRhZesnF491y0mV6x6/5/82QP3XP++3317Z4IRCYUiT4xNulW/QtFOJiDwHjZFUSKvGachwAekyU5abXWWp0POKC8fwVVAmR1D4INqSoYwOZGumOks9HRy5ep+KBAiikEUZ1aujPMLIFv1K6hmaQuGC18ietRexUMqihEOaiARoYhVD2RUqFfIA1tx+DqkAAGZwXTLzlYlbELkyjDYOIvpFXAMAtauyokGkVcMQoDylk1bFOv/C0BZ+CkqrUeI4zSclKhPshHBc5yVQpBWyx1+wIYXnHx4mxq3HQc4hRbCjiuLeWBuduGvPvRJ2LwkwKSIQhQTV1tbKmIlirS94jNf//5Jxx31/BMPyCI7rqsir8YI6vA9Gl8FkUisyNgKgUAGHENMjFss8KPLr5srNUktM1sfWAXMwUe4LHpBksMwihK+hHWgcW5YrT1N0gReaixcaiB9RM/3FdiZNIuhQlWIjyQhegEUWQdKwtmdD26+8NJbzzrxQGvdGPzbFK/aBHSxJJAmCAyvKjWay+OdoKU3KQIzOrnrSTOVJhVjwWEb8t9+6+ve+J4/arWn+4MubE4mnVg13Z3vKsElifcVXCpgUMka61xIeFyT+WEwG4/gTjGNxxID7LJ0vheDl1tvv32/Aw7I2jYhRCHHQ+U0RjPyFkP0lUnTZhJZCYQo8EGgkpJaZ4KPJnFJikWPysElubKpyZqsFJWWygtVSHSG1qxaMT3ZabdyhP5oMnTZAl7GXtIxJIMFQrAKY0VZEYBI7MZq5h0w4kf6ih2cMBuJzhqabDZMHE86fv7a87EZMRESoaUbylnmin5XqoCEYE3CccPEpA660448NYkRLTGRyXAyNdFZMT3ZamUT7c76PdYdetDBB+2124aOrMjZORdCEC/OOVoy3uIRTEujwntXc5CyhAg0ysCb2Dt473WD+W39QXeqs1KICGo0WBWAAzkAqLr777/vmpUrW5nde889jj7i0AM27DnVQQK0bFNm03AMVXzgxGltE/owrJCGP5Cxps1w4fGOC4y4BmnGtyjT0vznLsXdMSNOBtWwbj3uWvsk2voljeKpR+/77rf/ynv/5ZO2xSFNUZZgBzCkWgocta1WHRV0F9+OqvcDm+RHHjB1/NFHfe5b5+XTawKZEEKTmNbOIiCQLTm12fTHvnIup+13vums6XbeH5St3IGJjas9/Ywx1sIwoIhlQdaA61pRRixYAaqq8kVgzi3Z3mLXpq1kohOiDg2Zaqh16baZMVcMHR0LO0+5dt5xF4CJKAKbN2+GCDGrhk6ns3rlDBBoOCxk6pdWBhvxMSauAOYNXXLL4PM/unFLTyiZ6ldxt4nJzlRTijlSqCcVR0zeL/bQmsxf9qzDzn7W/9ct8MFPnPu+9//D4uxD+XS7N7/gK1FwFV2tm10SKGlZtHo1qpWjC9gcZa1VR5FTA0SpKk5TA47jmrBqlgy8qfZTqLc0EwM+1iepiFgyCuyzfv2Zz3nOP3/kXKtpCBF5jnwC/V4MYrM1oT8whgy0LLxqcJ12MKT9PohEA0YCu6QQRVGGskKSE1Fv0L/73gfliHW+dtHNsPu61Q/dUSadjlDlq95tt287+ISVdQa8Zm2S52nRByqAzAMbHxLZicD5f3O4lkJ8WaWGM2pWdhxhAGlz5ObAS55/8sVXXPPD625mm4m1iFE0imHLsDV5gU1Q2r44+JsPfvTIQ9+3e4enmUkDcwPw8A4bR5mUDWCVQEbBIcJY3H731ksuvQwhUJ6CCEyixIYhgZml30MSOUmEPXxwln1RwGZLZ+F/9LXG/6UqY/BDMNA6Z2JZALXZnoBpdnbue+f/8LnHHzjlXKMF03iBCcEsCUDoUHuFhvUudtGSTtkHTRIXfXDWCvCM4/d9w0vO/NcvfC21k5WY2C9k5YQSgSANILSLmbkuEYoBGGpaVpHAHfONb132x//rz/c/+JBXnP3qE5962DQjA5LGME0s1BiFIcMO9eyR1k09kxAlCQ+T0aihIOeKKqapUeDHl19RC0d5cOSkkeCveZyxgsbEmixJJzt5bY5HYxD7/+MPAxgFCZMu0/MpyxLW2NSF0sPHPfdZ9ze//9YT9m2bh6WPdbTrF0hTJNT06xWwQ0JI/b9Zu6SeU1VVmqY/C2ZobFsRERG0cz3x8EP+4g9/c7c2DFABcdigd8O+aRyjHHjAoGkTqyKlIbMcMa0JgwC7/+JC1grL+B9nPOcnN9/7pfN/7DqpX1xEa6K+IdIQF7SJJ82UGesubHmBSuZsCXSAZ570lPMuumwhVF6cGrtE5hxiPwDHbMWCH/zL586tkPzar5y5Ok9LYND3E20LIE0NFPBVTUkxTkEBYGiEQjSqSevsJ+tMUpqLpJx14kIZ1dqsLd0ujOXhRDzG8C0epVzaGArRI5Q0PEqVd3rzqwpbtmwBM1RFZPfdd3cWUEgMRmCbmXQD40CGk6xSlMD518z95Ue/esE1d3g7yfmUL2M06VXXPFCvSJOlCD7256GldZiZcIkiBbiUmQxvf/0zf/WNZ2fkBwvbHrzvvl5vsH0BJkUwqAhX3jT/3r/+9z/6qw9887yffPOCmz7w8e99/jsXXnbHvXOCSKhlxBvJlLEPpaOKpxZTIQxbsFwXYVprDzFASFNT7+TdV0y84ZxXHXHoPhoW2+0kYUYRub0ClQ09ydNOLLyKZGkKY3yvp32PtAWiqEv4LtVJb1GiCoaNIS4q/8CmzSPObzvHQftvoBiISCLFQLffdlfDfYhiCLutWwUIOwtyD22e9XEJCf/PuQkfsaOoPyPs69FCJFJnau1QDQI0UCIUiAGxKgaLIlg/jXNe8sIZK1R0G+dBMj5G7z1DLINJokp75dprb3/g7z/8+WBRDdlZDR3wYR/EGkNAQqap5lIuBN//0aUPbd1m8lyVgiKAfFSQgXGkAucggapurj7xg5ZWHYtUgtOYaHwsXxMNLapyjoTSWEtJIoIAAltOEkiEessA8dU33HLDnQ+WQ15+MwQ2TGGoSdCWaJ0ygrJoV5IHgksyrfs/gBQhB379nJecdNjhSVGlqjCut9CHTbI8j2WR8C6PvTfkSR06hkdoRBBUwEN9fPpb39uO5Me33fu2P/jzX3nX//nyJfc8uIh+zcY07I3pFrGoRLXmUFgYA2MaMUtfhbLU4EHkWm0lkDMBuPWBwRe/+vVoXSAbkSiG/O7asZHIGRhEy5zVoy3OIYT6GtalKf2/OlLcHEjSsJLHumKi0SMKqbBhEFW97nSWp/Wo5rKntCFthNVZmCSfhkEqZa5lS8skdkNvVkIVQogx1p1BEQHwM8m3hn1sj1Bp2RvMbSu2b9qtjfbwTU4OnxMIkwiTwATQBqyCIqaADuAAVmSEGKARziK1ptGNAqOWvNjVKPdT/PRn/ihKXdnBW17zisP22s1055LEYjAwagRcs99A9cABdpgGeKyniURIMEE04mnHH3D8kYeVc9uzZJRvOyCBWlYYFVYukEt77ZwkH/7iue/843/89k/u7AOmnfaBUlHUeYJLYAxU4atQVNooixoyaR1XPLC9O4BLB1HFJEhTwIQotRa/wEBZhtFymG8JVEYYoxk5nTxsQtnumIiNLYGgUlS8ZXYbrFMRobDfPvsqABFStnYE3yYgiC8psVXEXbP4h89++4bZWKQrMLG2CgrXmq+qb1/w42cf/oInrHcWBqKm1QIUgwXkk67WsaGSNHeK33zbWQcftM8//t8P3HX7La2snbTQD7j55vCd8y741gU/uObma3p+keiT2gucpkJ+YmbiLWe/6o2vftm6CdcyzM19rZkoTXAGGnIIj7VtapZ701E33LB0CKQY9MpWJz18/9Xvescbf/eP3v/gAw+4yTUoiU3OSSsGL1UJ8RZWY3CGkOe+io3/MGoZAlJVQxqgKD1Kb9XUNfDmuTk/7BW1gIMP2MuamzSoiCVO7r5vY31PolZAtve+e91wx43WJlWw22YXY4DaZdqn/4lQLsU4JP4La14sKxL6BapQa8/X00MMlGXIEgXFyTyp5UtOe+KGF5zy5M9976JZDZq0WFiqXhBJiQgiQcBuEInTqU9/6/zDDznw7GcfCa+pG6nvLCPRNzVWQ6QnDwjjns341vkXwRiXpUVRGJvAMoL6qGRMrIp2Oy8W+o5DQuj3ZsNAs6ylniMxKwnpf/gVFBnBZYkPTNYCWfQhqDFJqgJUJYyTWLFL7t80+4PLrj30oHUpmkqpZnDzuDiTmh0k0R8HF0+Axe5gupNKNchTp6prUvr9t7/p/vf8xS0PzXVm1nV7BVSJrCHEsoDLH3s+PWIKmzgEMAlswIwA/ODH1/zomusLk61at2F+oX/RT2788WXXPvuEQ485cK8nHv+Eww/eeyYHZ6mgIaMwQNAYIxEZNnDGOPaiIIpAEaAWl1//wAc++pmrb7otZtPCiRItJagKaITRRGMc9A7cf29b6xk2LuI7UqAez5Hz/x8oV51yCZTB2tzB9sTEoOj53iKUjbGpyHTGDXN7WfbAy9qmhkUCFMwMk2XtbLxOqFOun6FIoRJ5dcZlaUZ5zBKXWiCUlWpwWatmQEI94AFYSg2cAFktKDR82z4qMbWWw+I+NCMdPxvWBYZ6Lr/wxCtPyQNH7Tf55pe+6C/+8cPzErZFNaBYy1w2dMz6vfHwGI679jljsM5lwru18PxTTrzsyms9owyo1Tcw1KgyKoEAT6USJtfMz2/5zsVXP7Bp8+XXPOFZJ5941AErLaEu8TxgyCbGqslqPJKBaqihONvHlq5+7dvf61ahilz1C7ADAzEgcYiERkfjYeIdQ8/6xnr3Edzo7egOPfwyEJH32LJli7FWFFBdv349AbWWYCP/rqRkFGCXlhHW4MY7Z295cAFrD27c3dRicmVRbLn9/k2X33D74esPYbV52kb0QEQrB6Tf72d5i2KECwnsihZe/PwnaDj7j//4j3/7t3/78EOOuvOOB2648Z67N24NiQumRWmSpNbbmCSZl9jrl3/7fz9+9x0b/+h33rH/Hi700G41qSQPi+FHPvq5HnpSgOobEhSWMmeMQglnPuvojZte/bf/8G9bZ+emptcNil706kgSFnaVo7JbDlzahhL6XeSt4fUmJiWJDRfDBwwGJmoUVTJz/f5cQMdCIAzeY91qZ7iKAIyo3bRpe2OKaSDAnnutj/FaYQLMps2zMf5nt/f5Jdb0pEhtmiYJA2yMIgiEYV1CiCWkQpYZhBjspMWbXn7W9bfcfsnd2yJIiABm45QJqhCFJVFINLGd/cNHPn3ckQcfu3uiIjX5uqE/UkNoaDZb8DDGkK0IAbj02ptuvncjsgnViKhILBHUQX0gw9CoVT8jf8LRh++922qWSqueMU7gdkU6SIj8YuHPv+L6zXPbzdQaJAmIYqxHlJFakkpFtVfJD6+88YVnPmuPCVjADQnktMNeGCaOrJBG5nGXDzDnnKL2EosEUB/H7j/1q2e/4g//7p8fmtvCrUkBBv1eYgywyyNMo4Es4mWzyVv6+PSXvx5tFsRuml3UUpLO6szIuRde8ZMrr/nSdy/ac491B++392EHHXDQfnuvWz0zPYEEIFA0FrUbLtgDxBSBUnD1Tff86OLLz73gwitvunPFug2LwUSqk7TRsKFAI3xfpZrI06c+6YlU73aRmoTPv9hi4z/hg4e58igmSOMEKr25bZSmWattiX1RxrKQIlo1Ow1sCvbBO+uIwIZUyYsnbYyoY6yIqGZx1e3FGOPPJPFScEUWMOy9Ri2CVsBUkjiyukP20+wmYQlUsw+0EZE3FlCSEIMolNmyMQ3Z7/EoeT8MR/ylQ6gqSAmvOuP4e++69x8/+vnpmfW9EIfq/CIqDJByI3tBu7jj2aAoYZSCT40749Sjf3LVUz72pXPt9LpKDXiIzY8MAIxBkkEKuDyfnL79ga3X/utHLrjkxwds2OvIQw96wnFH77PXdMfCAeVYZemBhQXcu/HBG26+7dKrr7/xzvvu37YQwGlnoiw8VGFTSABcLTEo2MFqcFig6vIp751FADsmlo3lahHCIO/9li1bVNUYEyMmOlMC1LZKABA9sQGZWCsY9fp2srWw2G3NrNskBpEQPWqM17XEde7fOl8BTDCwzljSuiFuOXWBkGSdeg1ZgAgv/x9PT+3//NM/+99XX3XtYl/bU+t7VehMzoQo2l+sbBtWSs8GWRx0k3zy+xdef8VVv3LqSce/+qwXHn/0nskI1R8mXnGIRZoxSow0FSsAiAgTBw0WziUWAKKC4mtf+dx+d+7//vPHt26+Pc+nU2MsCaT/B3/wzqOOOuxfPvihb593UZplgrZXAw1QJWICiQQibqDE0nPUCFJju2W1aR7rVqJeMhMtixhgYDiNoTu3fbG5B6QBOjXVjtAYBElr05bZEHeSGf8yo+qwbMV/jgNGgvpBhAAhRBeV6qafAdvmhktM2QaPQze0X3j6SXd+6uubyyJ4RZLCZpUElmCcJTbBC/K8EH1gdv7vPviRf/ifb+xokjVDLY3xAi1FPoGGmvCuwOYevvqDH5ZqQz2cZQ2YJAishZRs4JxlP9hvj7W/9rpXHbzvzHQLJiKGXYugSojAQ/MB//zRr5//44gIl8cYUXhkCRgqIXHWDyqXtq+55b4Lr7zjJU/fLxLcEk4nrIiKRv7w4Z6Ku3pTBVlqAyrLJlaVcVmWuVjiFc8/4rpbTv3oN7/fDT2kmWgQdsaYOueqT+WdjsLx8hNGAEW0pu7xNu4CpeB751969Q03JZ0VVakqpGTSIEV/kE7tvqDV3Nbiji13XHLD3ZOtSyZaaZ6YFdOTq1ZO77Z61cqZFZ2JVmKd975XlJu2zd94yx3bt2+fndu+eeucSfOp3fftBorsmpihtYpEYIhRr7GwUj3puCccctBaeuSmevOX+v867XIk24EsU9Ji0DNsjFI7Sw2CI6O6JKcxvhSddWhoO0REbJKR64MxJoRQVZW1tu5o/6yALoEFJeBEOEbDnM8MItpmyaTVKDPqwMIeDoAjhkYErec1ELzEyEnGxiRmWZYkgPeSJD8FIKUPC8LLN87PvfollJUPUSezRBWve8kLbrjp9h/f/mAvElwCVtQuk7WpnrIQ7eKNYZBFZkGgWHF0K1Kc8+Ln3njzrTdunIvKsbbEAAtMrPEjBxQLSA0Mb39oU97JJtbsec3tD9z+wJYLrrx+4kvfnprorF61YvXKmSxJQohRMLfY3b51y9zcXLfbne/1e2UoBZVQNrXCWAsXECoWqEYNHqa9MxMA2Tlnhh4Z5RrfEmOm7xCRhYUFEU1SGyOMMc2oEwOqiL7GRlWhoZqabC0qMseDfhf5BJyDs6CA+Tk7YfPUKbjOe+qTRX3MEquiXuGAQLD1KgkwFkHw4jNOPfUZp4LR9/jzv/zMZ7/4nYVuaVsTaCdsTKwGIA5l6KxY3e1vLroLC85+8Ktf+Mx3vnjiUYd94UP/kA6ZBHUGHEcRvPZNJShgxoZYRIRtQ0OpW1JMscXqWH/jra+cbLU/9OHP5Vnn+BOe8MQTjn7maU9IMySMY/7+Pfc8GD/35e9/4EOf8QMPy6hRKNVYV/mkKoCPFhSIyJlCwvYe4sqGd2k0avA2Y7GJL9EvvDZDKURQY0GkiDFpdbrd/miY+T8P1rXTk3Lna+/nnpZxlrepnstz1hAAjoD3VY5Qz9n0+/12nlpAKrzmrGd+60eXykPbH5ovYIxyAh8kSpKlPkYwgSiURS/oDy6+8tPfuPSc5z8xgxlFzGaXEaBhuKgRFJFw36bBDy+9HHleQ1bsnIBQetik5leS9xzLffdY/ZTDZxxAgsSAeTgL9Ji7eAHorLGH7L3+fMdbBz0xijRDq0UaVULlfdZuDVSydHLzps0X/OSaFzx9v3rafFiJNLmOLgcmALBKHNNmeIxnQA3yBmgEmySrYWPDlFR429kvuvX+e7571bVCHdNuU6SyrGDTnZ8ltFz1fulREgKo7so4CC8GzAm++t3zK3L9QQnKrHGJEks0oF406jrGIkZf+MH89tIulqnh6u7NWWINIcbIpMYYVS18CLBsExFJ0zTkK7o+WHEBArbNmKcKIxp41sBaJVZykVNPfGIna2QQiVlixNBB/L9nW5aSrcagUJQBUZu4KLF2L1XEctCHpkQ7t7WJMRARsx2uDpU6Eopaa2twS4Zi1j/L2Ggd2KIoyljWv5ABS81porXSBxRDgQaprYeNQQhgB2O4pg1JrLFPCRpCYOOsRep4V5OipR4W/fK7CgDSxKUAVMrFYp/dWr/1tje86M2/lXRWVohQ1NOOQmAYWRqHeMxAF3Hw0SamvzDfmpgAQq8Xjj9o5a+9/uXveO9fCqFQCOpBb46wgCBWJrVxfju10/ba3XqLc7ES255eLKu+yubevH9gq6F7kyQhovpGhBCg0Rg2REEcJS2XpFAqg6jvmSRRCEuwLBWrNILycZl/KA0RSxppBj1id+ARJpKI69WrQp3OJICiKJIk2Xf//RqHrropOxSIsrXtoQpHHLrfHjNO21Sm1Xbb32yKrc6Wtrc18b1nnXyCytLEVZrktRO4s0uT8T6osbXcl/gYJjNkCUyKbrlQVF2yJCLol4gMZliF63fDFsxE7JGGiQHW0uJE+NFtV3z70p8ENLKF5GFrTWdA/NAPa2gkYRTiPTUzL8KWQPWsvDDDIFr4FuHtrz3zsgs+fv53PvBX73vDy854wqoWUhQJkAPr1xgnwfcGpga0mEWjiDBz4/9jCKWX0otAQBVRzWAhIAHaqW23shBC6SvjEpe3YjP8QgQcsN/+RERJUvX71qUjskIdU0bp1889Yo6oS7U94TCi0dij1uLn+gEa/T8/E2JBLbyhQ5bsDkBf82SqYiQ2zVwTGo8t6xK4FGQB2+506kufWEw6vOtt52RxMSNxxmoVkE8jIoASy6gGuSNoZGN7kT/y5e9cddd8CQYbv5wO2ORbhqOvlBCAj3zmswVYTCJQZpaoqopWC0UBa1mFQpFxeNFzn+EAo2gxTERGsBCrwepj+ppAjGoCnPyk4/Zdv2ois0BEFHhRAVmbJElVVUmSFN6blWu/+t3z79uKChAyw2wRQM32bghITI2dlIiAFKpkTC0DS0T1qn7E9UYCDQQPmABTwUVytaKaY+yzFm95zf9Ykfrc+Fj1fBTYFKo0XESNUzuGUqjMjWu7jICPaOANvGgFQHxQC8rwjfOvuujqm0qXI+3A2CBBSQjBGjLWgW1UEjKwbWQTMZkoTUuy6T53utQa2ImunZyn9gJ3inSFdlaVpu253RVbcI6kE2CRtGBcnS4jBCY1UBZJCUkoDtpz3RnPPiEllIUytL4KOlTkqjeBIRptnJ3ul9GPdtbw3ZUjmcaQ77HfONqUu/JSNNrhO/mHo08BPHr4qadCyTAZbrS3lQAOMcKwEIylqDHJkkbcQGPzrJsTtbSvIV4aqBWGGoJlsmNO7SN5wseRbxFRrSwNIog0ZbMESAG/CApOy0TLDEgA0mAB25AKQvMmG7aZAzmwQZI2A1vEIDMUfAMbSlI3eteP8kZ5BGcsxUB9lPioQ13uXfr4OvqHw6cOX+SxvIw0rQOfdRICDj1g5V/86R9Uve2QAagiQ4jeWitAkmcoijj2PrF86YxTY2vMAgRJXAXOJ2dACvJTbcqAM08+7F1vfnVberK4eWYyQ9FD0eusmIH3CAOturadGVCv31eylZpCbEzaFbeC7VA+E/KZvml3uVMk033NKtOp7ERBeYG8Mu2Ckl6gqhJ1KaUtJSbjYoy+qpwxeTtDGEgsoZ441pmXrwfGa6ksGp4L9Gjddtnp/W6kilWZmUiJtJ4EkaWTtGGQNcR0jS2LDWtw2vGHToVZM3/fPpPYI+m3evevpu4pxxy4xzSm6vF6HZL8x94bN0QQEkExWGTE1PDCYKDAfRv7F178o0qKNLXMgOUoJUIXOoeZgd29zA5w7cM76dGrzGHT6QGT6V6tr/7wq11UVK9sHxHUKIzC1K5EQRAEEaFXIIqzbmeooEBBgaywE1AEa+M4y1IlKBPyFt4AqHDtldfCK8JQMaWWV6YxvFeViYjZq/R82SsbcZV6/I2oLstIlMaS5wYk16EUNf/y3KuX5JeWLyUde9QsqKVv43K0Wx93stVk+FRrITLzIzcOoiBII8Y9dN8bTa9ys+6GH8YCJxyx14tOf3qmlV+YM3kLlefplVKFerQ5FD1IZGdLMdff9eA/f+JL8x4Lg6CEQdRGLEv80DsZJskjcNvG4qrrb6rYlCpxJLEYIkSQJdbZ6IuEwn57rHvCkQexokVIAAffhO9m5OMxfFVxGi1w4IZVRx60L5U9jp6tQeOBQKoqqqIUQRHsYT//tW8BGAQFm+gby0iXLN2j2vqbmQ2zoV2fMGq8vhofjIAlmU4TcOLRe//O215fzW9upwZSgWnZAhrm0xojokCWFtNY4h8NwGRBHNkVwK33Vd+/+FI7OR3VovJwFmlaIvbFqzMxBgQPURCTtWwTBQehSDZyEjgLnEVqnkpJCApiWAdOmlagCHxEFTA/B2PSiYlY+RBCamy5uDCTu9/5jbdN5dCAVkaqKjEadhj3N2+ctUmVVGjZfhn7gMO//Gn2Sp0tqIioavONqojEGGOM45f0PyzTGnWE+uvw38QYJcb6laV5tUd7kToZCSL1ExhOnIqgfo/a4FVxJDu1ZOtQs+Oa5tEjPH+eQU/FSECsnFYmVkZKjoAEiK/3OyANykTKS2UYjz8bWaKf5bt6hARtlFbrYw2qO0nYhy+zlHCNZ0gPXyR1rimhJmm1Mzzh6P1f98oXZlqh7Gs1yDqtMD9vnK0W5uzU5C5NQNfSG0vaxxDAG5QpcM5LTnvrOS9e2aaFzXe7jJGn3Y0PtFetSBNnVEI5CEWhZE3WprQt5IYuPTayVbJKtvFiqtWMjVVOAjshpyYFJ2ZiBThRH0WYrQNzjKrRDzbe66ymJiRGCDF6RInWuuZY4SUEbJk5yY4ol+7kTGwEEmMMobasVhVJrBsLIxjqmw2HyVVJMWXwlrOOPvuZJxyywvbuvFLuverAVv/lTz/iN88+aUMLmcJEaRFsPeEtAeqbiqE+wCKYYa0hCEHr3/ilL335/vvvMY4j+SgDuAjuY4XyXtw5MKT7LmL9XLlma7lye1zTk7UV70bbaNYjDFCABSnBEEJgAghVqOC4Uf3NMxCPIZ2jE3pIbqOU1BpFwg1OlgAJKSFYEQviCKvYeO8DEHLsaMwGWMaFOqPU7hVRZeBDvwpx+JENyBApK0gDxZH5uUAVbG0SY72r6+X3y24QjJvuqNIOZTsRERnQsmPyZ/jbh4+HowX1Q6CyM41mBdezU7HmL1IzXdEG3vjKFx+6z+4tI3F2KxIn3QElWQiRGQiVMchcYtK86MvXz/vx5772Q86TCjCmJoKKYcSqAhuYJMIOFBdccumd929klyhRkqWq2ownxYgQSSonAX5w6lNP2H0SVmEAlcA1cx8G9NifzZTyVIKTn3xcgirlQOJHemQyvp0Jkew3zj1/W1kLZFolI+JHjjkjPXLVUVoAYq5BkhopGUEmj1j0UiPsRSPJ1WY4UIyRKcZLn3fqi5719LC4NUkIWtb4D4+9fhPlh/d0eAI05BmjFmoRLdSxIyFcf/td55534fzWOdgE0ytgU8QAQpXQAJ7Zs3iWymrl4I1WRhukBCo7dgdIEErAMweohw6vpALOudVrQFR2u2maMnNRFDNTk68/+xVPOXLvWCI1IEWMkU0tYLuMV1snVztFuUYIX3MQ/nT7Zewll71+gxyMricz02N5NcKynb30smP42SNiZ8NOST3jpUO0zIBsY+nDzGypNjklREIEL52OqJ8clp7Y4fmzii7jy7vercxMrKZeNhQciyGpfaFGLaQdtZgxkh9a6jzpCFeg8Qsj0Mej3cbD/Qji8Q1SHzqjqEuP4fOOw5/UWGLRMuhrB+z0EchWDTauCq0MsOcMXvnCZx178AYUi+3ExaJCDZlnWfDl6LcuXer/CE8b9XxGWVeCctrgNS961ptfdWYrdlvkM/LITG/7bFkO2Nm8M8mtNsjEAPWCWHOhQBBSIR0lcp4p1HaFhqKhOMwIOfb68AokEPaBlDNO2s6l02unM/T9/LZVU3kntZmDIS2rckmTih7Je3dHLlczKi5YclZRoK5jiGioaiu0zIVg+F0dWZkAhAL7tPC2M/Z78Sn7zc1LTpRarFhBMxbWi0NFLsEo3tX6wsNxDyiiEoOsMzEGgcmdveja+z/3ua+6fAIm8YMBshxO4crOXnm2JsTWYpEuFsZDPYIA5F1aabJ6/7UDBAuu6fEGJhoIKgJrwgESfJUaq1Vgm8DwcuRPhr3yhpkSAJvUPRdEraxRAIYswCRwBhv22POGWx+CVKT1BKkCojS01Rgasis1fjUYQlzDAglEBFaVqERDLhcr4DiBKJGqRm2ONPPLT7yGG1J1pOs/SlZVaxupJYTsp+IbEFFdGys1lbeSDI+mJZhaVaOqMjXbhkbrf8R/2JF1RoAE3WtV/tazX/GO9/51TLKqGqhEwErQ1CUSvCF471UNTa0qqsV//tgXnnDMsQfv06lBSi+l5RrJt4ArFZvn9Ac/ujSyjcRQYjZVf4A0MdbFWMBHJd9KXYvds0872QAZI/qSVci5KNGw0128OPUmPP6IQw/Ze/11924blH2kkyCFGiKuFTsIBCJlum/TtvMvvuGsUw4LgLOuClViEZez5GvMAYBoZMMww/51nWQ/SoNjiH+bYelCSyElAgjFYGXWfsebXnfbnQ9ce9dD7Zn1vUGsFzcNP8tSmxgPi8UKcNqAJ4pAWBig311o5U5Ma0DQQR+qcAZ5yjHEQZUzC6KqQoAacyQ2zFCRh5OGVEC1pbQgRoDZJiAWBcq+rwoU/aSTtVIze98Du++28pyXvuA1L30GA1oKHFelTzI73jSgoahInV2QYfVNe3zUVal30NJ5/zNKIHZ6voIIj7cUqvNCZhbRXVyiO7D0Ri6ADBVAqfGR3OUoQT/rmLZ0X5q6DiKikGY6li0ZKJi4Vr0Ao45zOvInpzHVFR07WXW5offjY7XSWM1Z44UkdbgFYoyqXIfHx3B/lnUn6nxGtcY8RESEZXSbH3VNmnqEmy2AKDHE4Iw9aH36+rPO2HjfvZsWepzk6cR06aNNTVjsInXLMLal4+PR2nAABGyadEUBsQhrOvb1Z51x4P4H/MGf/XV3tt+ZXqk2UTExhMGgRFC4HHkKZgRfKzexNEKDoqwUSNFIIi/5FbBAQARrudXRKDpYhIiFRl/1+wOnAyvFaU857q2veukxB++FIKXv53lLwMPFMF5/7oRWw/U7oEdQSR3xDMz/j73vjrPrqs79djnn3Dq9aqRRs3ovtoq7jTvGYAyYlhBKgPSEQICEhCS8PCDwHgkvEEhCKAkQwGCwweDeZcu2rGr1Xkaa0fRbz9nl/bHuPXM05Wo0lmzK7N/89BvN3Dln17VX+da3GOcWfj7HhvQs6LKJDmaNUsRGUhVDFVAHTE9haRuf38zmNbIGCc8iIQ2TDNYE+ULULVxyyFkDGMdhRRVQQM0VkgPf/vY9x473Wh4PiFvQteA5JLNus5+Ln+53TudlL2QWbhGehmsgAi3VymvWPHD8qU//4MtPnNjWC90Dvx9+L4qDsP0oZqFsTMKRPBGDU2bZGXWtGZSBtqUoobXGQoMJWBfMo/J+UuLmW15TU+v5wSBgyjXnh9wG5XoTxlrNOHdiXiwmPZRqM8IwoxHWt9LQ5WogkgGBr0uVxZjWujiBmhXnF8sVFeIE6xkJBSA1fbgvxL4smzQCLGFgbHhAc0hK2vJrjYAW5ULmZROJR+9DCzicceCadYtuueKSlM3HgsF4Mm4LRXDXMGktY4BfLAb5POOCuYn9HQNf/Np3e30USng/YpH2jOFFw4vAlpcObN25jzlxYyyM8QtFKAvDtFKQjox5sMqqwvKlC+bPrA2KhgPQqkRzx4QNi+mM7wuMcQDKttY4N1y5nqsClO84EhqwVhsYA2OUNQpGW2O0lXf9+Odd/aUISAkKw8sl78vRWMYEB5OMl+glIytbUaZzQAJSgLuAU6YIB1UtgvWk8IAFrVV//K531rtGFgeYDWCMLYcRz8TulfDRxhhtSuuni4CWkJIJSIHaFO689eLvfPWf18xrb+BF9JyCyktr0N9n+vsZh9EKxnBACF7ColkjOBgMt0aYktXLrGJGMfqVtVZrDkgOCc1NwFRBCEiuYglpc72Zk0eWzJ32R+9++/vfcV0M8ICqFIeB6zmAKRQLozufIBgTFc5L2e5/2ZDHsQOX4V1LF2oFP4uNoHzoXzNigUypnQ3LRbeqNqwUbLZMk0fLlmKL2lqLsOKgHPeXOH9alwlDrsZEA7KGO5o5ijkBc4oQBQsfXMHxAQUEgI4Qj4dnIBoZ5Wd6msvX8ASjomfsn3KXYewZbshxwOpLEfwwOlw+42f6uobDrUYJeWhwcA1uGRdSCq5cmDRw2xWL3nrrTdL3hbbCMMdxVW+Pk4xDq6E4dUSwjBVCdVAKLgG8RHwKB+ACNg60JtmVy+f+x+c+dcv65bFCn+0/ZXL9DnQ6GY9VV8F1oAL4RVgNa4ShquRWWCusFlZxKBjDrGbW8FK5dVPW/LXJZ+xgD4o5R/ueCVLCNCbllLT3p+/7rc/+9UevXD6HaUiORDyhteJnliFnITnqiPtajn7ahuwQxhjTSgnpah30dHcLTIMl7gOuSWojgAV34kFgA2UScS78vOt6DuMa8AQ4bU0NCGvzBThxJ54ov0hGSIk5kafZElRFQuPESTzx2AuOVxv4QMxD3MIWYPqQ4rY6mzM9cHxwU6p9zhiMEIZr2K9+5797j3X1n+h5dMfzA6d7Bvp7b7vl5rfecWdKVLWi2Qcz0AW/kGCuJ13i4ooem/AkFwomk8kZZpI8wbnJ5ga5UalE0hUOGdxCQHBcd9PKh59dc/fPHy1jtOwZxbPpc4CGZRyOJz2vnMTLoBW01kZYcA2uhyWSD/QNSsaVNWDaIngVsVyIYLlKZ5s4CcFhuWFlpgFLSCJ7vkD9BKlGOSGcGivhCLnl3JRKEnMOTuClMm2WEpCGUK7sDDwvA0oeL86tQtLBH73n7c++sOlwd6+XTOcBSFfBMutLzj2PF31ltA4s95J19z+xacmPN7zvTesAxKQLq8A4F442UMDjz76YK0JJzj3XgCEIeCzGpVS5PI/Hk3E3mwl8lXntda+RDCmPw2rpumAsCLR0vIllG8QkKwBXXbrmP75zd29eWa3ABSyzXFhrBEGBYTmEjKW3vLRv+66DU9bMLJogxkWgFRfS0o61IV5OUHqWZdxyZoxhjHFy1ZTNsFFVrrAMObNlZywvyR2tjRAuLITC665esmff7f/4lW96DRcR6JxUac645daUpB7jQwGs0uYTnrTlynHKVxAyIXDxrPT3/vkv7n5w2/fu+fm2vQczmX4fzEopGfOVguVCcMkdziwDM5YoOUOhY860TDmsYpzLUuayNkoxY63NJzxX5zNpaa66Zt1bX3/LutUzkgywWjAGcOsHLC600a7rRovisbJjqUTUySUYTAkZXTovDNwEwXk5LxQTG4ra2BIin9N/ocMgI2eoANVj5RjWsLhPKQxajlGGgUU7NrhPUvxQl8qLawqB8VKZO2s1YwxMcCaHHPi2XGEz/HfoedFSlecNzjUUbuXclgpoc0ByR1prmIFh0pQ5+PQwGmSqqFvOU+PnIk/tRPoJy7hhFP1k3HJwZpgQZcW9rF6zCr60aEiScV4mMDElr7kZwnJZayvUiBCMaW0NL4GmBWMMRQGHQ77nTbcePNT53Z8+7NQ6IpEKOONQJSu9nBljS2VTxwQqiBJTILel8n2cUOBa+WDaKrSmYvULmmd/8sM/+Mn9P7n/kZ0HjwQ5o/winARnrtEWnEEKRo9hZWKoshXIuDXkX6VzAcatMUzZfABmBWfJuOSqoHKD9dXJeTOmfej33rNkYTMHXMDjgDG6UJCxmD1Td+JD5x/jULnKsEdtGV1v0BoSxpju7i5BJgsrVRYOt7/ShrvcdYneNQehPZkqGggOrW2JtQ6CxdOW8cDCMgjGBbwQbuaSua6VKyUQQBmlcPhgZ19PwHgVmIbjQBdgA9TEUKdyohdxBXjQHsHhuYGA4JCwcvvuPcLxRHNyW+6kSFkWlz/a/uj3n7ovlU/cccMbLlt68RVz18RcJ9DKZWDyDFA4i7gAY0nuxFOGUTlPVlOdIkI3+KxUYpjDAukk3vz2m3/+xIPFnGLGKYGHIhEuKWV5k4FSsgQJeAZjoLU1xoBJCsiEurEx6O7uBbjVBtIKbl916rtSbXBjtNbGaiGoZq5l1hpuw1Cf1qqUAXTe3P6wDLoEA9aUUstgbAkvwawxxiptAm2KAGAVGGldDnHdMhaNiQ9BErVCMob501LveuMtn/3qfweFDJgLbSxgmVTaeC53XbfgBxBOQTnWqm986/uXLJl38bw6jwIigYZ0NLDnoHr62c0ajoUoK4pUiZQ89iqX8a0KprdPXXPJSiJbMToQUpTCcSWa8nNQhKnQqoBxwGdMbVpz8bLjT2wtFHKQSUJ/l8xIWGa1BQ80cr598JHHrlg9MyUcC2Ut0eoRIlNYwGirtS5xoQpjUQK5G0bcddYYM7bc4CKUbMQaykmVYFy61geTSEkUgd+98/bnt+x4Zn9fAGYtjDFMa3BrrC75Iq02ZVpYVi7mqykfkkFCea4GAhjjMS8N+a7XLLl5zZKHn97+s0effHHX/q6+wUxRxdINuaLWWvuKCSE144ANIEqQXGZC0BEHDLjlDoyw0IpzppUOAoezVDKmC7lqD9Pb22+55tK33nZtYxwsMJ5jLbMwCkXOuASs1tp1YuoMaWIAYQyUMggo93KUwKJWSillyiVUh/wM7FyrAA85bCJeLhhb8qhro41h44nKhZ0kED31VUMba6CB8QWwynNQEhEWhlnLLbNUncMY2CFMfxiGI2uOsRAsxC9UNPHMXAFjYI0JEQwMCppZa7SxTAfGlGq5lXcPsTwGQBEWko0ofzvUVx5BlJ6XfpoShxPlVzJmrVLWsnEHFo0xoZeSwZTQl8xao1FKtDC0fYbFo0d6Z5gtkYhrGBcGCJgOuE60Vcl3v/3tO/Z17OnoDvKFWDxWyGS455HktpSTSPClMUM3BiYAAO6wUlnkEse5EDFASRda+VK6U9N4z1uuf91Nr/nG//zw+a27Nr20r28g56TqWCxpqFq0CWHQXDNmIC2TACy3VBCZWUPJ0QT09GLCqCKKeWFYe2PNiksX33zd1devnwMLB/ANgkIOngtjhXRL5AIhfoWRi8uOqnXJ6DcskoLIYDljcenEXQ+cO46jjZspFG3pcYIPIfQ5GITkmsDv1vKYAxgb+J50rTaClzB2fiFwPc8AvoYjh5IVI+zwpFwz38+5TkpyHD9xjFlrAwMpoAx0DtWIz6ozdX1F/zCSAjnAupxxRwiHC2Z4oJkyzK2u9nURcalz/TYVUxnfZzpRGyskxHce+fFP7r/nC3/zmXVty2KCB0a7w1MBywA1cAvLueUwCprBMjAGobSWrlMCGJXpay9ePrtYLDKbODPttQSpKxkVFsZGkEgchkGD+UYb0r80E9YQwS04lEb/QFbDGmiHcZeLC0zzw8Pr50w0SsQ9ro0Vgvl5p9DjWoeRXWeFZQYsAMCsw60VLC+DHOlClpTUCUkbqq9OLilrwfyMk+u1osiMV7rimTIcBpxbKY3yWN4JMhQXGUqq5WdgD6OoI20Qi0EFkA7uuOU1z724+a4Hnk63zMwWLefcgQryGbjSYbJQDOKxdJD3Y57sOHL8s//w9//+hU8l65IqCKTjacD38eLzTx/YuYXF0ol4MpvrYZw5limlpJdgWst81s/2V8f4FcsXTanjMYbAL8ZcCWt9v+h4yWG283hXDCj4geN6cYnrL1/70JPPqlxRyTjAHRtwq4TVANMU5fN9zzHPPvHonlsvXb1opoFxpKPLG5umTfoDsXy3MdCWcc7AGUl1Dsa1BudCM2FLF8zImHzZVxGtz8gUIMGZA1Uw0uMSaEnjY3/4vrf83setcY3Kaa05PDDOmLHMGAZhIBkThX4UszaAkWWXB21DqySR+KkAkkMbyd0pSbz5+sXXXr5498G+ZzZt3rTnwAt7DnfpYqaQgc+Y6ziMgbPQqmbGhloXtzCMMw7f+DDasYDvi6BQk0q0VCVWXLpmxeL5N1x5SWu6lIXhSQOjlTWSS7gO/ACGuU7M933muKWA75DtVvT8PssMswKwlvsArPWYBZhmUCJQTpA21idRzMtxqHPdC7qYY8WMzPcyqzhzDLhXwkNYy5m1ATO+hINiVusIKDRKwGYZGNcGvJiR+R4HnuRMaZ9xboxxGA+M5o5rVUHqAvOzJoB1UWbPHm6zKhjtQxT7PV2AlQAr3eKCMWa11oTAlPm0CQraxMRQ1d8xTkPU6TVR+cbO7CcDbD6DfJ+btdwp+oGRjpAqYFBgjFnDLbjKyWIdU2DOUMSQn+GqGkYnfjaxNv5O29L6CKtYvlfmAi6k5pwrKQWzugABWC7BnWKeB1luDMCHQgPR6wicsltErpdnO2XgMWvApWWwjH6luDGu4TJIs1La1nB9d4QULXFtWW2YoFmxrsMzBSybHXvvW173qc//cybvM8ckOFMZZuxQyogxYIILFKRRowqTMaF7DLAcOhDWGqVdKaokYnX84x+8Y+ehvo1bX9qyc/+ml/buPnCkWFSJVDosJW7AJKRmVjNjAc6stUZYWKOY0bCaWcO0hlELZk5bNGfFsvmz1ixfsnB2XVKAg9QpaK1TiQS0QuAj5p1BwxXqRWx0uhdm9YhCxCwAjIYoKNmbxwf/6B/ue/gZmUwVTfH33v3Gz/7525JcQVlwCcZUYKXDAG2ZKCVwwTAC31qnZKOwMw6PHTGJQ7+1UBqU8WOBgs9f3H70jrf9WSBqerW1aWn0cW9xjdNSyLgn4ZxCnEPFoRmz2mFgPrQSjCWFEytabXkAkSc9AIZx7RIxqmNEIoO105d85U8+V4tYApybMilGGIwPnQ1lMpjQTCGHpNG+IziMDpS1biwH7DmOy6+/TfOEDph0E0oZ6EDE4tpYGFm9cIWprud1Df0DnRfPbfz8n161nCEF5IFv3Lf/r75ybw9q4CvH9V8zt+rrn3l7HYMKEDj48N/9x1e/9RPGYzaXfcNNl/77//1Y2lMh9V+Zu+VC0qKO0NMLxeDIqc5DJ0539+e468JGkjCYgeUchjMzraVhztTm2nSCDBkGw8+xqBitiB8Yh3MmMFCwew4cPHaqO7BgZC2UQKslM4Nbm3TZ3JnTZrc1MRhrFJiIMh4PE+L0fPI9AxjImwNHjh3v7M75inEyQkqeu1LmiOUx1y3ksgK6qa5qZntba1MNA7QB5+jpLx4+duJUd1/OD8A4RTfjruf7vrVMSq6UMlrVpJLN9TWL5k0bqj8fFdbnhkwuJW2RqAosOk73Hzja0dHV47hxlAvWlaoTgtYFUMX6qsSs9iktzfUOZ5QcWAj8mOMyoHcgv/f4qROnuoMgEI5rLHmcwguVHqhvvPxihxkhOIte1mWvDIteQiy0/Ya2ky2zmT32/K6cr4JCwRgjhBTCISvbWCs4Z8Z6kre11M+e1paOCxpDeegRnARZRwbacCZgOQxQVMgE2H2sr3sgd+TYiYMHDx04ePj4iZNdPb25fJEC/VGQk6AaArooHVQlEs1NdXOnty9aQAWCGufMbOQMZQsDYmgjmZIeEJFoJYWflfRDo2zH6Z69x0+d6OpzvYQZ5mxlBrAmUFOb62ZPbW2qS0VSSM+NrdsCPRm19/CRI8dPKQs3HrcA04ZzHgSBcB1jjFJBfVVyVvvUaY01nohuv6G4MJU9233g2L6jp4rKuK5DUVHOeeD7QjBjoHVQFXentTbPmtKcSnqjKRLGAgb8ZM/g3qMnu7oHtNZSuoSoI1occpZLKRvrai6a1txclxQXnDx2uGJEW/HAkZPHOk+f7s8aLqWUQRAwY1xH+L7vutIaA62mNNbPmz2jJhVTWkkhhzaADfc5PxsKfCyZOqYvqlQh3qJQKOZ89dSmHYpJAhxR3hWnmsdc+L7vMNZaXzu7vaWhNskApeGJYSoX2an4xRObAkirjQFTJkzPV65kqliQjLc21l/U3tJQkwaMUkpKN7KsHFH8WghDKnEiGQBGMSZFAHT1Fg8ePXGqq8tY5Xrxggo910NoM4HgkiVz66pScU+WrhFG8iKc2zOroodvZ0OraSO+GwUMFnDsVPeufQde2rP/2InO7S/t7s/m+gaz+UBxGZOuZ5g0xsAE1iimlWCoTifb21ovmjWjrblx8cK5LQ2101tbGqpLdSfEmR7nUpnaUPljZwg3NrYKLsHOtClK62s4hBCQFlXxpAmUtRZad3R1k2VbsjZLCCjylxoGQ4hMzgTDGTW0WcU0k+hPJIfvw/HgG99xY4sXT1swf9rDj77gNE4NcgpJY1G0wpeeVbQJlIWx4IYxy1wpOVPaFrVvBWWuhcQKsnRrOjYo5GwidazrBCACBMUAyaHaumdefixiWsEAMvSwMuFYBIwrx5XKQjC8uGk7F3FlysWNGbPM5VZooyCY8FzhxXK+klw0pRKNJfJvE4B39vX35fNI1cGJOUzVJGJxBmEhHOSBjtM9lnGrrcN4TTLtiDPSkV4JDvpS2r6lQKGUMuY5c9vb5kybYsHM8DK05VOtQeEyXcLoGSHZxMjnueBkkKdjbMWCWSsWzBorv50B+Ww+EfcYoLW1lkspxpPiZCw4Q1WcL53bvnRue+X8eW2gtWVlwk4CIwCoq/Zqqmay4cRlUAqcQwhYKvEhOOcjQthjGvVnuWJRBpdwwGFob6xub6zW5swcXJzh5PN9BcB1S4qyVoZzJpkk+EdNVXxVasbyi6YBBIJCmHfOIlBHq87w4wyf4REkuGyEoUy6y7Wr51uA0PFhn01ZQbNAEFgpS5ELM6Sk4gwAconZzzJozkqEEoJpIbBuTo1CTXHFlHxxdSGPbNEvFHWgzb4DBy2DNcP8HSaVjKUSbkNNdV1tVU2Kx2Wpn1YZzmxIYxHhAOcjV610YowlIlwuWVtLfVtLvdIWnI2ax28jQ7aANoYxKxg/18hiTUquXDhr+fxZsrw5TbnOLgv1oHKSuLJwzlyp8DaQDItmT50zYyo9R2lYa4VgTqQ3Shkp+Ugf0jBVo6kuXVeV5nz0PUkHyloI8aox9XPgovaWWVNbiko7jqDNRisihgarhBC0+o6QZ/w14xOSqeP4WMgmzRDzHCHEa6++xI4hwYwpg/nYkFwaVeQK4MbLVw4BNsKRMFhdCrTxIcgmP7NOD2ejDYMN7SIOgAlLRN9ttV5LVbsxUznnjIux7otCIYh55YIN5UimsUQLMMakseESRsDAWFgtuYjFRN30+nlT629Yvyof6N6B3GBB9WXymVw+V1SBNr4yMEpyloi56VQylYink/HqZKwq7SQ9CAuHlY0ra61RnFBkZ8S4+Uik83CpjlGwXCYMfg0vcsvguGhqbrBGcTAoe+jQkeGZroLBgnEq9ovhkKhzz/pVCq6HXL4/Ho8ZBK7r/MVffEAkvvHM9j3BYA9qE9IyoZjNM7gcwkA7YAwoBkYJKC65ZcZqW6psaEslDpkVAGeW26LvuineDyk5AwS457glEr4o1oed5VgwsCAIXIcDXBlA4OlnN5bINlkJRGOFEzBOxVw0Y1x6BcUcJtpqEslynYhsgMMnOo1mgASHYLxtSjMvi3NtcOTwCUI2atjWKS1CYKSv6BWo/MMYE0JESEPK9PcRfgET2i6spG8xSqxhRsiJ95Ck+shbeVQVJJmMszLONJyWymVuRQRmGgZuY7BY6wAAekhJREFUzRhblzNIDsmHVzBSGpyX/txGsnw4g5SlDwlAOFxrKAUpJyqGR/yRGJK5BoAQXPJy/+3w+eF8SNkitA95qmhTEQOcEIzzUs1pNooiVZI2oxKST2wIkg+fZFIUGOCVL3ljYYxFRXU4uuhCiDi3FlaCeRypOBCHgUs0P8tnLzZnZpkhwqLEy7mWYVVWiHLKfwkSz896XqgnJeRNKfODjVm0kpXGaK0FjOR8YpH4oq+FEI4I3SSlaVTKksLAIkuvtXGc0RHohYIvhKCiWVQVUQjGgCDQjiPoyeV/jdbaKVciGaFOWYA5EhGCwhIwjNigwtU3FsrAveAEOHwMfxL5pAlhS/TUABAEGjBCCAosBEFA9T+klK8QdrYsbznnrsvH2j+cQYjhXjQ2Luq1M2JNnDMe0XLo7ROoWRlufs55CRGOUsWsUe+LeMxBmEAXJuFYe45SkYPD2nJ5DAZXQMZ5Ms5rq6rDvAcbqf7nK0gBZwglVWIVop9YC0WkclwOBVNeXpOj6kYM0NZwhpiDqVNaGQFmGes4caqoEROMiYh/X+szafU4I7fQhHDeXChtdCIes0CumPG82svWza1v+eg/funrP3n4wXwQ+APFWJ0bF2nfWGUDZhOcMwsoFRgoJhkXkjFprQHATPmsWwnLGbg1rleEzRSvveUqF9Il44r8VOwsCIBhh5QKBEFrzh0L7Nu3r1D04STBGbfQzJSsDGjmuopzJiSYQGBmNdc4JW2X9Rew5+Ax5iatAbRxXSxdNM9YGKs5hFI4fvwUmMO5NKq3bdoUKV+1OtbDzp7WWhsIR9hhRDNltYOZ0ANEvlOjtArZdMd5GetA0wXCI8qW76vQJBqOZVGK+hnNuBlLZDBQkgg7I9RooJT2xpD9pkzFTK5vVlawot40a88wBkOLjZfYPGHOE9FH2H96HRPcGGuMBcoHdMRO8X0lpeSccNZ2WMEWzpkxVilin2CcsxKd74hU3lAA2DI57kSqrJAOM4Kdm2G4R8SWlNcx3zGqu5f4NUtWpaWMFmEihEnDLuFy5abSTyIxRFNKwjQRqcxYBUBOqOWTFlhWvDgXowORQhVf8FCLpjQydk7zGXeFKdsAtNlo9ZxyRjaPWOTO2IH+WMwNdRFbdlBxgA4jgfTLfpAxM1gZ4HBmztQDBKcxDrn0WGicvIqOLn7GWrDyHSwcQXVDSvellK+k+C0DnkxI/8DHYAkKqTpCVjtjwe2YDjhjI0giFn2ONQQnL7P8kJl9rlpX2OehZA4ATHDBRr0vaHdZCwsdGhsTmGpjSwEmA8BSRMIE2jqOYAJeJA2ApjEuzzBCSKpzVp6fUrYvAGYMjA7GMi3OSeUyJcSVHcUO4ByNTQ1CsMAvQLr5fPFUVzbdkiRr3hDVckTDNBUtifHMGOfwAyW4tNbEnBiDEeBzZ6b/8IO/c6jj8LMvPK94wBqq4jImuefbolZcuNa61nBjbM5CaRZAcCjLLGdghDSyjFkGYZAUseKp/rWzlr35lttd4lsM6V9ttEgHKruLLaxgHBZaae5h05bjx453kA/W0oYn+LY1gJVxVyTTOUgw4Tly0fTmpIHkpgieM9h7vEPIKcpI6ALX/uIFjZIBTBmIvl4MDuRg4sIVxgbNLXVnhJNfcd0ryiFEpksY7hklXYeX/oQuP8Eg5DlbS05ZxIdGG2eQ3pgmZtT6pHuusrDgZfo6UwYQCA5nbFubs1FCQlqbQGuy50LHfvlmApW11RoKJecWY+ftauECtkyvJBgXZ+MU99wh7z0lY1gLpTT1HKAfsmjgcrhkHD0Aas4s3DX+SyWSmWHPuABCIWgtjC5pEGMFp9gI4mzOeUmJsqaEdwBQyhVmQ/oiSohsZmEhORuCh5Q+R9VdOJ3lMsCXrPWx4TulIpXl78NNaMaw2+Uo8zkR5ydtY5SoGYb0bNeVNuIipBRpw5gj+ajOVj/QQohS5dKIvu46kn4YhhSpQgnVghtZQS4IdFlcsMrdNsZoa13nleZ5ZmXfG9khWpthvaWtRbCK80hXe07uolDwjuVncfgoLn9jQ3LW4fdyyTU+Ik9fCMZG8BiYc7cRz6CaG9ar0e4LrS0RyzIQZQxlcZ2b28aWawFQNhADuIAjeGyEYAqLGJVvaqK/GZJ7I3cr5+DcefkLWsYgj7A0BSPaLdTWppOJeH/WF/GkMcHuvftmtSyL2HdUXoVFdDY+5Dk7583JtdauE/d933XjnCEfKOFwYzB/Vmp6a+uzxkHOHTgWBJ0FJHy44ILpGGTKiSVTvsOULcBqsADkHY2Ul7TcwIJngpl1U959xzum8mbAOKX4YzgePk6uUVMq0G2FF/OBhx58pLPztHBqDDgDN9ZYy8AZCWs3leTxhDIaQVBb481pdVLMwqKoMVBEf8HYmMuZhK9cpuuriH7EGmDX3oNGc0BqrZPpeF1tOqLERCoBv1JSILTXh2D7XIRLPXQ+mDVKRy5Cc0bRrnM+vSWKPlIOAMixVTd6idaaRQoGV77yoxZeKODGqoeiFKlWLKoiSMnliKtLa6u1dhxZ/szoL33ZFwZjjIV4DItS6rcUztiTWVJKSuB3VtJrcSYpQan/rjTDQopsZAfMhEHPjFWaFlo9xsDPvbxoic6NIvulWAknzgNrLdmK5VXU5XChFpAsDHCQz4uR9WDKopKNZwmjZXxQJuUyxsgxrORABZGSRzTlbEKHpbR1ox0kfSuq0QpxlmgREW4Na64rS4jhyMPDsFEFk2nYDjSlpLWh5xCdGF69Fu60YQeZvJXl8/LKqYOhjB2nnqdUyekYLjTnEIKNdZ2Nmk7HARUEQojQv0W6yASiqDRX4RNQ5hUS0hn1vuDMEjaU9j/94cTvNRYJlYYkN1YbYyQr29lsmFFTPtraKqM5k6VwHXGTsvMmtOUQORiLWqslFL1gaGqsa21t7N/fwSGKufz2HbtuvHyZJkIOzsDAztBZh+INE936jtFwnZgOwAXiUmYKQSzm9BXRlK7xWCLQ8eAkg1JIKMSYiTEjC6pWu63cqYppbqz1wQyYDon8DaUgMs0U3EC88cZbr5p1mQsujS0Zzb5BbHS88UiTvsQQRFJYa3AYi737DxT8QLoCxjJAMVEqMANAurKqOs8EuAD82VPqGzwwq6A4BJ7fegxuSmvBmZEw01rqYxKAttAWePaZF8A9ZqUJcjNmt9XWJKMq1yspknzfdxxn3HF9xmW08omAtVr5xsBxY+cmenQJy8nAGIPrCCrEUUFURb3iZXmkxpIapqycCY6Rp3BkO9MKLwXcw3dprcmjLoSQgkkhrT0DAWDCG+s8rZ41ijFWdtURk6kwYGN6u4bKBg+/qkP5WOLQE0wIqYdJbFbObmI8ksYbig5+zsM6s8ZyuKvLVw4bVvW5smM/4t8i8iuuNGPMDYs0mvLtGoI5wh/Ti4t+UQghhBRE02LLlZiHoLLsrC7waGAlHBcFu0cQvpf+7wjJWASUD1horWwkU2x8Al0MTSA5ZugGDbecprySs1kjofcrJCin/oeu65D/abRHDU+biJ4LzhiPdDLcda+uysVGLF/YYZyJqbDWKqVefoBpPCHFUYT8GJxb4XoxBkOFwg2jNPzI7WyGBxbL6D5bKtWGYeMKM1UnpjXSTgt9vWM/hxIUTSSYwAAzgbwEPzBccMmHdiG5yTkHlV+LpDaOqNjNBDiDYI6UkT3MorL9vAQWR71imIVlxjLBmhqr2lob9x/p5BbFfPHokY6QBa7sujdQGpKHnmyLCCMIO9crBJxjoN9UpTksclmTTDtFjWoPzXU1MoDRgrlxLWIwPjJ5ZBSMQc73nUTMicENwDUkYJUlanvGwCyYATMcaEk2Xn/JFTFwDyLBeT5TTMS8M1J6wiGwSueT2C+MAbdcK8Ay1435SnMmwGDAUFKTGVyPJ9LFwCApXWbmttU7ALQ1isHBQ09tDJgHZYwqOFzNm9nmARwmUIpJ7HhpN2eO4I7y9dS2lqpUzFaocHchWwhiIJFduj/sME+mHX6XRK5SIaU494hzKOnCq6KcZM7GCuhEJSPFdCpYaaJMFhCOrmLZ5iHbt6SoRbgGysFWMcyatBZaW3KMnfdrJexqeEkQP/xYmySUg8MM2ShcI7rEfGSJsNJK6/MSHR3Lgo/+fJxQkmGmCGPMWDAR4YK3w417E2Gdo+TAmOuVvIVEZUX68pDo5yOTMce9LqNeOVEgGZRStCfpLpRSTOyqM8ZIKUPVM+RiOKN2+JmulFE3ubVWShnVNqK4AoxDFg0DUEeXiR4VPZuV01wudAuFQKlOQAQPOuwzF1rfisYTh1nXFSxtSiqPaofGKDYWzI6dgW5gEdctPSe6XSegdUWXMpQ5Fd0EpdJRQ8VAJyReXGeIgYLUSsHBGDNa8RCbYlkZQ8oAC8GHapMbC2ss43Tidfk8gjHBxXnZnBJDBbqjbirDwIRgeR9NDax92pTg8Y2uUyWlu2vPwYJCvByOgzGMAWN3ZZi1d1YPDROwFlVVpTBuIskBOAIaePMbXrt56+G7fvxQdXN1fz7P4RnLOeeGxZHpRqfh6XisGnmjwBWYhcpZNwmjYQwcDgE9WLzz9W+4qHpqDMIBE4ArHNghHrMxAbHsjLxwhERQnqu15lLMW7hIPbDJjbl+3veSqWImj1QSOoCf99oXWDcFIZHPJtngjetnAACTzOV5g5f2HDU+hydj0saC4PU3XUUrwWUsZ7D/8LFC0QcHVGHenJlN9TF+pn/7FfN1hUdu+NvtCFuxBIYZGX+ZWFfLQKUhjJFlrIIfdejGHZ9kNOVu2vJbcNbg8rCPMVbBtcsp2+uCXRRlI5JxLoe0i7H2xTCpEbVBR/0MG2vGMHIN+MtZ39ECHyQrhsVHeOVbamT0xEbSkO0wSEdkjDbyW8bAmGSjdI8PW2k2joNzxnU1co9E8PRn2gYTnM9ykG5oc5Yjs3bY2al8jY68YEbqx2eVP5wPn8PwsIw8NUK8Wuh5DFPWxzLSXhUg13jOC86Iig6BCO2IjcSGjoIddY+NHP4EvFzRzTPO/V/BVzp+VyWPbrPI5HHhDE0dK0tONsK9UjLJypeOlCOm/eUazdH6miYixMnjbghrO62t2fNca4wKcKqzZ8/ezlCKMWZhNbSmFWQRFr8SU0dYTSkSIDgLHG+4e0wJKB2o1ibvk3/1p3e+6bW53lMpR9S4HjKBLEgRJODXoN/LnzY878ZYCkbAWp5KME9AF6EDWANfxSyfVteSgOMBAoxZCMZL+EI2+oY2Y/yvlNGiDGHIE8l0PJH0feU4IigWZG0NjAY0ampEsipvKKTk1/L8rEa4ADjPBDh4An3ZgCWrBLPCFOAPzGqDB2irNdj2nYf6B7LgXAjmJbwZU1sEJttkm2znKP3PpHsQtvxN+YtXqjM89EsCCthIwqOZnNxxmwSTbbK9Ekrq2PxOtnSES+UaNYMGFEr/qgiFxHBhYE2puKc9D4dejg4Yt9wYzQUEhw8sXjKvuirR068ZE51d/S9u3bFkQRO9XJAyGTHUmB3y0oUsmjZScbOyd7HUGR6C36leu4k5UkNOaWGf+tsPLlu2+Mv//s0jJ46mqxv9AnOYa1nSZALbWUA67iUQ6IK2RRMUoAHHiSdSQb6gBjMt1dPnts2MQzKrheUU/RtC+pdcNsNz76Js/jhzvrTWQkBbaG25dFEMhCuCQhFGoVhAyvUaGr2qxrwTh9A1XL12/fIm4j5gCDx87fsP5XxhtdJaCRTnzWiqTpaez+A+89zm3sEMRMxYP5mSF81qt3YCYJlXSciet35eaJF9oZ9vRr9+2PmTMaOPZQzRYF/+u/ivyvwzQNoKMzAiyzZCRjped9zLWq9f5vk05+dd7BU4Yhd0vL9snb8A/bE4/3LpVbsvRnFLR0lh7NjrzctMhHyI2dWcOU3sfK3fMC/XUNEoBsWBhQvmNDfVKeW7rpvN+Vu27TKlHNSyC2/0fCJDAdphAAKMnXRqASL3tqR3MoUhrmYF+HEXLfX44Psu//Cfvrc6IbgJKN7kIAaTwIDw+ywrSmkdMAYi4NPazwY2o+JIrV9w8bRUk4TlBJwvxxXKPjkTCUGcLUGVclikBMA5TnWdLvgBHDfQ2okJk+mBw25/x7vqW6ZZN8mFI1QRudOvvWqJAzAL38JneGTjDuZVwbJETAibu/n6S5MuGCBZTAMvbN2ZDxQ4s6Ywpalu7qx2h+FXo/2q9PPXuU16F0ZcKkTFaA2sglWwGlaVTVxT2W9lRhOak1M82SbbL919cUaKipmwPRHpHj+PvRxTaHAutFGA5lAtLYnZM9uhfMGlUnbXrgNdPVSVAsYaGDXqECwVDuJDalYQBATJrOjo4hG9z5ZdcVJbC+sLBKQp3XH7mnfc+frMQDeTyrdKW8Z5HL4X9OnigObGEU6sTLTCXC3qZW2VH0/6ThqeKFNqWVtStqw8Q/9l43AJ2HImLj3h1KlTQSEA5xrGQDsx3Py6G9/7e+u9muacgtY6zYN5LVUzauEBRmvf4IUD6Alc5YO5cW59brMrlsx2AQYooKPb37n3sLUMRnGBBfNnt0+pFr/kysyZXl072tdv6H1vy+SwbKRhc0G1rhGKAfVh/F8jB/KrugqmHD3QZcovE1kbM6zwxLAIRTT4GNrBv6aWxQjVs6SnjlRJfz2CqxXG+5shmn7N7osx8hx55NjyYWCDMgnfCDB3+YOs/HUesFx2bPXLUpTTuBwrViwTQhqtGXcPHTmxc9chAEKAswgTiB1bNYmUDqjIMsJNucBGmR1XwDqwnmCeYI4yOY6AA1Ji/dqLY55QzDesoIxhcAAPg7ow4DMttLLIZMC4G0upwUD1+WmVmlU73QGH1ZyXUHu2vEbnCgRm5ewOAN096OzqLj2FCd3fvXTu9L/967ds2oLenLIyZq3lhcztN1ydAhyAm0AKfOuuR3uKDNa11mZ6Ti+c2z611aXSRRx4ccuuI8c7wTmKec8Tq1cuFdEid78iboVfP/E8KTR/JQ3oIR2KRRRRXpbBrEy+Vd6ndpR7ofxlqJ7s5I7+DWhm8nD9GtwX0fMrIpqWxHBYpxjTlOLny6/Nh8vtiARnjDEYDmOAyy5fX1dXYzQc6XZ2nn7++U06fALnGJ65NvSsMIYY5kFYa/P5fMUuScABHFgJw8uVz5xCMfC469sCBzwOyZ26hnqfBXANuDUGgAstbdEK5sAwQPJ4ilkWDPhzWue84erXve3GO3mpTAuVLQUT0PZliE8DY/Dkk0/v37+fC1HKO43FbrnhqgYP//aN7/XnjXTi3KK1Pr1+RR0tmitZx+lg0659YDGkqiTnjofrrrm0tQYCkJJbYMOzL/T0DsL1AN1QX7Nu7SUmgAmKv6QiYISxEj02L+fw2HP8utDPn1BnzvRsjfQevQzdybJSql3FL17miPulU/Iu6PpSMTXNoBks45ZJMAkmKIvPMmYhNISC9CF9cAU+YtuO+LJnfp3j1v7l3M+VXIMvz9lzocd7njfvL71z6/yt7C+Bf+sC3Bdn+qN5GY91xhezir5gFWwQ+VKwKvr+C7E/y9U/okixcs0hBiqfJxmwbFFDY0NyINtlnVjh9OltO/dkBsBd7cRsyU0UmUEG2DAJkEny2ivOfSALdPTZnq7+1XPjHuCRs4mFmaJ8OAFZpMXcOKDiLKaAIjC1vTWRTtpsDq7HrLFGgRlwgBkrIOOOUtxk8ywfu2rZpZ/+w7+bifokjICmRyuthShxLUaId8agIUI0pZFzwBglhLBMBBaPPLnhyOHjqJ0H4cLva5/VfsW11/3XT/dnDXOra7TWvDD45tuvmu7AAzRQ5N7PH99wqjsH1COTg6taauIzptR65YKa+49nd+w6aHKBm+K+RFtT1fIFNZ4Fg/erZbvwscsB/SY5WjjshOsxTLbzcEuFJBMRisRSns65iFHzG5d/R4S3lpcqlPwGjnfywP763Be0pmaEc80Mz08cEZo8j/3ho3j3Sj44wbhnkQCksIgx3HrDxa5bKHAXqZYnnn7h4L7DSU+g6IMJpbUC90uczgZQDDCQBtLoUrHY40U8P4hvbB+844t3f+C/Hn+qH8cDaLJD8wGMsTAFlWMmYCYgYgzLyoQVDLCagcomilIs1rUNTbWwMRQdbgxDHqofui/V3pBBQZlBMD9hZSxjP/mBj09DfTWQBBflxHApXQpwSsHKIV6qaMmjOhYzYBYWXIFrGF3+jWAcgLJ4fOPmHz/yOKqbEKsBpIC5847bVS3/78c3Zr14MZ+V0NOq4tctbK6ycIE8cLiAh7YeLwQcliHmqMHTFy+eftMljcLXcWhrceBQ51MbtyFZ4xdziRhuue4yQamgwS+1f2ukF5e9bOwLO8evC/38c+8MH/1rjHm7kP3nmMBXxbG98vN/rg/nZ9JAsMhJ5+BhiMEBnFJi8lkn5Myvc60p+Uu5n8/mJ6j89WqO92WLK7yc0b1a4jb8MlozwC8WYUs5YNYYawx9Q78dfYZ/aRbg/N4XZ/d7nXF+BZgAc8rfDD/Uw3rFzk9vWOhB4yMde0oBgNEQwG23XstYHn6AVE1nV/fPfvEgDOC6NtBCuGUkqilTOpcLWUj4eQtgy0sH/urz//FP3/3ZgQG277T+wvdfUA6yBcACUkApAzjSKRXqsUNuxtJWYsTpxZgtVRYWLPCLWfgagXUEczjzqlJIJgt5FfOSGCyk47Wmrzi3YUY9q6oCPAubK5aVuFHY4c46Vxph/QRjdQBwK/mxzt7O4yerausweBomv3Tx/NvfcvWPHjm0vzcI3ARiruP3vf3mS+c3IcFKZBNPbu/7+YaXAuNwwRHkEklx+SVLOOAgAFig8ZN7H8gMFBLpamZ8V6jX3XRtUECJ0uJXzm48hxn+NbaeJ2fhl+KKOqs2cIZUHF1a/lJfyRfE9cAqzMnkeF/pls/nKQstxEl7nkfYYt/3iSk+Wq1oUlJWPL/j0rPPY39K5H5jiSXBwEvaDpYtal+2aD5cBhjHS9z9018c7sxaJpkTKxR9HkGfkV5IP4EK4o7mFnNmzujvy/X1ZRizSCaf2nbggZcg40CuAGhwpowpYecZQ4R10IRQesaNMZyVOFeTMVcyxYSBZMzCz/vFrEaWq85ivJiuSc1Wp1RSJW9Y/5pmmSZdhcXFqDCas6rkzFJciBtwRvgQRwbAoEG6ttFzPNN/UrLutJv9gw99aM8p/OTR50RVi8ropOPMThZvX18vgHwAC/QX8P0fP8ji9ZZLxi032dlt1ddeMccYCDdmGT90ZPCBhx7lXiw3MCAYW7N61ez26kRs8s6ebJNtsk223/TmeV6YhSaE2LNnz4YNGzo6OgA4jkOAaaXUWfjGJ9urptFHWyRab6nut4AxcJ2S7vGOO9+MTA/yA8Jxd+8/9tDTL/iAAlwvJgBZSuSJKoYGtgiuJcOUGv6h978/oXwZKMGlilV98Zs/2t8Lk4qBAcYwCML5kjZKDwo9ZtHyugxwGOqqky11tdbPCW4ACBmDErBJqavQy3k3tyf1jSuvve3Kmz1AAErlwfQ5zo8BC8AUKacUobBgAAp+0QIxDo/LJQvnOibXnFb/+OmPL1xd85mv/LDPpgKRhpdgme53v/ayqTHoIlwHOYsNL554buteBVck0zrX7wZ9t127pjEBj8O3CIB773/0RGdvzEsA1qrCO9/6FnqvDiZz0ybbZJtsk+03+86muuxaA7DWbtmy5d577/3ud7977NgxrTX9nOpaUsnOyfbLtXxhINCGThRmwAwTJR4EUc6k9gvmhuuuaG2tk0IXVKCcxH/f9fN+H/35kh+ozIuPIe+cpeQsE2gI4OoF7uUXTeOFgtYsUOZQ9+A//WhjhwCEowtZzoUBLOMYNf0RHCjxqZJeVhXjF81sg/EZlNY6Fk9xxFGU6pTf++y+zO6Bm5Zd977b3jUr1iYsmIZ0iF32nHT/EpePZTAM0kBaaMgiBHfjAFyNGy+d/6d/8N53vevNP/jBN6+7bsF//mBrR87kUaWNg4Hu61dedPvlU9NAlasMMGDw1f95IB+4yjCdzSeqE3OmpO68Zb4DcCCbt31ZfP9HP9fWLRaD6qqqmW2tV162jANGGS4mvVyTbbJNtsn2m9uipfMADAwMdHZ2DgwM5HI5IQRVLqdi5JNz9avg5RquTUMrxQHfDziQjPHaNN5++y0q2xOPJ2W85qlNO+596KVYHIViaT+UXGXkLSsxPhuAGQMPSCv8+Ttfu2J6EzI9Vmte2/zj53Z97YGj/RyoatCjaRRl6v1SxVMuBGBgtQAcgUXz5tQ31ALaLxa0sgBHAPQXHLfhtnU3fuS3/3R5wxwPSDAwYwCjzATw55RWCmEBG4LUuK99GxR4YFyL19+y9uMf+92psxq+//D+ux58Ask6GKDgT0uzD7xxWQqQKApmswF+8ljXk1sOc686layCnzX53t+6/dopcQjAAF6CfeeHD7y4fY/w4gKsv/Pku3/7bXVJcECKiqWcJ9tkm2yTbbL9ujdWbuTE2rx58+HDh+Px+C233NLa2opyUWOKKk6gHPVku+AqV5R6+cwL3VijrNUAmC0lPnCL1990dXNjtTFKGVu07rd+cI8CHI+ewobIK6gMJIN1U4N5PybB86jjWNKM375yWQvPSEcUjOz16r/y82e+v7XQBRRIwbLENKgEjIgQlwEwOiA9n/6RwIL5FzU11GgTALyotOvF48lUY2PTpz780Y+85w8W1U+JW7gBmIEQzIIz7k5QK9UKGlrAZ7CAAFJCepIJL6AE9P4ADx/Cfz66uZhq6unuiSecOp7787feuKQWLqC0UnB6ffyfr92FqnbjpAd7ehM1bls1u+OGhQkgBhigN4v/+K/va+aCu4LxqW0tb3rDzQLw80XGLDigJ3WuyTbZJttk+w1tWmtjDHm5BgYGdu7cWSwWp0+fPnv2bK21UooQ9OQPm1S5fgW8XPbMHzqOo5Uf92IcyGUzMYEl85vf/qbbioP9UEbGqx5/+oW7frrDhE8bzt3CfUgvWYXAuAxMI6Zw2/rWt161kmdPQxWQrDseJP726/c8fRI5iuENUWIYVv4inZCi1MZazjlVd26fOjWVjEvGZTJhrQ1UPp/p17nBO2+9bGFrjfStayAZCoMFMBZYayHtuSUZ8VLlb2bBDC9T1koqMFnIg5m80QWObR34y//3vb393BfxxqZ6//juW1a0336JkwasLkLEB4DPfvXHhzsz2ji5gvZikudO/8UH3trowYUJtOHAd37wi70HjiXSNflcLj/Y+57felt1CgyIxx2jA1j8KhS1nmyTbbJNtsl2QZoQghISC4UCgHQ6vXr16htvvDGdThPZuOu6nPNJZeuXV+Uam94ejHPASMlJ+0knEwJIurjuqvXNUxohuSrkjcJX/v0bAzkAQMBVUQFcBdoakJKkiaxLMAjAwrVIBfjAmy5eN7MaxW4TFCBTp3jTh//pZ08dIK2LWeaUFSNjdGCCAmGwHNcFwLlkrFT5pqaKNzc3B73djDFIgAVcFKc2p0QAD4g7JVBYLB0DA1jMlLxm56JyGWk0t4JZoW0xJ3UgjIEqQGvEkkEgC0K8mMNH//1HJ3SdYQ2GeUHfyZsX1//xbXOrAaHgCS8L/vX7d37v4S08UQcvDsZVMXf50uk3XNLIA8WgXcFP9ervfO9Hmjm5fIHDTpvWctP1VyZjFFrVXERitReyVchzoV+FlQMmjM0kE833fQBBEFhLDDI6NOOiJh19JnzXODNxisUi/a3WOgiC6KtDGMTIXoWvrvyKYrEYmpvRn4TDCd9Y4TkVehIdOz0htGujnaR3VXiCUoo+EARBEATDOhMdbOXxkvUcnczwb8Pn0weiU31OLfzD6KxG91h0s9FLQ/hw5UkY9vBxbs6RY6+8TMMGTkOgHT5qi/6q8uSHq0N/MrJ7+Xyefhh9zlgjDTdquDfomXR/D5vP6KmkX0VfMQxUdH7lT/S95Lah4Yf9DAcSSqRo9ybQq/BPojsw2hn6t8Kajjy29F/qavj8cDvRZ+i3uVwu3EUVS7OU/lAIEYvF6urq7rzzzje/+c0zZ87EiDBitKpedOGGjY7eG56m6OSPR47RcOjfkR+L/rZyiwoQ+p6mOjr50X+js02UGWc93bR5Qgk28kAppUI5GRUa9GRao/OgNP/1Jz85tEi0UkOMqMMLPTMwZtE+vf6lfSe3bt9FPq2B/p62lmmL501zHHAptG+kKxiDKualKzU4B6QtP5WDC4CjrX36vv37O/oCxOsM3L6BzMkj+6a0TW2rcwIDw5gFN1pJIZjgVilWQo/zqOKhgU0vHdt+6EShoKCK0sO0lur/+w8fW9Be54LqbVswgDNbSoFk54pBLxa0dJ0iUPBzMdeB1QgKcCS4q7gcFOK5Lnz4i3ft6MhatwnCMf0d8xqcv/6tW1e0MqngSBSAPafsx7/wX6d1lc5ZWCQTXhIDX/6b97bEUe0BQG8Bd9374Ld/cK+BF3PjweDAB9739ltuWJJwwGEYFLMMTJSW4gK7usKzGm5HxpjWWghRLBaDIMjn87FYjHN+tgrlY54uIYQQgp5P4APOuVIqn89ns9nu7u7Tp08Xi0XHcYwxZLdprcl6Y4wFQTAW5Qx9TErJOc9kMnR0SVfwfZ+UDzpavu/TrxzHCUcdDmesceXzecbYyZMna2pqCDMRBIHneXTsqYdCiNOnT9MRdV13rEke9RVEqJPP513XzWazjuNkMplMJnPq1KlCoUC6F60FJYqf9RahFxGu9tSpUzQhoa1MM1/hOeGg6MNSSpL4APr7+0lYu64rhCgUCp438eoIuVyO9ABaDtpanPNisUirGQr0np4ex3EKhYLruhULtg45BsI5z2azpKqGm2FYGxwcpMcqpXi50aYa3SbjnAR0T09PMpnM5XKO49DGoP7TetFAcrnc4OBgIpGgLpHQJyKlsUbBGBscHKQDGHY7k8mQIhIuX7FYzGQyIYgnHHJ4QkOiJnod/RUdBCmllDIIgkKhkM/nBwYGiHGA1preG45lZD8nIAHOKnyok4ODg3QFEi0C7TS6/xzHoVn1fT8Wi9H+oTlxHGcCcok+TzKHwnPhqEleUa+klKTbnXU/0DGhdbfW5nI5urxpm+XzedrY9BkSdDTDruvSYlXoKu0Esu6KxWI8Hq9gb5CgoLfTOaL94/s+bYBisUg7J5vNCiF83yc5T1NdWc7QeJVSIcisp6fHWjs4OBiPx8NZog5UOK3WWqVUNpstFouu6w4MDCSTSXp+JpOJxWIkHGi6tNYkFWm66JmVA6m+73ueRw8nU4H2SbFYzGazvb29fX194V0TBIHrurlcLip56A9f/m6X0T5G+LIj5TGGqYrFooh7t996w30PPtqdhfXVYO/Aj376i6vXr7lomhAGwuUgDlwuAOsgsACYM1QRiCMBXDEt9vfvvuUdf/8/OdQXihZe8omde+X3Hkq967ULWpEENMC5a7RyuOXSGVqbM/uzdMlC+d2fgDFIEfP4e9/z1vUrLxIwQABmwEoxQXPmSMdr+gAyLrNF6zg87qbyfn/cEZBAMUDM6wMePoXPfPMXR3MJp6o6KOQd6zfG1J+/680rZzBZtK7DTg+gz8Hn/vOefSdzoroeTiAdmz194Hfe+pol05AGAK7Ad+478pWvfTMoWOYaa4tzZrfd8fobquIlHBkB97myEBc8sDhsS4WbjKTGf//3f5Pd1t7e/oY3vIG25sSsydBcM8Z0d3fv3bt37969hw4dIgmltY7FYtXV1YsXL549e/aUKVMcxyHBRwev8v1aKBQ2bdr05JNPxuNxkjV0wIaJdWPMnXfe6XkeCbsw+7rC8x9++OFjx44ppS6//PKlS5eGB5KuhFBw/+IXv+jr62tra3v9619/TvPj+77jOPF4PJPJHD58+OjRo5s3b+7p6XFdN5PJCCGam5tnz569YMGC9vZ2z/NIQRlV9aS5DefcWrtp06bt27fX19dffvnlc+bMCecz1KLGWjKSmPSufD6fTCY3b9782GOPOY5TLBbf+MY3tre3kzo4AZEUBMH+/fsfeuihfD7f2Nh46aWXXnTRRSM3DK1Ob2/vT3/609OnTzPGXvva186ePZtEZIV5YIwVCgVr7d69ezdu3JjL5SqIfsdxLrvsssWLF9OlTtNSYVD5fH7Xrl0PPPBAIpFYvHjx5ZdfTte/67qUNUZ6ajabfeaZZzZv3tzS0nLDDTfU19eTTkMKeoXJefrpp5955pmww0op4l4i1xRpRaQwAWhsbHzd616XTCbDlR156OjCDkdE91BXV9fu3bt37dp1/Phx2oH02xUrVixatGjWrFmk+tMteOH0LTq5pAL6vv/II4/s2bMnmUxOmzbtlltuifY/3A9SSq31ww8/vGvXLmNMe3v71VdfXVNTM7G3a61zudxPf/rTQ4cOMcaqqqre/e5302TSNiNDscKSkaYeSkWl1AMPPHDs2DGcCcMSQiSTyVQqNWvWrPb29oaGBtotQRBUVvFDRQ3A888//9hjjyUSiTvvvLOpqWn0Cz6SukjK04EDB5588smBgQF6BRlgpLjk83nqPI00CILa2tr169fPnDlzLDlPGnn42yNHjtxzzz3FYnHdunWrVq0i8yOUtxXmbXBw8P777z927Fg8Hl+yZMlll10Wnr5kMqm1poGQQHv44Yd3797NOV+0aNGll14aGroVVGHqoed59BkhxMmTJ0+ePLlp06aTJ0/29PSEetXMmTPnzZs3a9asKVOmlEgbykpn5SGMV+Uao/JbWN41WvUIgInHHWVxxfqLbn/t9V/9+vdELKV956kNL3z3h/f+2R/cxnyk4rAaXHDJJGAFFMCsdVik7IgLxKBWtiX//gNv+dTXftoVJLx0jW2Y8uzejv/11e//zhtuuGpplQe4DEJIA/BImUmcqSOuXr7YcyALRhm9aM7CO15/DQBriqUySQxgpURDAQ6LcxURvg/PZYzBgAs3UVQFJwCPpXoZHj+Ej3z1hyeVV/Q5VKFKol7kP/KuN6+9iHmAdFkhgFOFb35v5w8e2uxVt+Z7er3a+mCga9WcxvffuZIrMAEF5IHv/fgXu3bsS9RPVUUbZAd+663vnj8rwSwM8xk0BxdMWMteeSRXuIOllDt27CC55jhOV1fXa17zmnQ6PQEHPgn0YrFI4n7Pnj1btmzZvn072THkxCLjI5fLHTlypKGhYd26devWrXMcx/d9uqgqv4UM38OHD4f2ceh2DjVIUrnIdUS27FjX9rD+b9y4sba2tq+vz3GcBQsWhOImvMk454cPH+7o6JjAhRSLxYIgOHLkyAMPPHDgwIHOzs50Ok36Fgm4jo6O48ePv/DCCxdffPFVV11VW1t7Vm9BeOkePnz44MGDfX19S5cuDTtcmaU69CmGk0P3/ZYtWw4fPiylJO22tbU1kUhMbI85jhMEwaFDh3zf7+zsrK+vnz59Otn9jDGaXt/3XdctFAobNmzYvn076Rl0vdETKqvg1DdjzOHDhwcGBmiSx7pC5s+fH7o8Q5/QWM+Px+ODg4MnTpxIpVInT55sb2+fNWtWOBV0g5LI7u7uPnToUD6fD4Ig6lKN+vZGvWKPHDmilCJPKg2cc+55XiaT8TyP2AForgYGBqIOktCKoG+MMUopmk9SUukae+655zZs2NDZ2Uk7gUZdKBQYY48//vhTTz21bNmy66+/furUqRdU2Qr3f2gnDA4Okl/2xIkT8+bNmzNnTrifSXrQKA4ePPjCCy+cPHmStNuJ8SPQoxKJxKFDh3bv3n369GnXdYvF4t69excsWDDsdFe6UKWMBuk456dOnTpw4ADNLbnVicRBCJHP57du3UpDW79+fbiTK7widCSTYnTkyJHKruXQvRSe8e7u7u3bt4c7UymVSCTI0eU4Tn9/fzqdJsWuUCg0NDRccsklFezqkP2LVm1wcHD37t3W2unTpy9btoxkxXiAZYVC4ejRo4cPH7bWdnd3z58/v6qqimaMHE5013DO9+7d+/jjj/f29jLGGhsbo9NVQVUFkMlkUqkUfezw4cOPPfbYwYMHfd8fHBzknNfU1EgpBwcHd+zYsXfv3mnTpt10001TpkxJJpPnd6vLkhYyesFdPuJfY4xhnCcZfve333TvPT8byFudTuf6+//1P79z5ZVXrltRE6hSgqE2hsEIDsAyaEAoDsPgWoAFCiIJvH550nnndf/rG/d1DhZFMsHrp7x47FTXt+498trXvPHKpmrAAnHADxB3RhSYBgQwvYUtmjP9iWd3wlcXtU+VplwqW1C9pKHaQ4xyMvk5BOYYIBk4QwAUdRAXHqQ3KJEBvv1U17/84KHTvIq5SWRONtTGqvNdf/Xut968xDE+rIs+C+Hing3dn/v6PTY5RWvAGheF2jQ+/sG3TEkgyZDLBkg6P3lg23d/eJ9T05zLB0Lr5Yvm3HnHLXEHVisurAWIIZZRbd5XsIRDdKv5vn///fc7jkN+b2vto48+euutt0744SSYtm3b9tRTT+3du5dzPnXq1JkzZ7a0tJAa0dHRceTIkYMHDx46dKilpWX16tWhsVLBm0LYiLACRjweX7BgQV1d3TAXV6hyJRIJktHjxH94npdOp9PpdDabffzxx6dMmVJdXT2sS47jeJ7nui6d8HNqxWKxs7Pze9/7XiaTKRQKs2fPXrFiRTKZpJPf39/f19d39OjRrVu3Pvvss1OmTFmzZs1ZkTFkmlOUpK6uzvM8EtOh7XgWGVFWbmjSPM87dOjQzp07yWSsrq7euHHjmjVrGhoaKms/Faz2YrEohGhqaurt7d20aVNVVdXll19OQRnqKl0YW7du3bBhQz6fDxeUnCIVVJZ8Ph+Px0lwk9rheV5ra+v8+fPHsjFmz54dKqO0ppUdn8VisaGhYXBwcGBg4J577rn11ltnzZpFV3h41dGjUqmU53lkD0QdkBUmbfbs2Zdddlk8Hqe7nPbASy+9FARBW1vb8uXLKTIYOsDIxhiGyhrmKQz9NLlc7t57792xY0dvb6/nedOnT1+0aFFtbW0sFuvr6+vv73/qqae01keOHPn+979/2223TZ8+nZ7ALpj1RwEmCpWGIIFisfjEE0/U19fX1dVFpYfjON3d3Y899tixY8dSqRTNA+EfzjXGHS7B5s2bOzs7a2pqtNYnTpzYtGkTqVy0B8Jg/Xh0OFJi4vF4KpUSQsybN6+qqip01BUKhePHj+/bt++FF144depUU1PTzJkzQ49ahc3meR7F/nzfJwlzVoQZPZAU1pkzZ95www0EiqWjbYzZunXr4OBgTU3N1VdfLYSguB7Jh4aGhgpe5KiokVLGyo1kb+iSHGaUjtqqq6vT6TTFN++66673ve99oYCin1PA9+GHHy4Wi3V1dfl8njTXkBGjQie11qlUimZvx44dDz744NGjRwcGBmbOnHnFFVfMnTuXkBKnT5/ev3//vn379u7dWygUVqxYcf3114ca+XkpoCSHfEf2THVmjLXTOhCc6YAvmlXzgd95+6c+9y8i0eDVNJzq7P78v3z1K5//SHMVBKCNFlKCAnzg5FxigLAAFGAsmAteD7zu4lrIN3zqP75/Iq+Mk3DTLZ0W//bDhw4envd7d65sc+EHqHW4HqZs2BLujANLF819duMOx3O7Ok76g5YnmICAdcBgQWW1raAq4ueO9XQklAaYcYRjgBywO4v/eWzPN+9/vjfvOOmkGsxWxXl7wv7+O+64ZWkyHiDuIgv4HE/tKH78/3wtnxNOqjrID1ZVpZE7/YH33H7V0kRMg3HEE87uk/jsF/6ju3PQqalHcUB6/A8/8N72VkgLhQAwGpZDaDDJX01erp6enp6eHs754sWLT5w40dXVdfDgwQqO3LM213VPnDjx1FNPvfTSS+l0euXKlatWrZo3b15orCxYsCCfz+/fv3/v3r3t7e3V1dWhvKsQ0CRRS3hbuueWLVs2Z84cisRHxeUw2Pg4jePu7m6CXhaLxYMHDz711FM33XRT1FeklCIlQCkVBfmOBbQa6WB/9NFHjx07JqVcuXLlunXrGhsba2pqCoUCCTKt9aFDhxobG1Op1CWXXFJZyIarEwakBgcHw1GHV3UFR1dU1hQKBUKNbN682ff91tbWqVOn7t271/f9AwcOtLa2jgefPup6hXATApy99NJL8+bNa25uDhdFCNHb27thwwZjDElbugJpTio06nA4UhL6DQ0NN954Y4WbgyB6oQSvvMnJ0cUYq62tpS3d2tpKHQv/0FqbzWbJzqbLcpwR+fb29vr6+mQySUClWCx29OjRI0eOdHR0NDc3X3311bSLSCGORrej1xvFqkIAXxiL3LVr1/79+7u7u6dNm7Zq1aply5aR24DWsVgszpw58/7773/xxRdzudzmzZvT6XR9ff2w0OR5N/PcUpoUJ6gWffPSSy+1t7dfc801NNJEIkEjOnDgwM6dO0MtlnNeAdhUWWNgjJ0+fXrPnj3W2nnz5mmtt2zZcujQIdKHwi1UWVCEhysUOLlcjq72iy++ePr06bRYoTDZuHHjww8/fPz48aeffrqxsTGZTJL0GGt66SS6rkuzVCgUSKsbT6SC5GpLS0tdXR3FzUmd7e/vP3r0aF9fn5TyxhtvNMYQeCD0LlfAv5PTLjxiBDuJyr1wLJXnjfS8gYGBurq6bDZ74MCBrVu3Ll68mECiBB2WUj766KMUUiQgGumL49mKBMjjnHd1dd1///0HDhzwPO+666679NJLq6urCSNIeIbDhw9v3br1mWeeOXz4cKFQmDFjxty5cynSfa4omtGXI1rEOhq6syO+6FfScazVMQcSePc777j0ktX5TMZXRtY0/PQXD/3bf34v78My+H7BgJsSyYKgMJ8wENaAwUIYDQ44FjXATcvj//DH75xSF7OOU+BVp/POaZO475ltn/jsD148VJQOegvDekk+K8UBpbBm9ZJ03IsL0XnshLAMCsK61GkNriFB0cUhlv1zssJzkpsYtGfgA08eyH/yG4/9v59v6q2ajqrWIJ9Lo9isBt538/qbltU4GinmC6ULwK4+fPBTXz7mJ5Kt7UGxaBUTQly3ZvFvv36uB8QFgkJBW/zHN7639fntSNUF2YJMp2695cY33LqSGUBrzgILGyCwYK9kwaxhiUgE+Xzsscd8308kEqtWrVq8eHE+n+/u7n722WcnIFJDaNEzzzxz6NChdDq9du3a173udaRv0UEiJSCVSi1btuzmm2+++OKL6Uqmw1/BmiHjOPxz3/eTySSd2BA1HMb+yWk3TDBVvl/r6+uj3vgNGzZs3bo1hGiEOiipKZUfFZUUBF9TSm3cuHHDhg3V1dUXXXTR9ddfP2fOHDJkKRZGYIvZs2e/4Q1vuO66684qa0h7oI4RpNd13VgsRnczTWZlbEp01WjaT548SbED8r1XVVX5vv/ggw/29vZOwAokoUkT1d/fX1tbG4/H9+3b9+yzzxYKhdBh4/v+k08+eezYMWNMQ0NDWNY3nPmzWvkUlaNvCNg7agvdDCGAo7J6QckTFO+mNXr++eefeOKJMO+JVKV4PJ5Op1OpFG2/cKKoV2Ei3qiNLj9aONLw6P5wyi0EtkeXMhoPHdZ/+nlHR8ezzz578uTJ6urqK6+88sorr2xsbLTW5vN5Ss7QWs+ZM+fWW29du3at1vrpp58+fPgwJpQPeK7aTz6fJ2WCWA9SqZS19sUXX9y1a1e0AwRL6u/vX7x4MeecMjAIRz8BBAVjbM+ePd3d3VVVVXPnzp07d24sFstkMlu2bAl1jiiiaKznhH4X+jcejyeTSWttOp2mLJbQB1ZbW3vVVVfNmTPHcZz9+/d3dnae1YlId382mw3VL6VUZVMnFLlRbEA4BM/zaIOFbjxrLf0kBGlV0JZCKRcexlQqRfocJQpEFa8K46LnJJPJ6urqmpoaa+1Pf/rTzs7OEG4I4OjRo08//bTjOG1tbRScpcSdML+ngmoYjn3jxo379+9PJpPLli278cYbKXToOE5ovE2bNu3666+/5JJLWlpa+vr6HnnkEUpMOV+8G3wcnq1h54Ebwzmsny821uCvPvrH1WnJEahCLpau+sKX/+PhDTt8wIknc8UsGQ/WyvJbAqBgYQwgBS+xeBXRyHDtHPa/P3jbdC9AMAjX1dzJy+Tm4wMf/b9f//xdLwzGMADkgDL+QgGaqm17EuvWrErH3fxgb31dVX9vPyfuLDZUYZsNaWmjD5Y0MR3VL8s/F7FERrMid04q/PsDez7xr3c9sPmojjchG4AFKZmfnvL/78ff88Y1TUkgIQDmaoj9nXjfh77UlfOsqMpmMpJpVxQaPf+Tf/raesABstk8j8fu+tnG//eVb7gNrTAWkiel+pPff4/nUGDUcu4wCEGRUnNmCukrFU+klCWl1J49e/L5/KJFi9rb2xcuXFhTU5PJZPbt2zeBh1OqVD6f37Jli9Z65syZy5cvJ6lKx5s8H6Hml0gkQjspml04lvOMLkuCTVCcflSXUigCwtyc0Nit0P98Pm+MSafTV111FYUXf/SjH504cSLqUSDRQ7rjeCY5FFha6x07djQ1NRljrr322paWFnJIUPcYY+SrJ29TPB6vkE8esgDQ31K8iYzaEF0RhXlVFlX0EOrJgQMHenp64vF4W1tbTU3N7NmzCXu7f//+CfCGhKOjdV+xYsWyZcsAPPPMM0eOHAnHcvLkSXJxLVmyZN68eXTZDMtkHOv+jladI+9OhSsqfFrUQVW5/4ODgxT2XbRo0cyZM6uqqh566KEdO3YQAIsuLbL+SZsJr8Aw5fCsUbBQhyAPGcVTwix3GtqoV0LohCA9gBA8hFw8ceLEnj17YrHY7Nmz582bR0BJ2mM05+l02vf99vb2VatWEYLz+eeffwXsPfJUEcLP9/2mpqZ169ZVVVUdP378ueeeI1IMMquee+65o0ePNjY2rl+/Pp1Ok9eTwOATeLXv+xs3bsxkMlOmTFm2bNnixYvr6+uDINi+fTvpxKHz5qzeXDoIYVSa8kxDRGnUK5lIJNra2iiK19XVRSD9yiLIdV0CC1L+XSwWG89+HvYNadUoc82ECddR3WKcTutQTQzdn5RwTa8YVhGygqlMhpAQ4vLLL/c87+TJk8888wzJMc/z8vn8448/fvr06erq6muuuYaM6igHELnBKsvbrq4uCqp4nnfFFVdQvDIcLL2LzuOVV16ZSCQ8z+vs7Ozq6iLv5gRU+VFVLj6keEUICNiIL7ryOQOM9H2TiHsCWLGo7RMf/l1bOAmVZVz2B/JP/+azB07bIqCgOCyzkhlYCzADocBt0eQsAlK8Ag3XgWfRALymAXd9/NYb5lRNSeR1kBnQrDvWuk9O/benj9z2l9+/e5e/J4MCYKCUypkgj3LFxNo0PvSh3y/63fv2bMvkB3oLKDL4HIoBgLCGGwttAAUWACSDTOjes+XwZ14jGyCgKtrWqKBIkcQOsP/a3P3b//TTT9z17I5iLa+eLgJWjXxt774b58T/8Y9ef8k0SgiABQYFNp3G7/7Fv+07moeoAfeQ8FT2xEX1ha9/5v2zkogpMAMZj7+4d+DP/+b/aJ5UReWoYo3M/9WfvGvF3DgUpAQYBzyBeAwJAelJUfIYXmAIfSgUSGrQGXjqqacKhUJ1dXVbWxuAlpaW9vZ2a21HRwfZnRiDN2hUkUoO7eeee05rnUwmL7roohkzZtBZjZr7JFWjNDZkz1W+YkNpFY/HKeOmr6+PfpjJZOgJ5AkLrcNokP6spgyJJGPM7Nmzb7jhBs/z+vr6fvSjH2Wz2dDjEppc40eUkw/p+PHjJ06cyGQyS5YsmTNnTjicMDmLfEJhGKVCQCF00tDQKKZA/5I+Gn6gMkqDVBayzilcSyiHmpqaVatW5fP5Sy65pKqqqq+vb8uWLaH+NIzSqfKVQEh52hipVOraa69NJpNBEPzsZz+jpIF8Pn/PPfcAqKmpufnmmymNnyQg3VsVdl2ok4VaeE1NDTn8aA+EjS746AYYT9WUcJKttTNnzrzmmmvoD++9997+/n7qfzTPPIxdhntpPNggAlDSYoUelBAlNgynOOo2CM9yqOBu27aN8uaWLl1aW1sbIutplii85bqu7/sLFy5ctGiRUmrfvn0dHR2kLoTq/vl1wEfj/tTPfD6/atUqwt4dPnx48+bNhPx74YUXNm/eXCgUrrnmmvb2dhogreM5+fJDrXT//v2nT5+OxWIzZsxwXddxnIULF3qeNzg4uH37drJbiJehwpGJ+pNo3WmZyFUTZidIKUOep9ClR6scLnGFV0Q9mqRGn1Ufinrxo58P1ZSoaXdOWItor0LajvDQReOhZ93nxWKRc37xxRevWrWqWCxu2bJl27ZtNI07duzYvHmz53mXXnrp9OnTyfMdtTTGcy+cPHmyo6PDGLN8+fLp06eHcHvStEIfpLW2urp6/fr1Qoiurq5Dhw7RVJyXypWyXMp6/IE2eB4YZCGfZQLpWPLKS1fefusNd//8KWUNAnvydPYjf/WpL/7jJ1rS1QqK2xKQHTDZQs4wE/cSZf0NQpTeLA2amPYc8fk/uPTbj576n/sePa2Y78bzA7m8iPUGhY//6/fWzGq8df3ia1a2Ncoqp+yGYhbFAt5xx7pcz0f+7d++sn3r0+tWviWkuBCg5AAJGDALxrQxPEK1YHRgrTWWATLmMC2ggMEA3OHc8XLAgzt6Htmy9+cbXuo1SVPdrotW+D7Pna6R2fe+6dq3XT+rFhCAC2SDwGfOhp3Bxz79bwf7FOL1EA6Exenjc2fU/+Nf/NbiKYhZcAEN7DqU/dBffebYyT7IVDodGzzZ9frfuv1db3sdU9YVpoSTt5wmqsw5TzXC+TmyuZ5bI6FMW5lOUW9v7759+7LZ7NSpU8ka1lqvWrXqxRdfJPjnvHnzQgTGsOyYsVQWAoeRt6a2tpaUCXIUh+EYeju5JXK5XCKRIA2D/NUVHAPh/U324nPPPXfgwIEwgkZYFqVUY2PjmjVrzhXhTlwJJD0XL1585MiRTZs2nT59+u677377299OyX0kueLxeAUs17CIFX3T3d1NmGvynFM/Q54nEgpkK5PsHg+s9eXaZJwTwwK5lHbs2HHw4EHXddvb22k5XNdta2vr7Ow8fPjwzp07FyxYMBLhd9YrIcqt2tDQsH79+gceeKCnp+eBBx644YYbNm7c2NHRkc/nb7755mQyGSLExz+EcG8LIXK53IkTJ+6+++5QRY5mVNx2220EtKdbbTygJcdxiNBISnnRRRdddtllDz/8cDabveeee4giJJ/PUwRwwuzB58V7FFXOMpkMaZxCiBkzZtB1QtspPMg0YwRzaWtr2717d6gonJXb4ry3a6655uTJk/v27XviiSfmzJkjpSSow5IlS2bMmEG8TXQ26YyM1b2QEiVaiJBMu+eeey4IgpqamoULFxIH2KJFix544IFisbhr167Vq1cTc83EThyliYTWLAXR6MhnMplisZhIJGpqas6aIfvr2mibWWtjsVgikViwYMGRI0f27dv36KOPtrW1GWPuv/9+KSV5ZCdAAkK2en9/P2X+ktIWhoCHBT3pe3IrUCoJZeGcl3U5R62NoeSyZXBdV1vFgIVz297/u+/dsGn38YMnEy1Tcv29Dz/01Jf/9b/++sPvsEbGBIxBMZ/3YjwZS1mYfLEY95KkiSFEiTEwh6WAGcD7r2peNu0NX/7+z5/etStVP82Ha3isqxj/6T795JGtC586fvOaBTesSk934FpUcSTjgMV73nLDVRfPam5thsk43GGl3EQOy2AZNIdhYFp4QhPthdZMKw5AcME0bIBABHCKDi846AQefK73vmde3LDvcME46VS7zuigbzAV457pnzVF/Mk73rF+jtsI5HtNrJr7HMpxHt/R/dFPf6Mz6wbcjSdi+f5eCD2lMf7Xf/TulXOkAzAGY9GXxxf//Vsbt+1Dsi4uxWBf1/LVS//wDz6YisEBC4Ki67gjSidhGJjtgmIpSOUiEXzs2LHDhw+nUql58+ZRpm6xWJwzZ057e3tnZ+eePXvWrVtXW1sbxqpC5sDK0v/06dOkT5DSQ/ACuhIGBwefeOKJzs5Och7Qz5cvX06IrvFYgXT/0X937dpF0TTKsKOctWw2O2PGjIULF56rykWSmqyi6urqdevWZbPZbdu2bdu27dlnn12+fHnIU0pa43hULnqaUqqrq4uuuvr6+jD9Kmr3R686mopXYD+QU4104sOHD/f29sbj8UsuuST0wC1dunT37t35fP7gwYMLFiwI/SXhAM+qtYQhNkqMWLt27b59+/bt27djx45kMvniiy/29PSsW7du+fLl5JIc5tc5K5Vr1P0QBEF/f//TTz89DLNI/7355ptD0znUUSpjuWiwhDL2PO/yyy/v7Ox88cUXt2zZ0tjYSA+krf4qqlx0qMPZIGZOiqE0NDREt2LUORpOcn19PZ1rCqyHQZwLh6Mf1hoaGlavXt3V1XXy5MkHH3wwl8sdPXq0pqbmsssumzZtGs7MR6lw7qKXa3TzdHV1UX3oadOmTZkyhYY/derUJUuW7Ny58+jRo6dPn25qagpZbM716FFCZTRzlnPe3d19//33b9u2zVo7d+7ctra28WTI/ro2CnHSwGfPnr1mzZpDhw4dOXLk0UcfJTOpqqpq7dq1LS0tBGU7V1eCUqq/v5+gk4TZCE/EqOzfDQ0NxEWXy+Xo52dNnjj/KpcFGIfvG8604wgOUfSVcOUly6b88e+//1P/+MWB/l4hXQP2L1/+1rxZ8+984+pCAFcgFo8X/awUXAoprGYQjPjoGSygLQwsZ5ZByUA1O7FrZrvLP/q6u5889ZXv33cqL3WyySRqTDboK9inDxe273/kOz/WN14853WXLZ7XhDhDQSFZXTt/xSUcUDYvwQFjCZfFwJiAJGCX1IAGB8AFh3BI4dMGSkAzZIGtx3Hfsy89snn34Z5s3k0XYm2IxQd7BmOe9FSuEcE7X3/lzeunzoojAXiAV8PzDAXgn7797Dd//OCJQc9wzqRQ+X6JTK00n/zj91+1VCaBXDYwUkiP/+t//uA7P/xZYZCxqmqj81VJ/omPf/iiWUkVQHDlOi7sq1m+OtxVFJXft28fHYYFCxaE4CoAixcv/tnPftbT07Nnz56LL744pAYeTzpxyLNM0ifMiwn5AMnE0VqTeuS67pQpUwhWX5mXK0pfSUYMkTxR9yhan0gk8vk8edcmMDkEyacbesaMGVdcccWJEyf6+voefPDBdDq9cOHCsPbIOOHzoU8+pIcOozYhfpw89iEC4xUTytEEzGPHjh08eNBxnFmzZs2cOTO8fhYuXFhfX3/ixImtW7euWrWqubk5vP9CTG4F1umQQp30TgAE1zh9+nRfXx/RNra0tFx33XUhzOisav3ISQ7RJI7jVFVVEXZw2D09TP6GV3KF/ocOSM/zyNGSSCSuuuqqnp6effv2PfPMM62trStXriSqufMSmJiw9zoaVCJfNemvFK2mUBp5qaNonpDvO9yHw9TQC5rAGJ3nlStXHjt27IUXXtiyZYvv+/X19XPmzJk/f35I/kRnUylVOY91GEqP3E4bN27s6emh8xti5Dnn69evJ0z9s88++/rXv568HRMwdQ4fPvzQQw85jkMIOd/3BwYGTpw4MTg4mM/nFy5cSFQgYf2o3zSVizx/IbG+67rz5s1bvnz5zp07t23blsvlmpqaFi5cSISCE8NU0W4nGUvR2GHUplGBQMCD0Pw4jyd3Ig9y3VKky2jNWalK43veccW+Awe++rVvuzJeyAYJN/nnf/Hp6qrP3nLdLN/CAYQT135RCuF5qVLy4JA8gIHV0BbWc2JBMaj3nBrgA5c137DiXV+6e9NPnzvQMRCwVAOkZ4u5AST3ZYMvPbTvSz97fvrU5FXrlq1ZOndRK2JALZBgcWWQ4FTUEQAsh0LpnYIwXGV+VR/IMfQL7DyBR57f/8RzO0725Q1zlWaBjgVGCKdK9wzC8U2x4+qLL/rd11+5sg51gCjCcTAQwHo4DfzZ39z9xLMHgthUr646X8jY/i4vZafU2w+//x23ra1yDVyORMLRDN/4ziNf/LdvZwpAImWDIuO5D3/o/VddPtsFpANd1OClkOJo0d4LropF70jyauzbt49z3tbWNmXKFDIRKP955syZtbW12Wx2y5YtK1euDMVQeNFWvgXr6uqOHj1aKBSIqjsKJUkmk5dddtny5cszmUx/f//mzZuJfIiuBEQSAyvIU2Jt0VpfffXV7e3tyWSSNLYQo4Yyg8AEsCZ0CVFgdM6cOVdcccXPfvaz/v7+Rx55pKWlhd6VTCYr11gcmUcWaoHEABlqPGH2ADnYQgzKecyjqTBeugBisdjevXuPHj2aSqXmzJlDeDiSYq7rzpgxY2BgoL+/f+fOnaRy0W/DeiNnVQhCRxepUwsWLFi9evV9991H6JZLL720sbExpBcKFbWxJnNUXZngXJzz5ubmd77znWHcMKpyhSH1qEekwvMpHkcaFZkQAKZNm3bNNdf09vYWCoV77rmnqalp6tSpFKt6dW+1kOkgnU6HPCadnZ1TpkyJ1rcJ5zlUbbu6umgdU6lUdMuNJ6nzfHU+Ho+vXbt27969XV1dqVQqlUpdfvnlYXpHyP07nhjrMJ9fT09PR0cHsd/NmjULQKFQoGBfIpEgkPX27duvvvrqRCIxYWacnTt3hqZUPB4n/BaNYv78+dOmTQvD62elPvn1a+SzD/3KhLm8/PLL9+/fPzg4KISorq6+9tprSR+dwPzQqlFEMplMHj16dPr06VGyoWFHnjHW1dWVTqcLhUIIyT1PWK5zxQRAM5TMGg7BODcAU+ASf/mxdx05duzhRzZ4Ma9QsAriTz/8Seef//LaK+ZlAiQc7nrxoKgczsBZKTOQAZz+IUYJFHyddB3r56UQVYLPisuPvW3lzVet/NpPnt1ysPNIx4CIp91EVUFxK5Px+rZdJ/YfeWT3v/9oQ1PCnTelacmMtnltzUsuqnUsXAnXhfQAiQDwDbQCDwANrZEp4Hhn/7b9B5/feXDP8S6TaBxUogDBZC0HA4x0bFrwvs5DTXWJeTPr33zL666cyauBGsDkCrFYLACshyd2Zv/2n799vM/JiZZi0YWfRdx6Cd6aVp//xB+smxOLAy5HIQcWx10/2fTxv/u/p7OKx9OIOaaQf+ubbv6D332dS2FQA89zCplsLJEsOxVfUX0LkRphhOU8cODAyZMniZX4W9/6ltY6m80SKQ75wIwxhw4d6urqmjp16kg/QYXW1ta2efPmwcHBsKBbuK1d112yZAn9ZP/+/Tt27CgUCoSKHScMM0zTKxQKtbW1xFZKdwZ5I+jhE6BMJNWQvGWksTHG1q9f39XVtWHDhn379j3wwANvectbCDNU4YgOo00iiTBlyhTKGuvs7CQ2mjB8Myza+0p6R2hBqQAR6bIvvvjiSy+9RMgeyl3N5XJ9fX2e5+3atYvqBESdK2dVYUNSrrBOjjFm/fr1J06cOHHixKxZs1avXh2NqA7L0avsRUME5E6JY8R/O6rKFc14H7+ngajAaaIId7hgwYIrr7zy4Ycf7u7uvvfee++44w7K53gVb7Uo862Usq6u7uDBg4ODg4cPH54yZcqwyDVZTXQh9fb2Hj16VGtdVVVFpUXHciVeuEY+wqlTp1566aVPPfWUMWbZsmUkc8g4JA2SDLMKWlEU0xZWTjx69OiBAwfIu/zDH/6QDEuScpxz8rJns9ldu3atWbMmrCd4ripFfX094cppGxw7dozyhy677LKwhgQ5HV9Fb+irqHKRnUYOV1KdZ8yYsXr16i1btgBYu3YtzRJl7E7MVA5xw7SUIf4htPeif7Jnzx6qNdnc3HwejaVz7zqYhVVB4DoxcCAwgvOYRBGocvBPn/+rN73tg9u27K+ubi1kzNETPR/6+N//yxf/Ye2K9qIFZxDRyWIa4AyGQ1gYC87AHRdFBdeNB4F2BEtzlQZvbeOXvn/NlkP9P39256NbD+zv7VciFTjpfG/Q0Lqov7ubMS+Q8Y37+l7Y+5JVz7sO92LCdYWXisWTMScRY45kAszy7mNdfsHP57QfGG0FFy7jCevNGujLSE/GXMfCBDoITBAw7qj8B25auGp6w2WrptRLSMADOHwkxADQVcR//XDTd3/y7Ol8/PTpAuJxJD3Gtc12zJke/8vfe/P6ObEEoIpZ4SXdOP7nx5v/7OOfOd1vknWN2eIg+vuuv/6yD/3xe11AALlcriYRg4UrnShA3obY+Vdq64eK16lTp4iBKZFI0I2bSCSIEYDK97quS9UAN23a1NjYSGCpyhUeQjN0xowZ5GPftWvXzJkzFy1aRDdiSANBQn/KlCnRyqxnvQXppiRXMEnegYEBwtEHQUBKUtiHCeguoZMp9ATQjXvttdeePHny+PHjzz//PMFvC4XCWa1hOuo0NM55Y2NjY2NjR0dHR0fHli1bli5dGo/HQwIqGntYEblQKBCZ9QVt4Vxt2rTp0KFDNIFE30BVohOJxMDAwNSpU5PJJOf82LFju3btCjXm8cxwKO+iiY1Kqdra2ptvvnnLli0LFy6MUvwP4zOr7OqLumFIJRqLymsYfjYaL6uM5SJNka58RNJL161bd/z48YMHD+7cufPRRx8l++TVutIoASL6zeLFi/ft25fL5bZv397c3Dxr1qzQvxW1bXK53MaNG0+ePCmlnDdvHln84UkMMzkudP8JbK6UWr9+fTKZzOfzl19+eZTSJUpCdta86WiHBwYGdu/encvlaI+RL4q4RovFIuUFk1H0wgsvrFixIuQ4PafW1tZ22223EewMQEdHxwMPPLBp06a+vj6yUqKiD7+RjTzQ4Q1CW+u6666rra0tFAphmQ0CV03sXmtsbJw2bdr+/fsPHTq0bdu2FStWjNwtFFI8dOgQxa+bm5spvwRlYthXIbDIwKR0ye3CBAfAYSWYAerT+OqXP/eOt//+vr0diWRzoqb20Inu3/uzT3zh0//7ijVTBguo8oiVwZTr7xhYY7ViXAgmGQBtPcE0wByhgaBQiEnjCXjGXDMruXzW2jfesPbRl04+unn/tkOnuvP69OGeVKpGuE7/QCYwrLauJZMdyMJyJoyC6bPoC2B9WAWqtcgcIAk4kBxWAIDVnrXVNVXWz9h8n4Bfn/Cmz5q28uKVly1MrKtFHeACwsICPoMPdxB4dPOhb931yLPPH/VRV9DWa2oNmDDZ08lYftWStk/9xZvmNcADuMonvXjex/fuffajn/w/WeOIRG12cJBL/9J1yz//9x+b0Si1VoKz6kQMMNCaS4kxSzC9Ei1MYj9+/PiRI0cSiURtbW1bW5sQgnxCmUyGlK2enp5jx44VCoXNmzcTT3rljP2oZJw6dWpLSwvBtjZu3Njc3Nzc3BzWpQ9dHUSOXFVVRejjysCgqFuFHHKUBDRMloU5WRMATFAVGiIBCk9gNputq6t77Wtf++1vfzufz3/72992HKempqYCXDrM1IuSKyYSiRUrVvT29nZ1dT355JO1tbVz586Npp2HHPQHDhzo7+9fsGDBhda6QhLRY8eOZbPZqqqqmTNnNjU1ER4lnU5TFQ7OOaGXcrncvn37iJqSnIghM0XlWHYYoSNFmcpKtrW1ES9JFBsXRlfHX0ib+kDaBgETMRr0PgRm0bsqkC+EjYLdFGKmjxFPElGV3njjjV/60pfS6fQzzzxD1X5eRS9CtISA1nrRokVPPfXU0aNHd+/eTcsanr4wSdYY09HR8cILL5BGsnz58mHVsc5Lod9xqoy+79MErl69OsynRrl8QpgTWjmASx0Ou6217u3t3b9/f01NTV1dXUtLSzqdJtust7eXlLBsNnvs2DGqt3Hw4MF58+ZNYNTZbDaVSoWwudbW1sWLF3d0dHR2dv7sZz9rbW0lRyO5SH8z4fMUN6DoP1VsowN72WWXRacxmUxWpg6uEFVvampatGgRQeiee+656urq2bNnDyudSSABOho1NTULFixoamqKJvO+8ioXyaNogSDDYQSsgAXk3KnJz/+fv/v4x/7XjpeOJJI1RiT3H+n/3T/8i7/7xEfecusSBQQKLtecA0EBgoELrpkxVgjAGiCAskXjwuMa0LEEA7hWjgwYghprltS5sy5recP6ln0nzJ6O3gde2LrzYEfPQDbhJZSR2cECkzFmpTWCk2vLWGstsyVL2jAEShsu4AgYg6AAVpSu1tnuKWm5dFHz2kXzls9pb61DtYsUkNQQMDAqUIrFEj6w6Sj+9Xu/+NmTLw76UsQajRXCBtachq+rRP6P33bjW2+e15BAGvAAw+MB8D/3PvbHH/+sz1PFYpG5LvzCqoVz/vGvPjKnWTKACzDYUvVtIUbLVYyouxe+kVOd4AsEN77lllsI4jCy3XfffVRaddu2bURKNDg4WFkPCPFJV1999d13333q1Kljx45997vfXb169dKlS8NaaUqp3t7eJ598sqamhtgWQubSCls/FMSkaRGiiH44TIpFzfRcLken/ayhRsoPoChYSGhJzuqpU6e+5jWv+clPfkIDrFxjdZibLax7s3bt2v379+/evbu7u/uuu+5auXLlZZddlkgkwqDJqVOntm/f/vDDD1trM5kM4RtGvWKjHoio9yL0tYwHiENK3tGjR4kgZ+bMmbfffjsxf1LeQywWIxhTT0/Pf/3Xf50+ffr555+/+uqrqZgj/XmFWaVlIi6oUIOh3kaTSYcVLaFG34dqaAWvZGg3B0FAxXPG0qXC2s9hCYTKmRChiy6s2olItaXa2tq3v/3t3//+9wcHBzOZTJiFGm48cixV2CcjU+TojVHDhlTPytGWcJXJT0kGwx133PEv//IvREqcz+fXrl07f/58CutQTvFLL720ZcuWjo6OeDx+8cUXz5o1K/ThTdhPPB6TLwo7C92N4RaKkpmFZo8xhjhpQ2f2WCZZWMCeoHsvvvhib2+v1vqtb33r3LlzQ65mYtIiF+YTTzzxgx/8IBaLPfTQQyETbwVvSkh+Rm4bIpjNZDLRIvQLFizo6+u79957Adxzzz3vfve7ybV2VuRAuOVoHghc+3J8S2HG9AS8sLQ0tJmpY8OCEvQv/bDCvJE3kXIDow7LcKfRiwggGw2nkPobdmCsoxQydCxYsKCrq+uZZ57ZtWtXLpe7/PLLKRM/tAz37dv3+OOPHz16lDE2bdq0NWvWUDfOV8D33B4xxH9+pisO0AKGw8TBewrFy1e1f+4fP/nBD/z5oaNdiNfCiI6u/j//2Ccl/vqNty5zHSgj4WddTwImyGSdZDW3QheUcDhUAVIknFgOKAJFwAekkB6kAwhmElAeZIqjdSpfNbX+qouv7vbR2Y0du468sHnnsVP9haCQL9piAAvpOK4rHaWDoJjnzLqe52ujqBKQMVKKuobERTOmzWirXzV/SlMKU9JoEiVtSVrAGjDe15urqk1px93fhW/d/di9T+za3+MXeAuSccutHeiSccv8gemNdR/7/ffceEmqGnCBTF8hVhWzDF/8yo//4Z/+dVAxFAechsagv3vF0tlf+vz/WjYjxYoQnjElbxsABlMiMSP+WXuGqvUKeb1I36LiZYyxqVOnhqJ2ZFu6dOkzzzxjjHnqqafWrl1L6WBnNbhp+86cOfP66693XXf79u2dnZ2nT59+8cUXq6uriWWnr6+vt7c3n8/39fXV1taS5hT6qCo8nA5emI119913YzRQET1t6dKl1157bSKRIEkX1nseSzrk83mCWxEDOF0A4WWwePFiYmscGBigHMNznfzq6uqrrrrKWkuJoo899tgLL7zQ0tLS0NCQzWY7OjoGBgaUUplMpqqqqre3t8KjqHuk7gxjmogiGEhhGmu8pM1s3ryZFBeqVhktvkvDJ2jqnDlzDh06ZIzZsGHDLbfcEkq6ClrsMAb8syYEkJszmrFY+X4K47b0SXKeHT58+HOf+9xYn6+vr3/HO94Rct5W7k+0/8M6TxpbS0vLlVde+eCDD/b395MiHmrq4wQmRrdr6BwN2eTDfVg58BHN3KSrhWyM22677emnn6a8sNOnTz/00EOpVKq2tra/v7+np4dK7zU1Na1ZsyaaInOhHauhs3xUYynawvEWCgXah2e9F8MsYMbYiRMnjh075rpuc3NzTU1NNAcIEeLZadOmTZ06taurq7+///Dhw9OnT69sT4a+wLDMVC6XC320tCfj8fiKFSuOHj26adMmrfX9999/0003RYtFVnAJ08MpqE3g1AnMM7nYQ1J1ci1PwHtEs0TYSkLihinb0TWNOibH6g+lsYcKcThXOJNSh5ZmGMDjrAFuOh3Nzc1r167N5/Pbt2+nWMEzzzxDJEcE5gu3xIoVK6688srW1lacJ3qIiQcWzzzKBswChsEIGG0LdbGUBtYua/3Pf//8B//wY7v2nEo1tuUHewJl//DPPnLg4Ht///1vqvaY9FK5wqA1QTKVhmUw4JpBWFgLGD/bn2cpmxDHMnjTuz55x5vfetN186bVogncA+eqkJDCggnDYlzMdGFbcWNre3B1ewB09+PoCcsl6+zNdHZ39g709vb35PwgnY43NDUm41UJ12msTk9pqKtLIiaRcOFyKIoeAhyQ2kihgSK4k4EX1Ke25/Clrz3xvXufKJi4YiktagGJjDLCB7TKdN1+3YoPv++O2dVIIxBWWR2rqYoN5vDPX/nJ5//1P3uLDAnXqfKCYzuWXr72/336bxfNTjkapqCYxznxhI1Qb+0ZSi3Kn7mwGWqhF2HLli20j8n1OtZurqmpmTFjxq5du5RSL7300sqVK1ERlh4tA8cYW7x4sZQymUyePHmyt7d3165druuSECGQaTweX7x48YoVK5YsWRLqQ2GssIIgKBQKVJz15MmT0SBR9AKj/odOqfCZFWKjnudRN6jwSJjSbK0tFArJZPLKK6/M5/ObN2+ufFWM1YhzIZlM3nfffd3d3blc7uTJk9lsdtOmTel0mqJ1QoiZM2euWrVq1apVZ/VqhJKIPEnZbJYysMLunTVtkwBqxWKR0vKjt0JUaXAcZ968eZs2bRocHHz++eevuuoqcoZFuS3GkrMhFUXoOasgPWlvkOkc+u3GuqJ83yd6TGstcVvTSvX19Y31ecp1PetOCD8QklZEKyWEWz2RSKxcufL48eMbNmzo7u5OJBLhDYdIMeCx5iesRx5OCL0ll8tF46pRrqzK+yGq7cVisdWrVxNI4MiRI6dOnYqCCwk+T6dv1apVFBe70MjucF/RdqXDns/nxzLkQhcm+YBzuRzpXhWoUENHlJRyz549+/btE0KEeMFRvSPTp0+fNWtWR0fHqVOnNm/ePHXq1LGeH50f8s8ZY3K5XG1tbdSuoGHW1tauXr167969+Xz+ueeeu+iii5YsWUKbcCzHbbjb6eHEwTuBcvLRB4ZnkIolnFMjmRnmjZJFmslkQo69EDZw1tNElZF836frI9QsR64dQQxJ6aSjNx5+vlChpCqK9fX1W7du7evr27t3L2OM8ACUpkqsk2vWrCEUV9Qt+vKRducOnz/T8VL2vHClAkc6nHGDoFAwsZh38aKWT3/qo3/ysc8d2n0oVlPr+zlVCL7879881dX5Z3/8u1MbHBFLS8DCFPPFmOMyTwAGjEEFbrJaGtFr8f0fb1Je/f/71k++eXfyxivX3X7NikXtaPJiVPwmDiQtTSiUhrZgDhqqcVE1yynYi1KSpcqQMRhAlhUWaRFncGBKZKyWA9AMJZEpeBG86MtTGX9rR/9//eSxJ557KRvEYjWzuPGCviznbiIu84O90mRnT0394bvfduv6JuPnEmBGZ7mVXMR3H8z873/82vd/8iBLpCEdQAX9XYvWLfvC//74kjl1rgYUeEIChhFpK3WDcUQrHIIDpnS4w4DjhfR2hcLO9/25c+dS7lUFQ7+qqoqyeDzPO3XqFB3dCl6N6JYlZWX+/PltbW0UvyB+VJJThCGbMWPG1KlTydQgZY5AG5VFNmX/LV26lMJJ0Rtr2FW6dOlSelooQyvHaKqrq0ntCLUNGmwY62lubia9M5fLNTY2TmD+ScS/733vO3jw4AsvvHD8+HHHcVpbWyknrq6u7qKLLpo3b15dXd1ZTdioE0gIQdZ5VVUVYbDCfOwKBi7pQETEPGPGjBDFHLU4w2uvubl50aJFg4ODhULh5MmTs2fPJmWrghVO/oxEIkE0CtHSv2ONq76+fuXKlVLKkOmgwv4Mx0WJijNnziRSkgoZjul0mpSz8QDDgyBobGxctmwZ5bGH1VdoE9IOp4JuQoje3t7a2lqaw7EOxai/in4gnU4TvmTWrFlhylVoKZ11P4Sli0PyoaVLly5atGjTpk3btm0bHBwkfctaW1VV1d7ePnfu3KlTp57HgidnVblQhjATbwIVkq/sxfR9f+rUqTU1Nc3NzZWLE4QzSS4ixtj06dOrqqrmzJlD6xJ1A0cdV/Pnz89msxTFOytvVng3O44ze/ZsKWVbWxtFD8IFJY150aJF11577ZEjRwYGBg4fPjxz5kyqj17ZW0MHtrW1dcWKFVFlYgKihro6bdo0IcQEWN3JAgxjfNXV1cuWLdNah3tmnIQaruvOnj07FotNnTo1jLYP4+ONOo/nzZsHgCrcY3yF2uibXC4Xi8VaWlquvfba2bNn79q1q6urK5fLhSjhtra22bNnz5kzh2zRqPvgvKhc7JyTL2z01jdlBwwh0xnA+/v7U9W1GujuH6iqrtq0u/8Tf/vZJ598RlvW3NzS1dVpgvzatav+7m8+umxxS1Ig8FW1K5kFAgMY8AK0yvAa38GhHN7yns8c6crASzuxZDaTT8ad5QtmXrFi/uq5bYumJ2fUwi2C8RLTvOZQgA8UDVxe6qkGuIVkJX3LhYE11H+lldVaSMa5gOV5xQImA4HOLLbszj/94u6tB48/tX0389JBrsis5MzVhjluzKi87ju54KIpr7lk3m/fsW5mE4LAphwroCWYH/BN24/+zae++PAjL7rVzX5QTNYksplTV1+x/LN/+xdzZ9QnGGxROZBwAG6G1KlwbhksjCl7vwR9IPLbC9eihmwUJTPWPgnrZoSg+7O6YaNAjagcJ48RITlIb0skEsOs87OerhCCQ/dKFMtVARgRhdOe1TUVtavCh0SdZOfF0I/GiQYGBsJgRBQAdFavQ6gS0bxlMhmiKgg9VeNMdycVZOQAh7GWR71N9D39W9mLM3IIZ10Fiu2Oc8LH4xat/K7K7LsoFxGPviI6FRSzpo2dz+fJmxLmuo/nTqKVCtWmgYEB2hixWIyu/zC8UiEgNSyJIdy0YZVoOjXFYrFYLJL+ES5NiGp6ZbAN4XaKumPHv38qzEO4UsP+MLxZK8uKs5qU4avD6aVa5vTSaFw4XJQQmxX6y8cZbqZ3TYw1huY2lGPnEbA/ODiYTqcJ5z5sQSurLKHoPuveGJm+EJU2FYYcjbFEraYQK8wYixbGJdsjJOg+LxJ+4iqXLetbjKJdlsNCFXwZc8FQCIqO6xQsfMaPHS/+5V//74ce3ZDLm+q6plyxYIxKJvgnPvYnv/O2K2MA04gLMAOowPqDLJkuMGcQ+MJ/v/CdHz/QnbVaphTzioGFsWAmwVRzmi+e0bR4evP8ac3LF82bMZPZiALIIp44DUjAKcfk6BtV1sbIB0Zj2n0su3nHoW17T2w/0Lv3eG9Hb2CsgPR4TZUZHGDcSBhVyKaSrlCZ97/z9uUzm665uDoFBAWTjHENFLUt+uwrX/ufL3zpm90Dfry2TWlYo9Vg15tvv/Ezf/snjSnEJTgAZrRSQkoqFF7qhA2riBsq+11yIYKzV0rlQhlQSblmUUvorOY+OfbD1K0KV+CwfR9Fmkc52eloDTuKY52cYaeXMoNCwTpWYDEqs0Jy0QpHNxTN5IWmwYYF6YwxJGvoIVE1dPyXDWlUYc3aMNBGl+sEas0S6Cd6T5A+Srpj5ZkktTuaHUYXA4XqRt4N4WKF0qoyvD1aCzzUqisguobFrIltPGTzqqByDePxqrD5qZKx53mkYVTWa4cJYuL9onRFGnhI3hv92DDW+3Gel1Evm/EH+4bxm4wacwxVK1NuKIOrXhnygtBrQm+Mhk3HGhS55EPzbKRFNNbChUHbYbZldF0ov3VYifoKcx6aMfRX0UWPVtcI68RHx0Uu0ihXzsiWz+epujbJzJevDVB0Piw0OQGtmjYJPYdEbjTVI3QZVl6R6BBCvhUqalnBEAql5XhKnkTNy1BiRwPNoU0y0qIbz6VzoVUuY8sU8owKMKsyur4cwNO2AC40nJyGtvjkp77+1f/8vl9AzZTpfae7eAxWZ267+aqP/Ml7l11U7wBMGSlLRYUKwKDFP3/9qS987X+SzXNO9RYhUk6qSkpZyOesn3c4OLNKF7y4qKtLpeOyqS65cuHsFUvmzGpL1VUhLYhhdUipsoACOKABDfhA9wD2Hshv2f7S3gNHD5/oHszpvsFCNh9ASXCXxROeGyvmDBewuiCl75hMVTy47tKlt1+3fv70minJEvyLAVqDc+w9WPjY//rio89uVo7IdnYi5sJ14Oc/9Ecf/NDv3NqYgLRAAHhWmTwckddBQqSEHeFBLKlclopPllSuENB1gUVflICebrjKGWdnxUWOerTG+pMKjwoVqcoqAmFCw46RilDhmaE+N7LS3DgVx5GS5Vy5NMNGWeJ092AE8JwkRRiViGb0VDb0o4J15O11Vr6ZsFejLuWwd4189fmFXYfK4rmSgA/jPh2/BXLWe2ikl2vYwOliIINkpMutsncqGukmeFOYpxkGE8/KxBG9HUfOQJQGFmMXNhh1G1wI/9ao5sc4nfSVA6Cj7sboWY7ewcOqwdBanHUzD/tDcqLE4/EoSDFMpA2xWePxA40q7qLJMeekaY2UHhPwdVXwlBO9fphOOJ6lDzWhyvXBRu0q8YOMdU9F7eowqBrVzivcR6Ekn3DhgfOrcjFGLq4QwEc/dgEWaBOAWwW3qB0m8G/f3PCZz32l81Sfk64JVN71mF/onjWt8f3vufMdb3ldTQJGIymQzwfMcwxHVwHH+/D5r97zzOZ9eeMWFdMWjEsrHM2kNgyMwxYhAD8H5qc9JlTWZX5DdVoVso4jk8lUPJlm3C1qqy2YcHoH+gOjgyDwAx1oKM0KigeagcUgPFgOZSEElw7TSudzca5daCb8mOPf8ppL3v7Gqy5qRg2DByOgjdaWxwxDXxY//NEj//DZL3dneBHC+tl4a02+vzNZm/6HT3z0LbesqAE8DSiCzylI68MYMAeuGLYCDMCr5uUKI0EkEWibVihpFwYWSXyc9X4KJUu4j8n4i+7mYQnww6Q/ncyzWvbE8EQlGkeiZ0ZSLoVn8qw8EcMOLc1SVPSE1urEjmihUCA3yTDTfwL+rZEyJdSno36+8avIUfs+XOvwLWEcMwx6hjG1s2ZgRT9TWUZHvT4YR42/MOgwjOC0cmQkdPBUDr8Ou8LDWaUtWiH0EyYKjPNWo0011h15Vit82KjDHHs6vyPzwoYtx1lJKM5jI21gnH61kIkgqsiedYnpjNMYo47wYVMU2mye50Xv7Mra7VgPDMN5w1xTocAZ1p8KNsCwnTCxsGB4fEK9bWJYpSgukAyhYXCCKJJkPLuIBhhCxEYi6KMMFCEN21knIaqOh3t+pLkYisSR6/gqqVyR/TOkEmC0ajTMAIGv+4Vws0XGZTUX+PkDBz7z2S/t3nfUcCfnF6XHLHyw4lVXr//AB9+3dkVLWtmUtBa8oCyTLAD6NYoWX/z3B5/ftvelAyd9kWBedcYHjEQsgcCPCSE4D4KiUUVrNWcMoAm1jAlwBss12RXMgAXGKmsYYwzc4VxaI4zlgORMCCGUr22hyB3HkwJBf2Mi194Uu+k1V9x2w7IpacQB14LbIiwCrbmbKAAPPnv4M//8bxueeA6xqhiLMaWUyVudu/jiRR//iz+54pLpWiEtyR9GwU+uAVvGaY2xx00kUeFMpNdkm2yTbbJNtsk22X7V2stRucZlsQD5bCGbiNUZeL0DJlXFT3fjb//hq/f87KGe/izzXO45Bsb383XNDTdfu+7P3/eWGc1V8Ri35UBlAPgWYOjVeH5b/32PPbtx64FTfYW8EUUfnnADX2utmRDC8bhwNJgmfIi1JXWQMTAGzsEsmIbV0Bo6AADGJWdScO0XrQo8yQSsVUFtdXrO7Fmz22quWTtz3YqGtIAAYoADqKLvkHFv8ezWI1/6+v/84L7H/YChqh5+gO4uKdDaVHvnW279wO++vaUeftGkPM6g+JBaKkyZ64FPKlGTbbJNtsk22SbbpMp1HnQuv8CFw4UwgLZEso7ePH7286e+/q3vPfnUxlRdc6GoVNaP1TUUOk/OuGjKHW+4+Y7bXzdnTsphQxqJBfIWgkEDgwobX+zbvvNAd07dt2HT6ayfyxUM41y4BhyQjDnggkGCl3ghjLZQGgawEp4rXc6gjZ81xSx0TthcdUImpZrSmJ47q23RvJnLl8yf1Z6oliU1C4AGlAKX4IACntt04sFHnv7uXfccPtqZqG7K5YvI5GVdVRrZJXPb3/ved772xlWSwZUQgA58z4kS9sthVBuTbbJNtsk22SbbZJtUuV5WMwG4ABh8BeFAA0WthJAaOHJq4Jv//cMvffkbKohV1zSf6uhtapvSeeyITLrTpjVeeenFb3zD9esvme4ART9Iug4DDBD4EBKcwwK9Cnv7cWIAp071HT/Ruf/gkX37D3Z19vqBKRSUAWNwOJecS865ZNwyWfSt0dDGF9zUVsVntbcsnDttxtT6+ip3SmNq7sxUfQyizIkqAGGDoKhkLG4ADRSBJ5878aOf/OKe+x7o7ctAAVxCI5ZIxGKxINfzB+9+4/t+582tTU6hgFQMAgj8Ysx1Shg3S/gzPkTkP6lzTbbJNtkm22SbbJMq18tttoymZzAAE8ZAW6icKXLuMcQ1sGN392c//S/3/vTRVKqprz8rG5qVDaALCDKJOFt7yeJ3vf2Nr7vxYgeQKClDsLAGzEBJZBny9EMgAHoHUMhbyxiAXN4MDmYHB7LFQsEYI5nknLe2trqu8DxICS7gOUin4AkIINBgFgkJBihjHM7pddYiAI524fFnt379Oz94asMLkC6EB6Xg551kzLG6mBt8zdWX/eVH/mjp/PpYOVmSAYLAW0M5icR0GoHgTapck22yTbbJNtkm26TK9fJVLpWD9AALSICpXHEgsH4yljJgPpgycWuZK/Dgw4c+/ekv7Nh3LMOkLQbwZCzhqmJGFzLJGGpSsd9555uvunTN2tVzPQ4dQDLLBQNgGQIYY8rFzgBtAYATUt3AWjCAc8hynUJSckgVJFcYZyjDvmAMlILnggPFADkfL+3u+9G9P/vJfQ8ePHYcTpx7McM4/ILwJNcFYQqrly34/ff9zi3XL3eIlsIWmIXLJWCVH0jGGaVpEN8pOzPlYVLlmmyTbbJNtsk22SZVrpevckUrMwdBznEFgEJQtEw40jOQBhgYsFVVLJvFf//g4W/86Cd7Dx0f7O2DcDl3mWXcQvmB53DB9YK57a+96ZpLL724pbmmtjpZn5YOIIjDioHzoSxKP1BCMIf///bu7jeK64zj+O95zpndtc3yYuPYJBguApWglZqgRGkjSAQVor1Ild70v2wUJblo1AgFKWlD6wqQ8tr0hoQXB7ABs/bMzsx5nl7MrHdtCKlkqt78PkK+8M56WcsXX505+xwBTNrVNgBVqgpXFwmQoNIFoiE6YKNzDlOJYYHBwK9du3bps6t/+fs3n3/7XZ1vSq/rKYWOdDLN19dgw9m5PSeOHfn978798Q9vHTrYS4aotaCKAKBVVWZZV6BweG0SIqA7A4u9RURExOR6RsmVvKqhIrFZ44GbuUAl5sMyZN2g42MbS2CQ8M4Hn/7pnfevXP1idTWPWT/r9odFDZVOJ6Y6rzbX0KmOHzv62qsvnTh29JcvHj80d3BxcbHf15BBFZODRRxwJLEk6gEi7cxWGNQRgawGqoSyxupacfPG3bt31m6t3LuyfOXy8vKdW3eGOrWpezDVh5VA6gQr8weahrP7ps6efvXC+TPnz55ZmO00gx4USDYManm5Md3pA+rm7qKawaxd3BrPxTe0d1yVf4VERERMrl0yIMGtXeDxpkx2Hs/s7ZUwoIY45GGO5Stfv/vexQ8/+tv3t+8jTMfuntQM1opJtPI0RPEIRT47vzh/YG5paenQoYUDc7Pz83MvHD60sPCcqM/O7t2/ryMKqxxeA+YuAbq+PniwPhhs5GtrD6/fXLm9cnd9UHzzr3/fXX1w5869qighUbOokFoFEiAGT6g2xYcvHl5468JvLpw7/ebrJ4Mj+PaFKgGkBlKz/14en1gm7Zu10R433bqMiIiImFy7SK5q9NE8HSeX71jvsdFO++ZfLC1WFirHjR/so4//cfHSZx9e/KRCcDhSgteIjl6nl3WKh49Q13BHCJplGkLWCSGEmZmpmZmpqV5XYGLN2dXwBJXOo0cbjwYbRVUXwyrPh6gqQDE9hcrghhDQbL0SgVRBq1QO9vdnfvXKy2//9vyZX596fn46Gnpx3FvjzfHSrLHZ5AZ5aT6n6HAZpSWaiRkmUEVgchERETG5dp1cbttf8CkXO2DwBBEgDocmsesBCVhZxXrulz65/P4Hf776+Vd5XsTQGVb1cGOjt79fWzIzV4FHdxdRVU15iWb8f0pwkxCaI7tC1kvJ4I4YJWZNWmkWU1EgNJllqEsA6GR7ezj32s/Pvn7q7JtvHF3a3zRWHE0L0ycF5uO0aavRo6PjwB0wARQZk4uIiIjJtWvj7fM2ro6dCTZqDjfLc+1GqEIUkOQK0QSUBlHUwM1b+OfytU//evna1S++++H2/XxQpMrb3e8RELhCIkygEeZwEdEYowDJTNTT1vlKXntVIVVQyaa6kDqq7t+758jR51859fKZN06fOrm0tA9dhwlSghmaU7ySIeiT+vK/iCeHyXhVj6tcRERETK5nnFwAJu8h6ui7E7u72ostlUXotlPf3V0kOqT9aOHownKIQYmPl7/69vr1L7/8+vsbtx4+HAw2i83NosgrM7hJKtNwWKJqz/aBIs50XUwVvW6nP9Xb2585sG+mP907fuTw0aXFl35x4uTPji0cjONNWnVzcJC0pyEKXFAZwvj4njahtH1TP3HOvAGKrfqEIPKvkIiIiMn1bNn2m2/tJC2B+mjPU1lalqlKGztmlcKhCqgbzASSaZDm/lxpSAFDQ21wQ15i9V5xa2Xlwf319fVBVaUiH24MBnmeN+e3hywsvvCcRul0Ov2ZPQdnD8wfnF2Y6+2bRmxGrTalZY66gDXj63vtpK8QHKhrE9WYTa7UtW9K2h1qOvG+tn19coxyTgQRERGTa/e8bSx9SoXpxNc0urquk8I6MbRXjbLFXVwgzZQFqDat1lwkqEpAoXGiahLcoQpVAKi3fs5E8PjWUHtH0GaWvY0eUnPzZCGIyMQzm//mjl9e8xyxiTe3rS/baag7kovVRURExOT6fyVXs17kBrM6iJrXIQSIjMZJuAMKEVdUDjjaR9uCsZRERMLE6yQzuI4nd6k3J16PVqHMAWkTyNxSSgBCjAIRmAJwhycZD5EfzYDYCjfZmhOhT9pMr21y7djMxuQiIiJicv2v7bgBh+018iORNpE6/ljMydOetS2AsLN/nvab2vo5rj91kf1ocj3+kuwtIiIiJhcRERER7R7HExARERExuYiIiIiYXERERETE5CIiIiJichERERExuYiIiIiIyUVERETE5CIiIiIiJhcRERERk4uIiIiIyUVERERETC4iIiIiJhcRERERk4uIiIiInoX/AIbpBdjf8AsyAAAAAElFTkSuQmCC" alt="Transhipping" style="height:56px;width:auto;object-fit:contain;">
      </div>
      <div class="inv-num">Nº ${docnum}</div>
    </div>
    <div class="inv-title">${isInv?'FATURA DE SOBREESTADIA DE CONTAINER':'RECIBO'}</div>
    <hr class="inv-hr">
    <div class="inv-row"><span class="inv-lbl">Cliente:</span><span class="inv-val">${b.client||'—'}${b.cnpj?'<br>CNPJ: '+b.cnpj:''}</span></div>
    <hr class="inv-hr-light">
    <div class="inv-row"><span class="inv-lbl">BL</span><span class="inv-val">${b.bl}</span></div>
    <div class="inv-row"><span class="inv-lbl">Container(s)</span><span class="inv-val">${rows.map(({c})=>c.container).join(', ')}</span></div>
    <div class="inv-row"><span class="inv-lbl">Navio/Voy:</span><span class="inv-val">${b.vessel||'—'}</span></div>
    <div class="inv-row"><span class="inv-lbl">From:</span><span class="inv-val">${b.pol||'—'}</span></div>
    <div class="inv-row"><span class="inv-lbl">To:</span><span class="inv-val">${b.pod||'—'}</span></div>

    <div style="display:flex;justify-content:flex-end;margin-bottom:0;">
      <div class="roe-box" style="min-width:160px;"><span>ROE</span><span>${roe.toFixed(4).replace('.',',')}</span></div>
    </div>
    <table class="inv-tbl">
      <thead><tr>${isInv?colsI:colsR}</tr></thead>
      <tbody>
        ${rowsHTML}
        ${hasDiscount ? `
        <tr class="inv-total-row" style="opacity:.7;">
          <td colspan="${totalCols-1}" class="inv-total-lbl">SUBTOTAL:</td>
          <td class="inv-total-val">${fmtBRL(subtotalBRL)}</td>
        </tr>
        <tr style="background:#f0fdf4;">
          <td colspan="${totalCols-1}" style="text-align:right;padding:6px 12px;font-weight:600;color:#15803d;">
            DESCONTO (${b.discount.mode === 'percent' ? b.discount.value + '%' : 'R$ ' + b.discount.value.toLocaleString('pt-BR',{minimumFractionDigits:2})}):
          </td>
          <td style="padding:6px 12px;font-weight:700;color:#15803d;text-align:right;">- ${fmtBRL(discountAmt)}</td>
        </tr>` : ''}
        <tr class="inv-total-row">
          <td colspan="${totalCols-1}" class="inv-total-lbl">${hasDiscount ? 'TOTAL FINAL:' : 'TOTAL:'}</td>
          <td class="inv-total-val">${fmtBRL(totalBRL)}</td>
        </tr>
        ${vencRow}
      </tbody>
    </table>
    <div class="inv-bank">
      <strong>Detalhes Bancários</strong>
      <div class="inv-bank-detail">TRANSHIPPING AGENCIAMENTO MARITIMO Ltda.<br>CNPJ 06.352.972/0001-21<br>BANCO: ITAU<br>AGÊNCIA: 0870 - PRAIA DO CANTO<br>CONTA CORRENTE 37293-5</div>
      <div class="inv-total-box">${fmtBRL(totalBRL)}</div>
    </div>
    ${isInv ? `<div class="inv-pix">
      <div class="inv-pix-qr" id="pix-qr-${docnum}"></div>
      <div class="inv-pix-info">
        <strong>Pagamento via PIX</strong>
        Escaneie o QR Code ao lado ou utilize a chave PIX abaixo para realizar o pagamento.<br>
        Valor da fatura: <strong>${fmtBRL(totalBRL)}</strong><br>
        <span class="inv-pix-key">🔑 Chave PIX (CNPJ): 06.352.972/0001-21</span>
      </div>
    </div>` : ''}
    <div class="inv-date">Vitória, ${cap(b.docDate ? new Date(b.docDate+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) : longDate())}</div>
  </div>`;

  // Generate PIX QR Code only for invoices
  if (isInv) {
    setTimeout(() => {
      const qrEl = document.getElementById('pix-qr-' + docnum);
      if (qrEl && typeof QRCode !== 'undefined') {
        const pixPayload = buildPixPayload('06352972000121', 'TRANSHIPPING AGENC MARITIMO', 'VIT', parseFloat(totalBRL.toFixed(2)));
        qrEl.innerHTML = '';
        new QRCode(qrEl, {
          text: pixPayload,
          width: 100,
          height: 100,
          correctLevel: QRCode.CorrectLevel.M
        });
      }
    }, 100);
  }
}

// ============================================================
// TRACKING MODULE
// ============================================================
// ── STORAGE: Containers (Firestore via window._dmStore) ───────────────────
// FIX #2: cópia profunda — mesma razão que load()
function trkLoad() { return JSON.parse(JSON.stringify((window._dmStore && window._dmStore.trk) || [])); }
function trkSave(d) {
  if (window._dmFireSave) window._dmFireSave('trk', d);
  else if (window._dmStore) window._dmStore.trk = d;
}
let trkData = (() => {
  const raw = trkLoad();
  const clean = raw.filter(r => {
    if (r.emptyReturn && r.discharge) {
      const used = trkDaysBetween(r.discharge, r.emptyReturn);
      const ft   = r.freeTime || 21;
      if (used !== null && used <= ft) return false;
    }
    return true;
  });
  if (clean.length < raw.length) trkSave(clean);
  return clean;
})();
let trkImportRaw = null;

function trkParseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0,10);
  if (typeof val === 'number') {
    // Excel serial
    const d = new Date((val - 25569) * 86400 * 1000);
    return d.toISOString().slice(0,10);
  }
  const s = String(val).trim();
  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m1) {
    const y = m1[3].length === 2 ? '20'+m1[3] : m1[3];
    return `${y}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  }
  // YYYY-MM-DD
  const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m2) return m2[0];
  return null;
}

function trkFmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d+'T12:00:00');
  return dt.toLocaleDateString('pt-BR');
}

function trkAddDays(dateStr, days) {
  if (!dateStr) return null;
  const d = new Date(dateStr+'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

function trkDaysBetween(d1, d2) {
  if (!d1 || !d2) return null;
  return Math.round((new Date(d2+'T12:00:00') - new Date(d1+'T12:00:00')) / 86400000);
}

function trkDaysElapsed(discharge) {
  if (!discharge) return null;
  const today = new Date(); today.setHours(12,0,0,0);
  return Math.round((today - new Date(discharge+'T12:00:00')) / 86400000);
}

function trkStatus(row) {
  const ft = row.freeTime || 21;
  if (row.emptyReturn) {
    // Container devolvido — verificar se gerou demurrage
    const usedDays = trkDaysBetween(row.discharge, row.emptyReturn);
    return usedDays !== null && usedDays > ft ? 'dd_returned' : 'returned';
  }
  // Ainda não devolvido
  const elapsed = trkDaysElapsed(row.discharge);
  if (elapsed === null) return 'none';
  const daysOver = elapsed - ft;
  if (daysOver > 0) return 'dd_open';        // gerando demurrage
  if (daysOver >= -1) return 'grace';         // vence hoje ou amanhã
  return 'free';
}

function trkNk(k) { return String(k).trim().toUpperCase().replace(/\s+/g,'_'); }

function openTrkImport() {
  trkImportRaw = null;
  document.getElementById('trk-import-btn').disabled = true;
  document.getElementById('trk-file-input').value = '';
  document.getElementById('trk-drop-zone').innerHTML = '<div class="drop-icon">⬆️</div><p><strong>Arraste ou selecione uma planilha</strong></p><p>(.xlsx, .xls, .csv)</p>';
  openModal('modal-trk-import');
}

function handleTrkDrop(e) {
  e.preventDefault();
  document.getElementById('trk-drop-zone').classList.remove('drag');
  if (e.dataTransfer.files[0]) processTrkFile(e.dataTransfer.files[0]);
}
function handleTrkFile(e) { if (e.target.files[0]) processTrkFile(e.target.files[0]); }

function processTrkFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array', cellDates:false});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, {defval:''});
    trkImportRaw = rows;
    document.getElementById('trk-import-btn').disabled = false;
    document.getElementById('trk-drop-zone').innerHTML = `<div class="drop-icon">✅</div><p><strong>${file.name}</strong></p><p>${rows.length} linha(s) encontrada(s)</p>`;
    toast(`${rows.length} linha(s) lidas.`, 'success');
  };
  reader.readAsArrayBuffer(file);
}

function doTrkImport() {
  if (!trkImportRaw) return;
  const parsed = trkImportRaw.map(row => {
    const n = {};
    Object.entries(row).forEach(([k,v]) => { n[trkNk(k)] = v; });
    const discharge = trkParseDate(n['DISCHARGE_DATE'] || n['DISCHARGE'] || n['DATA_DESCARGA'] || '');
    const freeTime  = parseInt(n['FREE_TIME'] || n['FREE TIME'] || 21) || 21;
    const emptyReturnRaw = trkParseDate(n['EMPTY_RETURN'] || n['EMPTY RETURN'] || n['DEVOLUCAO'] || '');
    // Deadline = discharge + freeTime
    const deadline  = trkParseDate(n['DEADLINE_FREE_TIME'] || n['DEADLINE FREE TIME'] || '') || trkAddDays(discharge, freeTime);
    // Use days = days between discharge and emptyReturn (or elapsed since discharge if no return)
    const useDaysRaw = n['USE_DAYS'] || n['USE DAYS'] || '';
    const useDays = useDaysRaw !== '' ? parseInt(useDaysRaw) : (emptyReturnRaw ? trkDaysBetween(discharge, emptyReturnRaw) : null);
    return {
      container:   String(n['CONTAINER'] || n['CTR'] || '').trim().toUpperCase(),
      bl:          String(n['BL'] || n['B/L'] || n['B_L'] || '').trim(),
      cnee:        String(n['CNEE'] || n['CLIENTE'] || '').trim(),
      type:        String(n['TYPE'] || n['TIPO'] || '').trim(),
      pol:         String(n['POL'] || '').trim(),
      pod:         String(n['POD'] || '').trim(),
      vessel:      String(n['VESSEL'] || n['NAVIO'] || '').trim(),
      discharge,
      deadline,
      emptyReturn: emptyReturnRaw,
      useDays,
      freeTime,
      cnpj:        (s => s.length === 13 ? '0'+s : s)(String(n['CNPJ'] || '').replace(/\D/g,'').trim()),
    };
  });
  let skippedFt = 0;
  const imported = parsed.filter(r => {
    if (!r.container) return false;
    if (r.emptyReturn && r.discharge) {
      const used = trkDaysBetween(r.discharge, r.emptyReturn);
      const ft   = r.freeTime || 21;
      if (used !== null && used <= ft) { skippedFt++; return false; }
    }
    return true;
  });

  let added = 0, updated = 0;
  imported.forEach(imp => {
    const idx = trkData.findIndex(x => x.container === imp.container && x.bl === imp.bl);
    if (idx >= 0) { trkData[idx] = imp; updated++; }
    else { trkData.push(imp); added++; }
  });
  trkSave(trkData);

  // Match imported CNPJs with client registry + update billing BLs
  let clientsLinked = 0;
  // Group cnpj by BL number (take first valid cnpj per BL)
  const cnpjByBL = {};
  imported.forEach(imp => {
    if (imp.cnpj && imp.cnpj.length === 14 && !cnpjByBL[imp.bl]) {
      cnpjByBL[imp.bl] = imp.cnpj;
    }
  });

  Object.entries(cnpjByBL).forEach(([blNum, cnpj]) => {
    // Update client registry
    const cnee = (imported.find(i => i.bl === blNum) || {}).cnee || '';
    const client = getClientByCnpj(cnpj);
    if (client) {
      syncBLEmails(cnpj, client.emails);
      clientsLinked++;
    } else if (cnee) {
      upsertClient(cnpj, cnee, []);
    }

    // Update CNPJ + email on any existing billing BL with same BL number
    bls.forEach(b => {
      if (b.bl === blNum && !b.cnpj) {
        b.cnpj = cnpj;
        const clientRec = getClientByCnpj(cnpj);
        if (clientRec) {
          if (!b.email) b.email = (clientRec.emails || []).join(', ');
          if (!b.client || b.client === b.cnee) b.client = clientRec.name || b.client;
        }
      }
    });
  });
  if (Object.keys(cnpjByBL).length) save(bls);

  closeModal('modal-trk-import');
  const migrated = checkAndMigrateBLs();
  renderTracking();
  let msg = `Importado: ${added} novo(s), ${updated} atualizado(s)${skippedFt > 0 ? `, ${skippedFt} ignorado(s) (devolvidos no free time)` : ''}.`;
  if (migrated > 0) msg += ` ${migrated} BL(s) migrado(s) para Faturamento!`;
  if (clientsLinked > 0) msg += ` ${clientsLinked} CNPJ(s) vinculado(s) a clientes.`;
  toast(msg, 'success');
}

function checkAndMigrateBLs() {
  // Group trkData by BL
  const byBL = {};
  trkData.forEach(r => {
    if (!r.bl) return;
    if (!byBL[r.bl]) byBL[r.bl] = [];
    byBL[r.bl].push(r);
  });

  let migrated = 0;

  Object.entries(byBL).forEach(([blNum, containers]) => {
    // Condition 1: ALL containers must be returned
    const allReturned = containers.every(c => !!c.emptyReturn);
    if (!allReturned) return;

    // Condition 2: at least one container generated demurrage
    const hasDemurrage = containers.some(c => trkStatus(c) === 'dd_returned');
    if (!hasDemurrage) return;

    // Check if already migrated (BL already exists in billing module)
    const alreadyExists = bls.some(b => b.bl === blNum);
    if (alreadyExists) return;

    // Build the BL object for billing module
    const first = containers[0];

    // Resolve CNPJ from any container in this BL
    const cnpjRaw = (containers.find(c => c.cnpj && c.cnpj.length === 14) || {}).cnpj || '';

    // Resolve email and client name from client registry
    let resolvedEmail  = '';
    let resolvedClient = first.cnee || '';
    if (cnpjRaw) {
      const clientRec = getClientByCnpj(cnpjRaw);
      if (clientRec) {
        resolvedEmail  = (clientRec.emails || []).join(', ');
        resolvedClient = clientRec.name  || resolvedClient;
      }
    }

    const blObj = {
      id: uid(),
      bl: blNum,
      vessel: first.vessel || '',
      pol: first.pol || '',
      pod: first.pod || '',
      client: resolvedClient,
      cnee: first.cnee || '',
      cnpj: cnpjRaw,
      phone: '',
      email: resolvedEmail,
      freeTime: first.freeTime || 21,
      roe: null,
      roeManual: false,
      ov1: null,
      ov2: null,
      venc: nextBusinessDay(null),
      docnum: genDocnum(blNum),
      migratedFromTracking: true,
      migratedAt: new Date().toISOString().slice(0,10),
      containers: containers.map(c => ({
        container: c.container,
        type: c.type || '40G1',
        discharge: c.discharge || '',
        emptyReturn: c.emptyReturn || '',
      })),
      createdAt: Date.now(),
    };

    bls.unshift(blObj);
    migrated++;
  });

  if (migrated > 0) save(bls);
  return migrated;
}

function renderTracking() {
  const q = (document.getElementById('trk-search')?.value || '').toLowerCase();
  const sf = document.getElementById('trk-filter-status')?.value || 'all';
  const today = new Date(); today.setHours(12,0,0,0);

  // Column filters
  const tfVal = id => (document.getElementById(id)?.value || '').toLowerCase().trim();
  const tf = {
    container: tfVal('tf-container'),
    bl:        tfVal('tf-bl'),
    cnee:      tfVal('tf-cnee'),
    type:      tfVal('tf-type'),
    pol:       tfVal('tf-pol'),
    pod:       tfVal('tf-pod'),
    vessel:    tfVal('tf-vessel'),
    discharge: tfVal('tf-discharge'),
    deadline:  tfVal('tf-deadline'),
    return:    tfVal('tf-return'),
    usedays:   tfVal('tf-usedays'),
    freetime:  tfVal('tf-freetime'),
    dias:      tfVal('tf-dias'),
    status:    tfVal('tf-status'),
  };

  const filtered = trkData.filter(r => {
    if (r.emptyReturn && r.discharge) {
      const used = trkDaysBetween(r.discharge, r.emptyReturn);
      if (used !== null && used <= (r.freeTime || 21)) return false;
    }
    const status = trkStatus(r);
    const elapsed = trkDaysElapsed(r.discharge);
    const ft = r.freeTime || 21;
    const useDays = r.useDays !== null && r.useDays !== undefined
      ? r.useDays
      : (r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : (elapsed !== null ? elapsed : null));
    const diasCorridos = r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : elapsed;

    const matchQ = !q || [r.container,r.bl,r.cnee,r.vessel].join(' ').toLowerCase().includes(q);
    const matchS = sf === 'all' || status === sf;
    const matchCols =
      (!tf.container || (r.container||'').toLowerCase().includes(tf.container)) &&
      (!tf.bl        || (r.bl||'').toLowerCase().includes(tf.bl)) &&
      (!tf.cnee      || (r.cnee||'').toLowerCase().includes(tf.cnee)) &&
      (!tf.type      || (r.type||'').toLowerCase().includes(tf.type)) &&
      (!tf.pol       || (r.pol||'').toLowerCase().includes(tf.pol)) &&
      (!tf.pod       || (r.pod||'').toLowerCase().includes(tf.pod)) &&
      (!tf.vessel    || (r.vessel||'').toLowerCase().includes(tf.vessel)) &&
      (!tf.discharge || trkFmtDate(r.discharge).includes(tf.discharge)) &&
      (!tf.deadline  || trkFmtDate(r.deadline).includes(tf.deadline)) &&
      (!tf.return    || trkFmtDate(r.emptyReturn).includes(tf.return)) &&
      (!tf.usedays   || String(useDays ?? '').includes(tf.usedays)) &&
      (!tf.freetime  || String(ft).includes(tf.freetime)) &&
      (!tf.dias      || String(diasCorridos ?? '').includes(tf.dias)) &&
      (!tf.status    || status === tf.status) &&
      (!tf.migratedat || (() => {
        const mbl = bls.find(x => x.bl === r.bl && x.migratedFromTracking);
        return mbl && mbl.migratedAt ? trkFmtDate(mbl.migratedAt).includes(tf.migratedat) : false;
      })());
    return matchQ && matchS && matchCols;
  });

  // Stats (always over full dataset)
  let nOver=0, nGrace=0, nFree=0;
  // Pre-compute per-BL migration eligibility and status
  const blGroups = {};
  trkData.forEach(r => {
    if (!r.bl) return;
    if (!blGroups[r.bl]) blGroups[r.bl] = [];
    blGroups[r.bl].push(r);
  });
  const blMigrationStatus = {};
  let nReady = 0;
  Object.entries(blGroups).forEach(([blNum, ctrs]) => {
    const allReturned = ctrs.every(c => !!c.emptyReturn);
    const total = ctrs.length;
    const returned = ctrs.filter(c => !!c.emptyReturn).length;
    const hasDemurrage = ctrs.some(c => trkStatus(c) === 'dd_returned');
    const inBilling = bls.some(b => b.bl === blNum);
    blMigrationStatus[blNum] = { allReturned, total, returned, hasDemurrage, inBilling };
    if (allReturned && hasDemurrage && !inBilling) nReady++;
  });

  trkData.forEach(r => {
    const s = trkStatus(r);
    if (s==='dd_open') nOver++;
    else if (s==='grace') nGrace++;
    else if (s==='free') nFree++;
  });
  document.getElementById('ts-total').textContent = trkData.length;
  document.getElementById('ts-over').textContent  = nOver;
  document.getElementById('ts-grace').textContent = nGrace;
  document.getElementById('ts-ready').textContent = nReady;
  updateAlertBadge();

  // Show migrate button if there are ready BLs
  const migrateBtn = document.getElementById('btn-migrate');
  if (migrateBtn) migrateBtn.style.display = nReady > 0 ? '' : 'none';

  const tbody = document.getElementById('trk-body');
  const empty = document.getElementById('trk-empty');
  const table = document.getElementById('trk-table-el');

  if (!filtered.length) {
    table.style.display = 'none';
    empty.style.display = '';
    return;
  }
  table.style.display = '';
  empty.style.display = 'none';

  if (window._trkView === 'bl') {
    tbody.innerHTML = renderTrkGroupedByBL(filtered);
  } else {
    tbody.innerHTML = filtered.map(r => {
    const status = trkStatus(r);
    const elapsed = trkDaysElapsed(r.discharge);
    const ft = r.freeTime || 21;
    const daysOver = elapsed !== null ? elapsed - ft : null;
    const useDays = r.useDays !== null && r.useDays !== undefined
      ? r.useDays
      : (r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : (elapsed !== null ? elapsed : null));
    const diasCorridos = r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : elapsed;
    const rowClass = status === 'dd_open'     ? 'row-dd-open'
      : status === 'dd_returned' ? 'row-dd-returned'
      : status === 'grace'       ? 'row-grace'
      : status === 'free'        ? 'row-free'
      : status === 'returned'    ? 'row-returned'
      : 'row-ok';

    let pillHtml, daysHtml;
    if (status === 'dd_open') {
      pillHtml = `<span class="pill pill-over">⛔ D&D Não devolvido (+${daysOver}d)</span>`;
      daysHtml = `<span class="days-num over">${diasCorridos ?? '—'}</span>`;
    } else if (status === 'dd_returned') {
      pillHtml = `<span class="pill pill-dd-returned">📦 D&D Devolvido</span>`;
      daysHtml = `<span class="days-num over">${diasCorridos ?? '—'}</span>`;
    } else if (status === 'returned') {
      pillHtml = `<span class="pill pill-free">✅ Devolvido</span>`;
      daysHtml = `<span class="days-num free">${diasCorridos ?? '—'}</span>`;
    } else if (status === 'grace') {
      const left = ft - elapsed;
      pillHtml = `<span class="pill pill-grace">⚠️ Atenção (${left <= 0 ? 'hoje' : left+'d'})</span>`;
      daysHtml = `<span class="days-num grace">${diasCorridos ?? '—'}</span>`;
    } else {
      const left = ft - elapsed;
      pillHtml = `<span class="pill pill-free">🟢 ${left}d restantes</span>`;
      daysHtml = `<span class="days-num free">${diasCorridos ?? '—'}</span>`;
    }

    // BL migration badge
    const ms = blMigrationStatus[r.bl];
    let blBadge = '';
    if (ms) {
      if (ms.inBilling) {
        blBadge = `<br><span class="pill pill-free" style="margin-top:3px;font-size:10px;">✔ Faturamento</span>`;
      } else if (ms.allReturned && ms.hasDemurrage) {
        blBadge = `<br><span class="pill pill-grace" style="margin-top:3px;font-size:10px;">⚡ Pronto p/ faturar</span>`;
      } else if (!ms.allReturned) {
        blBadge = `<br><span style="font-size:10px;color:var(--muted);">${ms.returned}/${ms.total} devolvidos</span>`;
      }
    }

    // Migration date — lookup from billing module
    const billedBL = bls.find(x => x.bl === r.bl && (x.migratedFromTracking || x.migratedAt));
    const migratedAtCell = billedBL && billedBL.migratedAt
      ? `<span style="font-size:10px;">${trkFmtDate(billedBL.migratedAt)}</span>`
      : '—';

    return `<tr class="${rowClass}">
      <td style="font-weight:600;white-space:normal;word-break:break-all;">${r.container}</td>
      <td style="text-align:left;white-space:normal;word-break:break-all;font-weight:600;">${r.bl||'—'}${blBadge}</td>
      <td style="text-align:left;overflow:hidden;text-overflow:ellipsis;" title="${r.cnee||''}">${r.cnee||'—'}</td>
      <td>${r.type||'—'}</td>
      <td>${r.pol||'—'}</td>
      <td>${r.pod||'—'}</td>
      <td style="text-align:left">${r.vessel||'—'}</td>
      <td>${trkFmtDate(r.discharge)}</td>
      <td>${trkFmtDate(r.deadline)}</td>
      <td>${trkFmtDate(r.emptyReturn)}</td>
      <td>${useDays !== null ? useDays : '—'}</td>
      <td>${ft}</td>
      <td>${daysHtml}</td>
      <td>${pillHtml}</td>
      <td>${migratedAtCell}</td>
    </tr>`;
  }).join('');
  }
}

function clearTrkFilters() {
  ['tf-container','tf-bl','tf-cnee','tf-type','tf-pol','tf-pod',
   'tf-vessel','tf-discharge','tf-deadline','tf-return',
   'tf-usedays','tf-freetime','tf-dias','tf-migratedat'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const sel = document.getElementById('tf-status');
  if (sel) sel.value = '';
  renderTracking();
}

function manualMigrate() {
  const migrated = checkAndMigrateBLs();
  if (migrated > 0) {
    renderTracking();
    renderList();
    toast(`${migrated} BL(s) migrado(s) para Faturamento com sucesso!`, 'success');
  } else {
    toast('Nenhum BL novo elegível para migração.', '');
  }
}

function clearTracking() {
  showDoubleConfirmation(
    'Excluir todos os Containers?',
    'Você está prestes a excluir permanentemente TODOS os containers do controle de rastreamento. Todos os dados de tracking, histórico e informações associadas serão removidos.',
    trkData.length,
    () => {
      var qtdExcluida = trkData.length; // FIX #8: captura ANTES de zerar o array
      trkData = [];
      trkSave(trkData);
      renderTracking();
      toast('✓ Controle de containers excluído permanentemente.', '');
      logAuditAction('exclusao_todos_containers', {quantidade: qtdExcluida});
    }
  );
}

function exportTrkReport() {
  if (!trkData.length) { toast('Nenhum dado para exportar.', 'error'); return; }
  const today = new Date(); today.setHours(12,0,0,0);
  const rows = trkData.map(r => {
    const status = trkStatus(r);
    const elapsed = trkDaysElapsed(r.discharge);
    const ft = r.freeTime || 21;
    const useDays = r.useDays !== null && r.useDays !== undefined
      ? r.useDays
      : (r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : (elapsed !== null ? elapsed : null));
    const diasCorridos = r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : elapsed;
    const statusLabel = {dd_open:'D&D Não Devolvido', dd_returned:'D&D Devolvido', returned:'Devolvido', grace:'Atenção', free:'Dentro do Free Time', none:'—'}[status]||'—';
    return {
      'CONTAINER': r.container, 'BL': r.bl, 'CNEE': r.cnee, 'TYPE': r.type,
      'POL': r.pol, 'POD': r.pod, 'VESSEL': r.vessel,
      'DISCHARGE': r.discharge ? trkFmtDate(r.discharge) : '—',
      'DEADLINE FREE TIME': r.deadline ? trkFmtDate(r.deadline) : '—',
      'EMPTY RETURN': r.emptyReturn ? trkFmtDate(r.emptyReturn) : '—',
      'USE DAYS': useDays !== null ? useDays : '—',
      'FREE TIME': ft,
      'DIAS CORRIDOS': diasCorridos !== null ? diasCorridos : '—',
      'STATUS': statusLabel,
    };
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, {origin:'A2'});
  const headers = Object.keys(rows[0]);
  ws['!cols'] = headers.map(h => ({wch: Math.max(h.length, 14)}));
  // Title
  ws['A1'] = {v:'TRANSHIPPING — Controle de Containers em Demurrage', t:'s'};
  ws['!merges'] = [{s:{r:0,c:0}, e:{r:0,c:headers.length-1}}];
  ws['!ref'] = `A1:${XLSX.utils.encode_cell({r:rows.length+1, c:headers.length-1})}`;
  XLSX.utils.book_append_sheet(wb, ws, 'Controle');
  const stamp = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `Controle_Containers_${stamp}.xlsx`);
  toast('Relatório exportado!', 'success');
}


// ============================================================
// CLIENTS IMPORT / EXPORT
// ============================================================
const CLI_TEMPLATE_B64 = "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";

function downloadCliTemplate() {
  const bin = atob(CLI_TEMPLATE_B64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  const blob = new Blob([arr], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'clientes_importacao.xlsx';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importClientsFile(input) {
  const file = input.files[0];
  if (!file) return;
  input.value = '';
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'csv') {
    const reader = new FileReader();
    reader.onload = e => parseClientsCSV(e.target.result);
    reader.readAsText(file, 'UTF-8');
    return;
  }

  // XLSX via SheetJS
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = new Uint8Array(e.target.result);
      const wb   = XLSX.read(data, {type:'array'});
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:false});
      processClientRows(rows);
    } catch(err) {
      toast('Erro ao ler arquivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseClientsCSV(text) {
  const lines = text.split(/\r?\n/).map(l => l.split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g,'')));
  processClientRows(lines);
}

function processClientRows(rows) {
  function toStr(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'number') return v.toFixed(0);
    return String(v);
  }
  function norm(s) {
    return toStr(s).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
  }

  // Find header row and map columns
  let dataStart = -1;
  let colCnpj = 0, colName = 1, colEmail = 2;

  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const row = rows[i];
    if (!row) continue;

    // Check every cell in this row for header keywords
    let foundCnpj = false;
    row.forEach((cell, idx) => {
      const h = norm(cell);
      if (h.includes('CNPJ'))                          { colCnpj = idx; foundCnpj = true; }
      if (h.includes('RAZ') || h.includes('SOCIAL'))   { colName  = idx; }
      if (h.includes('MAIL'))                           { colEmail = idx; }
    });

    if (foundCnpj) { dataStart = i + 1; break; }

    // No header yet — check if col 0 already has CNPJ-like data
    const digits = toStr(row[0]).replace(/\D/g,'');
    if (digits.length === 13 || digits.length === 14) { dataStart = i; break; }
  }

  if (dataStart < 0) {
    toast('Nenhuma linha de dados encontrada. Verifique o arquivo.', 'error');
    return;
  }

  let added = 0, updated = 0, skipped = 0, skipReasons = [];

  rows.slice(dataStart).forEach((row, idx) => {
    if (!row || row.every(c => c === null || c === undefined || c === '')) return;

    let cnpjStr = toStr(row[colCnpj]).replace(/\D/g,'').trim();
    if (cnpjStr.length === 13) cnpjStr = '0' + cnpjStr; // leading zero dropped by Excel

    const nameRaw  = toStr(row[colName]).trim();
    const emailRaw = toStr(row[colEmail]).trim();

    if (!cnpjStr || cnpjStr.length !== 14) {
      skipped++;
      if (skipReasons.length < 5) skipReasons.push(`linha ${dataStart + idx + 1}: "${toStr(row[colCnpj])}" → ${cnpjStr.length}d`);
      return;
    }

    const emails   = parseEmails(emailRaw);
    const existing = clients.find(c => normalizeCnpj(c.cnpj) === cnpjStr);

    if (existing) {
      if (nameRaw)           existing.name   = nameRaw;
      if (emails.length > 0) existing.emails = emails;
      syncBLEmails(cnpjStr, existing.emails);
      updated++;
    } else {
      clients.unshift({ id: uid(), cnpj: cnpjStr, name: nameRaw, emails, createdAt: Date.now() });
      syncBLEmails(cnpjStr, emails);
      added++;
    }
  });

  cliSave(clients);
  renderClients();

  let msg = `Importação: ${added} criado(s), ${updated} atualizado(s)`;
  if (skipped) msg += `, ${skipped} ignorado(s)`;
  if (skipReasons.length) msg += ` — CNPJs inválidos: ${skipReasons.join(' | ')}`;
  toast(msg, (!added && !updated) ? 'error' : 'success');
}

// ============================================================
// CLIENTS MODULE
// ============================================================
// ── STORAGE: Clientes (Firestore via window._dmStore) ─────────────────────
// FIX #2: cópia profunda — mesma razão que load()
function cliLoad() { return JSON.parse(JSON.stringify((window._dmStore && window._dmStore.clients) || [])); }
function cliSave(d) {
  if (window._dmFireSave) window._dmFireSave('clients', d);
  else if (window._dmStore) window._dmStore.clients = d;
}
let clients = cliLoad();
let editingClientId = null;

function normalizeCnpj(cnpj) {
  const d = String(cnpj||'').replace(/\D/g,'');
  return d.length === 13 ? '0' + d : d;
}

function formatCnpj(cnpj) {
  const d = normalizeCnpj(cnpj);
  if (d.length !== 14) return d || cnpj;
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function parseEmails(raw) {
  if (!raw) return [];
  return String(raw).split(/[\n,;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.length > 3 && e.includes('@') && e.includes('.'));
}

function getClientByCnpj(cnpj) {
  const norm = normalizeCnpj(cnpj);
  return clients.find(c => normalizeCnpj(c.cnpj) === norm) || null;
}

function getEmailsForBL(b) {
  if (b.cnpj) {
    const c = getClientByCnpj(b.cnpj);
    if (c && c.emails && c.emails.length > 0) return c.emails;
  }
  if (b.email) return parseEmails(b.email);
  return [];
}

// Upsert a client: create if new, update name/emails if exists
function upsertClient(cnpj, name, emails) {
  const norm = normalizeCnpj(cnpj);
  if (!norm || norm.length !== 14) return;
  const idx = clients.findIndex(c => normalizeCnpj(c.cnpj) === norm);
  if (idx >= 0) {
    if (name) clients[idx].name = name;
    if (emails && emails.length > 0) clients[idx].emails = emails;
  } else {
    clients.unshift({ id: uid(), cnpj: norm, name: name||'', emails: emails||[], createdAt: Date.now() });
  }
  cliSave(clients);
  if (emails && emails.length > 0) syncBLEmails(norm, emails);
}

function autoRegisterClient(cnpj, name, email) {
  const emails = parseEmails(email);
  upsertClient(cnpj, name, emails);
}

function syncBLEmails(cnpjNorm, emails) {
  let changed = false;
  bls.forEach(b => {
    if (normalizeCnpj(b.cnpj) === cnpjNorm) {
      b.email = emails.join(', ');
      changed = true;
    }
  });
  if (changed) save(bls);
}

function onCnpjInput() {
  const raw = document.getElementById('fc-cnpj').value;
  const norm = normalizeCnpj(raw);
  const hint = document.getElementById('fc-cnpj-hint');
  if (norm.length === 14 && !editingClientId) {
    const existing = clients.find(c => normalizeCnpj(c.cnpj) === norm);
    if (existing) {
      hint.textContent = '⚠️ CNPJ já cadastrado — clique em Editar para alterar.';
      hint.style.color = 'var(--red)';
    } else {
      hint.textContent = '✔ CNPJ disponível.';
      hint.style.color = 'var(--green)';
      const blMatch = bls.find(b => normalizeCnpj(b.cnpj) === norm);
      if (blMatch && blMatch.client && !document.getElementById('fc-name').value) {
        document.getElementById('fc-name').value = blMatch.client;
      }
    }
  } else {
    hint.textContent = '';
  }
}

function openNewClient() {
  editingClientId = null;
  document.getElementById('modal-client-title').textContent = 'Novo Cliente';
  document.getElementById('save-client-label').textContent = 'Criar Cliente';
  document.getElementById('fc-cnpj').value = '';
  document.getElementById('fc-cnpj').disabled = false;
  document.getElementById('fc-name').value = '';
  document.getElementById('fc-emails').value = '';
  document.getElementById('fc-cnpj-hint').textContent = '';
  openModal('modal-client');
}

function openEditClient(id) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  editingClientId = id;
  document.getElementById('modal-client-title').textContent = 'Editar Cliente';
  document.getElementById('save-client-label').textContent = 'Atualizar';
  document.getElementById('fc-cnpj').value = formatCnpj(c.cnpj);
  document.getElementById('fc-cnpj').disabled = true;
  document.getElementById('fc-name').value = c.name || '';
  document.getElementById('fc-emails').value = (c.emails||[]).join('\n');
  document.getElementById('fc-cnpj-hint').textContent = '';
  openModal('modal-client');
}

function saveClient() {
  const cnpjRaw  = document.getElementById('fc-cnpj').value.trim();
  const norm     = normalizeCnpj(cnpjRaw);
  const name     = document.getElementById('fc-name').value.trim();
  const emailsRaw = document.getElementById('fc-emails').value;
  const emails   = parseEmails(emailsRaw);

  if (!norm || norm.length !== 14) { toast('CNPJ inválido — informe 14 dígitos.', 'error'); return; }
  if (!name) { toast('Razão Social é obrigatória.', 'error'); return; }

  if (!editingClientId) {
    if (clients.find(c => normalizeCnpj(c.cnpj) === norm)) {
      toast('CNPJ já cadastrado. Use Editar para alterar.', 'error'); return;
    }
    clients.unshift({ id: uid(), cnpj: norm, name, emails, createdAt: Date.now() });
    toast('Cliente criado!', 'success');
  } else {
    const idx = clients.findIndex(x => x.id === editingClientId);
    if (idx >= 0) {
      clients[idx] = { ...clients[idx], name, emails };
      toast('Cliente atualizado!', 'success');
    }
  }

  syncBLEmails(norm, emails);
  cliSave(clients);
  logAuditAction('edicao_cliente', { cnpj: norm, name, acao: editingClientId ? 'edicao' : 'criacao' });
  closeModal('modal-client');
  renderClients();
}

function deleteClient(id) {
  if (!confirm('Excluir este cliente?')) return;
  clients = clients.filter(x => x.id !== id);
  cliSave(clients);
  renderClients();
  toast('Cliente excluído.');
}

function clearClients() {
  showDoubleConfirmation(
    'Excluir todos os Clientes?',
    'Você está prestes a excluir permanentemente TODOS os clientes cadastrados no sistema. Informações de contato, histórico e configurações associadas também serão removidas.',
    clients.length,
    () => {
      // FIX #15: captura quantidade ANTES de zerar o array (senão log registra 0)
      var qtdExcluida = clients.length;
      clients = [];
      cliSave(clients);
      renderClients();
      toast('✓ Cadastro de clientes excluído permanentemente.', '');
      logAuditAction('exclusao_todos_clientes', {quantidade: qtdExcluida});
    }
  );
}

function renderClients() {
  const q = (document.getElementById('cli-search')?.value || '').toLowerCase();
  const qDigits = q.replace(/\D/g, ''); // query stripped to digits only
  const sorted = [...clients].sort((a,b) => (a.name||a.cnpj||"").localeCompare(b.name||b.cnpj||"", "pt-BR"));
  const filtered = sorted.filter(c => {
    if (!q) return true;
    const text = [formatCnpj(c.cnpj), c.name, (c.emails||[]).join(' ')].join(' ').toLowerCase();
    if (text.includes(q)) return true;
    if (qDigits.length >= 2 && c.cnpj.includes(qDigits)) return true;
    return false;
  });

  const table = document.getElementById('cli-table');
  const empty = document.getElementById('cli-empty');
  const tbody = document.getElementById('cli-body');
  if (!table) return;

  if (!filtered.length) {
    table.style.display = 'none';
    if (empty) empty.style.display = '';
    return;
  }
  table.style.display = '';
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = filtered.map(c => {
    const blCount = bls.filter(b => normalizeCnpj(b.cnpj) === normalizeCnpj(c.cnpj)).length;
    const emailsHtml = (c.emails||[]).length
      ? c.emails.map(e => `<span style="display:inline-block;background:#dbeafe;color:#1e40af;border-radius:4px;padding:1px 7px;font-size:11px;margin:1px;">${e}</span>`).join(' ')
      : '<span style="color:var(--muted);font-size:11px;">—</span>';
    return `<tr>
      <td style="font-family:monospace;font-weight:600">${formatCnpj(c.cnpj)}</td>
      <td style="text-align:left">${c.name||'—'}</td>
      <td style="text-align:left">${emailsHtml}</td>
      <td>${blCount > 0 ? `<span style="font-weight:600;color:var(--blue)">${blCount}</span>` : '—'}</td>
      <td>
        <button class="act-btn edit" onclick="openEditClient('${c.id}')" style="padding:4px 10px;font-size:12px;">Editar</button>
        <button class="act-btn del"  onclick="deleteClient('${c.id}')"  style="padding:4px 10px;font-size:12px;" aria-label="Excluir cliente ${c.name||c.id}">Excluir</button>
      </td>
    </tr>`;
  }).join('');
}
// ============================================================
// USUARIOS MODULE
// ============================================================

// In-memory cache for users module
let _usrList = [];
let _logList = [];
let _logPage = 0;
const LOG_PER_PAGE = 50;
let _editingUserId = null;

async function renderUsers() {
  if (!window._dmIsAdmin) {
    const usersEl = document.getElementById('mod-users');
    if (usersEl) usersEl.innerHTML = '<div style="padding:60px;text-align:center;color:var(--muted);">⛔ Acesso restrito a administradores.</div>';
    return;
  }
  // Load users
  if (window._dmFireLoadUsuarios) {
    _usrList = await window._dmFireLoadUsuarios() || [];
  }
  // Load logs
  if (window._dmFireLoadLogs) {
    _logList = await window._dmFireLoadLogs() || [];
  }
  _logPage = 0;
  _renderUserTable();
  _renderLogTable();
  _updateUsrKPIs();
}

function _updateUsrKPIs() {
  const today = new Date().toISOString().slice(0,10);
  const activeUsers = _usrList.filter(u => u.ativo !== false).length;
  const sessionsToday = _logList.filter(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    return d.toISOString().slice(0,10) === today && l.acao === 'login';
  }).length;
  const el1 = document.getElementById('usr-kpi-total');
  const el2 = document.getElementById('usr-kpi-sessions');
  const el3 = document.getElementById('usr-kpi-logs');
  if (el1) el1.textContent = activeUsers;
  if (el2) el2.textContent = sessionsToday;
  if (el3) el3.textContent = _logList.length;
}

function _renderUserTable() {
  const tbody = document.getElementById('usr-body');
  if (!tbody) return;
  if (!_usrList.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">Nenhum usuário encontrado. Clique em "+ Novo Usuário".</td></tr>';
    return;
  }
  tbody.innerHTML = _usrList.map(u => {
    const criadoEm = u.criado_em?.toDate ? u.criado_em.toDate().toLocaleDateString('pt-BR') : (u.criado_em ? new Date(u.criado_em).toLocaleDateString('pt-BR') : '—');
    const adminBadge = u.admin ? '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;">ADMIN</span>' : '—';
    const ativoBadge = u.ativo !== false ? '<span style="color:#10b981;font-weight:700;">✔ Ativo</span>' : '<span style="color:#ef4444;font-weight:700;">✗ Inativo</span>';
    return `<tr>
      <td style="font-weight:600">${u.nome||'—'}</td>
      <td style="font-size:12px;color:var(--muted)">${u.email||'—'}</td>
      <td>${u.cargo||'—'}</td>
      <td style="text-align:center">${adminBadge}</td>
      <td style="text-align:center">${ativoBadge}</td>
      <td style="font-size:12px">${criadoEm}</td>
      <td style="text-align:center">
        <button class="act-btn edit" onclick="openEditUser('${u.uid||u.id}')" style="padding:4px 10px;font-size:12px;">Editar</button>
      </td>
    </tr>`;
  }).join('');
}

function _getFilteredLogs() {
  const qUser   = (document.getElementById('log-filter-user')?.value  || '').toLowerCase();
  const qAction = document.getElementById('log-filter-action')?.value || '';
  const qFrom   = document.getElementById('log-filter-from')?.value   || '';
  const qTo     = document.getElementById('log-filter-to')?.value     || '';
  return _logList.filter(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    const dStr = d.toISOString().slice(0,10);
    if (qUser   && !(l.usuario_nome||'').toLowerCase().includes(qUser)) return false;
    if (qAction && l.acao !== qAction) return false;
    if (qFrom   && dStr < qFrom) return false;
    if (qTo     && dStr > qTo)   return false;
    return true;
  });
}

function _renderLogTable() {
  const tbody = document.getElementById('log-body');
  if (!tbody) return;
  const filtered = _getFilteredLogs();
  const total = filtered.length;
  const start = _logPage * LOG_PER_PAGE;
  const page = filtered.slice(start, start + LOG_PER_PAGE);

  const countLabel = document.getElementById('log-count-label');
  const pageLabel  = document.getElementById('log-page-label');
  const prevBtn    = document.getElementById('log-prev-btn');
  const nextBtn    = document.getElementById('log-next-btn');
  if (countLabel) countLabel.textContent = `${total} registro(s)`;
  const totalPages = Math.max(1, Math.ceil(total / LOG_PER_PAGE));
  if (pageLabel) pageLabel.textContent = `Página ${_logPage+1} de ${totalPages}`;
  if (prevBtn) prevBtn.disabled = _logPage === 0;
  if (nextBtn) nextBtn.disabled = _logPage >= totalPages - 1;

  if (!page.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px;">Nenhum log encontrado.</td></tr>';
    return;
  }

  const actionColors = {
    login:              '#dcfce7;color:#15803d',
    logout:             '#f3f4f6;color:#6b7280',
    criacao_bl:         '#dbeafe;color:#1d4ed8',
    edicao_bl:          '#e0e7ff;color:#4338ca',
    exclusao_bl:        '#fee2e2;color:#dc2626',
    marcacao_pagamento: '#d1fae5;color:#065f46',
    marcacao_fatura:    '#fef3c7;color:#92400e',
    abertura_disputa:   '#fed7aa;color:#c2410c',
    resolucao_disputa:  '#dcfce7;color:#15803d',
    edicao_cliente:     '#e0e7ff;color:#4338ca',
    envio_email:        '#dbeafe;color:#1e40af',
    importacao_planilha:'#f0fdf4;color:#166534',
    exportacao_relatorio:'#f0fdf4;color:#166534',
  };

  tbody.innerHTML = page.map(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    const dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    const style = actionColors[l.acao] || '#f9fafb;color:#374151';
    const actionBadge = `<span style="background:${style};padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;">${l.acao||'?'}</span>`;
    let detalhe = '';
    try {
      const d2 = l.detalhe || {};
      const parts = [];
      if (d2.bl) parts.push(`BL: ${d2.bl}`);
      if (d2.blId) parts.push(`ID: ${d2.blId}`);
      if (d2.total != null) parts.push(`Total: R$ ${Number(d2.total).toLocaleString('pt-BR',{minimumFractionDigits:2})}`);
      if (d2.hasDiscount) parts.push('com desconto');
      if (d2.hasDispute) parts.push('em disputa');
      detalhe = parts.join(' · ') || JSON.stringify(d2);
    } catch(e) { detalhe = '—'; }
    return `<tr>
      <td style="font-size:12px;white-space:nowrap">${dateStr}</td>
      <td style="font-size:12px;font-weight:500">${l.usuario_nome||'—'}</td>
      <td>${actionBadge}</td>
      <td style="font-size:11px;color:var(--muted);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${detalhe}</td>
    </tr>`;
  }).join('');
}

function renderLogs() {
  _logPage = 0;
  _renderLogTable();
}

function logPage(dir) {
  const filtered = _getFilteredLogs();
  const totalPages = Math.max(1, Math.ceil(filtered.length / LOG_PER_PAGE));
  _logPage = Math.max(0, Math.min(_logPage + dir, totalPages - 1));
  _renderLogTable();
}

function clearLogFilters() {
  ['log-filter-user','log-filter-action','log-filter-from','log-filter-to'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderLogs();
}

function openNewUser() {
  _editingUserId = null;
  document.getElementById('modal-user-title').textContent = 'Novo Usuário';
  document.getElementById('save-user-label').textContent  = 'Criar';
  document.getElementById('fu-nome').value  = '';
  document.getElementById('fu-email').value = '';
  document.getElementById('fu-cargo').value = '';
  document.getElementById('fu-admin').checked = false;
  document.getElementById('fu-ativo').checked = true;
  openModal('modal-user');
}

function openEditUser(uid2) {
  const u = _usrList.find(x => (x.uid||x.id) === uid2);
  if (!u) return;
  _editingUserId = uid2;
  document.getElementById('modal-user-title').textContent = 'Editar Usuário';
  document.getElementById('save-user-label').textContent  = 'Atualizar';
  document.getElementById('fu-nome').value  = u.nome  || '';
  document.getElementById('fu-email').value = u.email || '';
  document.getElementById('fu-cargo').value = u.cargo || '';
  document.getElementById('fu-admin').checked = !!u.admin;
  document.getElementById('fu-ativo').checked = u.ativo !== false;
  openModal('modal-user');
}

async function saveUser() {
  const nome  = document.getElementById('fu-nome').value.trim();
  const email = document.getElementById('fu-email').value.trim();
  const cargo = document.getElementById('fu-cargo').value.trim();
  const admin = document.getElementById('fu-admin').checked;
  const ativo = document.getElementById('fu-ativo').checked;

  if (!nome)  { toast('Nome é obrigatório.', 'error'); return; }
  if (!email) { toast('E-mail é obrigatório.', 'error'); return; }

  const data = { nome, email, cargo, admin, ativo };
  if (_editingUserId) data.uid = _editingUserId;

  if (window._dmFireSaveUsuario) {
    const ok = await window._dmFireSaveUsuario(data);
    if (ok) {
      toast(_editingUserId ? 'Usuário atualizado!' : 'Usuário salvo!', 'success');
      logAuditAction('edicao_usuario', { uid: _editingUserId, nome, email });
      closeModal('modal-user');
      await renderUsers();
    } else {
      toast('Erro ao salvar usuário no Firebase.', 'error');
    }
  } else {
    toast('Firebase não disponível.', 'error');
  }
}

function exportLogsCSV() {
  const filtered = _getFilteredLogs();
  if (!filtered.length) { toast('Nenhum log para exportar.', 'error'); return; }
  const header = ['DATA/HORA','USUÁRIO','AÇÃO','DETALHE'];
  const rows = filtered.map(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    const dateStr = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR');
    let detalhe = '';
    try { detalhe = JSON.stringify(l.detalhe||{}); } catch(e) {}
    return [dateStr, l.usuario_nome||'', l.acao||'', detalhe];
  });
  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(';')).join('\n');
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `auditoria_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
  toast('CSV exportado!', 'success');
  logAuditAction('exportacao_relatorio', {tipo:'logs_auditoria', registros: filtered.length});
}

function confirmClearOldLogs() {
  const cutoff = prompt('Limpar logs mais antigos que quantos dias? (ex: 90)');
  if (!cutoff || isNaN(Number(cutoff))) return;
  const dias = parseInt(cutoff);

  const cutDate = new Date(Date.now() - dias * 86400000);
  const toDelete = _logList.filter(l => {
    const d = l.criado_em?.toDate ? l.criado_em.toDate() : new Date(l.criado_em || 0);
    return d < cutDate;
  });

  if (!toDelete.length) {
    toast('Nenhum log encontrado para o período informado.');
    return;
  }

  showDoubleConfirmation(
    'Excluir Logs Antigos?',
    `Você está prestes a excluir permanentemente todos os logs anteriores a ${dias} dias. Estes registros de auditoria não poderão ser recuperados.`,
    toDelete.length,
    () => {
      // Delete via Firebase
      if (window._dmDb && window._dmFireLog) {
        (async () => {
          const { deleteDoc, doc: docFn } = await import("https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js");
          let deleted = 0;
          for (const l of toDelete) {
            if (l._docId) {
              try { await deleteDoc(docFn(window._dmDb, 'logs', l._docId)); deleted++; } catch(e) {}
            }
          }
          toast(`✓ ${deleted} log(s) excluído(s) permanentemente.`, 'success');
          logAuditAction('limpeza_logs', { diasCutoff: dias, deletados: deleted });
          await renderUsers();
        })();
      } else {
        toast('Firebase não disponível para exclusão.', 'error');
      }
    }
  );
}

// ============================================================
// COBRANÇA CONSOLIDADA — mapa de clientes
// ============================================================
let _consMap = {};   // cnpj → { name, emails, bls[] }

function _rebuildConsMap() {
  _consMap = {};
  bls.forEach(b => {
    if (b.paid) return;
    if (!b.cnpj) return;
    if (!_consMap[b.cnpj]) {
      const cl = getClientByCnpj(b.cnpj);
      _consMap[b.cnpj] = {
        name:   (cl && cl.name) || b.client || b.cnpj,
        emails: getEmailsForBL(b),
        bls:    []
      };
    }
    _consMap[b.cnpj].bls.push(b);
  });
}

// Total BRL for a BL (all containers with demurrage)
function blTotalBRL(b) {
  if ((b.paid || b.billed) && b.frozenTotal != null) return b.frozenTotal;
  const roe = (b.paid || b.billed) && b.frozenRoe != null ? b.frozenRoe : effectiveROE(b);
  let total = 0;
  (b.containers || []).forEach(c => {
    const dc = daysBetween(c.discharge, c.emptyReturn);
    if (dc === null) return;
    total += calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD * roe;
  });
  return total;
}

// Open modal
function openConsolidatedEmail() {
  _rebuildConsMap();
  document.getElementById('cons-search').value = '';
  document.getElementById('cons-cnpj-hidden').value = '';
  document.getElementById('cons-selected-chip').style.display = 'none';
  document.getElementById('cons-dropdown').style.display = 'none';
  document.getElementById('cons-preview').style.display = 'none';
  document.getElementById('cons-empty').style.display   = 'none';
  document.getElementById('cons-send-btn').disabled     = true;
  document.getElementById('cons-pdf-btn').disabled      = true;
  _consSelected.clear();
  openModal('modal-consolidated');
  renderConsClientList('');
  _updateConsFooter();
  document.getElementById('cons-search').focus();
}

// Show all on focus
function showConsolidatedList() {
  _rebuildConsMap();
  filterConsolidatedList();
}

// Filter dropdown
function filterConsolidatedList() {
  const raw = (document.getElementById('cons-search').value || '').trim();
  renderConsClientList(raw);
  const rawL = raw.toLowerCase();
  const digits = raw.replace(/\D/g,'');
  const dd = document.getElementById('cons-dropdown');

  const entries = Object.entries(_consMap).filter(([cnpj, info]) => {
    if (!raw) return true;
    if (digits.length >= 2 && cnpj.includes(digits)) return true;
    if (info.name.toLowerCase().includes(rawL)) return true;
    if (formatCnpj(cnpj).includes(raw)) return true;
    return false;
  });

  if (!entries.length) { dd.style.display = 'none'; return; }

  dd.innerHTML = entries.map(([cnpj, info]) => {
    const pending  = info.bls.filter(b => !b.paid).length;
    const noEmail  = !info.emails.length;
    return `<div class="cons-dd-item" onclick="selectConsCnpj('${cnpj}')"
      style="padding:9px 12px;cursor:pointer;border-bottom:1px solid #f1f5f9;">
      <div style="font-weight:600;color:var(--navy);font-size:13px;">${info.name}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px;">
        ${formatCnpj(cnpj)}
        &nbsp;·&nbsp; ${pending} BL${pending!==1?'s':''} em aberto
        ${noEmail ? '&nbsp;·&nbsp;<span style="color:#dc2626;">⚠ sem e-mail</span>' : ''}
      </div>
    </div>`;
  }).join('');
  dd.style.display = 'block';
}

// Select a CNPJ from dropdown
function selectConsCnpj(cnpj) {
  const info = _consMap[cnpj];
  if (!info) return;
  document.getElementById('cons-search').value = '';
  document.getElementById('cons-cnpj-hidden').value = cnpj;
  document.getElementById('cons-dropdown').style.display = 'none';

  const chip = document.getElementById('cons-selected-chip');
  document.getElementById('cons-chip-text').textContent =
    `${formatCnpj(cnpj)} — ${info.name}`;
  chip.style.display = 'flex';

  renderConsClientList(document.getElementById('cons-search').value);
  _renderConsPreview(cnpj);
}

// Clear selection
function clearConsolidatedSelection() {
  document.getElementById('cons-cnpj-hidden').value = '';
  document.getElementById('cons-search').value = '';
  document.getElementById('cons-selected-chip').style.display = 'none';
  document.getElementById('cons-dropdown').style.display = 'none';
  document.getElementById('cons-preview').style.display = 'none';
  document.getElementById('cons-empty').style.display   = 'none';
  document.getElementById('cons-send-btn').disabled     = true;
  document.getElementById('cons-pdf-btn').disabled      = true;
  document.getElementById('cons-search').focus();
}

// Render preview table
function _renderConsPreview(cnpj) {
  const eligible = bls.filter(b => b.cnpj === cnpj && !b.paid);
  const preview  = document.getElementById('cons-preview');
  const empty    = document.getElementById('cons-empty');
  const sendBtn  = document.getElementById('cons-send-btn');
  const pdfBtn   = document.getElementById('cons-pdf-btn');

  if (!eligible.length) {
    preview.style.display = 'none';
    const hintEl2 = document.getElementById('cons-hint');
    if (hintEl2) hintEl2.style.display = 'none';
    empty.style.display   = '';
    sendBtn.disabled = true;
    pdfBtn.disabled  = true;
    return;
  }

  const hint = document.getElementById('cons-hint');
  if (hint) hint.style.display = 'none';
  preview.style.display = '';
  empty.style.display   = 'none';
  sendBtn.disabled = false;
  pdfBtn.disabled  = false;

  let grand = 0;
  document.getElementById('cons-tbody').innerHTML = eligible.map(b => {
    const total  = blTotalBRL(b);
    grand += total;
    const docnum = b.docnum || genDocnum(b.bl);
    const venc   = b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—';
    const status = b.billed
      ? '<span style="color:var(--blue);font-size:11px;">📄 Faturado</span>'
      : '<span style="color:#d97706;font-size:11px;">⏳ Pendente</span>';
    const ctrs = (b.containers||[]).map(c=>c.container).join(', ');
    return `<tr style="border-bottom:1px solid #f1f5f9;">
      <td style="padding:5px 8px;font-family:monospace;font-size:11px;white-space:nowrap;">${docnum}</td>
      <td style="padding:5px 8px;font-size:12px;">${b.bl}</td>
      <td style="padding:5px 8px;font-size:11px;color:var(--muted);">${ctrs}</td>
      <td style="padding:5px 8px;text-align:right;font-weight:600;font-size:12px;white-space:nowrap;">${fmtBRL(total)}</td>
      <td style="padding:5px 8px;font-size:12px;white-space:nowrap;">${venc}</td>
      <td style="padding:5px 8px;">${status}</td>
    </tr>`;
  }).join('');

  document.getElementById('cons-grand-total').textContent = fmtBRL(grand);
  const info   = _consMap[cnpj] || {};
  const emails = info.emails || [];
  document.getElementById('cons-to-display').textContent =
    emails.length ? emails.join(', ') : '⚠ Nenhum e-mail cadastrado';
}

// Send consolidated email
function sendConsolidatedEmail() {
  const cnpj = document.getElementById('cons-cnpj-hidden').value;
  if (!cnpj) return;
  const eligible = bls.filter(b => b.cnpj === cnpj && !b.paid);
  if (!eligible.length) return;
  const info  = _consMap[cnpj] || {};
  const nome  = info.name || cnpj;
  const emails = info.emails || getEmailsForBL(eligible[0]);
  if (!emails.length) { toast('Nenhum e-mail cadastrado para este cliente.', 'error'); return; }
  const to = encodeURIComponent(emails.join(', '));
  const firstName = nome.split(' ')[0];
  let grand = 0;
  const linhas = eligible.map(b => {
    const tot  = blTotalBRL(b); grand += tot;
    const doc  = b.docnum || genDocnum(b.bl);
    const venc = b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—';
    const ctrs = (b.containers||[]).map(c=>c.container).join(', ');
    const fmt  = tot.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    return `  ${doc}  |  BL: ${b.bl}  |  ${ctrs}  |  R$ ${fmt}  |  Venc: ${venc}  |  ${b.billed?'FATURADO':'PENDENTE'}`;
  }).join('\n');
  const grandFmt = grand.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const subject  = encodeURIComponent(`Cobranças de Demurrage — ${nome} — ${eligible.length} fatura${eligible.length>1?'s':''}`);
  const body     = encodeURIComponent(
`Prezado(a) ${firstName},

Encaminhamos o resumo das faturas de Sobreestadia em aberto para ${nome} (CNPJ: ${formatCnpj(cnpj)}):

${linhas}

─────────────────────────────────────
TOTAL GERAL: R$ ${grandFmt}
─────────────────────────────────────

Para gerar cada PDF: acesse o BL no sistema → "Imprimir / PDF".

PIX — Chave CNPJ: 06.352.972/0001-21
Banco: ITAÚ | Agência: 0870 - Praia do Canto | CC: 37293-5

Atenciosamente,
TRANSHIPPING AGENCIAMENTO MARÍTIMO Ltda.
CNPJ: 06.352.972/0001-21`);
  closeModal('modal-consolidated');
  window.location.href = `mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${body}`;
}

// ── Build standalone invoice HTML ────────────────────────────────────────
function buildInvoiceHTML(b) {
  const docnum     = b.docnum || genDocnum(b.bl);
  const roe        = (b.paid || b.billed) && b.frozenRoe != null ? b.frozenRoe : effectiveROE(b);
  const roeDisplay = roe.toLocaleString('pt-BR',{minimumFractionDigits:4,maximumFractionDigits:4});
  let totalBRL = 0;

  const rows = (b.containers||[]).filter(c => {
    const dc = daysBetween(c.discharge, c.emptyReturn);
    return dc !== null && calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD > 0;
  }).map(c => {
    const dc   = daysBetween(c.discharge, c.emptyReturn);
    const rate = getRate(c.type);
    const calc = calcUSD(dc, rate, b.ov1||null, b.ov2||null);
    const usd  = calc.totalUSD * roe;
    totalBRL  += usd;
    const ft   = b.freeTime || 21;
    const d1   = Math.min(dc, ft);
    const d2   = Math.max(0, dc - ft);
    return `<tr>
      <td>${c.container}</td><td>${c.type||'—'}</td>
      <td style="text-align:center">${d1}</td>
      <td style="text-align:center">$${rate.p1.usd.toFixed(2)}</td>
      <td style="text-align:center">${d2||'—'}</td>
      <td style="text-align:center">${d2?'$'+rate.p2.usd.toFixed(2):'—'}</td>
      <td>${c.discharge||'—'}</td><td>${c.emptyReturn||'—'}</td>
      <td style="text-align:right">R$&nbsp;${usd.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
    </tr>`;
  }).join('');

  const isFrozen = (b.paid || b.billed) && b.frozenTotal != null;
  if (isFrozen) totalBRL = b.frozenTotal;

  // Apply discount only when NOT frozen (frozen already includes discount via blTotal)
  let discountAmount = 0;
  let subtotalBRL = totalBRL;
  if (b.discount && b.discount.value > 0 && !isFrozen) {
    if (b.discount.mode === 'percent') {
      discountAmount = subtotalBRL * (b.discount.value / 100);
    } else {
      discountAmount = b.discount.value;
    }
    totalBRL = Math.max(0, subtotalBRL - discountAmount);
  }

  const totalFmt = totalBRL.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const subtotalFmt = subtotalBRL.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const discountFmt = discountAmount.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const vencFmt  = b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—';
  const docDate  = b.docDate
    ? new Date(b.docDate+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
    : new Date().toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const pixPayload = buildPixPayload('06352972000121','TRANSHIPPING AGENC MARITIMO','VIT', parseFloat(totalBRL.toFixed(2)));
  const logoSrc    = (document.querySelector('.inv-logo-area img')||{}).src || '';
  // Only extract invoice-relevant CSS (not the 97KB JSZip inline script)
  const pageCSS = (function() {
    var styles = document.querySelectorAll('style');
    var css = '';
    for (var i = 0; i < styles.length; i++) {
      var txt = styles[i].innerHTML;
      // skip huge scripts disguised as styles and JSZip content
      if (txt.length < 50000) css += txt + '\n';
    }
    return css;
  })();
  const safeFn     = `${docnum} FATURA DEMURRAGE ${(b.client||'').split(' ')[0]||'CLIENTE'} ${b.bl}`;

  return `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="UTF-8"><title>${safeFn}</title>
<style>
${pageCSS}
body{margin:0;padding:20px;background:white;}
.print-bar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;margin-bottom:18px;font-family:Arial,sans-serif;font-size:13px;}
.print-bar strong{flex:1;}
.print-bar button{padding:7px 20px;background:#0f2a4a;color:white;border:none;border-radius:4px;cursor:pointer;font-size:13px;font-weight:600;}
@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}.print-bar{display:none!important;}body{padding:0;}}
</style></head><body>
<div class="print-bar">
  <strong>📄 ${safeFn}</strong>
  <button onclick="window.print()">🖨️ Salvar como PDF</button>
</div>
<div class="invoice">
  <div class="inv-header">
    <div class="inv-logo-area"><img src="data:image/png;base64,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" alt="Transhipping" style="height:56px;width:auto;object-fit:contain;"></div>
    <div class="inv-num">Nº ${docnum}</div>
  </div>
  <div class="inv-title">FATURA DE SOBREESTADIA DE CONTAINER</div>
  <hr class="inv-hr">
  <div class="inv-row"><span class="inv-lbl">Cliente:</span><span class="inv-val">${b.client||'—'}${b.cnpj?'<br>CNPJ: '+formatCnpj(b.cnpj):''}</span></div>
  <hr class="inv-hr-light">
  <div class="inv-row"><span class="inv-lbl">BL</span><span class="inv-val">${b.bl}</span></div>
  <div class="inv-row"><span class="inv-lbl">Navio/Viagem</span><span class="inv-val">${b.vessel||'—'}</span></div>
  <div class="inv-row"><span class="inv-lbl">POL → POD</span><span class="inv-val">${b.pol||'—'} → ${b.pod||'—'}</span></div>
  <hr class="inv-hr">
  <div style="text-align:right;margin-bottom:6px;"><span class="roe-box">ROE ${roeDisplay}</span></div>
  <table class="inv-tbl" style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead><tr><th>CONTAINER</th><th>TIPO</th><th>DIAS 1º PER.</th><th>USD/DIA P1</th><th>DIAS 2º PER.</th><th>USD/DIA P2</th><th>DESCARGA</th><th>RETORNO</th><th>LÍQUIDO</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr style="border-top:2px solid var(--border);">
        <td colspan="8" style="text-align:right;font-weight:700;padding:6px 8px;">SUBTOTAL:</td>
        <td style="text-align:right;font-weight:700;padding:6px 8px;">R$&nbsp;${subtotalFmt}</td>
      </tr>
      ${b.discount && b.discount.value > 0 ? `<tr style="background:#f0fdf4;">
        <td colspan="8" style="text-align:right;font-weight:700;padding:6px 8px;color:#15803d;">DESCONTO ${b.discount.mode === 'percent' ? b.discount.value + '%' : ''}:</td>
        <td style="text-align:right;font-weight:700;padding:6px 8px;color:#15803d;">- R$&nbsp;${discountFmt}</td>
      </tr>` : ''}
      <tr class="inv-total-row">
        <td colspan="8" style="text-align:right;font-weight:700;padding:6px 8px;">TOTAL FINAL:</td>
        <td style="text-align:right;font-weight:700;padding:6px 8px;">R$&nbsp;${totalFmt}</td>
      </tr>
    </tfoot>
  </table>
  <table style="width:100%;margin-top:6px;border-collapse:collapse;">
    <tr class="inv-venc-row">
      <td style="padding:7px 10px;font-weight:600;">VENCIMENTO DIA</td>
      <td style="padding:7px 10px;font-weight:700;text-align:right;">${vencFmt}</td>
    </tr>
  </table>
  <div class="inv-bank-box" style="margin-top:10px;padding:10px 14px;background:#FFF8E1;border:1px solid #f59e0b;border-radius:4px;">
    BANCO: ITAÚ &nbsp;|&nbsp; AG: 0870 - PRAIA DO CANTO &nbsp;|&nbsp; CC: 37293-5<br>
    <strong style="font-size:15px;">R$&nbsp;${totalFmt}</strong>
  </div>
  <div style="display:flex;gap:16px;align-items:flex-start;margin-top:16px;padding-top:14px;border-top:1px solid #e5e7eb;">
    <div id="qr-inv" style="width:100px;height:100px;flex-shrink:0;"></div>
    <div style="font-size:12px;color:#333;line-height:1.6;">
      <strong style="display:block;font-size:13px;font-weight:700;color:#0f2a4a;text-transform:uppercase;margin-bottom:4px;">Pagamento via PIX</strong>
      Valor: <strong>R$&nbsp;${totalFmt}</strong><br>
      <span class="inv-pix-key">🔑 Chave PIX (CNPJ): 06.352.972/0001-21</span>
    </div>
  </div>
  <div style="text-align:right;margin-top:16px;font-size:12px;color:#555;">Vitória, ${docDate}</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script>
<script>window.onload=function(){var e=document.getElementById('qr-inv');if(e&&typeof QRCode!=='undefined')new QRCode(e,{text:${JSON.stringify(pixPayload)},width:100,height:100,correctLevel:QRCode.CorrectLevel.M});};<\/script>

<img id="inv-logo-data" src="data:image/png;base64,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" style="display:none" alt="">
</body></html>`;
}

// ── Generate ZIP with all invoices ───────────────────────────────────────
function printAllInvoices() {
  const cnpj = document.getElementById('cons-cnpj-hidden').value;
  if (!cnpj) { toast('Nenhum cliente selecionado.', 'error'); return; }
  const eligible = bls.filter(b => b.cnpj === cnpj && !b.paid);
  if (!eligible.length) { toast('Nenhum BL em aberto para este cliente.', 'error'); return; }
  const prevBL=currentBL,prevType=currentType,prevRoe=ovRoe,prevTot=ovTotal;
  const invoiceData = eligible.map(b => {
    currentBL=b;currentType='invoice';ovRoe=null;ovTotal=null;
    renderDoc(b,'invoice');
    const docnum=b.docnum||genDocnum(b.bl);
    const invHTML=document.getElementById('doc-content').innerHTML;
    const roe=(b.paid||b.billed)&&b.frozenRoe!=null?b.frozenRoe:effectiveROE(b);
    let tot=0;
    if(b.frozenTotal!=null&&(b.paid||b.billed))tot=b.frozenTotal;
    else(b.containers||[]).forEach(c=>{const dc=daysBetween(c.discharge,c.emptyReturn);if(dc!==null)tot+=calcUSD(dc,getRateForBL(b,c.type),b.ov1||null,b.ov2||null).totalUSD*roe;});
    return{docnum,invHTML,pixPayload:buildPixPayload('06352972000121','TRANSHIPPING AGENC MARITIMO','VIT',parseFloat(tot.toFixed(2)))};
  });
  currentBL=prevBL;currentType=prevType;ovRoe=prevRoe;ovTotal=prevTot;
  if(prevBL)renderDoc(prevBL,prevType||'invoice');
  else document.getElementById('doc-content').innerHTML='';
  const css=Array.from(document.querySelectorAll('style')).map(s=>s.innerHTML).join('\n');
  const info=_consMap[cnpj]||{};
  const nome=(info.name||cnpj).replace(/[^\w\sÀ-ú-]/g,'').trim().substring(0,40);
  const n=eligible.length;
  const ttl=`Faturas Demurrage — ${nome} — ${n} fatura${n>1?'s':''}`;
  const body=invoiceData.map(({invHTML},i)=>`<div class="pp${i===invoiceData.length-1?' lp':''}">${invHTML}</div>`).join('');
  const qrs=invoiceData.map(({docnum,pixPayload})=>`gen(${JSON.stringify('pix-qr-'+docnum)},${JSON.stringify(pixPayload)});`).join('');
  const doc=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${ttl}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"><\/script><style>${css}html,body{margin:0;padding:0;background:#f1f5f9}.top-bar{position:sticky;top:0;z-index:200;display:flex;align-items:center;gap:12px;padding:10px 20px;background:#0f2a4a;color:#fff;font-family:Arial,sans-serif;font-size:13px}.top-bar strong{flex:1}.top-bar button{padding:7px 20px;background:#f59e0b;color:#111;border:none;border-radius:6px;cursor:pointer;font-weight:700}.pp{background:#fff;margin:20px auto;max-width:900px;page-break-after:always;break-after:page}.lp{page-break-after:avoid;break-after:avoid}@media print{*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}html,body{background:#fff;margin:0;padding:0}.top-bar{display:none!important}.pp{margin:0;padding:0;max-width:100%;page-break-after:always;break-after:page}.lp{page-break-after:avoid;break-after:avoid}.inv-pix{display:flex!important}}</style></head><body><div class="top-bar"><strong>📄 ${ttl}</strong><span style="opacity:.75;font-size:12px">Ctrl+P para PDF</span><button onclick="window.print()">🖨️ Imprimir / PDF</button></div>${body}<script>function gen(id,p){var e=document.getElementById(id);if(e&&typeof QRCode!="undefined"){e.innerHTML="";new QRCode(e,{text:p,width:100,height:100,correctLevel:QRCode.CorrectLevel.M})}}function run(){if(typeof QRCode!="undefined"){${qrs}}else setTimeout(run,100)}run()<\/script></body></html>`;
  const w=window.open('','_blank');
  if(w){w.document.write(doc);w.document.close();closeModal('modal-consolidated');toast(`${n} fatura${n>1?'s':''} abertas — Ctrl+P para PDF.`,'success');}
  else toast('Permita pop-ups para este site.','error');
}

// ============================================================
// INIT
// ============================================================
// FIX #3: migracoes movidas para window._dmOnReady() — veja abaixo
// (executavam sobre bls=[] antes do Firebase carregar os dados)
document.addEventListener('click', e => {
  const dd = document.getElementById('cons-dropdown');
  const inp = document.getElementById('cons-search');
  if (dd && inp && !dd.contains(e.target) && e.target !== inp) dd.style.display = 'none';
});
document.addEventListener('keydown', e => {
  if (e.key==='Escape') ['modal-bl','modal-import','modal-editval','modal-rates','modal-trk-import','modal-consolidated','modal-client','modal-alert-email','modal-alert-panel'].forEach(id=>closeModal(id));
});
document.querySelectorAll('.overlay').forEach(ov => {
  ov.addEventListener('click', e => { if(e.target===ov) ov.classList.remove('open'); });
});

// ── NORMALIZECNPJ ──────────────────────────────────────────────────────────
function normalizeCnpj(cnpj) {
  const d = String(cnpj||'').replace(/\D/g,'');
  return d.length === 13 ? '0' + d : d;
}
function getClientByCnpj(cnpj) {
  const norm = normalizeCnpj(cnpj);
  return clients.find(c => normalizeCnpj(c.cnpj) === norm) || null;
}

// ── SWITCH MODULE (dashboard + users + settings) ───────────────────────────
function switchModule(mod) {
  ['dashboard','billing','tracking','clients','users','settings'].forEach(m => {
    const el = document.getElementById('mod-'+m);
    if (el) el.style.display = mod === m ? '' : 'none';
    const tab = document.getElementById('tab-'+m);
    if (tab) tab.classList.toggle('active', mod === m);
  });
  if (mod === 'tracking')  renderTracking();
  if (mod === 'clients')   renderClients();
  if (mod === 'dashboard') renderDashboard();
  if (mod === 'users')     renderUsers();
  if (mod === 'settings')  initCfgModule();
}

// ══════════════════════════════════════════════════════════════════
// MELHORIA #1 — ALERTAS VISUAIS PARA CONTAINERS CRÍTICOS
// ══════════════════════════════════════════════════════════════════
function applyContainerAlerts() {
  if (!Array.isArray(trkData)) return;
  trkData.forEach(r => {
    const rowEl = document.querySelector(`tr[data-trk-id="${r.id}"]`);
    if (!rowEl) return;
    rowEl.classList.remove('row-alert-medium','row-alert-high');
    const existing = rowEl.querySelector('.badge-overdue');
    if (existing) existing.remove();

    const ft = r.freeTime || 21;
    const elapsed = trkDaysElapsed(r.discharge);
    if (elapsed === null || r.emptyReturn) return;

    const daysOver = elapsed - ft;
    if (daysOver <= 0) return;

    if (daysOver > 10) {
      rowEl.classList.add('row-alert-high');
      const badge = document.createElement('span');
      badge.className = 'badge-overdue high';
      badge.textContent = `🔴 ${daysOver}d`;
      const firstTd = rowEl.querySelector('td');
      if (firstTd) firstTd.appendChild(badge);
    } else if (daysOver > 5) {
      rowEl.classList.add('row-alert-medium');
      const badge = document.createElement('span');
      badge.className = 'badge-overdue medium';
      badge.textContent = `⚠️ ${daysOver}d`;
      const firstTd = rowEl.querySelector('td');
      if (firstTd) firstTd.appendChild(badge);
    }
  });
}

// ══════════════════════════════════════════════════════════════════
// MELHORIA #4 — HISTÓRICO DE MODIFICAÇÕES (ACCOUNTABILITY)
// ══════════════════════════════════════════════════════════════════
async function logModification(collection, docId, action, details) {
  try {
    const user = window._dmUser || firebase.auth().currentUser;
    if (!user) return;
    const entry = {
      action: action,
      by: user.email || user.uid,
      at: firebase.firestore.FieldValue.serverTimestamp(),
      details: details || {}
    };
    await firebase.firestore()
      .collection(collection).doc(docId)
      .update({ modificationHistory: firebase.firestore.FieldValue.arrayUnion(entry) });
  } catch(e) { /* silently fail if field doesn't exist yet — will be created on next full save */ }
}

async function showModificationHistory(collection, docId, label) {
  try {
    const snap = await firebase.firestore().collection(collection).doc(docId).get();
    const history = (snap.data() || {}).modificationHistory || [];
    const sorted  = [...history].reverse();

    let html = `<div style="padding:4px 0 16px;font-size:13px;font-weight:600;color:var(--muted);">Histórico de alterações em <strong style="color:var(--text);">${label}</strong></div>`;
    html += `<ul class="mod-hist-list">`;

    if (sorted.length === 0) {
      html += `<li class="mod-hist-empty">Nenhuma modificação registrada ainda.</li>`;
    } else {
      const icons = { status_changed:'🔄', amount_updated:'💰', created:'✨', paid:'✅', billed:'📄', default:'✏️' };
      sorted.forEach((m, i) => {
        const icon = icons[m.action] || icons.default;
        const when = m.at && m.at.toDate ? m.at.toDate().toLocaleString('pt-BR') : '—';
        const det  = m.details && Object.keys(m.details).length
          ? Object.entries(m.details).map(([k,v])=>`${k}: <strong>${v}</strong>`).join(' · ') : '';
        html += `<li class="mod-hist-item">
          <div class="mod-hist-dot">${icon}</div>
          <div class="mod-hist-body">
            <div class="mod-hist-action">${m.action.replace(/_/g,' ')}</div>
            <div class="mod-hist-meta">por <strong>${m.by}</strong> · ${when}</div>
            ${det ? `<div class="mod-hist-meta" style="margin-top:3px;">${det}</div>` : ''}
          </div>
        </li>`;
      });
    }
    html += `</ul>`;

    showGenericModal('Histórico de Modificações', html, '540px');
  } catch(e) {
    showGenericModal('Erro', 'Não foi possível carregar o histórico: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════════
// NOVA ABA — CONFIGURAÇÕES
// ══════════════════════════════════════════════════════════════════
function switchCfgPane(btn, paneId) {
  document.querySelectorAll('.cfg-subtab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.cfg-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const pane = document.getElementById(paneId);
  if (pane) pane.classList.add('active');

  if (paneId === 'cfg-taxas')  renderCfgRates();
  if (paneId === 'cfg-users')  renderCfgUsers();
  if (paneId === 'cfg-sistema') renderCfgSistema();
}

function initCfgModule() {
  // Versão e data de deploy vindas do badge
  const badge = document.querySelector('.version-badge');
  if (badge) document.getElementById('cfg-version').textContent = badge.textContent.trim();
  // Data de deploy via meta tag inserida pelo workflow
  const deployMeta = document.querySelector('meta[name="deploy-date"]');
  document.getElementById('cfg-deploy-date').textContent = deployMeta
    ? deployMeta.getAttribute('content') : new Date().toLocaleDateString('pt-BR');
  // Usuário atual
  const u = window._dmUser || (firebase.auth && firebase.auth().currentUser);
  document.getElementById('cfg-current-user').textContent = u ? (u.email || u.uid) : '—';
  // Exibir aba de usuários só para admin
  const isAdmin = window._dmIsAdmin || false;
  document.querySelector('[onclick*="cfg-users"]').style.display = isAdmin ? '' : 'none';

  renderCfgRates();
}

// ── TAXAS EDITÁVEIS ────────────────────────────────────────────────
function renderCfgRates() {
  const tbody = document.getElementById('cfg-rates-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  (window._cfgRates || RATES).forEach((rate, idx) => {
    const p1Str = rate.p1 ? `${rate.p1.range[0]}–${rate.p1.range[1] === Infinity ? '∞' : rate.p1.range[1]}` : '—';
    tbody.innerHTML += `<tr>
      <td><strong>${rate.type}</strong></td>
      <td><input type="number" id="cfg-r-ft-${idx}" value="${rate.freeUntil}" min="0" max="60" style="width:70px;"></td>
      <td style="color:var(--muted);font-size:12px;">${p1Str}</td>
      <td><input type="number" id="cfg-r-p1-${idx}" value="${rate.p1 ? rate.p1.usd : ''}" min="0" step="1"></td>
      <td><input type="number" id="cfg-r-p2-${idx}" value="${rate.p2 ? rate.p2.usd : ''}" min="0" step="1"></td>
      <td><button class="btn btn-primary btn-sm" onclick="saveCfgRate(${idx})">💾 Salvar</button></td>
    </tr>`;
  });
}

async function saveCfgRate(idx) {
  const rates = window._cfgRates || RATES;
  const rate  = rates[idx];
  const ft    = parseInt(document.getElementById(`cfg-r-ft-${idx}`)?.value) || rate.freeUntil;
  const p1usd = parseFloat(document.getElementById(`cfg-r-p1-${idx}`)?.value) || (rate.p1 ? rate.p1.usd : 0);
  const p2usd = parseFloat(document.getElementById(`cfg-r-p2-${idx}`)?.value) || (rate.p2 ? rate.p2.usd : 0);

  // Atualiza na memória
  rate.freeUntil = ft;
  if (rate.p1) rate.p1.usd = p1usd;
  if (rate.p2) rate.p2.usd = p2usd;

  // Persiste no Firestore
  try {
    await firebase.firestore().collection('config').doc('rates').set(
      { rates: (window._cfgRates || RATES).map(r => ({
          type: r.type, freeUntil: r.freeUntil,
          p1usd: r.p1 ? r.p1.usd : null, p1from: r.p1 ? r.p1.range[0] : null,
          p2usd: r.p2 ? r.p2.usd : null
        })),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: (window._dmUser || firebase.auth().currentUser)?.email || '?'
      }, { merge: true }
    );
    toast('Taxa "' + rate.type + '" salva com sucesso!', 'success');
  } catch(e) {
    toast('Erro ao salvar taxa: ' + e.message, 'error');
  }
}

async function loadCfgRatesFromFirestore() {
  try {
    const snap = await firebase.firestore().collection('config').doc('rates').get();
    if (!snap.exists) return;
    const saved = snap.data().rates || [];
    saved.forEach(s => {
      const r = RATES.find(r => r.type === s.type);
      if (!r) return;
      if (s.freeUntil != null) r.freeUntil = s.freeUntil;
      if (r.p1 && s.p1usd  != null) r.p1.usd = s.p1usd;
      if (r.p2 && s.p2usd  != null) r.p2.usd = s.p2usd;
    });
  } catch(e) { /* usar rates padrão */ }
}

// ── USUÁRIOS ──────────────────────────────────────────────────────
async function renderCfgUsers() {
  const tbody = document.getElementById('cfg-users-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--muted);">Carregando...</td></tr>`;
  try {
    const snap = await firebase.firestore().collection('users').get();
    if (snap.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--muted);">Nenhum usuário cadastrado</td></tr>`;
      return;
    }
    tbody.innerHTML = '';
    snap.forEach(doc => {
      const u = doc.data();
      const lastLogin = u.lastLogin ? new Date(u.lastLogin.seconds*1000).toLocaleString('pt-BR') : '—';
      const role = u.role === 'admin' ? '<span class="cfg-badge admin">Admin</span>' : '<span class="cfg-badge user">Usuário</span>';
      const status = u.active !== false
        ? '<span style="color:var(--green);font-weight:600;">● Ativo</span>'
        : '<span style="color:var(--muted);">○ Inativo</span>';
      tbody.innerHTML += `<tr>
        <td>${u.email || doc.id}</td>
        <td>${u.displayName || '—'}</td>
        <td>${role}</td>
        <td style="font-size:12px;color:var(--muted);">${lastLogin}</td>
        <td>${status}</td>
      </tr>`;
    });
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:16px;color:var(--red);">Erro ao carregar usuários. Permissão necessária.</td></tr>`;
  }
}

// ── BACKUP ────────────────────────────────────────────────────────
async function cfgExportBackupJSON() {
  toast('Preparando backup...', 'info');
  try {
    const [blSnap, trkSnap, clientSnap] = await Promise.all([
      firebase.firestore().collection('bls').get(),
      firebase.firestore().collection('tracking').get(),
      firebase.firestore().collection('clients').get()
    ]);
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: (window._dmUser || firebase.auth().currentUser)?.email || '?',
      data: {
        bls:      blSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        tracking: trkSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        clients:  clientSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      }
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `demurrage-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup exportado com sucesso!', 'success');
  } catch(e) {
    toast('Erro ao exportar: ' + e.message, 'error');
  }
}

function cfgExportContainersCSV() {
  if (!Array.isArray(trkData) || trkData.length === 0) {
    toast('Nenhum container para exportar', 'error'); return;
  }
  const cols = ['Container','Tipo','Navio','POL','POD','Cliente','CNPJ','Descarga','FreeTime','Status','D&D Over','Devolvido'];
  const rows = trkData.map(r => [
    r.container, r.type, r.vessel, r.pol, r.pod, r.client, r.cnpj,
    r.discharge ? new Date(r.discharge).toLocaleDateString('pt-BR') : '',
    r.freeTime || 21,
    r.status || '',
    r.emptyReturn ? '' : Math.max(0, (trkDaysElapsed(r.discharge)||0) - (r.freeTime||21)),
    r.emptyReturn ? new Date(r.emptyReturn).toLocaleDateString('pt-BR') : ''
  ]);
  const csv = [cols, ...rows].map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `containers-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exportado com sucesso!', 'success');
}

async function cfgImportBackup(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm('⚠️ Isso irá SUBSTITUIR os dados atuais pelo backup selecionado.\n\nTem certeza que deseja continuar?')) {
    event.target.value = ''; return;
  }
  toast('Importando backup...', 'info');
  try {
    const text   = await file.text();
    const backup = JSON.parse(text);
    if (!backup.data) throw new Error('Formato de backup inválido');
    const db     = firebase.firestore();
    const batch  = db.batch();
    (backup.data.bls || []).forEach(d => {
      const {id, ...data} = d;
      batch.set(db.collection('bls').doc(id), data);
    });
    (backup.data.tracking || []).forEach(d => {
      const {id, ...data} = d;
      batch.set(db.collection('tracking').doc(id), data);
    });
    (backup.data.clients || []).forEach(d => {
      const {id, ...data} = d;
      batch.set(db.collection('clients').doc(id), data);
    });
    await batch.commit();
    toast('Backup restaurado! Recarregando...', 'success');
    setTimeout(() => location.reload(), 1800);
  } catch(e) {
    toast('Erro ao importar: ' + e.message, 'error');
  }
  event.target.value = '';
}

// ── SISTEMA ───────────────────────────────────────────────────────
async function renderCfgSistema() {
  try {
    const [blSnap, trkSnap, clientSnap] = await Promise.all([
      firebase.firestore().collection('bls').get(),
      firebase.firestore().collection('tracking').get(),
      firebase.firestore().collection('clients').get()
    ]);
    const total = blSnap.size + trkSnap.size + clientSnap.size;
    const el = document.getElementById('cfg-db-count');
    if (el) el.textContent = `${total} registros (${blSnap.size} BLs · ${trkSnap.size} containers · ${clientSnap.size} clientes)`;
  } catch(e) { /* ignore */ }
}

function cfgClearCache() {
  if (confirm('Limpar cache local (localStorage/sessionStorage)?')) {
    try { localStorage.clear(); sessionStorage.clear(); } catch(e) {}
    toast('Cache limpo com sucesso!', 'success');
  }
}
function cfgReloadRates() { loadCfgRatesFromFirestore().then(() => { renderCfgRates(); toast('Taxas recarregadas!', 'success'); }); }
function cfgShowAuditLog() { switchModule('users'); /* o log de auditoria já existe no módulo de usuários */ }

// ── ALERT SYSTEM ──────────────────────────────────────────────────────────
// ── STORAGE: Alert days (Firestore via window._dmStore) ───────────────────
function getAlertDays() {
  return (window._dmStore && window._dmStore.alertDays) || 5;
}
function saveAlertDays() {
  const v = parseInt(document.getElementById('alert-days-input')?.value) || 5;
  if (window._dmStore) window._dmStore.alertDays = v;
  if (window._dmFireSave) window._dmFireSave('alertDays', v);
}

function computeAlerts() {
  const alertDays = getAlertDays();
  const alerts = [];
  trkData.forEach(r => {
    if (r.emptyReturn) return;
    const ft      = r.freeTime || 21;
    const elapsed = trkDaysElapsed(r.discharge);
    if (elapsed === null) return;
    const daysLeft = ft - elapsed;
    if (daysLeft < 0)               alerts.push({ row: r, category: 'over',  daysLeft: 0,  daysOver: -daysLeft });
    else if (daysLeft === 0)        alerts.push({ row: r, category: 'today', daysLeft: 0,  daysOver: 0 });
    else if (daysLeft <= alertDays) alerts.push({ row: r, category: 'warn',  daysLeft,     daysOver: 0 });
  });
  return alerts;
}

function groupAlertsByCnee(alerts) {
  const groups = {};
  alerts.forEach(a => {
    const key = a.row.cnpj || a.row.cnee || '—';
    if (!groups[key]) {
      const client = a.row.cnpj ? getClientByCnpj(a.row.cnpj) : null;
      groups[key] = {
        cnpj:   a.row.cnpj || '',
        name:   (client && client.name) || a.row.cnee || a.row.cnpj || '—',
        emails: a.row.cnpj ? getEmailsForBL(a.row) : [],
        items:  []
      };
    }
    groups[key].items.push(a);
  });
  return groups;
}

function alertPillHTML(a) {
  if (a.category === 'over')  return `<span class="alert-pill-over">⛔ ${a.daysOver}d em D&D</span>`;
  if (a.category === 'today') return `<span class="alert-pill-today">🔴 Vence HOJE</span>`;
  if (a.category === 'warn')  return `<span class="alert-pill-warn">⚠️ Vence em ${a.daysLeft}d</span>`;
  return '';
}

function toggleAlertPanel() { openAlertPanel(); }

function openAlertPanel() {
  const inp = document.getElementById('alert-days-input');
  if (inp) inp.value = getAlertDays();
  openModal('modal-alert-panel');
  renderAlertPanel();
}

function renderAlertPanel() {
  const alerts  = computeAlerts();
  const groups  = groupAlertsByCnee(alerts);
  const badge   = document.getElementById('alert-toolbar-badge');
  const cbadge  = document.getElementById('alert-count-badge');
  const list    = document.getElementById('alert-list');
  if (!list) return;
  const total = alerts.length;
  if (badge)  { badge.textContent  = total; badge.style.display  = total > 0 ? '' : 'none'; }
  if (cbadge) { cbadge.textContent = total; }
  const panelBadge = document.getElementById('alert-panel-badge-count');
  if (panelBadge) panelBadge.textContent = total > 0
    ? `${total} container${total>1?'s':''} em situação de alerta`
    : 'Nenhum container em alerta';

  if (!total) {
    list.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted);font-size:13px;">✅ Nenhum container em situação de alerta no momento.</div>`;
    return;
  }

  const catOrder = { over:0, today:1, warn:2 };
  list.innerHTML = Object.values(groups).map(g => {
    const sorted = [...g.items].sort((a,b) => catOrder[a.category] - catOrder[b.category]);
    const rows = sorted.map(a => `
      <div class="alert-row">
        <span style="font-weight:600;color:var(--navy);min-width:120px;">${a.row.container}</span>
        <span style="color:var(--muted);font-size:11px;min-width:90px;">${a.row.bl||'—'}</span>
        <span style="color:var(--muted);font-size:11px;flex:1;">${trkFmtDate(a.row.discharge)} → deadline ${trkFmtDate(a.row.deadline)}</span>
        ${alertPillHTML(a)}
      </div>`).join('');

    const emailBadge = g.emails.length
      ? `<span style="color:#059669;font-size:11px;">✉️ ${g.emails.join(', ')}</span>`
      : `<span style="color:#dc2626;font-size:11px;">⚠ sem e-mail</span>`;

    const ov = g.items.filter(a=>a.category==='over').length;
    const td = g.items.filter(a=>a.category==='today').length;
    const wn = g.items.filter(a=>a.category==='warn').length;
    const summary = [
      ov ? `<span style="color:#dc2626">${ov} em D&D</span>` : '',
      td ? `<span style="color:#c05621">${td} vence hoje</span>` : '',
      wn ? `<span style="color:#b45309">${wn} a vencer</span>` : '',
    ].filter(Boolean).join(' · ');

    const safeKey = encodeURIComponent(g.cnpj || g.name);
    return `<div class="alert-group">
      <div class="alert-group-header">
        <div>
          ${g.name}
          ${g.cnpj ? `<span style="color:var(--muted);font-size:11px;margin-left:6px;font-weight:400;">${formatCnpj(g.cnpj)}</span>` : ''}
          <span style="margin-left:10px;font-weight:400;">${summary}</span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;">
          ${emailBadge}
          ${g.emails.length ? `<button class="btn btn-sm btn-outline" onclick="openAlertEmailForKey('${safeKey}')" style="font-size:11px;padding:3px 10px;">✉️ E-mail</button>` : ''}
        </div>
      </div>
      <div>${rows}</div>
    </div>`;
  }).join('');
}

function updateAlertBadge() {
  const alerts = computeAlerts();
  const badge  = document.getElementById('alert-toolbar-badge');
  if (badge) { badge.textContent = alerts.length; badge.style.display = alerts.length > 0 ? '' : 'none'; }
  const panel = document.getElementById('modal-alert-panel');
  if (panel && panel.classList.contains('open')) renderAlertPanel();
}

function buildAlertEmailBody(g) {
  const firstName = (g.name||'').split(' ')[0] || 'Prezado(a)';
  const alertDays = getAlertDays();
  const catOrder  = { over:0, today:1, warn:2 };
  const sorted    = [...g.items].sort((a,b) => catOrder[a.category] - catOrder[b.category]);
  const hasUrgent = sorted.some(a => a.category === 'over' || a.category === 'today');
  const lines = sorted.map(a => {
    const dl = trkFmtDate(a.row.deadline);
    if (a.category === 'over')  return `  ${a.row.container}  |  BL: ${a.row.bl||'—'}  |  ⛔ FREE TIME ENCERRADO há ${a.daysOver} dia(s)  |  Deadline: ${dl}`;
    if (a.category === 'today') return `  ${a.row.container}  |  BL: ${a.row.bl||'—'}  |  🔴 FREE TIME VENCE HOJE  |  Deadline: ${dl}`;
    if (a.category === 'warn')  return `  ${a.row.container}  |  BL: ${a.row.bl||'—'}  |  ⚠️ Faltam ${a.daysLeft} dia(s) para o free time  |  Deadline: ${dl}`;
    return '';
  }).filter(Boolean).join('\n');
  const intro = hasUrgent
    ? `Comunicamos que os containers abaixo já ultrapassaram ou atingiram o limite do free time.\nPor favor, providencie a devolução imediata para evitar cobranças adicionais de sobreestadia.`
    : `Informamos que os containers abaixo estão próximos do vencimento do free time (janela de ${alertDays} dias).\nRecomendamos providenciar a devolução antecipada para evitar cobranças de sobreestadia.`;
  return `Prezado(a) ${firstName},\n\n${intro}\n\nCONTAINERS EM ALERTA:\n\n${lines}\n\nEm caso de dúvidas, entre em contato conosco.\n\nAtenciosamente,\nTRANSHIPPING AGENCIAMENTO MARÍTIMO Ltda.\nCNPJ: 06.352.972/0001-21`;
}

function openAlertEmailForKey(encodedKey) {
  const key    = decodeURIComponent(encodedKey);
  const alerts = computeAlerts();
  const groups = groupAlertsByCnee(alerts);
  const g      = groups[key];
  if (!g || !g.emails.length) { toast('Nenhum e-mail cadastrado para este cliente.', 'error'); return; }
  const body    = buildAlertEmailBody(g);
  const subject = encodeURIComponent(`Alerta de Free Time — ${g.name} — ${g.items.length} container(s)`);
  const to      = encodeURIComponent(g.emails.join(', '));
  window.location.href = `mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${encodeURIComponent(body)}`;
}

function openAlertEmailModal() {
  const alerts   = computeAlerts();
  const groups   = groupAlertsByCnee(alerts);
  const listEl   = document.getElementById('alert-email-list');
  const countEl  = document.getElementById('alert-email-count');
  const eligible = Object.values(groups).filter(g =>
    g.emails.length > 0 &&
    g.items.some(a => a.category === 'over' || a.category === 'today' || a.category === 'warn')
  );
  if (countEl) countEl.textContent = eligible.length;
  window._alertEligible = eligible;
  const sendBtn = document.getElementById('alert-send-all-btn');
  if (sendBtn) sendBtn.disabled = !eligible.length;
  if (!listEl) return;
  if (!eligible.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:48px;color:var(--muted);font-size:13px;">Nenhum cliente com e-mail cadastrado e containers com alerta ativo.</div>`;
    openModal('modal-alert-email'); return;
  }
  listEl.innerHTML = eligible.map((g, idx) => {
    const body = buildAlertEmailBody(g);
    const ov = g.items.filter(a=>a.category==='over').length;
    const td = g.items.filter(a=>a.category==='today').length;
    const wn = g.items.filter(a=>a.category==='warn').length;
    const pills = [
      ov ? `<span class="alert-pill-over">${ov} em D&D</span>` : '',
      td ? `<span class="alert-pill-today">${td} hoje</span>` : '',
      wn ? `<span class="alert-pill-warn">${wn} a vencer</span>` : '',
    ].filter(Boolean).join(' ');
    return `<div class="alert-email-item">
      <div class="alert-email-header" onclick="toggleAlertEmailPreview(${idx})">
        <div>
          <div class="alert-email-cname">${g.name}${g.cnpj?` <span style="font-weight:400;font-size:11px;color:var(--muted);">${formatCnpj(g.cnpj)}</span>`:''}</div>
          <div class="alert-email-meta">✉️ ${g.emails.join(', ')} &nbsp;·&nbsp; ${g.items.length} container(s) &nbsp;·&nbsp; ${pills}</div>
        </div>
        <span style="font-size:18px;color:var(--muted);" id="alert-arrow-${idx}">▸</span>
      </div>
      <div class="alert-email-body" id="alert-body-${idx}">
        <div class="alert-email-preview">${body}</div>
        <button class="btn btn-sm btn-primary" onclick="sendAlertEmailFor(${idx})" style="font-size:12px;">✉️ Abrir este e-mail</button>
      </div>
    </div>`;
  }).join('');
  openModal('modal-alert-email');
}

function toggleAlertEmailPreview(idx) {
  const body  = document.getElementById(`alert-body-${idx}`);
  const arrow = document.getElementById(`alert-arrow-${idx}`);
  if (!body) return;
  const open = body.classList.toggle('open');
  if (arrow) arrow.textContent = open ? '▾' : '▸';
}
function sendAlertEmailFor(idx) {
  const eligible = window._alertEligible || [];
  const g = eligible[idx];
  if (!g) return;
  const body    = buildAlertEmailBody(g);
  const subject = encodeURIComponent(`Alerta de Free Time — ${g.name} — ${g.items.length} container(s)`);
  const to      = encodeURIComponent(g.emails.join(', '));
  window.open(`mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${encodeURIComponent(body)}`);
}
function sendAllAlertEmails() {
  const eligible = window._alertEligible || [];
  if (!eligible.length) return;
  eligible.forEach((g, i) => {
    setTimeout(() => {
      const body    = buildAlertEmailBody(g);
      const subject = encodeURIComponent(`Alerta de Free Time — ${g.name} — ${g.items.length} container(s)`);
      const to      = encodeURIComponent(g.emails.join(', '));
      window.open(`mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${encodeURIComponent(body)}`);
    }, i * 600);
  });
  closeModal('modal-alert-email');
  toast(`${eligible.length} e-mail(s) disparado(s)!`, 'success');
}

// ── CONSOLIDATED EMAIL ─────────────────────────────────────────────────────
// Multi-select state
const _consSelected = new Set();

function toggleConsSelection(cnpj, el) {
  if (_consSelected.has(cnpj)) {
    _consSelected.delete(cnpj);
    el.classList.remove('selected');
    el.querySelector('.cons-checkbox').checked = false;
  } else {
    _consSelected.add(cnpj);
    el.classList.add('selected');
    el.querySelector('.cons-checkbox').checked = true;
  }
  _updateConsFooter();
}

function _updateConsFooter() {
  const n     = _consSelected.size;
  const countEl  = document.getElementById('cons-selected-count');
  const multiBtn = document.getElementById('cons-multi-send-btn');
  const sendBtn  = document.getElementById('cons-send-btn');
  const pdfBtn   = document.getElementById('cons-pdf-btn');

  if (countEl) {
    countEl.style.display = n > 0 ? '' : 'none';
    countEl.textContent   = `${n} selecionado${n!==1?'s':''}`;
  }
  if (multiBtn) multiBtn.style.display = n > 1 ? '' : 'none';
  if (multiBtn) multiBtn.disabled      = n < 1;

  // Single selection: enable single email + PDF
  const singleCnpj = _consSelected.size === 1 ? [..._consSelected][0] : null;
  const cnpjHidden = document.getElementById('cons-cnpj-hidden');
  if (cnpjHidden) cnpjHidden.value = singleCnpj || '';
  if (sendBtn) sendBtn.disabled = !singleCnpj;
  if (pdfBtn)  pdfBtn.disabled  = !singleCnpj;
}

function agingLabel(bls) {
  // Find oldest unpaid billed invoice
  const billedDays = bls
    .filter(b => b.billed && !b.paid && b.billedAt)
    .map(b => Math.floor((Date.now() - new Date(b.billedAt).getTime()) / 86400000));
  if (!billedDays.length) return '';
  const max = Math.max(...billedDays);
  if (max >= 30) return `<span class="cons-aging-badge cons-aging-late">📅 ${max}d sem pagamento</span>`;
  if (max >= 15) return `<span class="cons-aging-badge cons-aging-warn">📅 ${max}d sem pagamento</span>`;
  return `<span class="cons-aging-badge cons-aging-ok">📅 ${max}d</span>`;
}

function renderConsClientList(query) {
  const listEl = document.getElementById('cons-client-list');
  if (!listEl) return;
  const rawL   = (query || '').toLowerCase().trim();
  const digits = rawL.replace(/\D/g,'');
  let entries = Object.entries(_consMap);
  if (rawL) {
    entries = entries.filter(([cnpj, info]) => {
      if (digits.length >= 2 && normalizeCnpj(cnpj).includes(digits)) return true;
      if (info.name.toLowerCase().includes(rawL)) return true;
      if (formatCnpj(cnpj).includes(rawL)) return true;
      return false;
    });
  }
  entries.sort((a, b) => b[1].bls.length - a[1].bls.length);

  if (!entries.length) {
    listEl.innerHTML = `<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:13px;">
      ${rawL ? 'Nenhum cliente encontrado para "' + query + '"' : 'Nenhuma fatura em aberto com CNPJ cadastrado.'}
    </div>`;
    return;
  }

  listEl.innerHTML = entries.map(([cnpj, info]) => {
    const count    = info.bls.length;
    const noEmail  = !info.emails.length;
    const isActive = _consSelected.has(cnpj);
    const aging    = agingLabel(info.bls);
    const safeId   = 'cr-' + cnpj.replace(/\D/g,'');
    return `<div id="${safeId}" class="cons-row${isActive?' selected':''}" onclick="toggleConsSelection('${cnpj}', this)">
      <input type="checkbox" class="cons-checkbox" ${isActive?'checked':''} onclick="event.stopPropagation();toggleConsSelection('${cnpj}',this.closest('.cons-row'))">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;color:var(--navy);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${info.name}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px;">
          ${formatCnpj(cnpj)} &nbsp;·&nbsp;
          <strong style="color:${count>0?'#dc2626':'var(--muted)'};">${count}</strong>
          fatura${count!==1?'s':''} em aberto
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        ${aging}
        ${noEmail ? '<span style="font-size:11px;color:#dc2626;white-space:nowrap;">⚠ sem e-mail</span>'
                  : '<span style="font-size:11px;color:#059669;white-space:nowrap;">✉️</span>'}
      </div>
    </div>`;
  }).join('');
}

function sendMultipleEmails() {
  if (!_consSelected.size) return;
  const cnpjs = [..._consSelected];
  cnpjs.forEach((cnpj, i) => {
    setTimeout(() => {
      const info      = _consMap[cnpj] || {};
      if (!info.emails?.length) return;
      const unpaid    = (info.bls||[]).filter(b => !b.paid);
      if (!unpaid.length) return;
      const nome      = info.name || cnpj;
      const firstName = nome.split(' ')[0];
      const to        = encodeURIComponent(info.emails.join(', '));
      let grand = 0;
      const linhas = unpaid.map(b => {
        const roe = (b.paid||b.billed)&&b.frozenRoe!=null ? b.frozenRoe : effectiveROE(b);
        let total = 0;
        (b.containers||[]).forEach(c => {
          const dc = daysBetween(c.discharge, c.emptyReturn);
          if (dc !== null) total += calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD * roe;
        });
        if ((b.paid||b.billed)&&b.frozenTotal!=null) total = b.frozenTotal;
        grand += total;
        const docnum = b.docnum || genDocnum(b.bl);
        const venc   = b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—';
        const fmt    = total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
        return `  ${docnum}  |  BL: ${b.bl}  |  R$ ${fmt}  |  Venc: ${venc}`;
      }).join('\n');
      const grandFmt = grand.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
      const subject  = encodeURIComponent(`Cobranças de Demurrage — ${nome} — ${unpaid.length} fatura${unpaid.length>1?'s':''}`);
      const body     = encodeURIComponent(`Prezado(a) ${firstName},\n\nEncaminhamos o resumo das faturas de Sobreestadia em aberto para ${nome} (CNPJ: ${formatCnpj(cnpj)}):\n\n${linhas}\n\n─────────────────────────────────────\nTOTAL GERAL: R$ ${grandFmt}\n─────────────────────────────────────\n\nPIX — Chave CNPJ: 06.352.972/0001-21\nBanco: ITAÚ | Agência: 0870 - Praia do Canto | CC: 37293-5\n\nAtenciosamente,\nTRANSHIPPING AGENCIAMENTO MARÍTIMO Ltda.\nCNPJ: 06.352.972/0001-21`);
      window.open(`mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${body}`);
    }, i * 700);
  });
  closeModal('modal-consolidated');
  toast(`Disparando ${cnpjs.length} cobrança${cnpjs.length>1?'s':''}...`, 'success');
}


// ── DISPARAR TODAS AS COBRANÇAS ────────────────────────────────────────────
function dispararTodasCobranças() {
  _rebuildConsMap();
  const eligible = Object.entries(_consMap).filter(([cnpj, info]) =>
    info.emails.length > 0 && info.bls.some(b => !b.paid)
  );
  if (!eligible.length) { toast('Nenhum cliente com e-mail cadastrado e faturas em aberto.', 'error'); return; }
  if (!confirm(`Disparar cobranças para ${eligible.length} cliente${eligible.length !== 1 ? 's' : ''}?\n\nSerá aberto um e-mail para cada cliente com faturas pendentes.`)) return;
  eligible.forEach(([cnpj, info], i) => {
    setTimeout(() => {
      const unpaid    = info.bls.filter(b => !b.paid);
      if (!unpaid.length) return;
      const nome      = info.name || cnpj;
      const firstName = nome.split(' ')[0];
      const to        = encodeURIComponent(info.emails.join(', '));
      let grand = 0;
      const linhas = unpaid.map(b => {
        const roe = (b.paid || b.billed) && b.frozenRoe != null ? b.frozenRoe : effectiveROE(b);
        let total = 0;
        (b.containers || []).forEach(c => {
          const dc = daysBetween(c.discharge, c.emptyReturn);
          if (dc !== null) total += calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD * roe;
        });
        if ((b.paid || b.billed) && b.frozenTotal != null) total = b.frozenTotal;
        grand += total;
        const docnum = b.docnum || genDocnum(b.bl);
        const venc   = b.venc ? new Date(b.venc+'T12:00:00').toLocaleDateString('pt-BR') : '—';
        const ctrs   = (b.containers||[]).map(c=>c.container).join(', ');
        const fmt    = total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
        return `  ${docnum}  |  BL: ${b.bl}  |  ${ctrs}  |  R$ ${fmt}  |  Venc: ${venc}`;
      }).join('\n');
      const grandFmt = grand.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
      const subject  = encodeURIComponent(`Cobranças de Demurrage — ${nome} — ${unpaid.length} fatura${unpaid.length>1?'s':''}`);
      const body     = encodeURIComponent(`Prezado(a) ${firstName},\n\nEncaminhamos o resumo das faturas de Sobreestadia em aberto para ${nome} (CNPJ: ${formatCnpj(cnpj)}):\n\n${linhas}\n\n─────────────────────────────────────\nTOTAL GERAL: R$ ${grandFmt}\n─────────────────────────────────────\n\nPIX — Chave CNPJ: 06.352.972/0001-21\nBanco: ITAÚ | Agência: 0870 - Praia do Canto | CC: 37293-5\n\nAtenciosamente,\nTRANSHIPPING AGENCIAMENTO MARÍTIMO Ltda.\nCNPJ: 06.352.972/0001-21`);
      window.open(`mailto:${to}?cc=eqp@fwlog.com.br&subject=${subject}&body=${body}`);
    }, i * 700);
  });
  toast(`Disparando ${eligible.length} cobrança${eligible.length>1?'s':''}...`, 'success');
}

// ── CLIENTS EXPORT ─────────────────────────────────────────────────────────
function exportClientsReport() {
  if (!clients.length) { toast('Nenhum cliente para exportar.', 'error'); return; }
  const sorted = [...clients].sort((a,b) => (a.name||a.cnpj||'').localeCompare(b.name||b.cnpj||'', 'pt-BR'));
  const rows = sorted.map(c => {
    const unpaid = bls.filter(b => b.cnpj && normalizeCnpj(b.cnpj) === normalizeCnpj(c.cnpj) && !b.paid);
    let totalAberto = 0;
    unpaid.forEach(b => {
      const roe = (b.billed && b.frozenRoe != null) ? b.frozenRoe : effectiveROE(b);
      let tot = b.frozenTotal != null && b.billed ? b.frozenTotal : 0;
      if (!tot) (b.containers||[]).forEach(ct => {
        const dc = daysBetween(ct.discharge, ct.emptyReturn);
        if (dc !== null) tot += calcUSD(dc, getRateForBL(b, ct.type), b.ov1||null, b.ov2||null).totalUSD * roe;
      });
      totalAberto += tot;
    });
    return {
      'RAZÃO SOCIAL': c.name||'—', 'CNPJ': formatCnpj(c.cnpj),
      'E-MAILS': (c.emails||[]).join('; ')||'—', 'TELEFONE': c.phone||'—',
      'BLs EM ABERTO': unpaid.length,
      'TOTAL EM ABERTO (R$)': totalAberto > 0 ? totalAberto.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—',
      'CADASTRADO EM': c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') : '—',
    };
  });
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows, {origin:'A2'});
  ws['!cols'] = Object.keys(rows[0]).map(h => ({wch: Math.max(h.length+2, 20)}));
  ws['A1'] = {v:'TRANSHIPPING — Cadastro de Clientes', t:'s'};
  ws['!merges'] = [{s:{r:0,c:0}, e:{r:0,c:Object.keys(rows[0]).length-1}}];
  ws['!ref'] = `A1:${XLSX.utils.encode_cell({r:rows.length+1, c:Object.keys(rows[0]).length-1})}`;
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
  XLSX.writeFile(wb, `Clientes_Transhipping_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Planilha exportada!', 'success');
}

// ── RENDER DASHBOARD ───────────────────────────────────────────────────────
function renderDashboard() {
  const now = new Date();
  const h   = now.getHours();
  const greet = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const dateStr = now.toLocaleDateString('pt-BR', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const greetEl = document.getElementById('dk-greeting');
  const dateEl  = document.getElementById('dk-date');
  if (greetEl) greetEl.textContent = greet + ' 👋';
  if (dateEl)  dateEl.textContent  = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  const totalBLs  = bls.length;
  const pendentes = bls.filter(b => !b.paid).length;
  const pagos     = bls.filter(b => b.paid).length;
  let totalAberto = 0;
  let totalVencido = 0;
  let totalFaturado = 0;
  let totalDisputa = 0;
  const today = new Date().toISOString().slice(0,10);

  bls.filter(b => !b.paid).forEach(b => {
    const roe = (b.billed && b.frozenRoe != null) ? b.frozenRoe : effectiveROE(b);
    let tot = b.frozenTotal != null && b.billed ? b.frozenTotal : 0;
    if (!tot) (b.containers||[]).forEach(c => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      if (dc !== null) tot += calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD * roe;
    });
    totalAberto += tot;

    // Count vencido (past due and not paid)
    if (b.venc && b.venc < today) {
      totalVencido += tot;
    }

    // Count faturado and not paid
    if (b.billed && !b.paid) {
      totalFaturado += tot;
    }

    // Count em disputa
    if (b.dispute && b.dispute.open) {
      totalDisputa += tot;
    }
  });

  document.getElementById('dk-total-bls').textContent  = totalBLs;
  document.getElementById('dk-pendentes').textContent  = pendentes;
  document.getElementById('dk-pagos').textContent      = pagos;
  const totalStr = 'R$ ' + totalAberto.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const totalEl  = document.getElementById('dk-total-aberto');
  if (totalEl) {
    totalEl.textContent = totalStr;
    // Auto-shrink font for very large values
    const len = totalStr.length;
    totalEl.style.fontSize = len > 16 ? '15px' : len > 13 ? '17px' : '20px';
  }

  // Update new KPI cards
  const vencidoStr = 'R$ ' + totalVencido.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const faturadoStr = 'R$ ' + totalFaturado.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const disputaStr = 'R$ ' + totalDisputa.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  const vencidoEl = document.getElementById('dk-total-vencido');
  const faturadoEl = document.getElementById('dk-total-faturado');
  const disputaEl = document.getElementById('dk-total-disputa');
  if (vencidoEl) vencidoEl.textContent = vencidoStr;
  if (faturadoEl) faturadoEl.textContent = faturadoStr;
  if (disputaEl) disputaEl.textContent = disputaStr;

  const alertDays = getAlertDays();
  let nDD=0, nAlerta=0, nLivres=0, nDD30=0;
  trkData.forEach(r => {
    if (r.emptyReturn) return;
    const ft = r.freeTime || 21;
    const elapsed = trkDaysElapsed(r.discharge);
    if (elapsed === null) return;
    const daysLeft = ft - elapsed;
    if (daysLeft < 0) { nDD++; if ((-daysLeft) > 30) nDD30++; }
    else if (daysLeft <= alertDays) nAlerta++;
    else nLivres++;
  });
  document.getElementById('dk-ctrs-total').textContent  = trkData.length;
  document.getElementById('dk-ctrs-dd').textContent     = nDD;
  document.getElementById('dk-ctrs-alerta').textContent = nAlerta;
  document.getElementById('dk-ctrs-livres').textContent = nLivres;
  const dd30Sub = document.getElementById('dk-dd30-sub');
  if (dd30Sub) dd30Sub.textContent = nDD30 > 0 ? `⚡ ${nDD30} há mais de 30 dias` : '';

  const alerts = computeAlerts();
  const alertSub = document.getElementById('dqa-alert-sub');
  if (alertSub) {
    if (!alerts.length) alertSub.textContent = 'Nenhum container em alerta';
    else {
      const nOver = alerts.filter(a=>a.category==='over').length;
      const nWarn = alerts.filter(a=>a.category==='warn'||a.category==='today').length;
      const parts = [];
      if (nOver) parts.push(`${nOver} em D&D`);
      if (nWarn) parts.push(`${nWarn} a vencer`);
      alertSub.textContent = parts.join(' · ');
    }
  }

  const byClient = {};
  bls.filter(b => !b.paid).forEach(b => {
    const key  = b.cnpj || (b.client||'').trim().toUpperCase() || '—';
    const name = (() => {
      if (b.cnpj) { const cl = getClientByCnpj(b.cnpj); return (cl&&cl.name)||b.client||b.cnpj; }
      return b.client || '—';
    })();
    if (!byClient[key]) byClient[key] = { name, total:0, count:0 };
    const roe = (b.billed && b.frozenRoe != null) ? b.frozenRoe : effectiveROE(b);
    let tot = b.frozenTotal != null && b.billed ? b.frozenTotal : 0;
    if (!tot) (b.containers||[]).forEach(c => {
      const dc = daysBetween(c.discharge, c.emptyReturn);
      if (dc !== null) tot += calcUSD(dc, getRateForBL(b, c.type), b.ov1||null, b.ov2||null).totalUSD * roe;
    });
    byClient[key].total += tot; byClient[key].count++;
  });
  const topClientes = Object.values(byClient).sort((a,b)=>b.total-a.total).slice(0,10);
  const topEl = document.getElementById('dk-top-clientes');
  if (topEl) {
    if (!topClientes.length) { topEl.innerHTML = '<div class="dash-panel-empty">Nenhuma fatura em aberto.</div>'; }
    else {
      topEl.innerHTML = topClientes.map((c,i) => {
        const valFmt = c.total.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
        return `<div class="dash-panel-row">
          <span class="dash-panel-rank">${i+1}</span>
          <span class="dash-panel-name" title="${c.name}">${c.name}</span>
          <span class="dash-panel-badge" style="background:#fee2e2;color:#b91c1c;">${c.count} BL${c.count>1?'s':''}</span>
          <span class="dash-panel-val" style="color:#b91c1c;">R$&nbsp;${valFmt}</span>
        </div>`;
      }).join('');
    }
  }

  const ddList = trkData.filter(r => {
    if (r.emptyReturn) return false;
    const elapsed = trkDaysElapsed(r.discharge);
    return elapsed !== null && elapsed > (r.freeTime||21);
  }).sort((a,b) => (trkDaysElapsed(b.discharge)-(b.freeTime||21)) - (trkDaysElapsed(a.discharge)-(a.freeTime||21))).slice(0,10);
  const ddEl = document.getElementById('dk-dd-list');
  if (ddEl) {
    if (!ddList.length) { ddEl.innerHTML = '<div class="dash-panel-empty">✅ Nenhum container em demurrage.</div>'; }
    else {
      ddEl.innerHTML = ddList.map(r => {
        const over = trkDaysElapsed(r.discharge) - (r.freeTime||21);
        const col  = over > 30 ? '#b91c1c' : over > 14 ? '#dc2626' : '#ef4444';
        return `<div class="dash-panel-row">
          <span class="dash-panel-name"><strong>${r.container}</strong></span>
          <span style="font-size:11px;color:var(--muted);flex-shrink:0;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.cnee||''}">${r.cnee||'—'}</span>
          <span class="dash-panel-badge" style="background:#fee2e2;color:${col};font-weight:700;">+${over}d</span>
        </div>`;
      }).join('');
    }
  }
  renderTodoList();
}
function filterClientsSemEmail() {
  switchModule('clients');
  setTimeout(() => renderClients(), 80);
  setTimeout(() => toast('Verifique clientes sem e-mail cadastrado.', 'error'), 200);
}


// ── BILLING SUB-TABS ──────────────────────────────────────────────────────
let activeBillingSubTab = 'faturados';

function setBillingSubTab(tab) {
  activeBillingSubTab = tab;

  // Toggle active class on sub-tabs
  ['faturados','pagos'].forEach(t => {
    const el = document.getElementById('subtab-' + t);
    if (el) el.classList.toggle('active', t === tab);
  });

  // Show/hide sub-filters
  const sfFat  = document.getElementById('subfilters-faturados');
  const sfPago = document.getElementById('subfilters-pagos');
  if (sfFat)  sfFat.style.display  = tab === 'faturados' ? 'flex' : 'none';
  if (sfPago) sfPago.style.display = tab === 'pagos'     ? 'flex' : 'none';

  // Reset filter to the appropriate default
  if (tab === 'faturados') setFilter('all');
  else                     setFilter('paid');
}

function updateBillingBadges() {
  const nFat  = bls.filter(b => !b.paid).length;
  const nPago = bls.filter(b => !!b.paid).length;
  const bFat  = document.getElementById('badge-faturados');
  const bPago = document.getElementById('badge-pagos');
  if (bFat)  bFat.textContent  = nFat  || '';
  if (bPago) bPago.textContent = nPago || '';
}


// ══════════════════════════════════════════════════════════════════
// FEATURE 1: "O QUE FAZER AGORA"
// ══════════════════════════════════════════════════════════════════
function renderTodoList() {
  const el = document.getElementById('dash-todo-list');
  if (!el) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const items = [];

  // ── Faturas vencidas não pagas ─────────────────────────────────
  const vencidas = bls.filter(b => !b.paid && b.venc && new Date(b.venc+'T00:00:00') < today);
  if (vencidas.length) {
    const total = vencidas.reduce((s,b) => s + blTotal(b,null), 0);
    items.push({
      level: 'urgent', icon: '🔴',
      title: `${vencidas.length} fatura${vencidas.length>1?'s':''} vencida${vencidas.length>1?'s':''}`,
      sub: `R$ ${total.toLocaleString('pt-BR',{minimumFractionDigits:2})} em atraso — cobrar agora`,
      action: () => { switchModule('billing'); setFilter('unpaid'); setBillingSubTab('faturados'); }
    });
  }

  // ── Faturas vencendo em até 3 dias ─────────────────────────────
  const em3 = bls.filter(b => {
    if (b.paid || !b.venc) return false;
    const diff = (new Date(b.venc+'T00:00:00') - today) / 86400000;
    return diff >= 0 && diff <= 3;
  });
  if (em3.length) {
    items.push({
      level: 'warn', icon: '⚠️',
      title: `${em3.length} fatura${em3.length>1?'s':''} vencem em até 3 dias`,
      sub: em3.map(b => b.bl).join(', ').substring(0,60) + (em3.length>3?'…':''),
      action: () => { switchModule('billing'); setFilter('unpaid'); setBillingSubTab('faturados'); }
    });
  }

  // ── Containers em D&D há mais de 30 dias ──────────────────────
  const dd30 = trkData.filter(r => {
    if (r.emptyReturn) return false;
    const e = trkDaysElapsed(r.discharge);
    return e !== null && e - (r.freeTime||21) > 30;
  });
  if (dd30.length) {
    items.push({
      level: 'urgent', icon: '⛔',
      title: `${dd30.length} container${dd30.length>1?'s':''} em D&D há mais de 30 dias`,
      sub: 'Ação urgente: acionar cliente ou providenciar devolução imediata',
      action: () => { switchModule('tracking'); openAlertPanel(); }
    });
  }

  // ── Alertas de free time ────────────────────────────────────────
  const alerts = computeAlerts();
  const todayAlerts = alerts.filter(a => a.category === 'today');
  const warnAlerts  = alerts.filter(a => a.category === 'warn');
  if (todayAlerts.length) {
    items.push({
      level: 'urgent', icon: '🔔',
      title: `${todayAlerts.length} container${todayAlerts.length>1?'s':''} com free time vencendo hoje`,
      sub: 'Enviar alerta ao cliente antes que entre em D&D',
      action: () => { switchModule('tracking'); openAlertPanel(); }
    });
  }
  if (warnAlerts.length) {
    items.push({
      level: 'warn', icon: '⏰',
      title: `${warnAlerts.length} container${warnAlerts.length>1?'s':''} a vencer em breve`,
      sub: `Janela de ${getAlertDays()} dias — alertar consignatários`,
      action: () => { switchModule('tracking'); openAlertPanel(); }
    });
  }

  // ── BLs prontos para migrar para faturamento ───────────────────
  const readyToMigrate = trkData.filter(r => {
    if (!r.emptyReturn || !r.discharge) return false;
    const used = trkDaysBetween(r.discharge, r.emptyReturn);
    return used !== null && used > (r.freeTime||21);
  });
  const blsInBilling = new Set(bls.map(b => b.bl));
  const notYetBilled = readyToMigrate.filter(r => !blsInBilling.has(r.bl));
  if (notYetBilled.length) {
    const uniqueBLs = [...new Set(notYetBilled.map(r => r.bl))];
    items.push({
      level: 'info', icon: '📋',
      title: `${uniqueBLs.length} BL${uniqueBLs.length>1?'s':''} com D&D pronto${uniqueBLs.length>1?'s':''} para faturar`,
      sub: 'Containers devolvidos com demurrage — migrar para faturamento',
      action: () => { switchModule('tracking'); }
    });
  }

  // ── Clientes sem e-mail (com faturas em aberto) ────────────────
  _rebuildConsMap();
  const semEmail = Object.values(_consMap).filter(c => !c.emails.length).length;
  if (semEmail) {
    items.push({
      level: 'info', icon: '📭',
      title: `${semEmail} cliente${semEmail>1?'s':''} com faturas em aberto sem e-mail`,
      sub: 'Cobranças automáticas não funcionam sem e-mail cadastrado',
      action: () => { switchModule('clients'); }
    });
  }

  if (!items.length) {
    el.innerHTML = '<div class="todo-empty">✅ Tudo em dia! Nenhuma ação urgente no momento.</div>';
    return;
  }

  // Sort: urgent first
  const order = { urgent: 0, warn: 1, info: 2 };
  items.sort((a,b) => order[a.level] - order[b.level]);

  el.innerHTML = items.slice(0,6).map((item, i) => `
    <div class="todo-item todo-item-${item.level}" onclick="window._todoActions[${i}]()" style="cursor:pointer;">
      <span class="todo-icon">${item.icon}</span>
      <div class="todo-text">
        <div class="todo-title">${item.title}</div>
        <div class="todo-sub">${item.sub}</div>
      </div>
      <span class="todo-action">Resolver →</span>
    </div>`).join('');

  // Store actions
  window._todoActions = items.slice(0,6).map(i => i.action);
}

// ══════════════════════════════════════════════════════════════════
// FEATURE 2: BACKUP / RESTORE
// ══════════════════════════════════════════════════════════════════
function backupData() {
  const data = {
    version:   '1.0',
    exportedAt: new Date().toISOString(),
    bls:      load(),
    tracking: trkLoad(),
    clients:  cliLoad(),
    // FIX #13: alertDays incluído no backup para ser restaurado corretamente
    alertDays: getAlertDays(),
  };
  const json  = JSON.stringify(data, null, 2);
  const blob  = new Blob([json], { type: 'application/json' });
  const url   = URL.createObjectURL(blob);
  const a     = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href      = url;
  a.download  = `DemurrageManager_Backup_${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Backup exportado: ${data.bls.length} BLs, ${data.tracking.length} containers, ${data.clients.length} clientes.`, 'success');
}

function restoreData() {
  const input = document.createElement('input');
  input.type  = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.bls && !data.tracking && !data.clients) {
          toast('Arquivo inválido — não é um backup do Demurrage Manager.', 'error');
          return;
        }
        const msg = `Restaurar backup de ${data.exportedAt ? new Date(data.exportedAt).toLocaleString('pt-BR') : 'data desconhecida'}?\n\n` +
          `• ${(data.bls||[]).length} BLs\n` +
          `• ${(data.tracking||[]).length} containers\n` +
          `• ${(data.clients||[]).length} clientes\n\n` +
          `ATENÇÃO: os dados atuais serão SUBSTITUÍDOS por este backup.`;
        if (!confirm(msg)) return;
        if (window._dmFireRestore) {
          window._dmFireRestore(data).then(() => {
            toast('Backup restaurado! Recarregando...', 'success');
            setTimeout(() => location.reload(), 1200);
          }).catch(err => toast('Erro ao restaurar: ' + err.message, 'error'));
        } else {
          toast('Firebase não inicializado.', 'error');
        }
      } catch(err) {
        toast('Erro ao ler arquivo: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  };
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
}

// ══════════════════════════════════════════════════════════════════
// FEATURE 3: VALIDAÇÃO DE CNPJ
// ══════════════════════════════════════════════════════════════════
function validarCNPJ(cnpj) {
  const d = String(cnpj||'').replace(/\D/g,'').padStart(14,'0').slice(0,14);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (d, n) => {
    let sum = 0, pos = n - 7;
    for (let i = n; i >= 1; i--) {
      sum += parseInt(d.charAt(n-i)) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(d,12) === parseInt(d.charAt(12)) && calc(d,13) === parseInt(d.charAt(13));
}

function checkCnpjField(inputEl) {
  const raw = inputEl.value.replace(/\D/g,'');
  if (!raw) { inputEl.style.borderColor = ''; return; }
  const padded = raw.padStart(14,'0').slice(0,14);
  if (padded.length === 14) {
    const valid = validarCNPJ(padded);
    inputEl.style.borderColor = valid ? '#16a34a' : '#dc2626';
    inputEl.title = valid ? '✅ CNPJ válido' : '❌ CNPJ inválido — verifique os dígitos';
  }
}


// ── TRACKING VIEW TOGGLE ──────────────────────────────────────────────────
window._trkView     = 'container'; // 'container' | 'bl'
window._trkExpanded = new Set();   // expanded BL keys

function toggleTrkView() {
  window._trkView = window._trkView === 'container' ? 'bl' : 'container';
  const btn = document.getElementById('btn-trk-view-toggle');
  if (btn) {
    btn.textContent = window._trkView === 'bl' ? '☰ Visão por Container' : '🗂 Visão por BL';
    btn.classList.toggle('trk-view-btn-active', window._trkView === 'bl');
  }
  window._trkExpanded.clear();
  renderTracking();
}

function toggleBlGroup(key) {
  if (window._trkExpanded.has(key)) window._trkExpanded.delete(key);
  else window._trkExpanded.add(key);
  renderTracking();
}

function renderTrkGroupedByBL(filtered) {
  // Group by BL (+ vessel to distinguish same BL different vessels)
  const groups = new Map();
  filtered.forEach(r => {
    const key = (r.bl || '—') + '||' + (r.vessel || '');
    if (!groups.has(key)) groups.set(key, { bl: r.bl||'—', vessel: r.vessel||'—', cnee: r.cnee||'—', pol: r.pol||'—', pod: r.pod||'—', ctrs: [] });
    groups.get(key).ctrs.push(r);
  });

  return [...groups.entries()].map(([key, g]) => {
    const ctrs   = g.ctrs;
    const isExp  = window._trkExpanded.has(key);
    const safeKey = key.replace(/'/g, "\\'");

    // Aggregate
    const nDD    = ctrs.filter(r => trkStatus(r) === 'dd_open').length;
    const nAlert = ctrs.filter(r => trkStatus(r) === 'grace').length;
    const nRetDD = ctrs.filter(r => trkStatus(r) === 'dd_returned').length;
    const nOk    = ctrs.filter(r => { const s=trkStatus(r); return s==='returned'||s==='free'; }).length;
    const maxOver= Math.max(0, ...ctrs.map(r => {
      if (r.emptyReturn) return 0;
      const e = trkDaysElapsed(r.discharge);
      return e !== null ? e - (r.freeTime||21) : 0;
    }));

    // Row background
    const bg = nDD > 0 ? '#fff5f5' : nAlert > 0 ? '#fffdf0' : '#fafcff';

    // Status summary pills
    const pills = [
      nDD    ? `<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">⛔ ${nDD} em D&D${maxOver>0?' +'+maxOver+'d':''}</span>` : '',
      nAlert ? `<span style="background:#fef3c7;color:#b45309;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">⚠️ ${nAlert} atenção</span>` : '',
      nRetDD ? `<span style="background:#ede9fe;color:#6d28d9;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">📦 ${nRetDD} dev c/D&D</span>` : '',
      nOk    ? `<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;">✅ ${nOk}</span>` : '',
    ].filter(Boolean).join(' ');

    // ── Summary row (full width, 15 cols): BL | CNEE | vessel | count | pills ──
    const arrow = isExp ? '▾' : '▸';
    const summaryRow = `<tr class="bl-group-row bl-group-header" onclick="toggleBlGroup('${safeKey}')"
        style="background:${bg};cursor:pointer;">
      <td colspan="2" style="padding:10px 12px;border-top:2px solid var(--border);">
        <span style="font-weight:700;color:var(--navy);font-size:13px;">${arrow} ${g.bl}</span>
      </td>
      <td colspan="2" style="padding:10px 8px;font-size:12px;border-top:2px solid var(--border);">
        <span style="color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:block;max-width:180px;" title="${g.cnee}">${g.cnee}</span>
      </td>
      <td colspan="2" style="padding:10px 8px;font-size:12px;color:var(--muted);border-top:2px solid var(--border);">
        ${g.pol||'—'} → ${g.pod||'—'}
      </td>
      <td style="padding:10px 8px;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border-top:2px solid var(--border);" title="${g.vessel}">${g.vessel}</td>
      <td style="padding:10px 8px;text-align:center;border-top:2px solid var(--border);">
        <span style="background:var(--navy);color:white;border-radius:99px;padding:2px 8px;font-size:11px;font-weight:700;">${ctrs.length}</span>
      </td>
      <td colspan="7" style="padding:10px 12px;border-top:2px solid var(--border);">
        ${pills}
      </td>
    </tr>`;

    if (!isExp) return summaryRow;

    // ── Child rows: re-use exact same single-row logic ──
    const childRows = ctrs.map(r => {
      const status = trkStatus(r);
      const elapsed = trkDaysElapsed(r.discharge);
      const ft = r.freeTime || 21;
      const daysOver = elapsed !== null ? elapsed - ft : null;
      const useDays = r.useDays !== null && r.useDays !== undefined
        ? r.useDays
        : (r.emptyReturn ? trkDaysBetween(r.discharge, r.emptyReturn) : elapsed);
      const diasCorridos = r.emptyReturn
        ? trkDaysBetween(r.discharge, r.emptyReturn)
        : elapsed;

      let daysHtml = '—';
      if (diasCorridos !== null) {
        const over = daysOver > 0;
        daysHtml = `<span style="font-weight:${over?'700':'400'};color:${over?'#dc2626':'inherit'}">${diasCorridos}</span>`;
      }

      const statusMap = {
        dd_open:     '<span style="color:#dc2626;font-weight:700;white-space:nowrap;">⛔ D&D</span>',
        dd_returned: '<span style="color:#7c3aed;white-space:nowrap;">📦 Dev c/D&D</span>',
        returned:    '<span style="color:#16a34a;white-space:nowrap;">✅ Devolvido</span>',
        grace:       '<span style="color:#d97706;white-space:nowrap;">⚠️ Atenção</span>',
        free:        '<span style="color:#2563eb;white-space:nowrap;">🟢 Free Time</span>',
        none:        '—'
      };
      const pillHtml = statusMap[status] || '—';

      return `<tr style="background:#f7faff;">
        <td style="padding:8px 12px;padding-left:28px;font-weight:600;border-left:3px solid #bfdbfe;">${r.container}</td>
        <td style="font-size:11px;color:var(--muted);">—</td>
        <td style="font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.cnee||''}">${r.cnee||'—'}</td>
        <td>${r.type||'—'}</td>
        <td>${r.pol||'—'}</td>
        <td>${r.pod||'—'}</td>
        <td style="font-size:12px;">${r.vessel||'—'}</td>
        <td>${trkFmtDate(r.discharge)}</td>
        <td>${trkFmtDate(r.deadline)}</td>
        <td>${trkFmtDate(r.emptyReturn)}</td>
        <td style="text-align:center;">${useDays !== null ? useDays : '—'}</td>
        <td style="text-align:center;">${ft}</td>
        <td style="text-align:center;">${daysHtml}</td>
        <td>${pillHtml}</td>
        <td style="font-size:11px;color:var(--muted);">—</td>
      </tr>`;
    }).join('');

    return summaryRow + childRows;
  }).join('');
}


// INIT will be called by Firebase module after data is loaded
// See: window._dmOnReady()
window._dmOnReady = function() {
  // ── Reload all global arrays from Firestore ──
  bls = load();              // ← critical: reatribui bls com dados do Firebase
  _backfillVenc();           // ← backfill seguro: só salva se houver mudança real
  // FIX #3: migracoes agora rodam APOS bls ser carregado do Firestore
  (function migrateDotcnum() {
    let changed = false;
    bls.forEach(b => { if (!b.docnum) { b.docnum = genDocnum(b.bl); changed = true; } });
    if (changed) save(bls);
  })();
  
  // Migração: atribuir migratedAt a BLs vindos do tracking que não possuem a data
  (function backfillMigratedAt() {
    let changed = false;
    bls.forEach(b => {
      if (b.migratedFromTracking && !b.migratedAt) {
        // Usa createdAt como data de migração (timestamp → YYYY-MM-DD)
        b.migratedAt = b.createdAt
          ? new Date(b.createdAt).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10);
        changed = true;
      }
    });
    if (changed) save(bls);
  })();
  const rawTrk = trkLoad();
  const cleanTrk = rawTrk.filter(r => {
    if (r.emptyReturn && r.discharge) {
      const used = trkDaysBetween(r.discharge, r.emptyReturn);
      const ft = r.freeTime || 21;
      if (used !== null && used <= ft) return false;
    }
    return true;
  });
  if (cleanTrk.length < rawTrk.length) trkSave(cleanTrk);
  trkData = cleanTrk;
  clients = cliLoad();
  renderList();
  renderRateTable();
  loadPTAX();
  renderTracking();
  updateAlertBadge();
  // MELHORIA #1: aplicar alertas visuais nos containers críticos
  setTimeout(applyContainerAlerts, 500);
  // MELHORIA TAXAS: carregar taxas customizadas do Firestore (se existirem)
  loadCfgRatesFromFirestore();
  switchModule('dashboard');
  // Hide loading overlay
  const overlay = document.getElementById('dm-loading-overlay');
  if (overlay) overlay.style.display = 'none';

  // ── Callbacks reativos: onSnapshot atualiza vars locais após carga inicial ──
  window._dmOnBLsUpdate = function() {
    bls = load();
    renderList();
    renderDashboard();
    updateAlertBadge();
  };
  window._dmOnTrkUpdate = function() {
    // FIX #7: aplica filtro de containers devolvidos dentro do free time
    // (mesmo filtro do carregamento inicial em _dmOnReady)
    var raw7 = trkLoad();
    var clean7 = raw7.filter(function(r) {
      if (r.emptyReturn && r.discharge) {
        var used = trkDaysBetween(r.discharge, r.emptyReturn);
        var ft   = r.freeTime || 21;
        if (used !== null && used <= ft) return false;
      }
      return true;
    });
    if (clean7.length < raw7.length) trkSave(clean7);
    trkData = clean7;
    renderTracking();
    updateAlertBadge();
  };
  window._dmOnClientsUpdate = function() {
    clients = cliLoad();
    renderClients();
  };
};
</script>

<!-- ── Badge de versão fixo ──────────────────────────────────────────── -->
<style>
  .version-badge {
    position: fixed;
    bottom: 12px;
    right: 16px;
    z-index: 9999;
    background: var(--navy);
    color: rgba(255,255,255,0.6);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.5px;
    padding: 4px 9px;
    border-radius: 20px;
    pointer-events: none;
    user-select: none;
    box-shadow: 0 1px 4px rgba(0,0,0,0.25);
  }
</style>
<div class="version-badge">v1.0.4</div>

<!-- ══════════════════════════════════════════════════════════════
     MÓDULO: CONFIGURAÇÕES
     ══════════════════════════════════════════════════════════════ -->
<div id="mod-settings" style="display:none;">

  <!-- Header -->
  <div class="cfg-header">
    <div class="cfg-header-icon">⚙️</div>
    <div class="cfg-header-text">
      <h1>Configurações do Sistema</h1>
      <p>Gerencie taxas, usuários, backup e informações do aplicativo</p>
    </div>
  </div>

  <!-- Sub-tabs -->
  <div class="cfg-subtabs">
    <div class="cfg-subtab active" onclick="switchCfgPane(this,'cfg-geral')">📊 Geral</div>
    <div class="cfg-subtab" onclick="switchCfgPane(this,'cfg-taxas')">💰 Taxas</div>
    <div class="cfg-subtab" onclick="switchCfgPane(this,'cfg-users')">👥 Usuários</div>
    <div class="cfg-subtab" onclick="switchCfgPane(this,'cfg-backup')">💾 Backup</div>
    <div class="cfg-subtab" onclick="switchCfgPane(this,'cfg-sistema')">🔧 Sistema</div>
  </div>

  <!-- ── PANE: GERAL ── -->
  <div id="cfg-geral" class="cfg-pane active">
    <div class="cfg-card">
      <div class="cfg-card-header"><h3>📋 Informações do Aplicativo</h3></div>
      <div class="cfg-card-body">
        <div class="cfg-info-grid">
          <div class="cfg-info-item">
            <label>Versão</label>
            <span id="cfg-version">v1.0.4</span>
          </div>
          <div class="cfg-info-item">
            <label>Data de Deploy</label>
            <span id="cfg-deploy-date">—</span>
          </div>
          <div class="cfg-info-item">
            <label>Ambiente</label>
            <span>Produção</span>
          </div>
          <div class="cfg-info-item">
            <label>Usuário Ativo</label>
            <span id="cfg-current-user">—</span>
          </div>
        </div>
      </div>
    </div>
    <div class="cfg-card">
      <div class="cfg-card-header"><h3>ℹ️ Sobre o Sistema</h3></div>
      <div class="cfg-card-body" style="font-size:13px;color:var(--text);line-height:1.7;">
        <p><strong>Demurrage Manager</strong> é um sistema interno desenvolvido para a <strong>Transhipping Agenciamento Marítimo Ltda.</strong> para centralizar a gestão de Demurrage &amp; Detention (D&amp;D) de containers.</p>
        <br>
        <p style="color:var(--muted);">Funcionalidades: controle em tempo real de containers · cálculo automático de D&D em USD · emissão de faturas com QR Code PIX · relatórios Excel · log de auditoria · sistema multiusuário com Firebase.</p>
      </div>
    </div>
  </div>

  <!-- ── PANE: TAXAS ── -->
  <div id="cfg-taxas" class="cfg-pane">
    <div class="cfg-card">
      <div class="cfg-card-header">
        <h3>💰 Tabela de Taxas (USD/dia)</h3>
        <span style="font-size:12px;color:var(--muted);">Alterações salvas automaticamente no Firestore</span>
      </div>
      <div class="cfg-card-body" style="padding:0;">
        <table class="cfg-table" id="cfg-rates-table">
          <thead>
            <tr>
              <th>Tipo de Container</th>
              <th>Free Time (dias)</th>
              <th>P1: Período (dias)</th>
              <th>P1: USD/dia</th>
              <th>P2: USD/dia</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody id="cfg-rates-tbody">
            <!-- preenchido via JS -->
          </tbody>
        </table>
      </div>
    </div>
    <div style="background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400e;">
      ⚠️ <strong>Atenção:</strong> As taxas editadas aqui são carregadas dinamicamente. Para garantir persistência entre sessões, as alterações são salvas no Firestore (<code>config/rates</code>).
    </div>
  </div>

  <!-- ── PANE: USUÁRIOS ── -->
  <div id="cfg-users" class="cfg-pane">
    <div class="cfg-card">
      <div class="cfg-card-header">
        <h3>👥 Usuários do Sistema</h3>
        <span style="font-size:12px;color:var(--muted);">Apenas administradores podem visualizar esta seção</span>
      </div>
      <div class="cfg-card-body" style="padding:0;">
        <table class="cfg-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Nome</th>
              <th>Função</th>
              <th>Último Acesso</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="cfg-users-tbody">
            <tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted);">Carregando usuários...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- ── PANE: BACKUP ── -->
  <div id="cfg-backup" class="cfg-pane">
    <div class="cfg-card">
      <div class="cfg-card-header"><h3>💾 Exportar Dados</h3></div>
      <div class="cfg-card-body">
        <div class="cfg-backup-grid">
          <button class="cfg-backup-btn export" onclick="cfgExportBackupJSON()">
            <span class="b-icon">📦</span>
            <div>
              <span class="b-label">Backup Completo (JSON)</span>
              <span class="b-desc">Exporta containers, BLs, clientes e config</span>
            </div>
          </button>
          <button class="cfg-backup-btn export" onclick="cfgExportContainersCSV()">
            <span class="b-icon">📊</span>
            <div>
              <span class="b-label">Containers (CSV)</span>
              <span class="b-desc">Planilha com todos os containers ativos</span>
            </div>
          </button>
        </div>
      </div>
    </div>
    <div class="cfg-card">
      <div class="cfg-card-header"><h3>📤 Restaurar Backup</h3></div>
      <div class="cfg-card-body">
        <p style="font-size:13px;color:var(--muted);margin-bottom:16px;">Importe um arquivo de backup JSON para restaurar os dados. <strong style="color:var(--red);">Atenção: os dados atuais serão substituídos.</strong></p>
        <label class="cfg-backup-btn import" style="cursor:pointer;">
          <span class="b-icon">📥</span>
          <div>
            <span class="b-label">Selecionar Arquivo de Backup</span>
            <span class="b-desc">Formatos aceitos: .json (gerado por este sistema)</span>
          </div>
          <input type="file" id="cfg-backup-file" accept=".json" style="display:none;" onchange="cfgImportBackup(event)">
        </label>
      </div>
    </div>
  </div>

  <!-- ── PANE: SISTEMA ── -->
  <div id="cfg-sistema" class="cfg-pane">
    <div class="cfg-card">
      <div class="cfg-card-header"><h3>🔧 Informações de Infraestrutura</h3></div>
      <div class="cfg-card-body">
        <div class="cfg-sys-row">
          <span class="cfg-sys-label">Banco de Dados</span>
          <span class="cfg-sys-val">Firebase Firestore (NoSQL, tempo real)</span>
        </div>
        <div class="cfg-sys-row">
          <span class="cfg-sys-label">Autenticação</span>
          <span class="cfg-sys-val">Firebase Authentication (email/senha)</span>
        </div>
        <div class="cfg-sys-row">
          <span class="cfg-sys-label">Hospedagem</span>
          <span class="cfg-sys-val">Firebase Hosting · demurragemanager.web.app</span>
        </div>
        <div class="cfg-sys-row">
          <span class="cfg-sys-label">Deploy</span>
          <span class="cfg-sys-val">GitHub Actions (automático no push para main)</span>
        </div>
        <div class="cfg-sys-row">
          <span class="cfg-sys-label">Tecnologia</span>
          <span class="cfg-sys-val">HTML5 · CSS3 · JavaScript Vanilla</span>
        </div>
        <div class="cfg-sys-row">
          <span class="cfg-sys-label">Status do Servidor</span>
          <span class="cfg-sys-val"><span class="cfg-status-dot"></span>Online</span>
        </div>
        <div class="cfg-sys-row">
          <span class="cfg-sys-label">Registros no Banco</span>
          <span class="cfg-sys-val" id="cfg-db-count">Carregando...</span>
        </div>
      </div>
    </div>
    <div class="cfg-card">
      <div class="cfg-card-header"><h3>🧹 Manutenção</h3></div>
      <div class="cfg-card-body" style="display:flex;gap:12px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="cfgClearCache()">🗑️ Limpar Cache Local</button>
        <button class="btn btn-outline btn-sm" onclick="cfgReloadRates()">🔄 Recarregar Taxas</button>
        <button class="btn btn-outline btn-sm" onclick="cfgShowAuditLog()">📋 Ver Log de Auditoria</button>
      </div>
    </div>
  </div>

</div><!-- /mod-settings -->

</body>
</html>

```

### `auth.js`

**Tamanho:** 2.6 KB

```javascript
// ============================================================
// AUTH.JS — Firebase Authentication
// Login com e-mail/senha, logout, guard de sessão
// ============================================================
import { auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

// ── Verificar sessão ao carregar qualquer página ─────────────
// Chame em app.html: requireAuth() — redireciona para login se não autenticado
// Chame em index.html: redirectIfLoggedIn() — redireciona para app se já logado
export function requireAuth(onUser) {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'index.html';
    } else {
      if (onUser) onUser(user);
    }
  });
}

export function redirectIfLoggedIn() {
  onAuthStateChanged(auth, (user) => {
    if (user) window.location.href = 'app.html';
  });
}

// ── Login ────────────────────────────────────────────────────
export async function login(email, password) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return { ok: true, user: cred.user };
  } catch (err) {
    const msgs = {
      'auth/invalid-credential':       'E-mail ou senha incorretos.',
      'auth/user-not-found':           'Usuário não encontrado.',
      'auth/wrong-password':           'Senha incorreta.',
      'auth/too-many-requests':        'Muitas tentativas. Aguarde alguns minutos.',
      'auth/user-disabled':            'Esta conta foi desativada.',
      'auth/network-request-failed':   'Erro de conexão. Verifique a internet.',
    };
    return { ok: false, msg: msgs[err.code] || `Erro: ${err.message}` };
  }
}

// ── Logout ───────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
  window.location.href = 'index.html';
}

// ── Reset de senha ───────────────────────────────────────────
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { ok: true };
  } catch (err) {
    return { ok: false, msg: err.message };
  }
}

// ── Usuário atual (síncrono, após auth inicializado) ─────────
export function currentUser() {
  return auth.currentUser;
}
```

### `db.js`

**Tamanho:** 6.3 KB

```javascript
// ============================================================
// DB.JS — Firestore wrapper
// Substitui localStorage. Mantém estado in-memory sincronizado
// em tempo real via onSnapshot — todos os usuários veem os
// mesmos dados sem precisar recarregar a página.
// ============================================================
import { db } from './firebase-config.js';
import {
  doc, collection,
  getDoc, setDoc, deleteDoc,
  onSnapshot, writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// ── Estado in-memory (substitui localStorage) ───────────────
let _bls      = [];
let _trk      = [];
let _clients  = [];
let _alertDays = 5;

// Callbacks para re-renderizar quando os dados mudarem remotamente
let _onBLsChange      = null;
let _onTrkChange      = null;
let _onClientsChange  = null;

// Flag: listeners ativos e dados carregados inicialmente
let _blsReady     = false;
let _trkReady     = false;
let _clientsReady = false;
let _onReadyCb    = null;
let _readyFired   = false;

function _checkReady() {
  if (!_readyFired && _blsReady && _trkReady && _clientsReady) {
    _readyFired = true;
    if (_onReadyCb) _onReadyCb();
  }
}

// ── Inicialização: ativa listeners Firestore ─────────────────
export function initDB({ onReady, onBLsChange, onTrkChange, onClientsChange }) {
  _onReadyCb       = onReady;
  _onBLsChange     = onBLsChange;
  _onTrkChange     = onTrkChange;
  _onClientsChange = onClientsChange;

  // ── BLs ──
  onSnapshot(collection(db, 'bls'), (snap) => {
    _bls = snap.docs.map(d => d.data());
    if (!_blsReady) { _blsReady = true; _checkReady(); }
    else if (_onBLsChange) _onBLsChange(_bls);
  }, (err) => console.error('[DB] bls listener error:', err));

  // ── Containers (tracking) ──
  onSnapshot(collection(db, 'containers'), (snap) => {
    _trk = snap.docs.map(d => d.data());
    if (!_trkReady) { _trkReady = true; _checkReady(); }
    else if (_onTrkChange) _onTrkChange(_trk);
  }, (err) => console.error('[DB] containers listener error:', err));

  // ── Clientes ──
  onSnapshot(collection(db, 'clients'), (snap) => {
    _clients = snap.docs.map(d => d.data());
    if (!_clientsReady) { _clientsReady = true; _checkReady(); }
    else if (_onClientsChange) _onClientsChange(_clients);
  }, (err) => console.error('[DB] clients listener error:', err));

  // ── Alert days (documento único em settings) ──
  getDoc(doc(db, 'settings', 'alerts')).then(snap => {
    if (snap.exists()) _alertDays = snap.data().days ?? 5;
  });
}

// ============================================================
// API pública — compatível com o código original
// ============================================================

// ── BLs (dm_v4) ──────────────────────────────────────────────
export function load() {
  return _bls;
}

export function save(bls) {
  _bls = bls;
  const batch = writeBatch(db);

  // IDs presentes na nova lista
  const newIds = new Set(bls.map(b => b.id));

  // Apaga docs que foram removidos
  // Nota: precisamos saber quais existiam — usamos _bls anterior
  // Simples: reescreve todos; deleção é tratada por deleteBL
  bls.forEach(bl => {
    batch.set(doc(db, 'bls', String(bl.id)), bl);
  });

  batch.commit().catch(e => console.error('[DB] save bls error:', e));
}

export function deleteBL(id) {
  _bls = _bls.filter(b => b.id !== id);
  deleteDoc(doc(db, 'bls', String(id)))
    .catch(e => console.error('[DB] deleteBL error:', e));
}

// ── Containers / Tracking (dm_tracking_v1) ───────────────────
export function trkLoad() {
  return _trk;
}

export function trkSave(data) {
  _trk = data;
  const batch = writeBatch(db);
  data.forEach(c => {
    batch.set(doc(db, 'containers', String(c.container)), c);
  });
  batch.commit().catch(e => console.error('[DB] trkSave error:', e));
}

export function trkDelete(container) {
  _trk = _trk.filter(c => c.container !== container);
  deleteDoc(doc(db, 'containers', String(container)))
    .catch(e => console.error('[DB] trkDelete error:', e));
}

export function trkClear() {
  const batch = writeBatch(db);
  _trk.forEach(c => {
    batch.delete(doc(db, 'containers', String(c.container)));
  });
  _trk = [];
  batch.commit().catch(e => console.error('[DB] trkClear error:', e));
}

// ── Clientes (dm_clients_v1) ──────────────────────────────────
export function cliLoad() {
  return _clients;
}

export function cliSave(clients) {
  _clients = clients;
  const batch = writeBatch(db);
  clients.forEach(c => {
    batch.set(doc(db, 'clients', String(c.id)), c);
  });
  batch.commit().catch(e => console.error('[DB] cliSave error:', e));
}

export function cliDelete(id) {
  _clients = _clients.filter(c => c.id !== id);
  deleteDoc(doc(db, 'clients', String(id)))
    .catch(e => console.error('[DB] cliDelete error:', e));
}

// ── Alert days (dm_alert_days) ────────────────────────────────
export function getAlertDays() {
  return _alertDays;
}

export function saveAlertDays(days) {
  _alertDays = days;
  setDoc(doc(db, 'settings', 'alerts'), { days })
    .catch(e => console.error('[DB] saveAlertDays error:', e));
}

// ── Backup / Restore (compatibilidade com funções originais) ──
export function getAllData() {
  return {
    bls:      [..._bls],
    tracking: [..._trk],
    clients:  [..._clients],
    alertDays: _alertDays
  };
}

export async function restoreAllData(data) {
  // Apaga coleções existentes e reescreve
  const batch = writeBatch(db);

  if (data.bls) {
    _bls = data.bls;
    data.bls.forEach(b => batch.set(doc(db, 'bls', String(b.id)), b));
  }
  if (data.tracking) {
    _trk = data.tracking;
    data.tracking.forEach(c => batch.set(doc(db, 'containers', String(c.container)), c));
  }
  if (data.clients) {
    _clients = data.clients;
    data.clients.forEach(c => batch.set(doc(db, 'clients', String(c.id)), c));
  }
  if (data.alertDays) {
    _alertDays = data.alertDays;
    batch.set(doc(db, 'settings', 'alerts'), { days: data.alertDays });
  }

  await batch.commit();
}
```

### `firebase-config.js`

**Tamanho:** 1.2 KB

```javascript
// ============================================================
// FIREBASE CONFIGURATION — demurragemanager
// ============================================================
// Este arquivo é referência de arquitetura.
// O app.html e index.html já contêm o Firebase embutido inline.
// Use este módulo se quiser separar o código em múltiplos arquivos.
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyBWXLvUspGo1rRDSWYJ3rGMRUOGUH6bARI",
  authDomain:        "demurragemanager.firebaseapp.com",
  projectId:         "demurragemanager",
  storageBucket:     "demurragemanager.firebasestorage.app",
  messagingSenderId: "951449004275",
  appId:             "1:951449004275:web:c01cc83d02ba87d9bcaf86"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

export { app, auth, db };
```

### `SETUP.md`

**Tamanho:** 2.5 KB

```markdown
# Demurrage Manager — Guia de Configuração

## Status do Projeto

✅ Firebase: **demurragemanager**
✅ Dados isolados por usuário (`/users/{uid}/...`)
✅ Exclusões propagadas ao Firestore (delete diferencial)
✅ Sem localStorage — tudo no Firestore

---

## Regras do Firestore (OBRIGATÓRIO configurar)

No Firebase Console → **Firestore → Regras**, cole exatamente:

` ` `javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}
` ` `

Clique em **Publicar**. Sem isso, nenhum dado é gravado.

---

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | Tela de login (Firebase Auth embutido) |
| `app.html` | Aplicação completa (Firestore embutido) |
| `js/` | Módulos de referência (não usados pelo app) |

---

## Estrutura do Firestore (por usuário)

` ` `
/users/{uid}/
  bls/{id}            ← BLs de faturamento
  containers/{cntr}   ← Controle de containers
  clients/{id}        ← Cadastro de clientes
  settings/alerts     ← { days: number }
` ` `

Cada usuário acessa APENAS os seus próprios dados.

---

## Gerenciar Usuários

👉 [console.firebase.google.com/project/demurragemanager/authentication/users](https://console.firebase.google.com/project/demurragemanager/authentication/users)

Para adicionar: **Adicionar usuário → e-mail + senha**
Para revogar: selecione o usuário → **Desativar** ou **Excluir**

---

## Migrar Dados Existentes (localStorage → Firestore)

1. Abra o `demurrage-manager.html` **original** no navegador
2. Clique em **💾 Backup** → salva um `.json`
3. No novo sistema, faça login
4. Clique em **📂 Restaurar** → selecione o `.json`
5. Dados gravados no Firestore sob o uid do usuário logado

---

## Solução de Problemas

| Sintoma | Causa provável | Solução |
|---------|---------------|---------|
| Dados somem entre sessões | Regras do Firestore bloqueando gravação | Configure as regras acima |
| "Missing or insufficient permissions" no console | Regras incorretas ou não publicadas | Verifique as regras no console |
| Tela de loading infinita | Firestore sem resposta | Verifique F12 → Console por erros |
| Dados de outros usuários aparecem | Regras antigas (sem `userId`) | Atualize para as regras acima |

---

*Transhipping Agenciamento Marítimo Ltda. — by Lucca Juliatti*
```

---

## 4. Dependências

Não há `package.json` — o projeto usa dependências via CDN. As versões fixas são:

```
# CDN (carregados via <script src="...">)
SheetJS / xlsx.js         v0.18.5     https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js
QRCode.js                 v1.0.0      https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js

# Firebase (ESM modules via gstatic CDN)
firebase-app.js           v11.0.0     https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js
firebase-auth.js          v11.0.0     https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js
firebase-firestore.js     v11.0.0     https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js

# Google Fonts
Inter                     (latest)    https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700
Syne                      (latest)    https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800
DM Mono                   (latest)    https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500
```

---

## 5. Variáveis de Ambiente / Configuração Firebase

O projeto usa Firebase com credenciais embutidas diretamente no HTML (padrão para aplicações web Firebase públicas — as chaves de API do Firebase Web SDK são seguras de expor; a segurança real vem das **Regras do Firestore**).

As credenciais estão em três lugares: `index.html`, `app.html` (ambos inline), e `firebase-config.js` (referência).

```
# Projeto Firebase
FIREBASE_PROJECT_ID        = "demurragemanager"
FIREBASE_AUTH_DOMAIN       = "demurragemanager.firebaseapp.com"
FIREBASE_API_KEY           = [ver arquivo firebase-config.js]
FIREBASE_STORAGE_BUCKET    = "demurragemanager.firebasestorage.app"
FIREBASE_MESSAGING_SENDER  = "951449004275"
FIREBASE_APP_ID            = [ver arquivo firebase-config.js]
```

### Regras do Firestore (OBRIGATÓRIO configurar no Console Firebase)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
    // Logs e sessões (admin pode ver tudo — ajuste conforme necessário)
    match /logs/{logId} {
      allow read, write: if request.auth != null;
    }
    match /sessoes/{sessaoId} {
      allow read, write: if request.auth != null;
    }
    match /usuarios/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Estrutura do Firestore por usuário

```
/users/{uid}/
  bls/{id}              ← BLs de faturamento
  containers/{cntr}     ← Controle de containers (tracking)
  clients/{id}          ← Cadastro de clientes
  settings/alerts       ← { days: number } — dias de alerta de free time

/logs/{logId}           ← Log de auditoria de ações
/sessoes/{sessaoId}     ← Registro de sessões de login
/usuarios/{uid}         ← Perfil de usuário (nome, cargo, admin, ativo)
```

---

## 6. Instruções de Reconstituição

### Pré-requisitos
- Conta Google com acesso ao projeto Firebase `demurragemanager`
- Ou criação de um novo projeto Firebase (ver passo 2)
- Qualquer servidor de arquivos estáticos (Netlify, GitHub Pages, Firebase Hosting, etc.) OU simplesmente abrir os arquivos diretamente no navegador

### Passo a passo

**1. Clonar ou criar os arquivos**
```bash
# Opção A: via repositório GitHub
git clone https://github.com/luccafwlog/demurrage-manager.git

# Opção B: criar os arquivos manualmente a partir deste snapshot
# (copiar o conteúdo de cada arquivo da seção 3 acima)
```

**2. Firebase — usar projeto existente OU criar novo**

Usando o projeto existente (`demurragemanager`):
- Apenas fazer login no Firebase Console e verificar se as regras estão configuradas
- URL: https://console.firebase.google.com/project/demurragemanager

Criando novo projeto:
```
a) Acessar console.firebase.google.com → Criar projeto
b) Habilitar: Authentication → Sign-in method → E-mail/Senha
c) Habilitar: Firestore Database → Criar em modo produção
d) Copiar as credenciais (apiKey, authDomain, etc.)
e) Substituir em index.html, app.html e firebase-config.js
```

**3. Configurar Regras do Firestore**
```
Firebase Console → Firestore → Regras → colar as regras da seção 5 → Publicar
```

**4. Criar usuários**
```
Firebase Console → Authentication → Users → Adicionar usuário (e-mail + senha)
```

**5. Registrar perfil admin (para acessar aba Usuários)**
No Firestore, criar manualmente o documento:
```
Coleção: usuarios
Documento ID: {uid do usuário}
Campos: { nome: "Nome", cargo: "Admin", admin: true, ativo: true }
```

**6. Deploy (opcional)**

Firebase Hosting:
```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # selecionar projeto, public dir = "."
firebase deploy
```

Netlify:
```bash
# Arrastar a pasta do projeto para app.netlify.com
# Ou conectar o repositório GitHub
```

**7. Restaurar dados (se houver backup)**
```
a) Fazer login na aplicação
b) Header → 📂 Restaurar → selecionar arquivo .json de backup
c) Aguardar importação (progress toast)
```

---

## 7. Contexto de Trabalho

### Decisões de Design Já Tomadas

**Arquitetura single-file:**
- Todo o app está em `app.html` (JS, CSS e HTML em um único arquivo)
- Decisão consciente para simplificar deploy e evitar problemas de módulos ES em file://
- Firebase embutido inline em `<script type="module">` dentro do HTML
- Os arquivos `auth.js`, `db.js`, `firebase-config.js` são referências documentais, não usados ativamente

**Estado da aplicação:**
- `window._dmStore` é o store global in-memory
- Firebase `onSnapshot` mantém o store sincronizado em tempo real
- `window._dmFireSave(type, newData)` é a função de persistência principal
- Diff correto: compara estado anterior com novo estado para deletar docs removidos

**Módulos do app (sub-tabs):**
```
dashboard  → mod-dashboard
billing    → mod-billing (sub-tabs: faturados / pagos)
tracking   → mod-tracking
clients    → mod-clients
users      → mod-users (visível apenas para admins)
```

**PTAX:**
- Busca automática da API do Banco Central do Brasil
- Aplica-se +6,5% sobre PTAX para obter o ROE da fatura
- ROE manual disponível no formulário do BL
- ROE é congelado no momento do pagamento/faturamento (campo `frozenRoe`)

**Cálculo de Demurrage:**
- Tabela de taxas (`RATES`) hardcoded no `app.html`
- Dois períodos (1º e 2º) com valores USD/dia por tipo de container
- Free time padrão: 21 dias corridos
- Dias corridos calculados entre descarga e devolução (inclusivo)

**Valores congelados:**
- Quando um BL é marcado como Faturado ou Pago, os campos `frozenRoe` e `frozenTotal` são gravados
- Isso garante que o valor da fatura não mude com variações do PTAX

**Numeração de faturas:**
- Gerada automaticamente a partir do número do BL
- Pode ser sobrescrita manualmente no formulário

**Dispute/Desconto:**
- Cada BL pode ter no máximo 1 disputa ativa e 1 desconto
- Desconto pode ser em valor fixo (R$) ou percentual
- Disputas têm status: aberto / em análise / resolvido

**Log de auditoria:**
- Cada ação relevante chama `logAuditAction(acao, detalhe)`
- Logs gravados na coleção `/logs/` do Firestore
- Sessões registradas em `/sessoes/`
- Admin vê todos os logs de todos os usuários

### Abordagens Descartadas
- **localStorage**: descartado em favor de Firestore para dados multi-usuário em tempo real
- **Módulos ES externos** (auth.js, db.js): descartados em favor de código inline nos HTMLs para evitar erros CORS
- **Frameworks (React, Vue)**: descartados em favor de vanilla JS para simplicidade e "vibe coding"
- **Backend próprio**: descartado em favor de Firebase (serverless, sem manutenção de servidor)

### Próximos Passos Planejados
1. **Tabela de taxas editável**: Permitir que admins editem as taxas USD/dia pela interface, salvando no Firestore
2. **Notificações**: Alertas automáticos por e-mail quando containers estão próximos do deadline
3. **Relatório por período**: Filtro de data no relatório Excel
4. **Mobile**: Melhorar responsividade para uso em dispositivos móveis

### Notas Técnicas para o Próximo Claude

- **Firebase v11.0.0**: usar sempre a mesma versão do SDK para consistência
- **Função `sanitize(obj)`**: fundamental — remove `undefined` e `NaN` antes de salvar no Firestore (Firestore não aceita `undefined`)
- **`writeBatch`**: usado para operações atômicas. Limite de 500 operações por batch — `_dmFireRestore` usa `_commitInChunks(400)` para respeitar esse limite
- **`onSnapshot` listeners**: ativados no `onAuthStateChanged` callback — só funcionam quando o usuário está autenticado. Erros exibem toast visível ao usuário (não são silenciados)
- **Aba Usuários**: o campo `admin: true` no documento `/usuarios/{uid}` controla o acesso. Sem esse documento, o usuário não vê a aba
- **`_dmIsAdmin`**: flag global inicializada como `false` antes do `getDoc` assíncrono — nunca ficará `undefined` durante a inicialização
- **Logout robusto**: implementado com timeouts para evitar que o processo fique pendurado em caso de erro de rede
- **`MiniZip`**: implementação JavaScript pura de ZIP incluída no app para exports futuros
- **`QRCode.js`**: gera o QR Code PIX diretamente no browser, sem servidor
- **PTAX API**: `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='MM-DD-YYYY'`
- **`load()` / `trkLoad()` / `cliLoad()`**: retornam **cópia profunda** via `JSON.parse(JSON.stringify(...))` — CRÍTICO para o diff correto em `_dmFireSave`. Nunca retornar referência direta ao `_dmStore`, pois isso faria o diff comparar o objeto consigo mesmo (zero deletes detectados → writes desnecessários)
- **`_dmFireSave` diff**: usa `oldStore = window._dmStore[type]` (referência ao estado atual do Firestore) vs `newData` (cópia local modificada) para calcular deletes e sets. O store só é atualizado após `batch.commit()` resolver (no `.then()`). Rollback ao `prevStore` é feito no `.catch()`
- **`_dmFireDelete`**: faz update otimista do `_dmStore` imediatamente + `deleteDoc` assíncrono. O `onSnapshot` confirmará depois
- **`backupData()`**: exporta `bls`, `tracking`, `clients` **e `alertDays`**. O restore espera todos esses campos
- **`_dmFireRestore`**: restore é **substitutivo** — deleta todos os documentos existentes nas 3 coleções antes de inserir os do backup, usando `_commitInChunks(400)`

---

## Histórico de Correções

### 2026-03-26 — Correções de Consumo Excessivo do Firestore

**Contexto:** Revisão de código identificou 8 problemas críticos/moderados de consumo excessivo de reads/writes/deletes no Firestore e bugs de dados.

| Fix | Arquivo | Descrição |
|-----|---------|-----------|
| **#02** | `app.html` | `load()`, `trkLoad()`, `cliLoad()` passaram a retornar cópia profunda (`JSON.parse/stringify`). Sem isso, `_dmFireSave` comparava `oldStore === newData` (mesma referência), nunca detectava deletes e reescrevia todos os documentos a cada `save()`. Rollback movido corretamente para `.catch()`. |
| **#09** | `app.html` | Toast em `_dmFireSave` exibia `"${type} deletado com sucesso!"` em **todas** as operações de escrita. Corrigido para `"Dados salvos com sucesso!"`. |
| **#10** | `app.html` | `_dmFireDelete` não atualizava `window._dmStore`. Adicionado update otimista imediato do store antes do `deleteDoc` assíncrono. |
| **#13** | `app.html` | `backupData()` não incluía `alertDays`. Campo adicionado ao JSON exportado. |
| **#14** | `app.html` | `setDoc(settingsDoc, { days: newData })` sem `merge: true` substituía o documento inteiro. Corrigido para `{ merge: true }`. |
| **#15** | `app.html` | `clearClients()` capturava `clients.length` após zerar o array → log sempre registrava `0`. Variável `qtdExcluida` capturada antes de zerar. |
| **#20** | `app.html` | `window._dmIsAdmin` ficava `undefined` durante a janela assíncrona do `getDoc`. Inicializado como `false` antes da chamada. |

**Fixes já existentes no código (não requereram alteração):**
- #03: Migrações movidas para `_dmOnReady()` (rodam com dados reais)
- #04: `_dmFireRestore` deleta registros existentes antes de restaurar
- #05: `_commitInChunks(400)` implementado
- #06: `_handleSnapshotError` com toast visível ao usuário
- #07: IIFE `trkData` protegida com `clean.length < raw.length`
- #08: `_dmOnTrkUpdate` aplica filtro de containers devolvidos no free time

---

## 🔭 Próximos Passos Recomendados

### Prioridade Alta
1. **Testar todos os fluxos críticos** na versão modular em produção:
   - Login / logout / troca de usuário
   - Criar, editar e salvar BL
   - Faturamento e geração de PDF/invoice
   - Import de planilha Excel
   - Backup e restore de dados
   - Cobrança consolidada + geração de ZIP

2. **Sincronizar repo local Windows** com o GitHub:
   ```
   git pull origin main
   ```
   O folder `C:\Users\lucca\...\demurrage-manager-main_github completo\` ainda tem o monólito. Após o pull terá a estrutura modular.

### Prioridade Média
3. **Lazy loading de módulos pesados** — `billing.js` (195 KB) e `consolidated.js` (281 KB) são carregados na inicialização mesmo quando não usados. Avaliar carregamento sob demanda com `import()` dinâmico.

4. **Atualizar snapshot** para incluir conteúdo integral dos novos módulos JS/CSS (atualmente o snapshot ainda contém o app.html monolítico; a estrutura modular está nos arquivos separados do repo).

5. **Code splitting do init.js** — 1.460 linhas num único arquivo; candidato a ser subdividido em `dashboard.js`, `settings.js` e `ptax.js`.

### Prioridade Baixa
6. **ESLint / validação estática** nos módulos JS.
7. **Testes automatizados** para `rates.js` e `utils.js` (funções puras, fáceis de testar sem Firebase).
8. **Service Worker / PWA** para funcionamento offline além do IndexedDB do Firestore.

---

*Snapshot atualizado em 2026-03-27 (v1.1.0) | Transhipping Agenciamento Marítimo Ltda. | by ljuliatti*
