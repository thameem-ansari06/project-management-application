from datetime import datetime, timezone
import re

from fastapi import HTTPException

import models


TASK_JSON_VERSION = "1.0"
GENERATED_BY = "Project Management System"

ALLOWED_STATUSES = {"To Do", "In Progress", "Review", "Testing", "Done"}
ALLOWED_PRIORITIES = {"Urgent", "High", "Medium", "Low"}
ALLOWED_TASK_TYPES = {"task", "milestone", "epic", "bug"}
ALLOWED_DEPENDENCY_TYPES = {"FS", "SS", "FF", "SF"}

SUPPORTED_TASK_FIELDS = {
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
}


def serialize_task(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "priority": task.priority,
        "status": task.status,
        "task_type": task.task_type,
        "start_date": task.start_date.isoformat() if task.start_date else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "progress": task.progress,
        "parent_id": task.parent_id,
        "parent_task_id": task.parent_task_id,
        "predecessor_id": task.predecessor_id,
        "dependency_type": task.dependency_type,
        "lag_days": task.lag_days,
        "duration_days": task.duration_days,
        "estimated_hours": task.estimated_hours,
        "actual_hours": task.actual_hours,
        "remaining_hours": task.remaining_hours,
        "assigned_to_id": task.assigned_to_id,
        "assignee_ids": [user.id for user in task.assignees],
    }


def build_project_export(project, tasks):
    return {
        "template_version": TASK_JSON_VERSION,
        "generated_by": GENERATED_BY,
        "created_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
        },
        "instructions": {
            "format": "Enterprise project task export. Re-import this file through Import JSON.",
            "field_names": "Do not rename fields. The importer uses the application's internal API field names.",
            "dates": "Use YYYY-MM-DD for start_date and due_date. Empty optional dates should be null.",
            "status_values": sorted(ALLOWED_STATUSES),
            "priority_values": sorted(ALLOWED_PRIORITIES),
            "task_type_values": sorted(ALLOWED_TASK_TYPES),
            "dependency_type_values": sorted(ALLOWED_DEPENDENCY_TYPES),
            "progress": "Use an integer from 0 to 100.",
            "relationships": "parent_id, parent_task_id, and predecessor_id must reference task ids in this file.",
            "assignees": "assigned_to_id is the primary user id. assignee_ids is an array of user ids.",
            "hours": "estimated_hours, actual_hours, and remaining_hours must be numbers greater than or equal to 0.",
        },
        "tasks": [serialize_task(task) for task in tasks],
    }


def extract_tasks_from_payload(payload):
    if isinstance(payload, list):
        return payload, "legacy"
    if isinstance(payload, dict) and isinstance(payload.get("tasks"), list):
        return payload["tasks"], "enterprise"
    raise HTTPException(
        status_code=400,
        detail="Invalid JSON payload: expected either a task array or an object with a tasks array.",
    )


def validate_task_payload(tasks_data, db):
    errors = []

    if not isinstance(tasks_data, list):
        errors.append("tasks must be an array.")
    elif len(tasks_data) == 0:
        errors.append("tasks must contain at least one task.")

    if errors:
        raise HTTPException(status_code=400, detail={"message": "Task import validation failed.", "errors": errors})

    ids = []
    normalized = []
    assigned_user_ids = set()

    for index, task in enumerate(tasks_data):
        label = f"tasks[{index}]"

        if not isinstance(task, dict):
            errors.append(f"{label} must be an object.")
            continue

        unknown_fields = sorted(set(task.keys()) - SUPPORTED_TASK_FIELDS)
        if unknown_fields:
            errors.append(f"{label} contains unsupported fields: {', '.join(unknown_fields)}.")

        task_id = task.get("id")
        if task_id is not None:
            ids.append(task_id)

        title = task.get("title")
        if not isinstance(title, str) or not title.strip():
            errors.append(f"{label}.title is required and must be a non-empty string.")

        normalized_task = dict(task)
        normalized_task["start_date"] = _parse_optional_date(task.get("start_date"), f"{label}.start_date", errors)
        normalized_task["due_date"] = _parse_optional_date(task.get("due_date"), f"{label}.due_date", errors)

        _validate_choice(task, "status", ALLOWED_STATUSES, "To Do", label, errors)
        _validate_choice(task, "priority", ALLOWED_PRIORITIES, "Medium", label, errors)
        _validate_choice(task, "task_type", ALLOWED_TASK_TYPES, "task", label, errors)
        _validate_choice(task, "dependency_type", ALLOWED_DEPENDENCY_TYPES, "FS", label, errors)

        _validate_int_range(task, "progress", 0, 100, 0, label, errors)
        _validate_int(task, "lag_days", 0, label, errors)
        _validate_int(task, "duration_days", None, label, errors)
        _validate_non_negative_number(task, "estimated_hours", 0.0, label, errors)
        _validate_non_negative_number(task, "actual_hours", 0.0, label, errors)
        _validate_non_negative_number(task, "remaining_hours", 0.0, label, errors)

        for ref_field in ("parent_id", "parent_task_id", "predecessor_id"):
            ref_value = task.get(ref_field)
            if ref_value is not None:
                _validate_id_like(ref_value, f"{label}.{ref_field}", errors)

        assigned_to_id = task.get("assigned_to_id")
        if assigned_to_id is not None:
            _validate_id_like(assigned_to_id, f"{label}.assigned_to_id", errors)
            assigned_user_ids.add(assigned_to_id)

        assignee_ids = task.get("assignee_ids", [])
        if assignee_ids is None:
            assignee_ids = []
            normalized_task["assignee_ids"] = []
        if not isinstance(assignee_ids, list):
            errors.append(f"{label}.assignee_ids must be an array of user ids.")
        else:
            for user_id in assignee_ids:
                _validate_id_like(user_id, f"{label}.assignee_ids", errors)
                assigned_user_ids.add(user_id)

        normalized.append(normalized_task)

    duplicate_ids = sorted({task_id for task_id in ids if ids.count(task_id) > 1}, key=str)
    if duplicate_ids:
        errors.append(f"Duplicate task ids found: {', '.join(str(task_id) for task_id in duplicate_ids)}.")

    explicit_ids = set(ids)
    for index, task in enumerate(tasks_data):
        if not isinstance(task, dict):
            continue
        for ref_field in ("parent_id", "parent_task_id", "predecessor_id"):
            ref_value = task.get(ref_field)
            if ref_value is not None and ref_value not in explicit_ids:
                errors.append(f"tasks[{index}].{ref_field} references missing task id {ref_value}.")
        if task.get("parent_id") is not None and task.get("parent_id") == task.get("id"):
            errors.append(f"tasks[{index}].parent_id cannot reference its own task id.")
        if task.get("parent_task_id") is not None and task.get("parent_task_id") == task.get("id"):
            errors.append(f"tasks[{index}].parent_task_id cannot reference its own task id.")
        if task.get("predecessor_id") is not None and task.get("predecessor_id") == task.get("id"):
            errors.append(f"tasks[{index}].predecessor_id cannot reference its own task id.")

    _validate_reference_cycles(tasks_data, "parent_id", errors)
    _validate_reference_cycles(tasks_data, "parent_task_id", errors)
    _validate_reference_cycles(tasks_data, "predecessor_id", errors)

    if assigned_user_ids:
        existing_user_ids = {
            user_id for (user_id,) in db.query(models.User.id).filter(models.User.id.in_(assigned_user_ids)).all()
        }
        missing_user_ids = sorted(assigned_user_ids - existing_user_ids, key=str)
        if missing_user_ids:
            errors.append(f"Assigned user ids do not exist: {', '.join(str(user_id) for user_id in missing_user_ids)}.")

    if errors:
        raise HTTPException(status_code=400, detail={"message": "Task import validation failed.", "errors": errors})

    return normalized


def import_tasks_into_project(db, project, tasks_data, filename, current_user_id):
    normalized_tasks = validate_task_payload(tasks_data, db)

    existing_folder = db.query(models.Folder).filter(
        models.Folder.project_id == project.id,
        models.Folder.name == "Imported JSON Data",
    ).first()
    if existing_folder:
        db.delete(existing_folder)
        db.commit()

    folder = models.Folder(project_id=project.id, name="Imported JSON Data")
    db.add(folder)
    db.commit()
    db.refresh(folder)

    task_list = models.List(folder_id=folder.id, name="Imported JSON Data")
    db.add(task_list)
    db.commit()
    db.refresh(task_list)

    project.imported_json_name = filename
    db.commit()

    uid_to_db_id = {}
    created_by_key = {}

    for index, task_data in enumerate(normalized_tasks):
        start_date = task_data.get("start_date")
        due_date = task_data.get("due_date")
        duration_days = task_data.get("duration_days")
        if duration_days is None and start_date and due_date:
            duration_days = (due_date - start_date).days + 1

        db_task = models.Task(
            list_id=task_list.id,
            title=task_data.get("title"),
            description=task_data.get("description"),
            status=task_data.get("status", "To Do"),
            priority=task_data.get("priority", "Medium"),
            start_date=start_date,
            due_date=due_date,
            duration_days=duration_days,
            progress=task_data.get("progress", 0),
            task_type=task_data.get("task_type", "task"),
            dependency_type=task_data.get("dependency_type", "FS"),
            lag_days=task_data.get("lag_days", 0),
            estimated_hours=task_data.get("estimated_hours", 0.0),
            actual_hours=task_data.get("actual_hours", 0.0),
            remaining_hours=task_data.get("remaining_hours", 0.0),
            assigned_to_id=task_data.get("assigned_to_id"),
            created_by=current_user_id,
        )

        assignee_ids = task_data.get("assignee_ids") or []
        if assignee_ids:
            db_task.assignees = db.query(models.User).filter(models.User.id.in_(assignee_ids)).all()

        db.add(db_task)
        db.commit()
        db.refresh(db_task)

        import_key = task_data.get("id") if task_data.get("id") is not None else f"__task_index_{index}"
        uid_to_db_id[import_key] = db_task.id
        created_by_key[import_key] = db_task

    for index, task_data in enumerate(normalized_tasks):
        import_key = task_data.get("id") if task_data.get("id") is not None else f"__task_index_{index}"
        db_task = created_by_key[import_key]

        parent_id = task_data.get("parent_id")
        if parent_id is not None:
            db_task.parent_id = uid_to_db_id[parent_id]

        parent_task_id = task_data.get("parent_task_id")
        if parent_task_id is not None:
            db_task.parent_task_id = uid_to_db_id[parent_task_id]

        predecessor_id = task_data.get("predecessor_id")
        if predecessor_id is not None:
            db_task.predecessor_id = uid_to_db_id[predecessor_id]

        db.add(db_task)

    db.commit()

    return {"message": "Imported JSON successfully", "filename": filename, "tasks_imported": len(normalized_tasks)}


def _parse_optional_date(value, field_name, errors):
    if value in (None, ""):
        return None
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        errors.append(f"{field_name} must be a YYYY-MM-DD string or null.")
        return None
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        errors.append(f"{field_name} must be a valid date in YYYY-MM-DD format.")
        return None


def _validate_choice(task, field, allowed, default, label, errors):
    value = task.get(field, default)
    if value not in allowed:
        errors.append(f"{label}.{field} must be one of: {', '.join(sorted(allowed))}.")


def _validate_int_range(task, field, minimum, maximum, default, label, errors):
    value = task.get(field, default)
    if not isinstance(value, int) or isinstance(value, bool) or value < minimum or value > maximum:
        errors.append(f"{label}.{field} must be an integer from {minimum} to {maximum}.")


def _validate_int(task, field, minimum, label, errors):
    value = task.get(field)
    if value is None:
        return
    if not isinstance(value, int) or isinstance(value, bool):
        errors.append(f"{label}.{field} must be an integer.")
        return
    if minimum is not None and value < minimum:
        errors.append(f"{label}.{field} must be greater than or equal to {minimum}.")


def _validate_non_negative_number(task, field, default, label, errors):
    value = task.get(field, default)
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value < 0:
        errors.append(f"{label}.{field} must be a number greater than or equal to 0.")


def _validate_id_like(value, field_name, errors):
    if not isinstance(value, int) or isinstance(value, bool):
        errors.append(f"{field_name} must be an integer id.")


def _validate_reference_cycles(tasks_data, field, errors):
    task_by_id = {
        task.get("id"): task
        for task in tasks_data
        if isinstance(task, dict) and task.get("id") is not None
    }

    for task_id in task_by_id:
        visited = set()
        current_id = task_id

        while current_id is not None:
            if current_id in visited:
                errors.append(f"{field} contains a circular reference involving task id {current_id}.")
                break

            visited.add(current_id)
            current_task = task_by_id.get(current_id)
            if not current_task:
                break
            current_id = current_task.get(field)
