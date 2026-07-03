from database import engine
from sqlalchemy import text

with engine.connect() as con:
    try:
        con.execute(text("ALTER TABLE notifications ADD COLUMN tab_category VARCHAR DEFAULT 'Primary'"))
        con.commit()
        print('Column added successfully')
    except Exception as e:
        print(f'Error: {e}')
