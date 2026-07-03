import re

with open('src/components/layout/MainLayout.jsx', 'r', encoding='utf-8') as f:
    code = f.read()

# The aside block starts at `        {/* 1. Collapsible Left Sidebar */}`
# and ends at `        </aside>`

aside_regex = re.compile(r'\{\/\* 1\. Collapsible Left Sidebar \*\/}.*?<\/aside>', re.DOTALL)
aside_match = aside_regex.search(code)
if aside_match:
    old_aside = aside_match.group(0)
    
    # Try to extract the spaces block
    spaces_regex = re.compile(r'\{spaces\.map\(space => \(\s*<div key=\{space\.id\}.*?\)\)}\s*<\/div>', re.DOTALL)
    spaces_match = spaces_regex.search(old_aside)
    spaces_code = spaces_match.group(0) if spaces_match else ''
    
    tier1 = '''{/* 1. Tier 1: Slim Fixed Macro Ribbon (Far Left) */}
        <aside className="w-16 h-screen flex flex-col items-center py-4 bg-zinc-50 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex-shrink-0 z-30 transition-all duration-300">
          <div className="mb-6">
            <img src="/xbp_asia_icon.png" alt="XBP ASIA" className="w-8 h-8 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 cursor-pointer hover:scale-105 transition-transform duration-200" onClick={() => navigate('/')} />
          </div>

          <div className="flex flex-col gap-4 flex-1 w-full px-2">
            {[
              { id: 'dashboard', icon: Layers, label: 'Dashboard' },
              { id: 'home', icon: Home, label: 'Home' },
              { id: 'calendar', icon: CalendarIcon, label: 'Planner' },
              { id: 'kanban', icon: CheckSquare, label: 'Kanban' },
              { id: 'docs', icon: BookOpen, label: 'Docs' },
              { id: 'teams', icon: Users, label: 'Teams' },
              { id: 'ai', icon: Sparkles, label: 'AI Console' },
              { id: 'timesheet', icon: Clock, label: 'Timesheet' }
            ].map(item => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setActiveTab(item.id)}
                    className={cn("w-full h-10 rounded-xl cursor-pointer", activeTab === item.id ? "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400" : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800")}
                  >
                    <item.icon className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-xs">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="mt-auto pt-4 w-full px-2 flex flex-col gap-4 items-center">
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-full h-10 rounded-xl cursor-pointer text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800">
                      <LayoutGrid className="w-5 h-5" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-xs">More Apps</TooltipContent>
              </Tooltip>
              <PopoverContent side="right" align="end" className="w-72 p-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                <h4 className="font-bold text-xs mb-3 text-zinc-500 uppercase tracking-wider">App Launcher</h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div onClick={() => navigate('/whiteboard')} className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer border border-zinc-200 dark:border-zinc-800 transition">
                    <PenTool className="w-5 h-5 text-blue-500 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">Whiteboard</span>
                  </div>
                  <div onClick={() => { setShowAutomationModal(true); navigate('/automation'); }} className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer border border-zinc-200 dark:border-zinc-800 transition">
                    <Sliders className="w-5 h-5 text-amber-500 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">Automations</span>
                  </div>
                  <div onClick={() => { setShowGoalModal(true); navigate('/goals'); }} className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer border border-zinc-200 dark:border-zinc-800 transition">
                    <Target className="w-5 h-5 text-emerald-500 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">Goals</span>
                  </div>
                  <div onClick={() => setShowFormModal(true)} className="flex flex-col items-center justify-center p-2 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer border border-zinc-200 dark:border-zinc-800 transition">
                    <ClipboardList className="w-5 h-5 text-purple-500 mb-1" />
                    <span className="text-[10px] font-bold text-zinc-700 dark:text-zinc-300">Forms</span>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="w-9 h-9 cursor-pointer border border-zinc-200 dark:border-zinc-800 shadow-sm hover:scale-105 transition-transform">
                  <AvatarFallback className="bg-blue-600 text-white font-extrabold text-xs">
                    {currentUser?.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" side="right" align="end">
                <DropdownMenuLabel>
                  <div className="font-bold text-zinc-800 dark:text-zinc-100 truncate text-xs">{currentUser?.name}</div>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate font-normal">{currentUser?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>'''
    
    code = code.replace(old_aside, tier1)

tier2_template = '''        <div className="flex flex-1 overflow-hidden">
          {/* Tier 2 Contextual Panel */}
          <aside className="w-56 h-full bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 overflow-y-auto flex-shrink-0 flex flex-col hidden md:flex">
            <div className="p-4 space-y-5">
              {activeTab === 'dashboard' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center pl-1 mb-3">
                    <span className="text-[10px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider">Spaces</span>
                    <button onClick={() => setShowSpaceModal(true)} className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 cursor-pointer">+ Add</button>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    SPACES_BLOCK
                  </div>
                </div>
              )}
              {activeTab === 'home' && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider block pl-1 mb-3">Home</span>
                  <div className="space-y-1">
                    <NavLink to="/" className={({ isActive }) => `flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 ${isActive ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><Inbox className="w-4 h-4"/> Inbox</NavLink>
                    <NavLink to="/tasks" className={({ isActive }) => `flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 ${isActive ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><CheckSquare className="w-4 h-4"/> My Tasks</NavLink>
                  </div>
                </div>
              )}
              {activeTab === 'docs' && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider block pl-1 mb-3">Notion Docs</span>
                  <div className="space-y-1">
                    <NavLink to="/docs" className={({ isActive }) => `flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 ${isActive ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><BookOpen className="w-4 h-4"/> All Docs</NavLink>
                    <button onClick={handleCreateDoc} className="flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"><Plus className="w-4 h-4"/> New Doc</button>
                  </div>
                </div>
              )}
              {activeTab === 'ai' && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider block pl-1 mb-3">AI Agents</span>
                  <div className="space-y-1">
                    <button onClick={() => setShowAIConsole(true)} className="flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"><Sparkles className="w-4 h-4"/> AI Console</button>
                  </div>
                </div>
              )}
              {activeTab === 'calendar' && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider block pl-1 mb-3">Planner</span>
                  <div className="space-y-1">
                    <NavLink to="/calendar" className={({ isActive }) => `flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 ${isActive ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><CalendarIcon className="w-4 h-4"/> Matrix</NavLink>
                    <NavLink to="/timeline" className={({ isActive }) => `flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 ${isActive ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><Layers className="w-4 h-4"/> Gantt</NavLink>
                  </div>
                </div>
              )}
              {activeTab === 'kanban' && (
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-extrabold text-zinc-400 dark:text-zinc-500 tracking-wider block pl-1 mb-3">Kanban</span>
                  <div className="space-y-1">
                    <NavLink to="/kanban" className={({ isActive }) => `flex items-center rounded-lg text-sm font-semibold justify-start gap-2.5 w-full px-3 py-2 ${isActive ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}><CheckSquare className="w-4 h-4"/> Board</NavLink>
                  </div>
                </div>
              )}
              {!['dashboard', 'home', 'docs', 'ai', 'calendar', 'kanban'].includes(activeTab) && (
                <div className="text-center py-10 px-2">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Context options will appear here.</span>
                </div>
              )}
            </div>
          </aside>

          {/* 3. Scrollable Main Content area (with standard padding) */}'''

tier2 = tier2_template.replace('SPACES_BLOCK', spaces_code)
code = code.replace('{/* 3. Scrollable Main Content area (with standard padding) */}', tier2)

# Now close the wrapper around </main>
code = code.replace('</main>\n      </div>\n\n      {/* --- AI CONSOLE ASSISTANT --- */}', '</main>\n        </div>\n      </div>\n\n      {/* --- AI CONSOLE ASSISTANT --- */}')

with open('src/components/layout/MainLayout.jsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated MainLayout.jsx")
