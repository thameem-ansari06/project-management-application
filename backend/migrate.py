from database import engine
from sqlalchemy import text

print("Starting migration...")

# 1. Rename table spaces to projects
try:
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(text("ALTER TABLE spaces RENAME TO projects;"))
            print("Renamed table spaces to projects")
except Exception as e:
    print("spaces table not renamed:", str(e).split('\n')[0])

# 2. Rename space_id column to project_id in folders table
try:
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(text("ALTER TABLE folders RENAME COLUMN space_id TO project_id;"))
            print("Renamed folders.space_id to folders.project_id")
except Exception as e:
    print("folders.space_id not renamed:", str(e).split('\n')[0])

# 3. Add canvas_state column to projects table
try:
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(text("ALTER TABLE projects ADD COLUMN canvas_state JSONB DEFAULT '{}'::jsonb;"))
            print("Added canvas_state column to projects table")
except Exception as e:
    print("canvas_state column not added:", str(e).split('\n')[0])

# 4. Add imported_xml_name column to projects table
try:
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(text("ALTER TABLE projects ADD COLUMN imported_xml_name VARCHAR;"))
            print("Added imported_xml_name column to projects table")
except Exception as e:
    print("imported_xml_name column not added:", str(e).split('\n')[0])

print("Migration run completed.")
