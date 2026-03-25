# 🚀 Deploy Firebase Hosting - Demurrage Manager

Seus arquivos estão prontos para deploy! Escolha uma das opções abaixo:

---

## ✅ Opção 1: Deploy via Firebase Console (MAIS FÁCIL)

1. Acesse: https://console.firebase.google.com/project/demurragemanager/hosting
2. Clique em **"Iniciar"** ou **"Adicionar site"** (se for primeira vez)
3. Clique em **"Upload de arquivo"**
4. Selecione TODOS os arquivos dessa pasta:
   - `app.html`
   - `index.html`
   - `firebase.json`
5. Clique em **Upload**

**Seu site estará em:**
```
https://demurragemanager.web.app
https://demurragemanager.firebaseapp.com
```

---

## 🔧 Opção 2: Deploy via CLI (Automático)

Se preferir usar terminal:

```bash
# 1. Ir para a pasta
cd /sessions/great-bold-cori/firebase-hosting

# 2. Fazer login (abre browser)
npx -y firebase-tools@latest login

# 3. Definir projeto
npx -y firebase-tools@latest use demurragemanager

# 4. Fazer deploy
npx -y firebase-tools@latest deploy --only hosting

# 5. Seu site estará em:
# https://demurragemanager.web.app
```

---

## 📝 Arquivos Incluídos:

✅ `app.html` - Aplicação principal (721KB)
✅ `index.html` - Tela de login (15KB)
✅ `firebase.json` - Configuração do hosting

---

## 🎯 Próximos passos:

1. Faça o deploy (escolha opção 1 ou 2)
2. Acesse seu site em: https://demurragemanager.web.app
3. Teste o login e a exclusão de dados
4. Pronto! 🎉

---

## 📌 Notas importantes:

- **Ilimitado de deploys** - Pode fazer deploy quantas vezes quiser
- **Gratuito** - Sem cobranças adicionais
- **Domínio personalizado** - Você pode adicionar seu próprio domínio depois
- **SSL/HTTPS automático** - Seu site já tem certificado de segurança

Qualquer dúvida, é só chamar! 🚀
