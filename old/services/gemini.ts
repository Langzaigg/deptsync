import { GoogleGenAI } from "@google/genai";
import { TimelineEvent, Inspiration, Project, WeeklyReport, TaskAssignment } from "../types";

const getAIClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY not set. AI features will mock a response.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// 3.7.3 分公司项目月报汇总
export const generateDeptMonthlyReport = async (
  projects: Project[],
  events: TimelineEvent[],
  startDate: string,
  endDate: string
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "缺少 API Key。";

  let context = `报告周期: ${startDate} 至 ${endDate}\n\n`;
  
  projects.forEach(p => {
      context += `项目: ${p.title} (状态: ${p.status})\n`;
      const projEvents = events.filter(e => e.projectId === p.id);
      if (projEvents.length > 0) {
          context += `本周期动态:\n`;
          projEvents.forEach(e => context += `- [${e.date.split('T')[0]}] ${e.type}: ${e.content}\n`);
      } else {
          context += `本周期无重大更新记录。\n`;
      }
      context += `\n`;
  });

  const prompt = `
    你是一个部门项目管理专家。请根据以下项目数据，撰写一份《部门项目综述报告》。
    请使用中文输出。
    
    结构要求:
    1. **总体概况**: 本周期项目总体推进情况、前期任务转化率、重点项目状态。
    2. **重点项目进展**: 挑选 3-5 个有实质进展或里程碑的项目进行详细描述。
    3. **资源与协作**: 基于项目动态，分析资源投入情况（如有提到）。
    4. **风险与预警**: 识别进度停滞或有问题的项目。
    5. **下步规划建议**: 基于当前状态给出建议。

    输入数据:
    ${context}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "生成失败";
  } catch (error) {
    console.error("AI Error:", error);
    return "AI 服务暂时不可用。";
  }
};

// 3.7.2 AI 汇总个人周报 -> 项目周报 (Deprecated in favor of Timeline+Tasks approach for this version)
export const generateProjectWeeklyReport = async (
    project: Project,
    personalReports: WeeklyReport[],
    weekRange: string
): Promise<string> => {
    const ai = getAIClient();
    if (!ai) return "缺少 API Key。";

    let teamUpdates = "";
    personalReports.forEach(r => {
        // Find details specific to this project
        const detail = r.details?.find(d => d.projectId === project.id);
        if (detail) {
            teamUpdates += `- 成员 ${r.username}: ${detail.content} (计划: ${detail.plan})\n`;
        } else if (r.linkedProjectIds.includes(project.id)) {
            // Fallback to full content if structure is missing (legacy)
            teamUpdates += `- 成员 ${r.username}: ${r.content}\n`;
        }
    });

    if (!teamUpdates) return "本周团队成员未提交相关周报，无法自动汇总。";

    const prompt = `
      你是项目 "${project.title}" 的负责人。请根据团队成员提交的个人周报，汇总生成本项目的【项目周报】。
      周期: ${weekRange}
      
      团队成员汇报:
      ${teamUpdates}
      
      请按照以下模板生成:
      1. **本周进展**: 整合大家的完成情况，不要简单的罗列，要概括。
      2. **存在问题**: 提取汇报中提到的困难或阻碍。
      3. **下周计划**: 整合大家的下周计划。
      4. **工时概览**: (简要提及大家的主要投入方向)
    `;

    try {
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
        });
        return response.text || "生成失败";
    } catch (error) {
        return "AI 服务异常。";
    }
};

export const generateProjectReport = async (
  project: Project,
  events: TimelineEvent[],
  tasks: TaskAssignment[],
  startDate: string,
  endDate: string
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return "缺少 API Key。请配置环境变量。";

  const eventText = events.map(e => 
    `- [${e.date.split('T')[0]}] (${e.type}) ${e.authorName}: ${e.content}`
  ).join('\n');

  let taskText = "";
  if (tasks.length > 0) {
      taskText = tasks.map(t => 
          `- 任务 "${t.title}": 进度 ${t.progress}%, 状态 ${t.status}, 负责人 ${t.assigneeIds.length}人`
      ).join('\n');
  } else {
      taskText = "暂无任务进度数据。";
  }

  const prompt = `
    你是一个专业的项目管理助手。请为项目 "${project.title}" 生成一份进度报告。
    报告周期: ${startDate} 至 ${endDate}。
    请使用中文输出。
    
    项目基础信息:
    - 描述: ${project.description}
    - 当前状态: ${project.status}
    - 客户: ${project.customerName || '内部'}
    
    【时间线动态】 (Events):
    ${eventText || '此期间无时间线更新记录。'}

    【任务进度概览】 (Current Tasks):
    ${taskText}
    
    请按照以下结构生成报告 (Markdown 格式):
    # ${startDate} 至 ${endDate} 项目进度报告

    ## 1. 执行摘要
    [简要总结本周期的核心进展]

    ## 2. 详细进展
    [结合时间线事件和任务进度进行描述]

    ## 3. 风险与问题
    [基于标记为 ISSUE 的事件或进度滞后的任务]

    ## 4. 后续计划与建议
    [基于当前状态的建议]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "无法生成内容。";
  } catch (error) {
    console.error("AI Error:", error);
    return "由于 API 错误，生成报告失败。";
  }
};

export const generatePersonalReport = async (
  username: string,
  projects: { id: string; title: string; events: TimelineEvent[]; tasks: TaskAssignment[] }[],
  inspirations: Inspiration[]
): Promise<string> => {
  const ai = getAIClient();
  if (!ai) return JSON.stringify({ generalSummary: "Mock Summary: No API Key." });

  let projectContext = "";
  projects.forEach(p => {
    projectContext += `\nProject ID: ${p.id}\nTitle: ${p.title}\nRecent Activity:\n`;
    if (p.events.length === 0 && p.tasks.length === 0) {
        projectContext += "- No updates recorded in system.\n";
    }
    p.events.forEach(e => {
      projectContext += `- (Timeline Event) ${e.content}\n`;
    });
    p.tasks.forEach(t => {
      projectContext += `- (Task) "${t.title}": Status ${t.status}, Progress ${t.progress}%\n`;
    });
  });

  let inspirationContext = "";
  inspirations.forEach(i => {
    inspirationContext += `- Shared Idea: ${i.content}\n`;
  });

  const prompt = `
    You are an AI assistant helping employee "${username}" write their weekly report.
    Based on the following activity logs from the project management system, generate a JSON object.
    
    The user needs to fill in a form with "content" (work done this week) and "plan" (next week's plan) for each project they are working on.
    Also provide a "generalSummary" for the overall week.
    
    DATA:
    ${projectContext}
    
    INSPIRATIONS/IDEAS SHARED:
    ${inspirationContext}
    
    OUTPUT FORMAT (Strict JSON):
    {
       "[PROJECT_ID_1]": {
           "content": "Summarize work done based on timeline events and task progress...",
           "plan": "Suggest logical next steps based on current task status..."
       },
       "[PROJECT_ID_2]": { ... },
       "generalSummary": "A brief overall summary of the week, including any inspirations shared."
    }
    
    Language: Chinese (Simplified).
    Do not include markdown formatting like \`\`\`json. Just the raw JSON string.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "{}";
  } catch (error) {
    console.error("AI Error:", error);
    return "{}";
  }
};