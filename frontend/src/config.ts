// 系统配置
export const CONFIG = {
  // 部门/系统名称
  DEPARTMENT_NAME: import.meta.env.VITE_DEPARTMENT_NAME || 'DeptSync',

  // 登录页提示信息
  LOGIN_HINT: import.meta.env.VITE_LOGIN_HINT || '默认管理员: 工号 <span class="font-mono bg-slate-100 px-1 rounded">admin</span> / 密码 <span class="font-mono bg-slate-100 px-1 rounded">admin</span>',

  // 页面标题
  PAGE_TITLE: import.meta.env.VITE_PAGE_TITLE || 'DeptSync - 部门协同管理平台'
} as const;
