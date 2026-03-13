import { apiClient } from './client';
import type { 
  LoginInput, 
  AuthResponse, 
  UtilizadorDTO, 
  ForgotPasswordInput, 
  ResetPasswordInput,
  SuperAdminLoginInput,
  UtilizadorUpdateInput
} from '@clinicaplus/types';

export const authApi = {
  login: (data: LoginInput) => 
    apiClient.post<{ data: AuthResponse }>('/auth/login', data)
      .then(r => r.data.data),

  loginSuperAdmin: (data: SuperAdminLoginInput) => 
    apiClient.post<{ data: AuthResponse }>('/auth/login-superadmin', data)
      .then(r => r.data.data),

  registerPaciente: (data: Record<string, unknown>) => 
    apiClient.post<{ data: AuthResponse }>('/auth/registar-paciente', data)
      .then(r => r.data.data),

  registerClinica: (data: Record<string, unknown>) =>
    apiClient.post<{ data: AuthResponse }>('/auth/registar-clinica', data)
      .then(r => r.data.data),

  refresh: () => 
    apiClient.post<{ data: AuthResponse }>('/auth/refresh')
      .then(r => r.data.data),

  logout: () => 
    apiClient.post('/auth/logout')
      .then(() => {}),

  forgotPassword: (data: ForgotPasswordInput) =>
    apiClient.post('/auth/forgot-password', data)
      .then(() => {}),

  resetPassword: (data: ResetPasswordInput) =>
    apiClient.post('/auth/reset-password', data)
      .then(() => {}),

  getMe: () =>
    apiClient.get<{ data: UtilizadorDTO }>('/auth/me')
      .then(r => r.data.data),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.patch('/auth/change-password', { oldPassword, newPassword })
      .then(r => r.data),

  updateProfile: (data: UtilizadorUpdateInput) =>
    apiClient.patch<{ data: UtilizadorDTO }>('/auth/me', data)
      .then(r => r.data.data),
};
