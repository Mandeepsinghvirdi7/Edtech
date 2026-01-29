import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { FrontendTeamData } from '@/types';
import { getBDEData } from '@/data/dataProcess';

interface TeamFlowchartProps {
  teams: FrontendTeamData[];
  selectedBranch?: string;
  selectedDrive?: string;
  selectedMonth?: string;
}

const TeamNode = ({ data }: { data: any }) => (
  <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-400">
    <div className="flex">
      <div className="ml-2">
        <div className="text-lg font-bold">{data.label}</div>
        <div className="text-gray-500">{data.role}</div>
        {data.metrics && (
          <div className="text-sm">
            <div>Target: {data.metrics.target}</div>
            <div>Admissions: {data.metrics.admissions}</div>
            <div>Achievement: {data.metrics.achievement}%</div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const nodeTypes: NodeTypes = {
  teamNode: TeamNode,
};

export function TeamFlowchart({ teams, selectedBranch, selectedDrive, selectedMonth }: TeamFlowchartProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const nodeHeight = 120; // Estimated height for a node including some internal padding
    const verticalPadding = 80; // Vertical spacing between main sections (VPs, DBMs, Team Leaders)
    const bdeVerticalSpacing = 100; // Vertical spacing between BDEs within a team

    let currentVpY = 0;

    // Group by VP -> DBM -> Teams
    const vpMap = new Map<string, Map<string, FrontendTeamData[]>>();
    teams.forEach(team => {
      // Ensure records are filtered for inactive BDEs for the flowchart as well
      const activeRecords = team.records.filter(r => !r.inactive);
      if (activeRecords.length > 0) { // Only consider teams with active BDEs/records
        // For now, assume VP is derived from branch or use a default
        // In a real implementation, VP would be a field in the data
        const vpName = team.records[0]?.branch?.includes('Mumbai') ? 'VP Mumbai' : 'VP Hyderabad';
        const dbmName = team.dbm;

        if (!vpMap.has(vpName)) {
          vpMap.set(vpName, new Map());
        }
        const dbmMap = vpMap.get(vpName)!;
        if (!dbmMap.has(dbmName)) {
          dbmMap.set(dbmName, []);
        }
        dbmMap.get(dbmName)!.push({ ...team, records: activeRecords });
      }
    });

    vpMap.forEach((dbmMap, vpName) => {
      const vpId = `vp-${vpName.replace(/\s+/g, '-')}`;
      nodes.push({
        id: vpId,
        type: 'teamNode',
        position: { x: 0, y: currentVpY },
        data: {
          label: vpName,
          role: 'VP',
        },
      });

      let currentDbmY = currentVpY + verticalPadding;

      dbmMap.forEach((dbmTeams, dbmName) => {
        const dbmId = `dbm-${dbmName.replace(/\s+/g, '-')}-${vpName.replace(/\s+/g, '-')}`;
        nodes.push({
          id: dbmId,
          type: 'teamNode',
          position: { x: 200, y: currentDbmY },
          data: {
            label: dbmName,
            role: 'DBM',
          },
        });

        // Connect VP to DBM
        edges.push({
          id: `edge-${vpId}-${dbmId}`,
          source: vpId,
          target: dbmId,
          type: 'smoothstep',
        });

        let currentTeamLeaderY = currentDbmY;

        dbmTeams.forEach((team, teamIndex) => {
          const teamLeaderId = `tl-${team.teamLeader.replace(/\s+/g, '-')}-${dbmName.replace(/\s+/g, '-')}`;
          if (teamIndex > 0) {
            currentTeamLeaderY += verticalPadding;
          }

          nodes.push({
            id: teamLeaderId,
            type: 'teamNode',
            position: { x: 400, y: currentTeamLeaderY },
            data: {
              label: team.teamName,
              role: `Lead: ${team.teamLeader}`,
              metrics: {
                target: team.totalTarget,
                admissions: team.totalAdmissions,
                achievement: team.avgAchievement,
              },
            },
          });

          // Connect DBM to Team Leader
          edges.push({
            id: `edge-${dbmId}-${teamLeaderId}`,
            source: dbmId,
            target: teamLeaderId,
            type: 'smoothstep',
          });

          let currentBdeY = currentTeamLeaderY;
          const bdeData = getBDEData(team.records, selectedBranch, team.teamLeader, selectedDrive, selectedMonth);

          bdeData.forEach((bde, bdeIndex) => {
            const bdeId = `bde-${bde.name.replace(/\s+/g, '-')}-${teamLeaderId}`;
            nodes.push({
              id: bdeId,
              type: 'teamNode',
              position: { x: 600, y: currentBdeY + bdeIndex * bdeVerticalSpacing },
              data: {
                label: bde.name,
                role: 'BDE',
                metrics: {
                  target: bde.totalTarget,
                  admissions: bde.totalAdmissions,
                  achievement: bde.avgAchievement,
                },
              },
            });

            // Connect Team Leader to BDE
            edges.push({
              id: `edge-${teamLeaderId}-${bdeId}`,
              source: teamLeaderId,
              target: bdeId,
              type: 'smoothstep',
            });
          });

          currentTeamLeaderY += Math.max(bdeData.length * bdeVerticalSpacing, nodeHeight);
        });

        currentDbmY += verticalPadding * 2;
      }); // Close dbmMap.forEach
    }); // Close vpMap.forEach

    return { initialNodes: nodes, initialEdges: edges };
  }, [teams, selectedBranch, selectedDrive, selectedMonth]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <div className="w-full h-[800px] border rounded-lg">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="cross" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}
