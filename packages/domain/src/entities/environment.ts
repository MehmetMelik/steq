export interface Variable {
  id: string;
  environment_id: string;
  key: string;
  value: string;
  is_secret: boolean;
  enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  workspace_id: string;
  name: string;
  is_active: boolean;
  variables: Variable[];
  created_at: string;
  updated_at: string;
}

export interface CreateEnvironmentInput {
  workspace_id: string;
  name: string;
}

export interface UpdateEnvironmentInput {
  id: string;
  name?: string;
  variables?: Variable[];
}
