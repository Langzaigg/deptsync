from pydantic_settings import BaseSettings
from typing import Optional, Dict, Any
import yaml
import os


class PromptsConfig:
    """Prompts configuration loaded from YAML file."""
    
    def __init__(self, prompts_file: Optional[str] = None):
        self.prompts: Dict[str, Any] = {}
        if prompts_file is None:
            # 默认在 app 目录下查找 prompts.yaml
            prompts_file = os.path.join(os.path.dirname(__file__), "prompts.yaml")
        self._load_prompts(prompts_file)
    
    def _load_prompts(self, file_path: str):
        """Load prompts from YAML file."""
        if os.path.exists(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                self.prompts = yaml.safe_load(f) or {}
        else:
            # 如果文件不存在，使用默认提示词
            self.prompts = self._get_default_prompts()
    
    def _get_default_prompts(self) -> Dict[str, Any]:
        """Get default prompts if YAML file not found."""
        return {
            "dept_monthly_report": {
                "system": "你是一个部门项目管理专家。请使用中文输出。",
                "user": "请根据以下项目数据，撰写一份《部门项目综述报告》。\n\n结构要求:\n1. **总体概况**: 本周期项目总体推进情况、前期任务转化率、重点项目状态。\n2. **重点项目进展**: 挑选 3-5 个有实质进展或里程碑的项目进行详细描述。\n3. **资源与协作**: 基于项目动态，分析资源投入情况（如有提到）。\n4. **风险与预警**: 识别进度停滞或有问题的项目。\n5. **下步规划建议**: 基于当前状态给出建议。\n\n输入数据:\n{context}"
            },
            "project_weekly_report": {
                "system": "你是项目负责人。请使用中文输出。",
                "user": '你是项目 "{project_title}" 的负责人。请根据团队成员提交的个人周报，汇总生成本项目的【项目周报】。\n周期: {week_range}\n\n团队成员汇报:\n{team_updates}\n\n请按照以下模板生成:\n1. **本周进展**: 整合大家的完成情况，不要简单的罗列，要概括。\n2. **存在问题**: 提取汇报中提到的困难或阻碍。\n3. **下周计划**: 整合大家的下周计划。\n4. **工时概览**: (简要提及大家的主要投入方向)'
            },
            "project_report": {
                "system": "你是一个专业的项目管理助手。请使用中文输出Markdown格式。",
                "user": '请为项目 "{project_title}" 生成一份进度报告。\n报告周期: {start_date} 至 {end_date}。\n\n项目基础信息:\n- 描述: {description}\n- 当前状态: {status}\n- 客户: {customer}\n\n【时间线动态】:\n{event_text}\n\n【任务进度概览】:\n{task_text}\n\n请按照以下结构生成报告 (Markdown 格式):\n# {start_date} 至 {end_date} 项目进度报告\n\n## 1. 执行摘要\n[简要总结本周期的核心进展]\n\n## 2. 详细进展\n[结合时间线事件和任务进度进行描述]\n\n## 3. 风险与问题\n[基于标记为 ISSUE 的事件或进度滞后的任务]\n\n## 4. 后续计划与建议\n[基于当前状态的建议]'
            },
            "personal_report": {
                "system": "You are an AI assistant that outputs valid JSON only.",
                "user": 'You are helping employee "{username}" write their weekly report.\nBased on the following activity logs, generate a JSON object.\n\nDATA:\n{project_context}\n\nINSPIRATIONS/IDEAS SHARED:\n{inspiration_context}\n\nOUTPUT FORMAT (Strict JSON):\n{{\n   "[PROJECT_ID_1]": {{\n       "content": "Summarize work done...",\n       "plan": "Suggest next steps..."\n   }},\n   "generalSummary": "A brief overall summary of the week."\n}}\n\nLanguage: Chinese (Simplified).\nOutput raw JSON only, no markdown formatting.'
            }
        }
    
    def get_prompt(self, key: str) -> Dict[str, str]:
        """Get prompt by key. Returns dict with 'system' and 'user' keys."""
        return self.prompts.get(key, {})


class Settings(BaseSettings):
    # MySQL Configuration
    MYSQL_HOST: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "deptsync"
    MYSQL_DATABASE: str = "deptsync"

    # JWT Configuration
    SECRET_KEY: str = "deptsync-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # OpenAI Configuration
    OPENAI_API_BASE: Optional[str] = None
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"

    # MinIO Configuration
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    MINIO_BUCKET: str = "deptsync"
    MINIO_SECURE: bool = False

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DATABASE}"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
prompts = PromptsConfig()
