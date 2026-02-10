from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from ..services import llm
from ..utils.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/llm", tags=["llm"])


class DeptMonthlyReportRequest(BaseModel):
    projects: List[Dict[str, Any]]
    events: List[Dict[str, Any]]
    start_date: str
    end_date: str


class ProjectWeeklyReportRequest(BaseModel):
    project: Dict[str, Any]
    personal_reports: List[Dict[str, Any]]
    week_range: str


class ProjectReportRequest(BaseModel):
    project: Dict[str, Any]
    events: List[Dict[str, Any]]
    tasks: List[Dict[str, Any]]
    start_date: str
    end_date: str


class PersonalReportRequest(BaseModel):
    projects: List[Dict[str, Any]]
    inspirations: List[Dict[str, Any]]


class LLMResponse(BaseModel):
    content: str


class PersonalReportResponse(BaseModel):
    data: Dict[str, Any]


@router.post("/dept-monthly-report", response_model=LLMResponse)
async def generate_dept_monthly_report(
    request: DeptMonthlyReportRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate department monthly report."""
    result = await llm.generate_dept_monthly_report(
        request.projects,
        request.events,
        request.start_date,
        request.end_date
    )
    return LLMResponse(content=result)


@router.post("/project-weekly-report", response_model=LLMResponse)
async def generate_project_weekly_report(
    request: ProjectWeeklyReportRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate project weekly report from personal reports."""
    result = await llm.generate_project_weekly_report(
        request.project,
        request.personal_reports,
        request.week_range
    )
    return LLMResponse(content=result)


@router.post("/project-report", response_model=LLMResponse)
async def generate_project_report(
    request: ProjectReportRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate project progress report."""
    result = await llm.generate_project_report(
        request.project,
        request.events,
        request.tasks,
        request.start_date,
        request.end_date
    )
    return LLMResponse(content=result)


@router.post("/personal-report", response_model=PersonalReportResponse)
@router.post("/generate-personal-report", response_model=PersonalReportResponse)
async def generate_personal_report(
    request: PersonalReportRequest,
    current_user: User = Depends(get_current_user)
):
    """Generate personal weekly report suggestions."""
    result = await llm.generate_personal_report(
        str(current_user.username),
        request.projects,
        request.inspirations
    )
    return PersonalReportResponse(data=result)


# 通用报告生成端点
@router.post("/generate-report")
async def generate_report(
    request: dict,
    current_user: User = Depends(get_current_user)
):
    """通用报告生成端点，根据report_type路由到不同的生成器"""
    report_type = request.get("report_type", "")
    
    try:
        if report_type == "project":
            # 项目报告
            result = await llm.generate_project_report(
                request.get("project", {}),
                request.get("events", []),
                request.get("tasks", []),
                request.get("start_date", ""),
                request.get("end_date", "")
            )
            return {"content": result, "type": "project"}
            
        elif report_type == "dept_monthly":
            # 部门月报
            result = await llm.generate_dept_monthly_report(
                request.get("projects", []),
                request.get("events", []),
                request.get("start_date", ""),
                request.get("end_date", "")
            )
            return {"content": result, "type": "dept_monthly"}
            
        elif report_type == "project_weekly":
            # 项目周报
            result = await llm.generate_project_weekly_report(
                request.get("project", {}),
                request.get("personal_reports", []),
                request.get("week_range", "")
            )
            return {"content": result, "type": "project_weekly"}
            
        elif report_type == "personal":
            # 个人报告
            result = await llm.generate_personal_report(
                str(current_user.username),
                request.get("projects", []),
                request.get("inspirations", [])
            )
            return {"data": result, "type": "personal"}
            
        else:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=400,
                detail=f"不支持的报告类型: {report_type}。支持的类型: project, dept_monthly, project_weekly, personal"
            )
            
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=500,
            detail=f"生成报告时出错: {str(e)}"
        )
