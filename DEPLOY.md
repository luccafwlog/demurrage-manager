# Demurrage Manager — Deploy Automático

## 🚀 Como funciona

Qualquer alteração feita nos arquivos e enviada para o GitHub dispara automaticamente um deploy no Firebase Hosting.

## 📋 Fluxo de trabalho

```
Você edita um arquivo → Salva → Git push → GitHub Actions → Firebase Hosting atualizado ✅
```

## 🔧 Configuração

| Item | Valor |
|------|-------|
| Repositório GitHub | https://github.com/luccafwlog/demurrage-manager |
| Firebase Project | demurragemanager |
| Site publicado | https://demurragemanager.web.app |
| Branch principal | main |
| Workflow | .github/workflows/firebase-deploy.yml |

## 📦 Arquivos do projeto

- `index.html` — Página inicial
- `app.html` — Aplicação principal
- `firebase.json` — Configuração do Firebase Hosting
- `firestore.rules` — Regras do Firestore
- `.github/workflows/firebase-deploy.yml` — Pipeline de deploy automático

## ⚠️ Segurança

O token do Firebase (`FIREBASE_TOKEN`) está armazenado de forma segura nos **GitHub Actions Secrets** e nunca fica exposto no código.

---
*Configurado em 24/03/2026 — Deploy automático via GitHub Actions*
