import { memo, useCallback, useMemo, useEffect } from "react";
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
  Handle,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Architecture, ArchNode, ArchEdge } from "@/types/architecture";
import { Badge } from "@/components/ui/badge";

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

const ArchNodeCard = memo(({ data }: any) => {
  const { label, type, description } = (data?.node || {}) as ArchNode;
  return (
    <div className={`rounded-md px-3 py-2 shadow-sm ${colorByType(type)}`} style={{ maxWidth: 260 }}>
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-sm truncate" title={label}>{label}</div>
        <Badge variant="secondary">{typeLabel[type] || type}</Badge>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground mt-1" title={description}>{description}</p>
      )}
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

  return (
    <section className="w-full rounded-lg border bg-card">
      <div className="flex items-center justify-between p-3 border-b">
        <div className="font-semibold">Diagram architektury</div>
        <div className="flex gap-2">
          <button className="rounded-md px-3 py-1 text-sm bg-secondary text-secondary-foreground" onClick={() => add("service")}>+ Service</button>
          <button className="rounded-md px-3 py-1 text-sm bg-secondary text-secondary-foreground" onClick={() => add("db")}>+ DB</button>
          <button className="rounded-md px-3 py-1 text-sm bg-secondary text-secondary-foreground" onClick={() => add("api")}>+ API</button>
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
