import sys

with open('d:/my_project_app/frontend/src/components/layout/MainLayout.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Workspace Switcher (Tier 2/Header)
old_workspace_item = """                  {workspaces.map(w => (
                    <DropdownMenuItem 
                      key={w.id} 
                      onClick={() => setSelectedWorkspace(w)} 
                      className={`font-semibold cursor-pointer text-xs ${selectedWorkspace?.id === w.id ? 'bg-zinc-200 dark:bg-zinc-800 font-bold' : ''}`}
                    >
                      🏢 {w.name}
                    </DropdownMenuItem>
                  ))}"""

new_workspace_item = """                  {workspaces.map(w => (
                    <DropdownMenuItem 
                      key={w.id} 
                      onClick={() => setSelectedWorkspace(w)} 
                      className={`font-semibold cursor-pointer text-xs flex justify-between items-center ${selectedWorkspace?.id === w.id ? 'bg-zinc-200 dark:bg-zinc-800 font-bold' : ''}`}
                    >
                      <span>🏢 {w.name}</span>
                      <Trash2 
                        className="w-3.5 h-3.5 text-red-500 hover:text-red-700 ml-2" 
                        onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: 'workspace', id: w.id }); }} 
                      />
                    </DropdownMenuItem>
                  ))}"""

code = code.replace(old_workspace_item, new_workspace_item)

# 2. Spaces Sidebar Tree (Projects)
old_space_item = """                          <span className="truncate">📁 {space.name}</span>
                          {selectedSpace?.id === space.id && (
                            <button onClick={(e) => { e.stopPropagation(); setShowFolderModal(true); }} className="text-[10px] text-blue-500 dark:text-blue-400 font-bold px-1">+ Folder</button>
                          )}"""

new_space_item = """                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="truncate">📁 {space.name}</span>
                            <Trash2 
                              className="w-3.5 h-3.5 text-zinc-400 hover:text-red-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" 
                              onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: 'project', id: space.id }); }} 
                            />
                          </div>
                          {selectedSpace?.id === space.id && (
                            <button onClick={(e) => { e.stopPropagation(); setShowFolderModal(true); }} className="text-[10px] text-blue-500 dark:text-blue-400 font-bold px-1">+ Folder</button>
                          )}"""

# Note: for the group-hover to work, the parent div needs 'group' class.
old_space_wrapper = """                        <div 
                          onClick={() => setSelectedSpace(space)} 
                          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition ${selectedSpace?.id === space.id ? 'text-zinc-900 dark:text-white bg-zinc-200 dark:bg-zinc-800 font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                        >"""
new_space_wrapper = """                        <div 
                          onClick={() => setSelectedSpace(space)} 
                          className={`group flex items-center justify-between p-1.5 rounded cursor-pointer transition ${selectedSpace?.id === space.id ? 'text-zinc-900 dark:text-white bg-zinc-200 dark:bg-zinc-800 font-bold' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/50'}`}
                        >"""

code = code.replace(old_space_wrapper, new_space_wrapper)
code = code.replace(old_space_item, new_space_item)

# 3. Task Details Modal
old_task_header = """            <div className="p-6 border-b border-zinc-800 flex justify-between items-start flex-shrink-0 bg-zinc-900 rounded-t-2xl">
              <div>
                <Badge variant="outline">Task ID: #{selectedTask.id}</Badge>
                <h3 className="text-lg font-bold text-zinc-100 mt-2">{selectedTask.title}</h3>
              </div>
              <Button onClick={() => { setSelectedTask(null); if (selectedList) fetchTasks(selectedList.id); }} variant="ghost" size="icon" className="h-6 w-6">✕</Button>
            </div>"""

new_task_header = """            <div className="p-6 border-b border-zinc-800 flex justify-between items-start flex-shrink-0 bg-zinc-900 rounded-t-2xl">
              <div>
                <Badge variant="outline">Task ID: #{selectedTask.id}</Badge>
                <h3 className="text-lg font-bold text-zinc-100 mt-2">{selectedTask.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={() => setItemToDelete({ type: 'task', id: selectedTask.id })} 
                  variant="destructive" 
                  size="sm" 
                  className="h-7 text-[10px] font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
                <Button onClick={() => { setSelectedTask(null); if (selectedList) fetchTasks(selectedList.id); }} variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white">✕</Button>
              </div>
            </div>"""

code = code.replace(old_task_header, new_task_header)

# 4. AlertDialog Wrapper at the very bottom
alert_dialog_code = """
      {/* --- ALERT DIALOG --- */}
      <AlertDialog open={!!itemToDelete} onOpenChange={(open) => { if (!open) setItemToDelete(null); }}>
        <AlertDialogContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-zinc-900 dark:text-zinc-100">Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-500 dark:text-zinc-400">
              This action cannot be undone. This will permanently delete this {itemToDelete?.type} and all nested data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-none hover:bg-zinc-200 dark:hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (itemToDelete?.type === 'workspace') handleDeleteWorkspace(itemToDelete.id);
                else if (itemToDelete?.type === 'project') handleDeleteProject(itemToDelete.id);
                else if (itemToDelete?.type === 'task') handleDeleteTask(itemToDelete.id);
              }}
              className="bg-red-600 text-white hover:bg-red-700 font-bold"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
"""

code = code.replace('    </TooltipProvider>', alert_dialog_code)

with open('d:/my_project_app/frontend/src/components/layout/MainLayout.jsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("MainLayout patched successfully")
