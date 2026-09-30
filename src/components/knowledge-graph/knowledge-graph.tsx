"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
} from "@xyflow/react";

import type { GraphCard, GraphRelation } from "@/types/knowledge";

type KnowledgeGraphProps = {
  cards: GraphCard[];
  relations: GraphRelation[];
};

const sourceStyles: Record<GraphCard["source"]["format"], { background: string; border: string }> = {
  pdf: { background: "#eff6ff", border: "#93c5fd" },
  teams: { background: "#f5f3ff", border: "#c4b5fd" },
  email_msg: { background: "#fdf2f8", border: "#f9a8d4" },
};

const sourceLabels: Record<GraphCard["source"]["format"], string> = {
  pdf: "PDF",
  teams: "Teams",
  email_msg: "Email",
};

export function KnowledgeGraph({ cards, relations }: KnowledgeGraphProps) {
  const initialNodes = useMemo<Node[]>(
    () =>
      cards.map((card, index) => {
        const style = sourceStyles[card.source.format];

        return {
          id: card.id,
          position: {
            x: (index % 4) * 280,
            y: Math.floor(index / 4) * 150,
          },
          data: {
            label: (
              <div className="w-52 text-left">
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                  {sourceLabels[card.source.format]}
                </p>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-4">
                  {card.title}
                </p>
                <p className="mt-1 line-clamp-1 text-[10px] opacity-70">
                  {card.knowledgeType}
                </p>
              </div>
            ),
          },
          style: {
            width: 220,
            padding: 12,
            border: `1px solid ${style.border}`,
            borderRadius: 12,
            background: style.background,
          },
        };
      }),
    [cards],
  );

  const initialEdges = useMemo<Edge[]>(
    () =>
      relations.map((relation) => ({
        id: `${relation.sourceId}--${relation.targetId}--${relation.kind}`,
        source: relation.sourceId,
        target: relation.targetId,
        label: relation.reason,
        style: {
          strokeWidth: Math.min(1 + (relation.score ?? 0) / 5, 4),
          stroke: relation.kind === "conflict_candidate" ? "#f59e0b" : "#a1a1aa",
        },
        labelStyle: { fontSize: 10, fill: "#52525b" },
      })),
    [relations],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes]);
  useEffect(() => setEdges(initialEdges), [initialEdges, setEdges]);

  return (
    <div className="h-[720px] w-full overflow-hidden rounded-xl border border-black/10 bg-white">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
      >
        <Background />
        <Controls />
        <MiniMap zoomable pannable />
      </ReactFlow>
    </div>
  );
}
