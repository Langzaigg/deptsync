# DeptSync - 部门协同管理平台

前后端分离架构版本。

## 项目亮点

### 🚀 AI 赋能的智能汇报体系
DeptSync 深度集成了大语言模型 (LLM)，实现了从个人到部门的全链路智能汇报：

- **个人周报辅助**: AI 根据员工本周的活动日志（任务、会议、代码提交等），自动生成结构化的个人周报，减少机械性工作。
- **项目周报汇总**: 自动聚合团队成员的周报内容，为项目经理生成项目维度的进度周报，智能提炼风险与关键进展。
- **部门综述报告**: 基于各项目周报，生成部门级的月度综述，宏观把控资源投入与产出。

### 🛡️ 数据安全与隐私
- **私有化存储**: 所有文件存储在自托管的 MinIO 对象存储中，支持私有化部署。
- **敏感配置分离**: 支持接入私有化 LLM 模型（兼容 OpenAI 接口），确保核心业务数据不外泄。

### ⚡ 现代化架构
- **前后端分离**: React + FastAPI 的经典组合，开发效率与性能并重。
- **无感代理**: 内置文件反向代理，前端无需直接连接对象存储，简化网络配置。
- **容器化友好**: 设计之初即考虑 Docker 部署，支持云原生环境。

## 技术栈

- **后端**: Python FastAPI + MySQL + LangChain (OpenAI) + MinIO
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

### 1. 基础环境准备

- MySQL 5.7+
- MinIO Object Storage

创建 MySQL 数据库:
```sql
CREATE DATABASE deptsync CHARACTER SET utf8mb4;
```

启动 MinIO 服务 (确保 Access Key / Secret Key 与配置一致)。

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
| MINIO_ENDPOINT | MinIO 地址 | localhost:9000 |
| MINIO_ACCESS_KEY | MinIO 用户名 | minioadmin |
| MINIO_SECRET_KEY | MinIO 密码 | minioadmin |
| MINIO_BUCKET | MinIO 存储桶 | deptsync |
| MINIO_SECURE | MinIO 是否使用 HTTPS | false |

### 前端 (.env)

配置位于 `frontend/.env`，构建时注入。

| 变量 | 说明 | 默认值 |
|------|------|--------|
| VITE_DEPARTMENT_NAME | 部门/系统名称 | DeptSync |
| VITE_LOGIN_HINT | 登录页提示信息 (支持 HTML) | (默认管理员提示) |
| VITE_PAGE_TITLE | 页面标题 | DeptSync - 部门协同管理平台 |

## 文件存储结构

所有文件存储在 MinIO 中，结构如下：

- **项目附件**: `projects/{项目名}/{图片|文档}/{uuid}_filename`
- **周报附件**: `reports/{用户名}/{图片|文档}/{uuid}_filename`

## API 文档

启动后端后访问:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
