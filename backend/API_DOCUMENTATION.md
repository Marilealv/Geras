# API Geras - Documentação

## 📋 Visão Geral

API Node.js + Express para gerenciar doações, instituições e idosos. 
Autenticação via JWT, imagens armazenadas em Cloudinary.

**Base URL**: `http://localhost:3001/api`

---

## 🔐 Autenticação

Todos os endpoints protegidos requerem header `Authorization: Bearer {token}`

### POST `/auth/register` - Registrar Usuário
Cria novo usuário (donatário ou moderador)

**Body**:
```json
{
  "email": "usuario@email.com",
  "senha": "senha123",
  "tipo": "donatario",
  "nomeResponsavel": "João Silva",
  "telefone": "(11) 98765-4321"
}
```

**Response** (201):
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "usuario@email.com",
    "tipo": "donatario",
    "nome": "João Silva",
    "telefone": "(11) 98765-4321"
  }
}
```

### POST `/auth/login` - Login
Autentica usuário e retorna token JWT

**Body**:
```json
{
  "email": "usuario@email.com",
  "senha": "senha123"
}
```

**Response** (200):
```json
{
  "token": "eyJhbGc...",
  "user": { ... }
}
```

**Regras de segurança**:
- Após 5 tentativas falhas consecutivas, a conta (por email) fica bloqueada por 5 minutos.
- Durante o bloqueio, o endpoint retorna status `423 Locked`.

**Response** (423):
```json
{
  "message": "Conta bloqueada temporariamente. Tente novamente em 5 minutos.",
  "bloqueadoAte": "2026-04-13T15:45:00.000Z"
}
```

### POST `/auth/logout` - Logout
Revoga o token atual para impedir reutilizacao em novas requisicoes.

**Headers**:
- `Authorization: Bearer {token}` (obrigatorio)

**Response** (204): sem conteudo

**Observacoes**:
- Token revogado passa a retornar `401` nas rotas protegidas.
- A revogacao vale ate o vencimento natural do JWT.

---

## 📸 Upload de Imagens

### POST `/uploads/image` - Upload de Imagem
Faz upload de imagem para Cloudinary com categorização automática

**Headers**:
- `Authorization: Bearer {token}` (obrigatório)

**Body** (FormData):
- `image`: File (obrigatório)
- `type`: "idosos" | "instituicoes" (obrigatório)

**Comportamento**:
- `type: "idosos"` → Pasta: `home/geras/idosos`
- `type: "instituicoes"` → Pasta: `home/geras/instituicoes`
- Metadados armazenados na tabela `imagens`
- Retorna `imagemId` para usar em cadastros

**Response** (201):
```json
{
  "imagem": {
    "id": 5,
    "url": "https://res.cloudinary.com/...",
    "publicId": "home/geras/idosos/abc123xyz"
  }
}
```

**Exemplo Frontend**:
```typescript
// Upload de foto de idoso
const formData = new FormData();
formData.append("image", fotoFile);
formData.append("type", "idosos");

const response = await fetch("/api/uploads/image", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
  body: formData
});

const { imagem } = await response.json();
const fotoImagemId = imagem.id; // Use para cadastrar idoso
```

---

## 🏢 Instituições

### POST `/instituicoes` - Cadastrar Instituição
Cria instituição para usuário (1 por usuário)

**Headers**: `Authorization: Bearer {token}`

**Body**:
```json
{
  "nomeInstituicao": "Asilo Vida Feliz",
  "cnpj": "12.345.678/0001-90",
  "endereco": "Rua A, 123",
  "cidade": "São Paulo",
  "estado": "SP",
  "cep": "01234-567",
  "telefone": "(11) 3123-4567",
  "descricao": "Asilo especializado em cuidados",
  "imagemId": 5
}
```

**Response** (201):
```json
{
  "instituicao": {
    "id": 1,
    "nome": "Asilo Vida Feliz",
    "cnpj": "12.345.678/0001-90",
    "imagem_url": "https://res.cloudinary.com/...",
    "status": "pendente"
  }
}
```

### GET `/instituicoes/me` - Minha Instituição
Busca instituição do usuário autenticado

**Headers**: `Authorization: Bearer {token}`

**Response** (200):
```json
{
  "instituicao": { ... }
}
```

### PUT `/instituicoes/me` - Atualizar Instituição
Atualiza dados da instituição (suporta atualização parcial)

**Headers**: `Authorization: Bearer {token}`

**Body**: (todos os campos são opcionais)
```json
{
  "nome": "Novo Nome",
  "imagemId": 10,
  "status": "aprovada"
}
```

**Response** (200):
```json
{
  "instituicao": { ... }
}
```

---

## 👴 Idosos

### POST `/idosos` - Cadastrar Idoso
Cria novo registro de idoso com necessidades

**Headers**: `Authorization: Bearer {token}`

**Requer**: Instituição cadastrada para o usuário

**Body**:
```json
{
  "nome": "Maria Silva",
  "idade": 78,
  "dataAniversario": "1945-03-15",
  "fotoImagemId": 5,
  "historia": "Vida de trabalho e família",
  "hobbies": "Leitura, jardinagem",
  "musicaFavorita": "Músicas antigas",
  "comidaFavorita": "Bolo de chocolate",
  "necessidades": [
    { "item": "Fraldas geriátricas", "tipo": "urgente" },
    { "item": "Livros de mistério", "tipo": "desejado" }
  ]
}
```

**Response** (201):
```json
{
  "idoso": {
    "id": 1,
    "nome": "Maria Silva",
    "idade": 78,
    "foto_url": "https://res.cloudinary.com/...",
    "necessidades": [ ... ]
  }
}
```

### GET `/idosos` - Listar Idosos
Lista todos os idosos da instituição do usuário

**Headers**: `Authorization: Bearer {token}`

**Response** (200):
```json
{
  "idosos": [
    {
      "id": 1,
      "nome": "Maria Silva",
      "idade": 78,
      "foto_url": "https://res.cloudinary.com/..."
    }
  ]
}
```

### GET `/idosos/:id` - Detalhes do Idoso
Busca idoso específico com necessidades

**Headers**: `Authorization: Bearer {token}`

**Response** (200):
```json
{
  "idoso": {
    "id": 1,
    "nome": "Maria Silva",
    "idade": 78,
    "foto_url": "https://res.cloudinary.com/...",
    "necessidades": [
      { "id": 1, "item": "Fraldas", "tipo": "urgente" }
    ]
  }
}
```

### PUT `/idosos/:id` - Atualizar Idoso
Atualiza dados do idoso (suporta atualização parcial)

**Headers**: `Authorization: Bearer {token}`

**Body**: (todos os campos são opcionais, necessidades substitui a lista anterior)
```json
{
  "nome": "Maria da Silva",
  "idade": 79,
  "necessidades": [
    { "item": "Fraldas geriátricas", "tipo": "urgente" },
    { "item": "Remédios para pressão", "tipo": "urgente" }
  ]
}
```

**Response** (200):
```json
{
  "idoso": { ... }
}
```

### DELETE `/idosos/:id` - Remover Idoso
Remove idoso e suas necessidades associadas

**Headers**: `Authorization: Bearer {token}`

**Response** (204): Sem conteúdo

---

## 🗂️ Estrutura de Pastas no Cloudinary

```
cloud_name/
└── home/
    └── geras/
        ├── idosos/       ← Fotos de idosos
        │   ├── user1_abc123.jpg
        │   ├── user2_def456.jpg
        └── instituicoes/ ← Logos e fotos de instituições
            ├── user3_ghi789.jpg
            └── user4_jkl012.jpg
```

---

## 🛡️ Respostas de Erro

### 400 - Bad Request
```json
{
  "message": "Descrição do erro de validação"
}
```

### 401 - Unauthorized
```json
{
  "message": "Token invalido ou expirado."
}
```

### 423 - Locked
```json
{
  "message": "Conta bloqueada temporariamente. Tente novamente em 5 minutos.",
  "bloqueadoAte": "2026-04-13T15:45:00.000Z"
}
```

### 404 - Not Found
```json
{
  "message": "Recurso nao encontrado."
}
```

### 409 - Conflict
```json
{
  "message": "Email ja cadastrado" / "Usuario ja possui instituicao"
}
```

### 500 - Server Error
```json
{
  "message": "Erro interno ao processar requisição."
}
```

---

## 📋 Fluxo Completo de Uso

### 1. Registrar novo usuário (donatário)
```bash
POST /auth/register
Body: { email, senha, tipo: "donatario", nomeResponsavel, telefone }
```

### 2. Login
```bash
POST /auth/login
Body: { email, senha }
ReturnValue: { token, user }
```

### 3. Fazer upload de logo da instituição
```bash
POST /uploads/image
Headers: Authorization: Bearer {token}
Body: FormData { image: File, type: "instituicoes" }
ReturnValue: { imagem: { id, url, publicId } }
```

### 4. Cadastrar instituição
```bash
POST /instituicoes
Headers: Authorization: Bearer {token}
Body: { ... dados da instituição ..., imagemId: {resultado do upload} }
```

### 5. Upload de foto de idoso
```bash
POST /uploads/image
Headers: Authorization: Bearer {token}
Body: FormData { image: File, type: "idosos" }
ReturnValue: { imagem: { id, url, publicId } }
```

### 6. Cadastrar idoso
```bash
POST /idosos
Headers: Authorization: Bearer {token}
Body: { ... dados do idoso ..., fotoImagemId: {resultado do upload} }
```

### 7. Listar idosos
```bash
GET /idosos
Headers: Authorization: Bearer {token}
```

---

## 🗄️ Tabelas do Banco

| Tabela | Descrição | Chaves |
|--------|-----------|--------|
| `usuarios` | Usuários do sistema | `id` (PK), `email` (UNIQUE) |
| `imagens` | Metadados de imagens | `id` (PK), `cloudinary_public_id` (UNIQUE) |
| `instituicoes` | Instituições de cuidado | `id` (PK), `usuario_id` (UNIQUE, FK) |
| `idosos` | Idosos sob cuidado | `id` (PK), `instituicao_id` (FK) |
| `idoso_necessidades` | Necessidades dos idosos | `id` (PK), `idoso_id` (FK) |
| `logs_auditoria` | Log de operações | `id` (PK) |

---

## 🔄 Relacionamentos

```
usuarios (1) ──→ (many) instituicoes
             ├─→ (many) imagens

instituicoes (1) ──→ (many) idosos
             └─→ (1) imagens

idosos (1) ──→ (many) idoso_necessidades
       └─→ (1) imagens

logs_auditoria (many) ──→ Qualquer tabela (via operação/registro_id)
```

---

## 📝 Variáveis de Ambiente

```env
# Servidor
PORT=3001

# Banco de Dados PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/geras

# Autenticação JWT
JWT_SECRET=seu-segredo-muito-forte-aqui

# Cloudinary
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret
```

---

## 🚀 Iniciar o Servidor

```bash
cd backend
npm install
npm run dev:api
```

Servidor rodará em `http://localhost:3001`

---

**Última atualização**: Abril 2026
**Versão**: 1.0.0
