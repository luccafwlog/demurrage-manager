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

## 🗄️ Banco de dados (Supabase)

Mudanças de banco ficam em `supabase/migrations/` e **não** são aplicadas pelo deploy automático.
Para aplicar: Supabase Dashboard → SQL Editor → colar o arquivo → Run. Os arquivos são idempotentes.

O deploy publica só os arquivos do app: `.md`, `.sql`, `supabase/` e arquivos ocultos ficam fora do Hosting (`firebase.json`).
JS/CSS/HTML são servidos com `Cache-Control: no-cache` (revalidam a cada acesso) — não é mais preciso subir `?v=` a cada alteração.

## ⚠️ Segurança

As credenciais ficam nos **GitHub Actions Secrets** e nunca no código. O workflow usa a service account (`FIREBASE_SERVICE_ACCOUNT`) quando o secret existe e, se não existir, o token legado (`FIREBASE_TOKEN`, autenticação descontinuada pelo Firebase).

### Migrar para service account

1. Google Cloud Console do projeto `demurragemanager` → **IAM e administrador → Contas de serviço → Criar conta de serviço**.
2. Papel: **Administrador do Firebase Hosting** (`roles/firebasehosting.admin`).
3. Na conta criada: **Chaves → Adicionar chave → JSON**. O arquivo é baixado uma única vez.
4. GitHub → **Settings → Secrets and variables → Actions → New repository secret**: nome `FIREBASE_SERVICE_ACCOUNT`, valor = conteúdo inteiro do JSON.
5. Depois de um deploy com sucesso (o log mostra "Autenticando com service account"), apague o secret `FIREBASE_TOKEN` e o arquivo JSON do seu computador.

A versão do `firebase-tools` é fixa no workflow. Para atualizar, troque o número nas duas linhas `firebase-tools@…` do `firebase-deploy.yml`.

---
*Configurado em 24/03/2026 — Deploy automático via GitHub Actions*
