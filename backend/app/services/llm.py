"""
LLM Service using LangChain with OpenAI-compatible API
Migrated from frontend gemini.ts
"""
from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from ..config import settings, prompts


def get_llm() -> Optional[ChatOpenAI]:
    """Get LangChain ChatOpenAI instance."""
    if not settings.OPENAI_API_KEY:
        return None
    
    kwargs = {
        "model": settings.OPENAI_MODEL,
        "api_key": settings.OPENAI_API_KEY,
        "temperature": 0.7,
    }
    if settings.OPENAI_API_BASE:
        kwargs["base_url"] = settings.OPENAI_API_BASE
    
    return ChatOpenAI(**kwargs)


async def generate_dept_monthly_report(
    projects: List[Dict[str, Any]],
    events: List[Dict[str, Any]],
    start_date: str,
    end_date: str
) -> str:
    """Generate department monthly report (3.7.3)."""
    llm = get_llm()
    if not llm:
        return "缺少 API Key。"
    
    # Build context
    context = f"报告周期: {start_date} 至 {end_date}\n\n"
    for p in projects:
        context += f"项目: {p['title']} (状态: {p['status']})\n"
        proj_events = [e for e in events if e.get('project_id') == p['id']]
        if proj_events:
            context += "本周期动态:\n"
            for e in proj_events:
                date_str = e['date'].split('T')[0] if isinstance(e['date'], str) else str(e['date'])[:10]
                context += f"- [{date_str}] {e['type']}: {e['content']}\n"
        else:
            context += "本周期无重大更新记录。\n"
        context += "\n"
    
    prompt_config = prompts.get_prompt("dept_monthly_report")
    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_config.get("system", "你是一个部门项目管理专家。请使用中文输出。")),
        ("user", prompt_config.get("user", "请根据以下数据撰写报告:\n{context}"))
    ])
    
    chain = prompt | llm | StrOutputParser()
    try:
        return await chain.ainvoke({"context": context})
    except Exception as e:
        return f"AI 服务暂时不可用: {str(e)}"


async def generate_project_weekly_report(
    project: Dict[str, Any],
    personal_reports: List[Dict[str, Any]],
    week_range: str
) -> str:
    """Generate project weekly report from personal reports (3.7.2)."""
    llm = get_llm()
    if not llm:
        return "缺少 API Key。"
    
    team_updates = ""
    for r in personal_reports:
        details = r.get('details', [])
        detail = next((d for d in details if d.get('project_id') == project['id']), None)
        if detail:
            team_updates += f"- 成员 {r['username']}: {detail.get('content', '')} (计划: {detail.get('plan', '')})\n"
        elif project['id'] in r.get('linked_project_ids', []):
            team_updates += f"- 成员 {r['username']}: {r.get('content', '')}\n"
    
    if not team_updates:
        return "本周团队成员未提交相关周报，无法自动汇总。"
    
    prompt_config = prompts.get_prompt("project_weekly_report")
    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_config.get("system", "你是项目负责人。请使用中文输出。")),
        ("user", prompt_config.get("user", ""))
    ])
    
    chain = prompt | llm | StrOutputParser()
    try:
        return await chain.ainvoke({
            "project_title": project['title'],
            "week_range": week_range,
            "team_updates": team_updates
        })
    except Exception as e:
        return f"AI 服务异常: {str(e)}"


async def generate_project_report(
    project: Dict[str, Any],
    events: List[Dict[str, Any]],
    tasks: List[Dict[str, Any]],
    start_date: str,
    end_date: str
) -> str:
    """Generate project progress report."""
    llm = get_llm()
    if not llm:
        return "缺少 API Key。请配置环境变量。"
    
    event_text = "\n".join([
        f"- [{e['date'].split('T')[0] if isinstance(e['date'], str) else str(e['date'])[:10]}] ({e['type']}) {e['author_name']}: {e['content']}"
        for e in events
    ]) or "此期间无时间线更新记录。"
    
    if tasks:
        task_text = "\n".join([
            f"- 任务 \"{t['title']}\": 进度 {t['progress']}%, 状态 {t['status']}, 负责人 {len(t.get('assignee_ids', []))}人"
            for t in tasks
        ])
    else:
        task_text = "暂无任务进度数据。"
    
    prompt_config = prompts.get_prompt("project_report")
    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_config.get("system", "你是一个专业的项目管理助手。请使用中文输出Markdown格式。")),
        ("user", prompt_config.get("user", ""))
    ])
    
    chain = prompt | llm | StrOutputParser()
    try:
        return await chain.ainvoke({
            "project_title": project['title'],
            "start_date": start_date,
            "end_date": end_date,
            "description": project.get('description', ''),
            "status": project.get('status', ''),
            "customer": project.get('customer_name', '内部'),
            "event_text": event_text,
            "task_text": task_text
        })
    except Exception as e:
        return f"由于 API 错误，生成报告失败: {str(e)}"


async def generate_personal_report(
    username: str,
    projects: List[Dict[str, Any]],
    inspirations: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Generate personal weekly report suggestions."""
    llm = get_llm()
    if not llm:
        return {"generalSummary": "Mock Summary: No API Key."}
    
    project_context = ""
    for p in projects:
        project_context += f"\nProject ID: {p['id']}\nTitle: {p['title']}\nRecent Activity:\n"
        events = p.get('events', [])
        tasks = p.get('tasks', [])
        if not events and not tasks:
            project_context += "- No updates recorded in system.\n"
        for e in events:
            project_context += f"- (Timeline Event) {e['content']}\n"
        for t in tasks:
            project_context += f"- (Task) \"{t['title']}\": Status {t['status']}, Progress {t['progress']}%\n"
    
    inspiration_context = "\n".join([f"- Shared Idea: {i['content']}" for i in inspirations])
    
    prompt_config = prompts.get_prompt("personal_report")
    prompt = ChatPromptTemplate.from_messages([
        ("system", prompt_config.get("system", "You are an AI assistant that outputs valid JSON only.")),
        ("user", prompt_config.get("user", ""))
    ])
    
    chain = prompt | llm | JsonOutputParser()
    try:
        return await chain.ainvoke({
            "username": username,
            "project_context": project_context,
            "inspiration_context": inspiration_context
        })
    except Exception as e:
        return {"generalSummary": f"生成失败: {str(e)}"}
