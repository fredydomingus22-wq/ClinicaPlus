import asyncio
import os
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver

async def check():
    print(f"AsyncPostgresSaver methods: {dir(AsyncPostgresSaver)}")
    try:
        # Just to check the signature of from_conn_string
        import inspect
        sig = inspect.signature(AsyncPostgresSaver.from_conn_string)
        print(f"from_conn_string signature: {sig}")
    except Exception as e:
        print(f"Error checking signature: {e}")

if __name__ == "__main__":
    asyncio.run(check())
