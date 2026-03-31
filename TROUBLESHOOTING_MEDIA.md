# Troubleshooting: Mídias no WhatsApp (Evolution API)

## Problema: Imagem/Vídeo não aparece no WhatsApp, apenas o link

### Causa Raiz
Evolution API não consegue acessar/baixar a URL da mídia por uma das razões:
1. `BACKEND_PUBLIC_URL` ou `APP_URL` não está definido
2. URL não é public-accessible (Evolution precisa acessar de fora)
3. URL está expirada ou arquivo foi deletado

---

## Checklist de Diagnóstico

### 1. Verificar Variáveis de Ambiente

```bash
# No seu arquivo .env ou docker-compose.yml
# Verifique se uma dessas está definida:
BACKEND_PUBLIC_URL=https://campaigns.ranoverchat.com.br
APP_URL=https://campaigns.ranoverchat.com.br
```

**Se não estiver, defina com o domínio público acessível:**
- Local: `http://localhost:3000`
- Docker/Internal: `http://campaign-backend:3000`
- Produção: `https://seu-dominio-publico.com`

### 2. Testar Acesso à URL

Execute este comando no servidor ou localmente:

```bash
# Teste se a URL é acessível
curl -I "https://campaigns.ranoverchat.com.br/api/uploads/seu-arquivo.jpg"

# Resposta esperada: 200 OK
# Resposta problemática: 404, 403, Connection refused
```

### 3. Logs do Backend

Procure por logs de envio para Evolution:

```bash
# Procure por linhas como:
# "Sending dynamic media (image) via Evolution (rover) for contact..."
# "Media URL for contact: https://campaigns.ranoverchat.com.br/api/uploads/..."

docker logs seu-container-campaign-backend | grep -i "evolution\|media"
```

### 4. Logs do Evolution

Verifique se o Evolution está tentando baixar a mídia:

```bash
# Procure por erros de download
docker logs seu-container-evolution | grep -i "download\|fail\|error"
```

---

## Soluções

### Solução 1: Definir BACKEND_PUBLIC_URL Corretamente

**No docker-compose.yml (local/development):**
```yaml
environment:
  - BACKEND_PUBLIC_URL=http://campaign-backend:3000
```

**Na produção (YAML.yaml):**
```yaml
environment:
  - BACKEND_PUBLIC_URL=https://campaigns.ranoverchat.com.br
  # ou derive do CHATWOOT_DOMAIN:
  - BACKEND_PUBLIC_URL=https://campaigns.${CHATWOOT_DOMAIN}
```

### Solução 2: Garantir URL Pública Acessível

Se usar domínio pública, configure reverse proxy/nginx:

```nginx
server {
    listen 443 ssl;
    server_name campaigns.ranoverchat.com.br;
    
    location /api/uploads/ {
        proxy_pass http://campaign-backend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Solução 3: Verificar Persistência de Arquivo

Certifique-se que o arquivo permanece no servidor:

```bash
# Verificar se pasta de uploads existe
ls -la backend/uploads/

# Verificar permissões
chmod 755 backend/uploads/
```

---

## Como Funciona Agora

### Flow de Envio de Mídia:

1. **Frontend** → Upload do arquivo
   - Backend retorna: `mediaUrl` (relativa) + `mediaPublicUrl` (absoluta)

2. **Frontend** → Criar campanha
   - Salva ambas URLs no banco de dados

3. **Processor** → Ao enviar campanha
   - Usa `mediaPublicUrl` (URL absoluta)
   - Passa para Evolution ou Chatwoot

4. **Evolution API** → Recebe URL absoluta
   - Download da mídia: `GET https://campaigns.ranoverchat.com.br/api/uploads/file.jpg`
   - Envia para WhatsApp como attachment

5. **WhatsApp Web** → Exibe imagem renderizada

---

## Possíveis Erros e Soluções

| Erro | Causa | Solução |
|------|-------|--------|
| URL vazia na Evolution | `BACKEND_PUBLIC_URL` não definido | Defina `BACKEND_PUBLIC_URL` no `.env` |
| 404 Not Found | Arquivo deletado ou upload falhou | Verifique logs de upload, pasta de uploads |
| Connection refused | Evolution não consegue acessar o servidor | Verifique firewall, se URL é pública |
| Timeout | Arquivo grande ou conexão lenta | Comprimir mídia antes de upload |
| Arquivo corrompido | Upload incompleto | Reupload o arquivo |

---

## Debug Avançado

### Habilitar Logs Detalhados

Adicione ao `.env`:
```
LOG_LEVEL=debug
```

### Rastrear URL Usada

Procure nos logs:
```bash
# Logs do processor
docker logs seu-container | grep "Media URL for contact"

# Logs do Evolution service
docker logs seu-container | grep "Sending Media to Evolution"
```

### Teste Manual com cURL

```bash
# Simular o que Evolution recebe
curl -X POST "http://seuevolution:3000/message/sendMedia/rover" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "557199999999",
    "mediatype": "image",
    "media": "https://campaigns.ranoverchat.com.br/api/uploads/test.jpg",
    "caption": "Teste"
  }'
```

---

## Checklist Final

- [ ] `BACKEND_PUBLIC_URL` definido com domínio acessível
- [ ] URL é pública (não localhost/internal)
- [ ] Arquivo existe em `backend/uploads/`
- [ ] Permissões de arquivo são 755
- [ ] Logs mostram URL absoluta sendo enviada
- [ ] Evolution consegue fazer curl da URL
- [ ] Chatwoot/WhatsApp recebem a imagem

Se ainda não funcionar, compartilhe os logs:
```bash
docker logs seu-container-campaign-backend 2>&1 | grep -i "media\|evolution\|upload" | tail -50
```
