export type ArchNodeType = "service" | "db" | "api" | "queue" | "cache" | "frontend" | "external" | "cron";

export interface ArchTableColumn {
  name: string;
  type: string;
  pk?: boolean;
  fk?: string;
}

export interface ArchTableDef {
  table: string;
  columns: ArchTableColumn[];
  purpose?: string;
}

export interface ArchNode {
  id: string;
  type: ArchNodeType;
  label: string;
  description?: string;
  tech?: string[];
  notes?: string;
  dbSchema?: ArchTableDef[];
}

export interface ArchEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  protocol?: string;
  details?: string;
  security?: string;
  frequency?: string;
}

export interface Architecture {
  nodes: ArchNode[];
  edges: ArchEdge[];
  legend?: Record<string, string>;
}
