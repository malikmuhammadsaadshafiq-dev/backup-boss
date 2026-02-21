export type UUID = string;

export type Industry = 
  | "manufacturing" 
  | "retail" 
  | "technology" 
  | "healthcare" 
  | "finance" 
  | "construction" 
  | "hospitality" 
  | "consulting" 
  | "other";

export type SubscriptionTier = "free" | "starter" | "professional" | "enterprise";

export type UserRole = "owner" | "admin" | "employee";

export type KnowledgeCategory = 
  | "operations" 
  | "finance" 
  | "client_management" 
  | "vendor_relations";

export type SimulationStatus = "active" | "completed" | "cancelled";

export type SimulationTaskStatus = "pending" | "in_progress" | "completed" | "failed";

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export type Priority = "low" | "medium" | "high" | "critical";

export type ScenarioType = 
  | "owner_absence" 
  | "key_person_loss" 
  | "system_failure" 
  | "natural_disaster" 
  | "cyber_attack" 
  | "supply_chain_disruption" 
  | "custom";

export interface Organization {
  id: UUID;
  name: string;
  industry: Industry;
  createdAt: Date;
  settings: Record<string, unknown>;
  subscriptionTier: SubscriptionTier;
}

export interface User {
  id: UUID;
  orgId: UUID;
  email: string;
  role: UserRole;
  competencies: string[];
  createdAt: Date;
  lastActive: Date;
}

export interface VoiceMemo {
  id: UUID;
  orgId: UUID;
  userId: UUID;
  s3Key: string;
  duration: number;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface KnowledgeFragment {
  id: UUID;
  memoId: UUID;
  transcriptionId: UUID;
  category: KnowledgeCategory;
  content: string;
  tags: string[];
  confidence: number;
  extractedAt: Date;
}

export interface Runbook {
  id: UUID;
  orgId: UUID;
  title: string;
  category: KnowledgeCategory;
  steps: unknown;
  requiredMaterials: string[];
  safety