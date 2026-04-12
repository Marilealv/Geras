# 🤝 Geras - Sistema de Doações para Idosos

Plataforma web para conectar doadores com instituições de cuidado a idosos, permitindo que doadores saibam exatamente quem está ajudando e quais são as necessidades reais.

---

## 📁 Estrutura do Projeto

```
Geras/
├── frontend/                 # App React + TypeScript
│   ├── src/
│   │   ├── app/
│   │   │   ├── lib/        # Utilidades (auth, uploads)
│   │   │   ├── pages/      # Páginas da aplicação
│   │   │   └── components/ # Componentes UI (Shadcn)
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                  # API Node.js + Express
│   ├── server/
│   │   ├── index.js        # Servidor principal com todas as rotas
│   │   ├── db.js           # Configuração PostgreSQL
│   │   └── services/
│   │       └── cloudinary.js # Integração Cloudinary
│   ├── sql/
│   │   └── 001_core_schema.sql # Schema do banco com triggers
│   ├── .env.example
│   ├── package.json
│   └── API_DOCUMENTATION.md # Documentação detalhada da API
│
├── guidelines/               # Documentação do projeto
│   └── Guidelines.md
│
├── README.md               # Este arquivo
├── package.json            # Dependências raiz
└── vite.config.ts

```

---

## 🚀 Começar Rápido

### Pré-requisitos
- Node.js 18+ e npm
- PostgreSQL (Neon ou local)
- Conta Cloudinary

### 1. Clonar e Instalar Dependências

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../backend
npm install
```

### 2. Configurar Variáveis de Ambiente

**Backend** (`backend/.env`):
```env
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/geras
JWT_SECRET=gere-com-openssl-rand-base64-32
CLOUDINARY_CLOUD_NAME=seu-cloud-name
CLOUDINARY_API_KEY=sua-api-key
CLOUDINARY_API_SECRET=seu-api-secret
```

### 3. Criar Schema do Banco

```bash
# Conectar ao PostgreSQL e executar:
psql postgresql://user:pass@host:5432/geras -f backend/sql/001_core_schema.sql
```

### 4. Iniciar Servidores

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev:api
# Rodará em http://localhost:3001
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# Rodará em http://localhost:5173
```

---

## 📚 Documentação Completa

### Frontend
- **Páginas**: 
  - `register.tsx` - Cadastro de donatário
  - `login.tsx` - Autenticação
  - `cadastrar-instituicao.tsx` - Registro de instituição
  - `cadastrar-idoso.tsx` - Registro de idoso com necessidades
  - `dashboard.tsx` - Dashboard principal
  - `perfil-idoso.tsx` - Detalhes e edição de idoso

- **Utilidades**:
  - `lib/auth.ts` - Gerenciamento de JWT e localStorage
  - `lib/uploads.ts` - Upload de imagens para Cloudinary
  - `config/api.ts` - Configuração de URLs de API

### Backend
- **Rotas de Autenticação**:
  - `POST /api/auth/register` - Criar conta
  - `POST /api/auth/login` - Autenticar

- **Rotas de Upload**:
  - `POST /api/uploads/image` - Upload com categorização automática

- **Rotas de Instituições**:
  - `POST /api/instituicoes` - Criar instituição
  - `GET /api/instituicoes/me` - Minha instituição
  - `PUT /api/instituicoes/me` - Atualizar instituição

- **Rotas de Idosos**:
  - `POST /api/idosos` - Criar idoso
  - `GET /api/idosos` - Listar idosos
  - `GET /api/idosos/:id` - Detalhes do idoso
  - `PUT /api/idosos/:id` - Atualizar idoso
  - `DELETE /api/idosos/:id` - Remover idoso

**Documentação API Completa**: Ver [backend/API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md)

---

## 🗂️ Fluxo de Imagens

### Cloudinary Folder Structure
```
home/
└── geras/
    ├── idosos/       ← Fotos de idosos (upload via "idosos")
    └── instituicoes/ ← Logos de instituições (upload via "instituicoes")
```

### Fluxo Frontend
```
User selects image
    ↓
uploadImageToCloudinary(file, type)
    ↓
POST /api/uploads/image { image, type }
    ↓
Backend uploads to Cloudinary na pasta correta
    ↓
INSERT INTO imagens (cloudinary_public_id, cloudinary_url, ...)
    ↓
Return { imagem: { id, url, publicId } }
    ↓
Frontend sends imagemId to cadastro endpoint
    ↓
Backend INSERT idoso/instituicao com imagem_id FK
    ↓
API responses resolvem URL via LEFT JOIN imagens
```

---

## 🔐 Segurança

### Autenticação
- JWT tokens com expiração de 1 dia
- Senhas hasheadas com bcrypt (12 rounds)
- Email normalizado (lowercase) para consistência

### Banco de Dados
- Triggers automáticas para `atualizado_em`
- Auditoria JSONB em `logs_auditoria` para todas operações
- Restrições de integridade:
  - 1 instituição por usuário
  - 1:many idosos por instituição
  - FK imutáveis (não permite alteração de `usuario_id`, `instituicao_id`, `cloudinary_public_id`)

### Upload de Imagens
- Validação de tipo MIME
- Armazenamento centralizado em Cloudinary
- Metadados separados em tabela `imagens`

---

## 🛠️ Desenvolvimento

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, React Router, Shadcn UI
- **Backend**: Node.js, Express, PostgreSQL, JWT, bcrypt, Cloudinary
- **Infrastructure**: Neon (PostgreSQL serverless), Render (Backend), Vercel/Netlify (Frontend)

### Scripts Úteis

**Frontend**:
```bash
npm run dev          # Iniciar com hot reload
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # ESLint
```

**Backend**:
```bash
npm run dev:api      # Iniciar servidor com nodemon
npm run start        # Iniciar servidor
# Não há build, roda JavaScript direto
```

### Dependências Principais

**Frontend**:
- react-router-dom: Roteamento
- lucide-react: Ícones
- sonner: Toast notifications

**Backend**:
- express: Framework web
- pg: PostgreSQL client
- bcrypt: Password hashing
- jsonwebtoken: JWT
- multer: Upload de arquivos
- cloudinary: Serviço de imagem
- streamifier: Converter buffer em stream

---

## 📊 Modelo de Dados

### Tabelas Principais

**usuarios**
- Armazena usuários (donatários e moderadores)
- Campos: id, email, senha, tipo_usuario, nome_responsavel, telefone

**imagens**
- Centralizador de metadados de imagens do Cloudinary
- Campos: id, cloudinary_public_id, cloudinary_url, mime_type, bytes, largura, altura

**instituicoes**
- Uma por usuário donatário
- Referencia imagens via FK `imagem_id`
- Status: pendente, aprovada, rejeitada

**idosos**
- Múltiplos por instituição
- Referencia imagens via FK `imagem_id`
- Contém dados pessoais e histórico de vida

**idoso_necessidades**
- Necessidades/desejos de cada idoso
- Tipos: urgente, desejado

**logs_auditoria**
- Captura JSONB de antes/depois para todas operações DML
- Rastreabilidade completa

---

## 🧪 Testando Manualmente

### Fluxo Completo

1. **Registrar Donatário**
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "senha": "senha123",
    "tipo": "donatario",
    "nomeResponsavel": "João Silva",
    "telefone": "(11) 98765-4321"
  }'
```

2. **Login**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@example.com",
    "senha": "senha123"
  }'
# Salvar token retornado
```

3. **Upload de Logo**
```bash
curl -X POST http://localhost:3001/api/uploads/image \
  -H "Authorization: Bearer {token}" \
  -F "image=@/path/to/logo.jpg" \
  -F "type=instituicoes"
# Salvar imagem.id retornado
```

4. **Cadastrar Instituição**
```bash
curl -X POST http://localhost:3001/api/instituicoes \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "nomeInstituicao": "Asilo Vida",
    "cnpj": "12.345.678/0001-90",
    "endereco": "Rua A, 123",
    "cidade": "São Paulo",
    "estado": "SP",
    "cep": "01234-567",
    "telefone": "(11) 3123-4567",
    "imagemId": {imagem_id}
  }'
```

5. **Upload de Foto de Idoso**
```bash
curl -X POST http://localhost:3001/api/uploads/image \
  -H "Authorization: Bearer {token}" \
  -F "image=@/path/to/photo.jpg" \
  -F "type=idosos"
# Salvar imagem.id retornado
```

6. **Cadastrar Idoso**
```bash
curl -X POST http://localhost:3001/api/idosos \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Maria Silva",
    "idade": 78,
    "fotoImagemId": {foto_imagem_id},
    "necessidades": [
      {"item": "Fraldas", "tipo": "urgente"}
    ]
  }'
```

---

## 📝 Notas Importantes

### Pastas do Cloudinary
- **idosos**: Fotos de pessoas idosas (resolvido automaticamente quando `type: "idosos"`)
- **instituicoes**: Imagens de instituições/logos (resolvido automaticamente quando `type: "instituicoes"`)

### Timestamps Automáticos
- `criado_em`: Preenchido automaticamente no INSERT
- `atualizado_em`: Preenchido no INSERT e atualizado automaticamente em UPDATEs via trigger

### Auditoria
- Toda mudança em dados é capturada em `logs_auditoria`
- Guardar JSONB antes e depois para rastreamento completo

---

## 🐛 Troubleshooting

### Erro: "Cloudinary não configurado"
- Verificar variáveis de ambiente em `backend/.env`
- Certificar que `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` estão setadas

### Erro: "Token inválido"
- Token pode ter expirado (1 dia)
- Fazer novo login para obter novo token

### Erro: "Usuario já possui instituição"
- Um usuário só pode ter 1 instituição
- Para criar outra, registrar novo usuário

### Imagens não aparecem
- Certificar que pasta no Cloudinary existe: `home/geras/idosos` ou `home/geras/instituicoes`
- Certificar que `type` foi enviado corretamente no upload

---

## 📞 Support

Para issues, abrir na aba Issues do GitHub.
Para documentação completa, ver [API_DOCUMENTATION.md](backend/API_DOCUMENTATION.md).

---

**Desenvolvido com ❤️ para ajudar idosos**

Versão: 1.0.0  
Última atualização: Abril 2026
