export const TASK_TEMPLATE_FIELDS = [
  "id",
  "title",
  "description",
  "priority",
  "status",
  "task_type",
  "start_date",
  "due_date",
  "progress",
  "parent_id",
  "parent_task_id",
  "predecessor_id",
  "dependency_type",
  "lag_days",
  "duration_days",
  "estimated_hours",
  "actual_hours",
  "remaining_hours",
  "assigned_to_id",
  "assignee_ids",
];

export const ALLOWED_STATUSES = ["To Do", "In Progress", "Review", "Testing", "Done"];
export const ALLOWED_PRIORITIES = ["Urgent", "High", "Medium", "Low"];
export const ALLOWED_TASK_TYPES = ["epic", "task", "milestone", "bug"];
export const ALLOWED_DEPENDENCY_TYPES = ["FS", "SS", "FF", "SF"];

const sampleTasks = [
  {
    id: 1,
    title: "Discovery and planning phase",
    description: "Align scope, success metrics, delivery risks, and release milestones with stakeholders.",
    priority: "High",
    status: "Done",
    task_type: "epic",
    start_date: "2026-07-01",
    due_date: "2026-07-03",
    progress: 100,
    parent_id: null,
    parent_task_id: null,
    predecessor_id: null,
    dependency_type: "FS",
    lag_days: 0,
    duration_days: 3,
    estimated_hours: 24,
    actual_hours: 22,
    remaining_hours: 0,
    assigned_to_id: null,
    assignee_ids: [],
  },
  {
    id: 2,
    title: "Requirements workshop",
    description: "Document personas, core workflows, reporting needs, and acceptance criteria.",
    priority: "High",
    status: "Done",
    task_type: "task",
    start_date: "2026-07-01",
    due_date: "2026-07-01",
    progress: 100,
    parent_id: 1,
    parent_task_id: null,
    predecessor_id: null,
    dependency_type: "FS",
    lag_days: 0,
    duration_days: 1,
    estimated_hours: 8,
    actual_hours: 8,
    remaining_hours: 0,
    assigned_to_id: null,
    assignee_ids: [],
  },
  {
    id: 3,
    title: "Architecture and UX sign-off",
    description: "Approve technical architecture, data model, integration touchpoints, and clickable workflow prototype.",
    priority: "Urgent",
    status: "Review",
    task_type: "milestone",
    start_date: "2026-07-03",
    due_date: "2026-07-03",
    progress: 90,
    parent_id: 1,
    parent_task_id: null,
    predecessor_id: 2,
    dependency_type: "FS",
    lag_days: 1,
    duration_days: 1,
    estimated_hours: 6,
    actual_hours: 5,
    remaining_hours: 1,
    assigned_to_id: null,
    assignee_ids: [],
  },
  {
    id: 4,
    title: "Build foundation phase",
    description: "Implement the core platform services and shared frontend shell required for feature delivery.",
    priority: "High",
    status: "In Progress",
    task_type: "epic",
    start_date: "2026-07-06",
    due_date: "2026-07-15",
    progress: 55,
    parent_id: null,
    parent_task_id: null,
    predecessor_id: 3,
    dependency_type: "FS",
    lag_days: 0,
    duration_days: 10,
    estimated_hours: 96,
    actual_hours: 48,
    remaining_hours: 48,
    assigned_to_id: null,
    assignee_ids: [],
  },
  {
    id: 5,
    title: "Set up API and database migrations",
    description: "Create task, project, authorization, and audit migration scripts with rollback coverage.",
    priority: "High",
    status: "In Progress",
    task_type: "task",
    start_date: "2026-07-06",
    due_date: "2026-07-08",
    progress: 65,
    parent_id: 4,
    parent_task_id: null,
    predecessor_id: 3,
    dependency_type: "FS",
    lag_days: 0,
    duration_days: 3,
    estimated_hours: 24,
    actual_hours: 14,
    remaining_hours: 10,
    assigned_to_id: null,
    assignee_ids: [],
  },
  {
    id: 6,
    title: "Implement task management UI",
    description: "Build task creation, editing, hierarchy, dependency, and assignment workflows.",
    priority: "Medium",
    status: "In Progress",
    task_type: "task",
    start_date: "2026-07-07",
    due_date: "2026-07-11",
    progress: 45,
    parent_id: 4,
    parent_task_id: null,
    predecessor_id: 5,
    dependency_type: "SS",
    lag_days: 1,
    duration_days: 5,
    estimated_hours: 40,
    actual_hours: 18,
    remaining_hours: 22,
    assigned_to_id: null,
    assignee_ids: [],
  },
  {
    id: 7,
    title: "Resolve authentication redirect bug",
    description: "Fix a redirect-loop defect seen during invitation-based login and add regression coverage.",
    priority: "Urgent",
    status: "Testing",
    task_type: "bug",
    start_date: "2026-07-10",
    due_date: "2026-07-11",
    progress: 80,
    parent_id: 4,
    parent_task_id: null,
    predecessor_id: 6,
    dependency_type: "FF",
    lag_days: 0,
    duration_days: 2,
    estimated_hours: 12,
    actual_hours: 10,
    remaining_hours: 2,
    assigned_to_id: null,
    assignee_ids: [],
  },
  {
    id: 8,
    title: "Quality and release phase",
    description: "Validate the release candidate, complete operational readiness, and prepare production rollout.",
    priority: "Medium",
    status: "To Do",
    task_type: "epic",
    start_date: "2026-07-16",
    due_date: "2026-07-22",
    progress: 0,
    parent_id: null,
    parent_task_id: null,
    predecessor_id: 4,
    dependency_type: "FS",
    lag_days: 0,
    duration_days: 7,
    estimated_hours: 56,
    actual_hours: 0,
    remaining_hours: 56,
    assigned_to_id: null,
    assignee_ids: [],
  },
  {
    id: 9,
    title: "End-to-end regression testing",
    description: "Run regression coverage across import, export, task editing, permissions, and Gantt scheduling.",
    priority: "Medium",
    status: "To Do",
    task_type: "task",
    start_date: "2026-07-16",
    due_date: "2026-07-19",
    progress: 0,
    parent_id: 8,
    parent_task_id: null,
    predecessor_id: 7,
    dependency_type: "FS",
    lag_days: 1,
    duration_days: 4,
    estimated_hours: 32,
    actual_hours: 0,
    remaining_hours: 32,
    assigned_to_id: null,
    assignee_ids: [],
  },
  {
    id: 10,
    title: "Production readiness review",
    description: "Confirm deployment plan, monitoring dashboards, support handoff, and release approval.",
    priority: "Low",
    status: "To Do",
    task_type: "milestone",
    start_date: "2026-07-22",
    due_date: "2026-07-22",
    progress: 0,
    parent_id: 8,
    parent_task_id: null,
    predecessor_id: 9,
    dependency_type: "SF",
    lag_days: 0,
    duration_days: 1,
    estimated_hours: 4,
    actual_hours: 0,
    remaining_hours: 4,
    assigned_to_id: null,
    assignee_ids: [],
  },
];

export function getSampleTaskTemplate() {
  return {
    template_version: "1.0",
    generated_by: "Project Management System",
    created_at: "2026-06-30T12:00:00Z",
    instructions: {
      purpose: "Use this file as a starting point for importing project tasks into the Gantt chart.",
      field_names: "Do not rename fields. The importer uses the application's internal API field names.",
      date_format: "Dates must be YYYY-MM-DD. Optional empty dates should be null.",
      required_fields: ["title"],
      status_values: ALLOWED_STATUSES,
      priority_values: ALLOWED_PRIORITIES,
      task_type_values: ALLOWED_TASK_TYPES,
      dependency_type_values: ALLOWED_DEPENDENCY_TYPES,
      progress_rules: "progress must be an integer from 0 to 100.",
      parent_child_relationships: "parent_id and parent_task_id must reference an id from this tasks array, or be null.",
      dependencies: "predecessor_id must reference an id from this tasks array, or be null. dependency_type must be FS, SS, FF, or SF.",
      assignee_format: "assigned_to_id is the primary user id. assignee_ids is an array of user ids. Use null and [] when importing into a workspace where user ids are unknown.",
      hours_format: "estimated_hours, actual_hours, and remaining_hours must be numbers greater than or equal to 0.",
      optional_values: "Keep optional fields present. Use null for empty ids and dates, [] for assignee_ids, and 0 for empty numeric values.",
    },
    tasks: sampleTasks.map((task) => ({ ...task })),
  };
}

export function validateSampleTaskTemplate(template) {
  const errors = [];
  if (!template || !Array.isArray(template.tasks)) {
    return ["Template must contain a tasks array."];
  }

  const ids = template.tasks.map((task) => task.id);
  const idSet = new Set(ids);
  if (idSet.size !== ids.length) {
    errors.push("Template contains duplicate task ids.");
  }

  template.tasks.forEach((task, index) => {
    const label = `tasks[${index}]`;
    TASK_TEMPLATE_FIELDS.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(task, field)) {
        errors.push(`${label}.${field} is missing.`);
      }
    });

    if (!task.title || typeof task.title !== "string") {
      errors.push(`${label}.title is required.`);
    }
    if (!isValidDate(task.start_date)) {
      errors.push(`${label}.start_date must be YYYY-MM-DD.`);
    }
    if (!isValidDate(task.due_date)) {
      errors.push(`${label}.due_date must be YYYY-MM-DD.`);
    }
    if (!Number.isInteger(task.progress) || task.progress < 0 || task.progress > 100) {
      errors.push(`${label}.progress must be an integer from 0 to 100.`);
    }
    if (!ALLOWED_DEPENDENCY_TYPES.includes(task.dependency_type)) {
      errors.push(`${label}.dependency_type is invalid.`);
    }
    if (!ALLOWED_STATUSES.includes(task.status)) {
      errors.push(`${label}.status is invalid.`);
    }
    if (!ALLOWED_PRIORITIES.includes(task.priority)) {
      errors.push(`${label}.priority is invalid.`);
    }
    if (!ALLOWED_TASK_TYPES.includes(task.task_type)) {
      errors.push(`${label}.task_type is invalid.`);
    }
    ["parent_id", "parent_task_id", "predecessor_id"].forEach((field) => {
      if (task[field] !== null && !idSet.has(task[field])) {
        errors.push(`${label}.${field} references a missing task id.`);
      }
      if (task[field] !== null && task[field] === task.id) {
        errors.push(`${label}.${field} cannot reference the same task.`);
      }
    });
  });

  return errors;
}

function isValidDate(value) {
  if (value === null) return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
