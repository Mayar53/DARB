export type { AuthResponse, Tokens, User } from "@/lib/types";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  nickname?: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  avatar?: string;
}
