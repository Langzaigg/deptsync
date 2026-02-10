# DeptSync - 部门协同管理平台

前后端分离架构版本。

## 技术栈

- **后端**: Python FastAPI + MySQL + LangChain (OpenAI)
- **前端**: React + TypeScript + Vite
- **代理**: 开发环境 Vite 代理 / 生产环境 Node Express 代理

## 目录结构

```
deptsync/
├── backend/         # FastAPI 后端
│   ├── app/         # 应用代码
│   └── requirements.txt
├── frontend/        # React 前端
│   ├── src/         # 源代码
│   ├── server.js    # 生产代理服务
│   └── package.json
└── README.md
```

## 快速开始

### 1. 配置数据库

创建 MySQL 数据库:
```sql
CREATE DATABASE deptsync CHARACTER SET utf8mb4;
```

### 2. 启动后端

```bash
cd backend
pip install -r requirements.txt

# 配置环境变量 (复制并修改)
cp .env.example .env

# 启动开发服务器
uvicorn app.main:app --reload --port 8000
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

### 4. 访问应用

打开 http://localhost:3000

默认管理员账号: `admin` / `admin`

## 生产部署

```bash
# 构建前端
cd frontend
npm run build

# 启动 Node 代理服务 (单端口暴露)
npm run serve

# 同时保持后端运行
cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 环境变量

### 后端 (.env)

| 变量 | 说明 | 默认值 |
|------|------|--------|
| MYSQL_HOST | MySQL 主机 | localhost |
| MYSQL_PORT | MySQL 端口 | 3306 |
| MYSQL_USER | MySQL 用户 | root |
| MYSQL_PASSWORD | MySQL 密码 | deptsync |
| MYSQL_DATABASE | 数据库名 | deptsync |
| OPENAI_API_BASE | OpenAI API 地址 | (空) |
| OPENAI_API_KEY | OpenAI API 密钥 | - |
| OPENAI_MODEL | 模型名称 | gpt-4o |

## API 文档

启动后端后访问:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
