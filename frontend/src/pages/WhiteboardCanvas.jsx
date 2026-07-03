import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from 'next-themes';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileText, Save, Plus, HelpCircle } from 'lucide-react';

// --- CUSTOM STICKY NOTE NODE COMPONENT ---
const StickyNoteNode = ({ id, data }) => {
  return (
    <div className="shadow-xl dark:shadow-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 w-64 p-4 rounded-2xl relative select-text transition-all duration-200 hover:scale-[1.01] hover:border-zinc-300 dark:hover:border-zinc-700">
      {/* Input Handle Port */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-blue-500 border-2 border-white dark:border-zinc-900 rounded-full" 
      />
      
      <div className="flex flex-col gap-2.5 h-full">
        {/* Note Header */}
        <div className="flex justify-between items-center text-[10px] text-zinc-500 dark:text-zinc-400 font-extrabold uppercase tracking-wider border-b border-zinc-100 dark:border-zinc-800 pb-1.5 select-none">
          <span className="flex items-center gap-1">🧠 Sticky Idea</span>
          <button 
            onClick={() => data.onDelete(id)} 
            className="text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-500 font-extrabold px-1 transition text-xs"
            title="Delete Idea"
          >
            ✕
          </button>
        </div>
        
        {/* Editable Area */}
        <textarea
          value={data.label || ''}
          onChange={(e) => data.onChange(id, e.target.value)}
          placeholder="Type your brainstorm thoughts here..."
          className="w-full text-xs bg-transparent border-0 resize-none outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 font-bold h-28 scrollbar-thin focus:ring-0"
        />
      </div>

      {/* Output Handle Port */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-blue-500 border-2 border-white dark:border-zinc-900 rounded-full" 
      />
    </div>
  );
};

// Map custom node types
const nodeTypes = {
  stickyNote: StickyNoteNode,
};

export default function WhiteboardCanvas() {
  const { selectedWorkspace, selectedProjectId, spaces } = useOutletContext();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const activeProject = spaces.find(p => p.id === selectedProjectId);

  // Map edges to be dynamically themed
  const themedEdges = edges.map(edge => ({
    ...edge,
    style: {
      ...edge.style,
      stroke: isDark ? '#71717a' : '#a1a1aa',
      strokeWidth: 2
    }
  }));

  // --- TEXT CHANGE HANDLER FOR CUSTOM NODES ---
  const handleNodeTextChange = useCallback((id, newText) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return {
            ...node,
            data: {
              ...node.data,
              label: newText,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  // --- DELETE HANDLER FOR CUSTOM NODES ---
  const handleNodeDelete = useCallback((id) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
  }, [setNodes]);

  // --- FETCH PROJECT DETAILS & LOAD CANVAS ---
  useEffect(() => {
    if (selectedWorkspace && selectedProjectId) {
      const fetchProject = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`http://127.0.0.1:8000/api/projects/${selectedProjectId}`);
          const canvas = res.data.canvas_state;
          if (canvas && canvas.nodes) {
            // Re-bind change and delete callback functions to the stateful nodes
            const mappedNodes = canvas.nodes.map(node => ({
              ...node,
              data: {
                ...node.data,
                onChange: handleNodeTextChange,
                onDelete: handleNodeDelete
              }
            }));
            setNodes(mappedNodes);
            setEdges(canvas.edges || []);
          } else {
            setNodes([]);
            setEdges([]);
          }
        } catch (err) {
          console.error("Error loading canvas state:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchProject();
    }
  }, [selectedWorkspace, selectedProjectId, handleNodeTextChange, handleNodeDelete, setNodes, setEdges]);

  // --- PERSIST CANVAS STATE ---
  const handleSaveCanvas = async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    try {
      // Clean function attachments before database serialization
      const cleanNodes = nodes.map(({ id, type, position, data }) => ({
        id,
        type,
        position,
        data: {
          label: data.label,
        },
      }));
      
      const payload = {
        canvas_state: {
          nodes: cleanNodes,
          edges,
        },
      };
      
      await axios.put(`http://127.0.0.1:8000/api/projects/${selectedProjectId}`, payload);
      alert('Canvas saved successfully!');
    } catch (err) {
      console.error("Error saving canvas:", err);
      alert('Failed to save canvas state.');
    } finally {
      setSaving(false);
    }
  };

  // --- ADD NEW STICKY NOTE ---
  const addStickyNote = () => {
    const id = `sticky_${Date.now()}`;
    const newNode = {
      id,
      type: 'stickyNote',
      position: {
        x: Math.random() * 200 + 150,
        y: Math.random() * 200 + 100,
      },
      data: {
        label: '',
        onChange: handleNodeTextChange,
        onDelete: handleNodeDelete,
      },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  // --- CONNECT NODES ---
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      style: { stroke: isDark ? '#71717a' : '#a1a1aa', strokeWidth: 2 } 
    }, eds)),
    [setEdges, isDark]
  );

  // Render Workspace level empty states
  if (!selectedWorkspace) {
    return (
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-8 shadow-sm dark:shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No Workspace Selected</CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-500 dark:text-zinc-400 text-sm">
            Please switch to or create a workspace to view the Whiteboard.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Project level empty states (strictly aligned with other views)
  if (!selectedProjectId) {
    return (
      <div className="max-w-6xl mx-auto mt-12 text-center">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 p-8 shadow-sm dark:shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-zinc-900 dark:text-zinc-100">No Project Selected</CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-500 dark:text-zinc-400 text-sm">
            No Project Selected. Please select a project from the dropdown above to load your tasks.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col h-[78vh] space-y-4">
      {/* Header controls bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            🎨 Whiteboard Canvas
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
            Brainstorm and link ideas for project "{activeProject?.name || 'Selected Project'}".
          </p>
        </div>

        {/* Buttons Controls */}
        <div className="flex items-center gap-3">
          <Button 
            onClick={addStickyNote} 
            variant="outline" 
            size="sm" 
            className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-bold flex items-center gap-1.5 h-9"
          >
            <Plus className="w-4 h-4 text-emerald-500" /> Add Sticky Note
          </Button>
          <Button 
            onClick={handleSaveCanvas} 
            disabled={saving}
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold flex items-center gap-1.5 h-9 disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Canvas"}
          </Button>
        </div>
      </div>

      {/* React Flow Board Container */}
      <div className="flex-grow bg-zinc-50 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden relative shadow-inner">
        {loading ? (
          <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center z-10 text-zinc-500 dark:text-zinc-400 font-bold animate-pulse">
            Syncing canvas assets...
          </div>
        ) : null}

        <ReactFlow
          nodes={nodes}
          edges={themedEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          connectionLineStyle={{ stroke: isDark ? '#71717a' : '#a1a1aa', strokeWidth: 2 }}
          fitView
          className="w-full h-full text-zinc-900 dark:text-zinc-100"
        >
          {/* Background dots pattern */}
          <Background color={isDark ? "#52525b" : "#a1a1aa"} gap={18} size={1} />
          <Controls className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 fill-zinc-800 dark:fill-zinc-200 shadow-sm dark:shadow-md" />
        </ReactFlow>

        {/* Floating Help Instructions */}
        <div className="absolute bottom-4 right-4 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 max-w-xs shadow-md dark:shadow-2xl pointer-events-none select-none text-[10px] text-zinc-500 dark:text-zinc-400 space-y-1 z-10 backdrop-blur-md">
          <span className="font-extrabold text-zinc-900 dark:text-zinc-200 block uppercase tracking-wider mb-1 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" /> Quick tips
          </span>
          <p>• Panning: Click and drag the grid background.</p>
          <p>• Zooming: Use mouse wheel or panel controls.</p>
          <p>• Connections: Drag line from node bottom to top.</p>
        </div>
      </div>
    </div>
  );
}
