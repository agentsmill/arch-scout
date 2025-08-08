import { memo, useCallback, useMemo, useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
  addEdge,
  Connection,
  Edge as RFEdge,
  Node as RFNode,
  Position,
  useReactFlow,
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Architecture, ArchNode, ArchEdge } from "@/types/architecture";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X } from "lucide-react";
import { useI18n } from "@/i18n";

const typeLabel: Record<string, string> = {
  service: "Service",
  db: "DB",
  api: "API",
  queue: "Queue",
  cache: "Cache",
  frontend: "Front",
  external: "External",
  cron: "Cron",
};

function colorByType(t: string) {
  switch (t) {
    case "db":
      return "bg-secondary text-secondary-foreground border border-border";
    case "api":
      return "bg-accent text-accent-foreground border border-border";
    case "queue":
      return "bg-muted text-muted-foreground border border-border";
    case "external":
      return "bg-card text-foreground border border-border";
    case "frontend":
      return "bg-card text-foreground border border-border";
    default:
      return "bg-card text-foreground border border-border";
  }
}

const ArchNodeCard = memo(({ id, data }: any) => {
  const { label, type, description } = (data?.node || {}) as ArchNode;
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label || "");
  const [desc, setDesc] = useState(description || "");
  const { setNodes } = useReactFlow();
  const { t } = useI18n();

  const onSave = () => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...(n.data as Record<string, unknown>),
                node: { ...((n.data as any)?.node || {}), label: name, description: desc },
              },
            }
          : n
      )
    );
    setEditing(false);
  };

  const onCancel = () => {
    setName(label || "");
    setDesc(description || "");
    setEditing(false);
  };

  return (
    <div className={`rounded-md px-3 py-2 shadow-sm ${colorByType(type)}`} style={{ maxWidth: 260 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-sm truncate" title={label}>
          {editing ? (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="nodrag h-7 text-sm"
              aria-label={t("node_name")}
            />
          ) : (
            label
          )}
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary">{typeLabel[type] || type}</Badge>
          {!editing ? (
            <Button variant="ghost" size="icon" aria-label={t("edit")} onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button variant="secondary" size="icon" aria-label={t("save_action")} onClick={onSave}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" aria-label={t("cancel")} onClick={onCancel}>
                <X className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="mt-1">
        {editing ? (
          <Textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            rows={2}
            className="nodrag text-xs"
            aria-label={t("node_desc")}
          />
        ) : (
          description && (
            <p className="text-xs text-muted-foreground" title={description}>
              {description}
            </p>
          )
        )}
      </div>
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  );
});

const nodeTypes = { archNode: ArchNodeCard } as const;

function mapToRF(arch?: Architecture) {
  const nodes: RFNode[] = (arch?.nodes || []).map((n, idx) => ({
    id: n.id,
    type: "archNode",
    data: { node: n } as Record<string, unknown>,
    position: { x: (idx % 4) * 280, y: Math.floor(idx / 4) * 160 },
  }));
  const edges: RFEdge[] = (arch?.edges || []).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: [e.protocol, e.label].filter(Boolean).join(" • "),
    animated: e.protocol === "event" || e.protocol === "queue",
    style: e.protocol === "http" ? { stroke: "hsl(var(--ring))" } : undefined,
  }));
  return { nodes, edges };
}

interface Props { arch?: Architecture }

export const ArchitectureDiagram = ({ arch }: Props) => {
  const { t } = useI18n();
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => mapToRF(arch), [arch]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const { nodes: mappedNodes, edges: mappedEdges } = mapToRF(arch);
    setNodes(mappedNodes);
    setEdges(mappedEdges);
  }, [arch, setNodes, setEdges]);

  const onConnect = useCallback((connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)), []);
  const add = (type: ArchNode["type"]) => {
    const id = `${type}-${nodes.length + 1}`;
    setNodes((nds) => nds.concat({ id, type: "archNode", data: { node: { id, type, label: `${type} ${nds.length + 1}` } } as Record<string, unknown>, position: { x: 80 + nds.length * 10, y: 60 + nds.length * 10 } }));
  };
  // Eksport architektury (LLM-friendly)
  const toArchitecture = (): Architecture => {
    const nodeArch: ArchNode[] = nodes
      .filter((n) => n.type === "archNode")
      .map((n) => ((n.data as any)?.node) as ArchNode)
      .filter(Boolean);

    const edgeArch: ArchEdge[] = edges.map((e) => {
      let protocol: string | undefined;
      let label: string | undefined = typeof e.label === "string" ? e.label : undefined;
      if (label && label.includes(" • ")) {
        const [proto, rest] = label.split(" • ");
        protocol = proto;
        label = rest || undefined;
      }
      return { id: e.id, source: e.source, target: e.target, label, protocol };
    });
    return { nodes: nodeArch, edges: edgeArch };
  };

  const download = (filename: string, content: string, type = "application/json") => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    const a = toArchitecture();
    download("architecture.json", JSON.stringify(a, null, 2), "application/json");
  };

  const toMarkdown = (a: Architecture) => {
    const nodeLines = a.nodes
      .map((n) => `- [${n.type}] ${n.id}: ${n.label}${n.description ? ` — ${n.description}` : ""}`)
      .join("\n");

    const edgeLines = a.edges
      .map((e) => `- ${e.source} -> ${e.target}${e.label ? ` (${e.label})` : ""}${e.protocol ? ` [${e.protocol}]` : ""}`)
      .join("\n");

    const idToLabel = new Map(a.nodes.map((n) => [n.id, n.label] as const));
    const mermaid = [
      "graph LR",
      ...a.edges.map(
        (e) => `${e.source}["${idToLabel.get(e.source) || e.source}"] --> ${e.target}["${idToLabel.get(e.target) || e.target}"]`
      ),
    ].join("\n");

    return [
      "# Architecture export (LLM-ready)",
      "## Nodes",
      nodeLines || "_no nodes_",
      "",
      "## Edges",
      edgeLines || "_no edges_",
      "",
      "## JSON",
      "```json",
      JSON.stringify(a, null, 2),
      "```",
      "",
      "## Mermaid",
      "```mermaid",
      mermaid,
      "```",
      "",
      "> Instructions for LLM: Modify the JSON section above and return only valid JSON.",
    ].join("\n");
  };

  const downloadMarkdown = () => {
    const a = toArchitecture();
    download("architecture.md", toMarkdown(a), "text/markdown");
  };

  return (
    <section className="w-full rounded-lg border bg-card" aria-label={t("diagram_title")}>
      <div className="flex items-center justify-between p-3 border-b">
        <div className="font-semibold">{t("diagram_title")}</div>
        <div className="flex gap-2">
          <button className="rounded-md px-3 py-1 text-sm bg-secondary text-secondary-foreground" onClick={() => add("service")}>{t("add_service")}</button>
          <button className="rounded-md px-3 py-1 text-sm bg-secondary text-secondary-foreground" onClick={() => add("db")}>{t("add_db")}</button>
          <button className="rounded-md px-3 py-1 text-sm bg-secondary text-secondary-foreground" onClick={() => add("api")}>{t("add_api")}</button>
          <button className="rounded-md px-3 py-1 text-sm bg-secondary text-secondary-foreground" onClick={downloadJSON}>{t("download_json")}</button>
          <button className="rounded-md px-3 py-1 text-sm bg-secondary text-secondary-foreground" onClick={downloadMarkdown}>{t("download_md")}</button>
        </div>
      </div>
      <div style={{ width: "100%", height: 520 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          nodeTypes={nodeTypes}
          className="react-flow"
        >
          <MiniMap pannable zoomable />
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </section>
  );
};
