// ルート定数
export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  presentations: {
    list: '/presentations',
    create: '/presentations/create',
    edit: (id: number) => `/presentations/${id}/edit`,
    view: (id: number) => `/presentations/${id}`,
    present: (id: number) => `/presentations/${id}/present`,
  },
  participants: {
    join: '/join',
    session: (accessCode: string) => `/session/${accessCode}`,
  },
} as const;