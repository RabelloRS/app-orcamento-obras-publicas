#!/usr/bin/env python
import uvicorn
import sys

if __name__ == "__main__":
    print("Iniciando servidor...")
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8080,
        reload=False,
        log_level="info"
    )
