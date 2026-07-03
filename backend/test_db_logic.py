from database import SessionLocal, engine
import models
from datetime import date, timedelta
from main import check_cycle, cascade_schedule_updates, hash_password

def run_tests():
    print("Starting backend logic validation...")
    db = SessionLocal()
    
    try:
        # 1. Clean tables
        print("Cleaning tables...")
        db.query(models.Attachment).delete()
        db.query(models.Comment).delete()
        db.query(models.Task).delete()
        db.query(models.List).delete()
        db.query(models.Folder).delete()
        db.query(models.Space).delete()
        db.query(models.WorkspaceMember).delete()
        db.query(models.Workspace).delete()
        db.query(models.User).delete()
        db.commit()
        print("Tables cleaned.")

        # 2. Create User
        user = models.User(
            name="Thameem",
            email="thameem@example.com",
            password_hash=hash_password("password123")
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user: {user.name} (ID: {user.id})")

        # 3. Create Workspace & Space & Folder & List
        ws = models.Workspace(name="TCS Workspace", owner_id=user.id)
        db.add(ws)
        db.commit()
        db.refresh(ws)
        print(f"Created Workspace: {ws.name}")

        member = models.WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="Owner")
        db.add(member)
        db.commit()

        space = models.Space(workspace_id=ws.id, name="Development", description="Coding Dept")
        db.add(space)
        db.commit()
        db.refresh(space)
        print(f"Created Space: {space.name}")

        folder = models.Folder(space_id=space.id, name="E-commerce Project")
        db.add(folder)
        db.commit()
        db.refresh(folder)
        print(f"Created Folder: {folder.name}")

        lst = models.List(folder_id=folder.id, name="Backend Tasks")
        db.add(lst)
        db.commit()
        db.refresh(lst)
        print(f"Created List: {lst.name}")

        # 4. Create Tasks (with Finish-to-Start dependencies)
        task_a = models.Task(
            list_id=lst.id,
            title="Design API Database",
            status="Todo",
            start_date=date(2026, 6, 10),
            due_date=date(2026, 6, 12),  # 3 days
            created_by=user.id
        )
        db.add(task_a)
        db.commit()
        db.refresh(task_a)
        print(f"Created Task A: {task_a.title} ({task_a.start_date} to {task_a.due_date})")

        # Task B depends on Task A
        task_b = models.Task(
            list_id=lst.id,
            title="Write Auth Logic",
            status="Todo",
            predecessor_id=task_a.id,
            start_date=task_a.due_date + timedelta(days=1),
            due_date=task_a.due_date + timedelta(days=2),  # 2 days duration
            created_by=user.id
        )
        db.add(task_b)
        db.commit()
        db.refresh(task_b)
        print(f"Created Task B: {task_b.title} (Predecessor: Task A, {task_b.start_date} to {task_b.due_date})")

        # 5. Verify Cycle Detection
        print("Verifying Cycle Detection...")
        # Check if Task A depending on Task B creates a cycle
        has_cycle = check_cycle(db, task_id=task_a.id, predecessor_id=task_b.id)
        print(f"Cycle check (A depends on B): {has_cycle} (Expected: True)")
        assert has_cycle == True, "Cycle detection failed to detect circular dependency"

        # Check independent task dependency
        has_cycle_self = check_cycle(db, task_id=task_a.id, predecessor_id=task_a.id)
        print(f"Cycle check (A depends on itself): {has_cycle_self} (Expected: True)")
        assert has_cycle_self == True, "Self dependency cycle check failed"

        # 6. Verify Cascading Updates
        print("Shifting Task A timeline to verify cascading dates...")
        # Task A shifts: start date = June 15, duration = 3 days, due_date = June 17
        task_a.start_date = date(2026, 6, 15)
        task_a.due_date = date(2026, 6, 17)
        db.add(task_a)
        db.commit()

        # Cascade updates
        cascade_schedule_updates(db, task_a)
        db.commit()

        # Refresh Task B and verify dates shifted
        db.refresh(task_b)
        print(f"Task B shifted schedule: {task_b.start_date} to {task_b.due_date}")
        assert task_b.start_date == date(2026, 6, 18), "Cascading updates failed: wrong start date"
        assert task_b.due_date == date(2026, 6, 19), "Cascading updates failed: wrong due date"
        print("Cascading schedule update succeeded!")

        # 7. Add Comment and Attachment
        comment = models.Comment(task_id=task_a.id, user_id=user.id, message="First comment!")
        db.add(comment)
        
        attachment = models.Attachment(task_id=task_a.id, file_name="mock_doc.pdf", file_url="http://uploads/mock.pdf", uploaded_by=user.id)
        db.add(attachment)
        db.commit()
        
        db.refresh(task_a)
        print(f"Task A Comments Count: {len(task_a.comments)}")
        print(f"Task A Attachments Count: {len(task_a.attachments)}")
        assert len(task_a.comments) == 1, "Comment creation failed"
        assert len(task_a.attachments) == 1, "Attachment association failed"

        # 8. Verify WBS Roll-up Logic
        print("Verifying WBS Parent/Child Roll-ups...")
        # Create a parent task
        parent_task = models.Task(
            list_id=lst.id,
            title="Parent Phase 1",
            status="Todo",
            created_by=user.id
        )
        db.add(parent_task)
        db.commit()
        db.refresh(parent_task)
        
        # Create child task 1
        child_1 = models.Task(
            list_id=lst.id,
            title="Child task 1",
            status="Todo",
            parent_id=parent_task.id,
            start_date=date(2026, 6, 20),
            due_date=date(2026, 6, 22),
            created_by=user.id
        )
        db.add(child_1)
        db.commit()
        
        # Create child task 2
        child_2 = models.Task(
            list_id=lst.id,
            title="Child task 2",
            status="Todo",
            parent_id=parent_task.id,
            start_date=date(2026, 6, 21),
            due_date=date(2026, 6, 25),
            created_by=user.id
        )
        db.add(child_2)
        db.commit()
        
        # Trigger recalculation
        from main import recalculate_parent_task
        recalculate_parent_task(db, parent_task.id)
        db.refresh(parent_task)
        
        # Assert parent dates match children (min/max)
        print(f"Parent dates rolled up: {parent_task.start_date} to {parent_task.due_date} (Duration: {parent_task.duration_days})")
        assert parent_task.start_date == date(2026, 6, 20), "WBS roll-up failed: wrong start date"
        assert parent_task.due_date == date(2026, 6, 25), "WBS roll-up failed: wrong due date"
        assert parent_task.duration_days == 6, f"WBS roll-up failed: wrong duration days (expected 6, got {parent_task.duration_days})"
        
        # Assert parent status is Todo (since all children are Todo)
        assert parent_task.status == "Todo", f"WBS roll-up failed: wrong status (expected Todo, got {parent_task.status})"
        
        # Change child 1 status to "In Progress"
        child_1.status = "In Progress"
        db.add(child_1)
        db.commit()
        recalculate_parent_task(db, parent_task.id)
        db.refresh(parent_task)
        assert parent_task.status == "In Progress", f"WBS roll-up failed: status should be In Progress, got {parent_task.status}"
        
        # Change child 1 and 2 to "Done"
        child_1.status = "Done"
        child_2.status = "Done"
        db.add(child_1)
        db.add(child_2)
        db.commit()
        recalculate_parent_task(db, parent_task.id)
        db.refresh(parent_task)
        assert parent_task.status == "Done", f"WBS roll-up failed: status should be Done, got {parent_task.status}"
        
        # Parent Cycle Check
        from main import check_parent_cycle
        has_parent_cycle = check_parent_cycle(db, task_id=parent_task.id, parent_id=child_1.id)
        print(f"Parent cycle check (parent depends on child 1): {has_parent_cycle} (Expected: True)")
        assert has_parent_cycle == True, "WBS parent cycle check failed"
        
        print("WBS roll-up logic tests PASSED successfully!")

        print("All backend logic tests PASSED successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    run_tests()
